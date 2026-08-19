let peakIscMetadata = null;

export function setPeakIscMetadata(metadata) {
  peakIscMetadata = metadata;
}

export function getPeakIscMetadata() {
  return peakIscMetadata;
}

export function clearPeakIscMetadata() {
  peakIscMetadata = null;
}

export function calculateYearlyVoc(rows) {
  console.log("calculateYearlyVoc CALLED");

  try {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      throw new Error("CSV file contains no data.");
    }

    const years = Object.keys(rows[0]);

    if (!years.length) {
      throw new Error("No year columns found in CSV.");
    }

    let allTimeMax = -Infinity;

    const summary = years.map((year) => {
      const values = rows
        .map((row) => Number(row[year]))
        .filter((value) => !isNaN(value) && value > 0);

      if (!values.length) {
        throw new Error(`No valid voltage values found for year ${year}.`);
      }

      // Safe alternative to Math.max/min for large datasets (hourly data = ~8760 rows)
      const maxVoltage = values.reduce((max, val) => val > max ? val : max, -Infinity);
      const minVoltage = values.reduce((min, val) => val < min ? val : min, Infinity);

      // Keep track of the highest overall voltage across all 25 years
      if (maxVoltage > allTimeMax) {
        allTimeMax = maxVoltage;
      }

      return {
        year,
        maxVoltage: Number(maxVoltage.toFixed(2)),
        minVoltage: Number(minVoltage.toFixed(2)),
      };
    });

    return {
      success: true,
      data: summary,
      allTimeMax: Number(allTimeMax.toFixed(2)), // Added this line
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      allTimeMax: null,
      error: error?.message || "An unexpected error occurred while processing the CSV file.",
    };
  }
}


export function calculateVocCold(vocStc, tempCoefficient, tCold) {
  const vStc = typeof vocStc === 'string' ? parseFloat(vocStc.replace(/[^\d.-]/g, '')) : Number(vocStc);
  const tc = typeof tempCoefficient === 'string' ? parseFloat(tempCoefficient.replace(/[^\d.-]/g, '')) : Number(tempCoefficient);
  const tC = typeof tCold === 'string' ? parseFloat(tCold.replace(/[^\d.-]/g, '')) : Number(tCold);

  if (isNaN(vStc) || isNaN(tc) || isNaN(tC)) {
    return NaN;
  }

  return vStc * (1 + (tc / 100) * (tC - 25));
}

export function calculateNMax(pcsMaxPvInputVoltage, vocCold) {
  const maxV = typeof pcsMaxPvInputVoltage === 'string'
    ? parseFloat(pcsMaxPvInputVoltage.replace(/[^\d.]/g, ''))
    : Number(pcsMaxPvInputVoltage);
  const vCold = Number(vocCold);

  if (isNaN(maxV) || isNaN(vCold) || vCold <= 0) {
    return { exact: "—", rounded: "—" };
  }

  const raw = maxV / vCold;
  return {
    exact: raw.toFixed(2),
    rounded: Math.floor(raw),
  };
}

export function calculateNMin(pcsMinPvInputVoltage, vmpMaxTemp) {
  const minVoltage = typeof pcsMinPvInputVoltage === 'string'
    ? parseFloat(pcsMinPvInputVoltage.replace(/[^\d.]/g, ''))
    : Number(pcsMinPvInputVoltage || 875);
  const vmp = Number(vmpMaxTemp);

  if (isNaN(minVoltage) || isNaN(vmp) || vmp === 0) {
    return { exact: "—", rounded: "—" };
  }

  const raw = minVoltage / vmp;
  return {
    exact: raw.toFixed(2),
    rounded: Math.ceil(raw),
  };
}


export function calculateYearlyIsc(rows) {
  console.log("calculateYearlyIsc CALLED");

  try {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      throw new Error("CSV file contains no data.");
    }

    const years = Object.keys(rows[0]);

    if (!years.length) {
      throw new Error("No year columns found in CSV.");
    }

    let allTimeMaxIsc = -Infinity;
    let max3hrIsc = -Infinity;
    let maxIscYear = "";

    let globalMaxH1 = { isc: -Infinity, serialNo: 0, year: "", date: "" };
    let globalMaxH2 = { isc: -Infinity, serialNo: 0, year: "", date: "" };
    let globalMaxH3 = { isc: -Infinity, serialNo: 0, year: "", date: "" };

    const summary = years.map((year) => {
      const values = rows
        .map((row) => Number(row[year]))
        .filter((value) => !isNaN(value));

      if (!values.length) {
        throw new Error(`No valid current values found for year ${year}.`);
      }

      // Track the day within this year that has the highest 3-hour average
      let yearlyBestDay = {
        avg: -Infinity,
        h1Val: 0, h1Idx: 0,
        h2Val: 0, h2Idx: 0,
        h3Val: 0, h3Idx: 0,
      };

      // Loop through each day chronologically
      for (let day = 0; day < Math.floor(values.length / 24); day++) {
        const base = day * 24;
        
        const v1 = values[base + 9] ?? 0;  // Hour 9 (09:00)
        const v2 = values[base + 10] ?? 0; // Hour 10 (10:00)
        const v3 = values[base + 11] ?? 0; // Hour 11 (11:00)
        
        const dailyAvg = (v1 + v2 + v3) / 3;

        // If this day's average is the highest so far, lock it in
        if (dailyAvg > yearlyBestDay.avg) {
          yearlyBestDay = {
            avg: dailyAvg,
            h1Val: v1, h1Idx: base + 9,
            h2Val: v2, h2Idx: base + 10,
            h3Val: v3, h3Idx: base + 11,
          };
        }
      }

      // Convert values to clean 2-decimal numbers
      const h1 = Number(yearlyBestDay.h1Val.toFixed(2));
      const h2 = Number(yearlyBestDay.h2Val.toFixed(2));
      const h3 = Number(yearlyBestDay.h3Val.toFixed(2));

      // Update the global trackers if this year's peak day values beat all-time values
      if (h1 > globalMaxH1.isc) {
        globalMaxH1 = {
          isc: h1,
          serialNo: yearlyBestDay.h1Idx,
          year,
          date: getTimestampFromSerial(yearlyBestDay.h1Idx, year),
        };
      }

      if (h2 > globalMaxH2.isc) {
        globalMaxH2 = {
          isc: h2,
          serialNo: yearlyBestDay.h2Idx,
          year,
          date: getTimestampFromSerial(yearlyBestDay.h2Idx, year),
        };
      }

      if (h3 > globalMaxH3.isc) {
        globalMaxH3 = {
          isc: h3,
          serialNo: yearlyBestDay.h3Idx,
          year,
          date: getTimestampFromSerial(yearlyBestDay.h3Idx, year),
        };
      }

      const yearlyMax = Math.max(h1, h2, h3);
      if (yearlyMax > allTimeMaxIsc) {
        allTimeMaxIsc = yearlyMax;
      }

      const yearlyAvg = Number(((h1 + h2 + h3) / 3).toFixed(2));
      if (yearlyAvg > max3hrIsc) {
        max3hrIsc = yearlyAvg;
        maxIscYear = year;
      }

      return {
        year,
        h1,
        h2,
        h3,
        avg: yearlyAvg,
      };
    });

    const metadata = {
      h1Record: { ...globalMaxH1 },
      h2Record: { ...globalMaxH2 },
      h3Record: { ...globalMaxH3 },
    };

    // Store globally inside module
    setPeakIscMetadata(metadata);

    return {
      success: true,
      data: summary,
      allTimeMaxIsc: Number(allTimeMaxIsc.toFixed(2)),
      max_3hr_isc: max3hrIsc !== -Infinity ? max3hrIsc : null,
      max_isc_year: maxIscYear !== "" ? maxIscYear : null,
      date1: globalMaxH1.date,
      date2: globalMaxH2.date,
      date3: globalMaxH3.date,
      metadata,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      allTimeMaxIsc: null,
      date1: "",
      date2: "",
      date3: "",
      metadata: null,
      error:
        error?.message ||
        "An unexpected error occurred while processing the CSV file.",
    };
  }
}

function getTimestampFromSerial(serialNo, year) {
  const dayOfYear = Math.floor(serialNo / 24);
  const hour = serialNo % 24;
  
  const date = new Date(year, 0, 1); // Starts at Jan 1st
  date.setDate(date.getDate() + dayOfYear);
  
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  
  return `${dd}/${mm}/${year} ${hh}:00`;
}


export function getIrradianceForPeaks(ghiRows = [], dhiRows = []) {
  console.log("getIrradianceForPeaks CALLED");

  try {
    const metadata = getPeakIscMetadata();

    if (!metadata || !metadata.h1Record || !metadata.h2Record || !metadata.h3Record) {
      throw new Error("Peak ISC metadata not found. Run calculateYearlyIsc() first.");
    }

    const fetchValue = (sheet, serialNo, year) => {
      if (sheet?.[serialNo] && sheet[serialNo][year] !== undefined) {
        const val = Number(sheet[serialNo][year]);
        return Number.isFinite(val) ? Number(val.toFixed(2)) : 0;
      }
      return 0;
    };

    return {
      success: true,
      h1: {
        ghi: fetchValue(ghiRows, metadata.h1Record.serialNo, metadata.h1Record.year),
        dhi: fetchValue(dhiRows, metadata.h1Record.serialNo, metadata.h1Record.year),
        isc: metadata.h1Record.isc,
        datetime: metadata.h1Record.date,
      },
      h2: {
        ghi: fetchValue(ghiRows, metadata.h2Record.serialNo, metadata.h2Record.year),
        dhi: fetchValue(dhiRows, metadata.h2Record.serialNo, metadata.h2Record.year),
        isc: metadata.h2Record.isc,
        datetime: metadata.h2Record.date,
      },
      h3: {
        ghi: fetchValue(ghiRows, metadata.h3Record.serialNo, metadata.h3Record.year),
        dhi: fetchValue(dhiRows, metadata.h3Record.serialNo, metadata.h3Record.year),
        isc: metadata.h3Record.isc,
        datetime: metadata.h3Record.date,
      },
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      h1: null,
      h2: null,
      h3: null,
      error: error.message || "Failed to extract matching irradiance values.",
    };
  }
}


/**
 * Prepares peak irradiance template values using stored ISC peak metadata.
 * @param {Array} ghiRows - Rows for Global Horizontal Irradiance
 * @param {Array} dhiRows - Rows for Diffuse Horizontal Irradiance
 * @returns {Object} An object containing template fields or failure details.
 */
export function prepareTableData(ghiRows = [], dhiRows = []) {
  const fallbackData = {
    t1_datetime: "N/A", t1_ghi: "N/A", t1_dhi: "N/A", t1_isc: "N/A",
    t2_datetime: "N/A", t2_ghi: "N/A", t2_dhi: "N/A", t2_isc: "N/A",
    t3_datetime: "N/A", t3_ghi: "N/A", t3_dhi: "N/A", t3_isc: "N/A",
  };

  try {
    const metadata = getPeakIscMetadata();
    console.log("prepareTableData metadata:", metadata);

    if (!metadata) {
      return {
        success: false,
        errorMessage: "Peak ISC metadata not available. Run calculateYearlyIsc() first.",
        tableTemplateData: fallbackData,
      };
    }

    const irrResult = getIrradianceForPeaks(ghiRows, dhiRows);

    if (!irrResult.success) {
      return {
        success: false,
        errorMessage: irrResult.error,
        tableTemplateData: fallbackData,
      };
    }

    const tableTemplateData = {
      t1_datetime: metadata.h1Record.date || "N/A",
      t1_ghi: irrResult.h1?.ghi ?? "N/A",
      t1_dhi: irrResult.h1?.dhi ?? "N/A",
      t1_isc: metadata.h1Record.isc ?? "N/A",

      t2_datetime: metadata.h2Record.date || "N/A",
      t2_ghi: irrResult.h2?.ghi ?? "N/A",
      t2_dhi: irrResult.h2?.dhi ?? "N/A",
      t2_isc: metadata.h2Record.isc ?? "N/A",

      t3_datetime: metadata.h3Record.date || "N/A",
      t3_ghi: irrResult.h3?.ghi ?? "N/A",
      t3_dhi: irrResult.h3?.dhi ?? "N/A",
      t3_isc: metadata.h3Record.isc ?? "N/A",
    };

    console.log("prepareTableData tableTemplateData:", tableTemplateData);

    return {
      success: true,
      errorMessage: null,
      tableTemplateData,
    };
  } catch (err) {
    return {
      success: false,
      errorMessage: err.message || "Failed to prepare peak irradiance table data.",
      tableTemplateData: fallbackData,
    };
  }
}
