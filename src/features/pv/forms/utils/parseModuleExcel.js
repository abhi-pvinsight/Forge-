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
    const label = String(row[1] || "").trim();
    const normalizedLabel = label.toLowerCase();
    const cellValue = String(row[2] || "").trim();

    // -- Handle Variant Rows (Columns 2 to 7 mapping) --
    if (Object.prototype.hasOwnProperty.call(variantLookup, normalizedLabel)) {
      const keyPrefix = variantLookup[normalizedLabel];
      
      html += `
        <tr>
          <td>${label}</td>
          <td>${row[2] || ""}</td>
          <td>${row[3] || ""}</td>
          <td>${row[4] || ""}</td>
          <td>${row[5] || ""}</td>
          <td>${row[6] || ""}</td>
          <td>${row[7] || ""}</td>
          <td>${row[8] || ""}</td>
        </tr>
      `;

      [row[2], row[3], row[4], row[5], row[6], row[7]].forEach((cell, index) => {
        values[`${keyPrefix}_${index + 1}`] = cell != null ? String(cell).trim() : "";
      });
      return;
    }

    // -- Base Metadata --
    if (/module model/i.test(normalizedLabel)) {
      values.module_model = cellValue;
    }

    // -- Direct Base Mappings --
    if (Object.prototype.hasOwnProperty.call(staticLookup, normalizedLabel)) {
      values[staticLookup[normalizedLabel]] = cellValue;
    }

    // -- Dimensions (Splitting "2382 x 1134 x 33") --
    if (/length x width x height/i.test(normalizedLabel)) {
      const parts = cellValue.split(/x/i).map(p => p.trim());
      values.module_length = parts[0] || "";
      values.module_width = parts[1] || "";
      values.module_height = parts[2] || "";
    }

    // -- Load Rating (Splitting "2400Pa (Wind) and 5400Pa (Snow)") --
    if (/load rating/i.test(normalizedLabel)) {
      const windMatch = cellValue.match(/([\d\w\s+-]+)\s*\(Wind\)/i);
      const snowMatch = cellValue.match(/([\d\w\s+-]+)\s*\(Snow\)/i);
      values.wind_load = windMatch ? windMatch[1].trim() : "";
      values.snow_load = snowMatch ? snowMatch[1].trim() : "";
    }

    // -- Degradation Sub-Rows (Sequential parsing) --
    if (/degradation/i.test(normalizedLabel)) {
      values.deg_year1 = cellValue; // First row entry
      
      // Look forward to adjacent layout rows where column 1 label is blank
      let nextRowIdx = rowIndex + 1;
      while (nextRowIdx < rows.length && String(rows[nextRowIdx][1] || "").trim() === "") {
        const nextVal = String(rows[nextRowIdx][2] || "").trim();
        if (/30th/i.test(nextVal)) values.deg_year30 = nextVal;
        if (/year on year/i.test(nextVal)) values.deg_yearly = nextVal;
        nextRowIdx++;
      }
    }

    // -- Warranty Sub-Rows (Sequential parsing) --
    if (/warranty/i.test(normalizedLabel)) {
      values.warranty_product = cellValue; // First row entry
      
      let nextRowIdx = rowIndex + 1;
      if (nextRowIdx < rows.length && String(rows[nextRowIdx][1] || "").trim() === "") {
        const nextVal = String(rows[nextRowIdx][2] || "").trim();
        if (nextVal) values.warranty_performance = nextVal;
      }
    }
  });

  return { rows, variantTable: html, values };
}