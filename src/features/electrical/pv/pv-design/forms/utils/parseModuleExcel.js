import * as XLSX from "xlsx";

export async function parseModuleExcel(file) {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
  });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const values = {};

  // 1. Variant technical parameters mapping (multi-column rows)
  const variantLookup = {
    "module rated power": "wp",
    "pstc (front side)": "pstc",
    "voc (front side)": "voc",
    "vmp (front side)": "vmp",
    "isc (front side)": "isc",
    "imp (front side)": "imp",
    "module efficiency": "eff",
  };

  // 2. Direct single-value mappings
  const staticLookup = {
    "temperature coefficient of current (isc), α": "temp_coeff_isc",
    "temperature coefficient of voltage (voc), β": "temp_coeff_voc",
    "temperature coefficient of power (pm), γ": "temp_coeff_pm",
    "noct": "noct",
    "series fuse max rating": "fuse_rating",
    "solar cells per module (units) / arrangement": "cell_count",
    "solar cell type": "cell_type",
    "front glass": "front_glass",
    "back glass": "back_glass",
    "module output cable": "output_cable",
    "module connector": "connector",
    "junction box": "junction_box",
  };

  let html = "";

  // Process rows loop
  rows.forEach((row, rowIndex) => {
    if (!row || !Array.isArray(row) || row.length === 0) return;

    // Search row[0]..row[3] for technical parameter labels
    let labelIndex = -1;
    let label = "";
    let matchedPrefix = null;

    for (let c = 0; c < Math.min(row.length, 4); c++) {
      const cellText = String(row[c] || "").trim();
      if (!cellText) continue;

      const norm = cellText.toLowerCase();

      if (/module rated power|maximum power|rated power|\bpmax\b|\bpstc\b|peak power|stc power|module power/i.test(norm) && !/coeff|temp/i.test(norm)) {
        labelIndex = c;
        label = cellText;
        matchedPrefix = "wp";
        break;
      } else if (/open[- ]circuit voltage|\bvoc\b/i.test(norm) && !/coeff|temp/i.test(norm)) {
        labelIndex = c;
        label = cellText;
        matchedPrefix = "voc";
        break;
      } else if (/optimum operating voltage|maximum power voltage|\bvmp\b/i.test(norm) && !/coeff|temp/i.test(norm)) {
        labelIndex = c;
        label = cellText;
        matchedPrefix = "vmp";
        break;
      } else if (/short[- ]circuit current|\bisc\b/i.test(norm) && !/coeff|temp/i.test(norm)) {
        labelIndex = c;
        label = cellText;
        matchedPrefix = "isc";
        break;
      } else if (/optimum operating current|maximum power current|\bimp\b/i.test(norm) && !/coeff|temp/i.test(norm)) {
        labelIndex = c;
        label = cellText;
        matchedPrefix = "imp";
        break;
      } else if (/module efficiency|\befficiency\b|\beff\b/i.test(norm)) {
        labelIndex = c;
        label = cellText;
        matchedPrefix = "eff";
        break;
      }
    }

    if (matchedPrefix && labelIndex >= 0) {
      const valCells = row.slice(labelIndex + 1)
        .map(cell => (cell != null ? String(cell).trim() : ""))
        .filter(c => c !== "");

      html += `
        <tr>
          <td>${label}</td>
          ${valCells.slice(0, 7).map(c => `<td>${c}</td>`).join('')}
        </tr>
      `;

      valCells.forEach((cell, index) => {
        if (index < 6) {
          values[`${matchedPrefix}_${index + 1}`] = cell;
          if (matchedPrefix === "wp") {
            values[`pstc_${index + 1}`] = cell;
          }
        }
      });

      if (matchedPrefix === "wp") {
        let maxVal = 0;
        let maxStr = "";
        valCells.forEach(cell => {
          const num = parseFloat(cell.replace(/[^\d.]/g, ""));
          if (!isNaN(num) && num > maxVal) {
            maxVal = num;
            maxStr = cell;
          }
        });
        if (maxStr !== "") {
          values.max_module_power = maxStr;
        }
      }
      return;
    }

    // Search for static/base metadata labels across row[0]..row[3]
    let baseLabelIndex = -1;
    let baseLabel = "";

    for (let c = 0; c < Math.min(row.length, 4); c++) {
      const val = String(row[c] || "").trim();
      if (val && isNaN(Number(val))) { // ignore numeric serial numbers like "1", "2", "3"
        baseLabelIndex = c;
        baseLabel = val;
        break;
      }
    }

    if (baseLabel) {
      const normalizedLabel = baseLabel.toLowerCase();
      const cellValue = String(row[baseLabelIndex + 1] || "").trim();

      // -- Base Metadata & Direct Mappings --
      if (/module model/i.test(normalizedLabel) && !values.module_model) {
        values.module_model = cellValue;
      }
      if (/manufacturer|make/i.test(normalizedLabel) && !values.module_make) {
        values.module_make = cellValue;
      }
      if (/temp.*coeff.*voc|temperature coefficient of (voltage|voc)/i.test(normalizedLabel) && !values.temp_coeff_voc) {
        values.temp_coeff_voc = cellValue;
        values.tempCoeffVoc = cellValue;
      }

      // -- Static Lookup fallback --
      if (Object.prototype.hasOwnProperty.call(staticLookup, normalizedLabel)) {
        values[staticLookup[normalizedLabel]] = cellValue;
      }

      // -- Dimensions --
      if (/length x width x height|dimensions/i.test(normalizedLabel)) {
        const parts = cellValue.split(/x/i).map(p => p.trim());
        if (parts.length >= 3) {
          values.module_length = parts[0] || "";
          values.module_width = parts[1] || "";
          values.module_height = parts[2] || "";
          values.module_dimensions = cellValue;
        }
      }

      // -- Load Rating --
      if (/load rating/i.test(normalizedLabel)) {
        const windMatch = cellValue.match(/([\d\w\s+-]+)\s*\(Wind\)/i);
        const snowMatch = cellValue.match(/([\d\w\s+-]+)\s*\(Snow\)/i);
        values.wind_load = windMatch ? windMatch[1].trim() : "";
        values.snow_load = snowMatch ? snowMatch[1].trim() : "";
      }

      // -- Degradation Sub-Rows --
      if (/degradation/i.test(normalizedLabel)) {
        values.deg_year1 = cellValue;
        let nextRowIdx = rowIndex + 1;
        while (nextRowIdx < rows.length && String(rows[nextRowIdx][1] || "").trim() === "") {
          const nextVal = String(rows[nextRowIdx][2] || "").trim();
          if (/30th/i.test(nextVal)) values.deg_year30 = nextVal;
          if (/year on year/i.test(nextVal)) values.deg_yearly = nextVal;
          nextRowIdx++;
        }
      }

      // -- Warranty Sub-Rows --
      if (/warranty/i.test(normalizedLabel)) {
        values.warranty_product = cellValue;
        let nextRowIdx = rowIndex + 1;
        if (nextRowIdx < rows.length && String(rows[nextRowIdx][1] || "").trim() === "") {
          const nextVal = String(rows[nextRowIdx][2] || "").trim();
          if (nextVal) values.warranty_performance = nextVal;
        }
      }
    }
  });

  // 3. Construct structured availableWpVariants array
  const availableWpVariants = [];
  const seenNumericWps = new Set();

  for (let i = 1; i <= 6; i++) {
    const rawWp = values[`wp_${i}`] || values[`pstc_${i}`] || "";
    if (rawWp) {
      const numWp = parseFloat(String(rawWp).replace(/[^\d.]/g, ""));
      if (!isNaN(numWp) && numWp > 0 && !seenNumericWps.has(numWp)) {
        seenNumericWps.add(numWp);
        availableWpVariants.push({
          index: i,
          wpLabel: `${numWp} Wp`,
          numericWp: numWp,
          rawWp: String(values[`wp_${i}`] || rawWp).trim(),
          ratedPower: String(values[`wp_${i}`] || numWp).trim(),
          voc: values[`voc_${i}`] || "",
          vmp: values[`vmp_${i}`] || "",
          isc: values[`isc_${i}`] || "",
          imp: values[`imp_${i}`] || "",
          pstc: values[`pstc_${i}`] || String(numWp),
          eff: values[`eff_${i}`] || "",
        });
      }
    }
  }

  // Sort availableWpVariants ascending by numeric Wp
  availableWpVariants.sort((a, b) => a.numericWp - b.numericWp);
  values.availableWpVariants = availableWpVariants;

  return { rows, variantTable: html, values, availableWpVariants };
}