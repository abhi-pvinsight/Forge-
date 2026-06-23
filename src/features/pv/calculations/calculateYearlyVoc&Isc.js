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

// export function calculateYearlyIsc(rows) {

//   console.log("calculateYearlyIsc CALLED");

//   try {
//     if (!rows || !Array.isArray(rows) || rows.length === 0) {
//       throw new Error("CSV file contains no data.");
//     }

//     const years = Object.keys(rows[0]);

//     if (!years.length) {
//       throw new Error("No year columns found in CSV.");
//     }

//     let allTimeMaxIsc = -Infinity;

//     const summary = years.map((year) => {
//       const values = rows
//         .map((row) => Number(row[year]))
//         .filter((value) => !isNaN(value));

//       if (!values.length) {
//         throw new Error(`No valid current values found for year ${year}.`);
//       }

//       const hr11Values = [];
//       const hr12Values = [];
//       const hr13Values = [];

//       for (let day = 0; day < Math.floor(values.length / 24); day++) {
//         const base = day * 24;
//         hr11Values.push(values[base + 10]);
//         hr12Values.push(values[base + 11]);
//         hr13Values.push(values[base + 12]);
//       }

//       // Safe alternative to Math.max for large arrays
//       const h1 = Number(hr11Values.reduce((max, val) => val > max ? val : max, -Infinity).toFixed(2));
//       const h2 = Number(hr12Values.reduce((max, val) => val > max ? val : max, -Infinity).toFixed(2));
//       const h3 = Number(hr13Values.reduce((max, val) => val > max ? val : max, -Infinity).toFixed(2));

//       // Tracks the absolute max current found anywhere in h1, h2, or h3 across all 25 years
//       const yearlyMax = Math.max(h1, h2, h3);
//       if (yearlyMax > allTimeMaxIsc) {
//         allTimeMaxIsc = yearlyMax;
//       }

//       return { 
//         year, 
//         h1, 
//         h2, 
//         h3, 
//         avg: Number(((h1 + h2 + h3) / 3).toFixed(2)), 
//       }; 
//     });

//     return { 
//       success: true, 
//       data: summary, 
//       allTimeMaxIsc: Number(allTimeMaxIsc.toFixed(2)), // Added this line
//       error: null, 
//     };
//   } catch (error) {
//     return { 
//       success: false, 
//       data: [], 
//       allTimeMaxIsc: null,
//       error: error?.message || "An unexpected error occurred while processing the CSV file.", 
//     };
//   }
// }
 // minmum no of can be used in the given inverter  


 export function calculateNMin(
  pcsMinPvInputVoltage,
  vmpMaxTemp
) {
  const raw = pcsMinPvInputVoltage / vmpMaxTemp;

  return {
    exact: raw.toFixed(2),
    rounded: Math.round(raw),
  };
}

// Helper function to turn serial index number (0 to 8759) and year into MM/DD/YYYY HH:MM string
// function getTimestampFromSerial(serialNo, year) {
//   const dayOfYear = Math.floor(serialNo / 24);
//   const hour = serialNo % 24;
  
//   const date = new Date(year, 0, 1); // Starts at Jan 1st
//   date.setDate(date.getDate() + dayOfYear);
  
//   const mm = String(date.getMonth() + 1).padStart(2, '0');
//   const dd = String(date.getDate()).padStart(2, '0');
//   const hh = String(hour).padStart(2, '0');
  
//   return `${mm}/${dd}/${year} ${hh}:00`;
// }

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

    // Track 25-year global peak records along with their serial number positions and year
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

      // Track both values and their original file indices (serial number)
      const hr11Data = [];
      const hr12Data = [];
      const hr13Data = [];

      for (let day = 0; day < Math.floor(values.length / 24); day++) {
        const base = day * 24;
        hr11Data.push({ val: values[base + 10], idx: base + 10 });
        hr12Data.push({ val: values[base + 11], idx: base + 11 });
        hr13Data.push({ val: values[base + 12], idx: base + 12 });
      }

      // Find highest records for this specific year along with the source index
      const h1Record = hr11Data.reduce((max, item) => item.val > max.val ? item : max, { val: -Infinity, idx: 0 });
      const h2Record = hr12Data.reduce((max, item) => item.val > max.val ? item : max, { val: -Infinity, idx: 0 });
      const h3Record = hr13Data.reduce((max, item) => item.val > max.val ? item : max, { val: -Infinity, idx: 0 });

      const h1 = Number(h1Record.val.toFixed(2));
      const h2 = Number(h2Record.val.toFixed(2));
      const h3 = Number(h3Record.val.toFixed(2));

      // Update 25-year maximum records across the hourly groups
      if (h1 > globalMaxH1.isc) {
        globalMaxH1 = {
          isc: h1,
          serialNo: h1Record.idx,
          year: year,
          date: getTimestampFromSerial(h1Record.idx, year)
        };
      }

      if (h2 > globalMaxH2.isc) {
        globalMaxH2 = {
          isc: h2,
          serialNo: h2Record.idx,
          year: year,
          date: getTimestampFromSerial(h2Record.idx, year)
        };
      }

      if (h3 > globalMaxH3.isc) {
        globalMaxH3 = {
          isc: h3,
          serialNo: h3Record.idx,
          year: year,
          date: getTimestampFromSerial(h3Record.idx, year)
        };
      }

      // Tracks the absolute max current found anywhere in h1, h2, or h3 across all 25 years
      const yearlyMax = Math.max(h1, h2, h3);
      if (yearlyMax > allTimeMaxIsc) {
        allTimeMaxIsc = yearlyMax;
      }

      return { 
        year, 
        h1, 
        h2, 
        h3, 
        avg: Number(((h1 + h2 + h3) / 3).toFixed(2)), 
      }; 
    });

    // Explicit date tracking variables extracted from our top records
    const date1 = globalMaxH1.date;
    const date2 = globalMaxH2.date;
    const date3 = globalMaxH3.date;

    return { 
      success: true, 
      data: summary, 
      allTimeMaxIsc: Number(allTimeMaxIsc.toFixed(2)),
      
      // Explicit date text variables
      date1, 
      date2, 
      date3, 

      // Raw tracking metadata so your separate GHI/DHI calculations can match row coordinates
      metadata: {
        h1Record: { serialNo: globalMaxH1.serialNo, year: globalMaxH1.year, isc: globalMaxH1.isc },
        h2Record: { serialNo: globalMaxH2.serialNo, year: globalMaxH2.year, isc: globalMaxH2.isc },
        h3Record: { serialNo: globalMaxH3.serialNo, year: globalMaxH3.year, isc: globalMaxH3.isc }
      },
      error: null, 
    };
  } catch (error) {
    return { 
      success: false, 
      data: [], 
      allTimeMaxIsc: null,
      date1: "", date2: "", date3: "",
      metadata: null,
      error: error?.message || "An unexpected error occurred while processing the CSV file.", 
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
  
  return `${mm}/${dd}/${year} ${hh}:00`;
}


export function getIrradianceForPeaks(metadata, ghiRows = [], dhiRows = []) {
  console.log("getIrradianceForPeaks CALLED");

  try {
    if (!metadata || !metadata.h1Record || !metadata.h2Record || !metadata.h3Record) {
      throw new Error("Invalid or missing Isc peak metadata coordinates.");
    }

    // Helper to safely fetch values out of the specific year and serial index row position
    const fetchValue = (sheet, serialNo, year) => {
      if (sheet && sheet[serialNo] && sheet[serialNo][year] !== undefined) {
        const val = Number(sheet[serialNo][year]);
        return !isNaN(val) ? Number(val.toFixed(2)) : 0;
      }
      return 0;
    };

    // Extract records using coordinates computed during the Isc tracking step
    const resultH1 = {
      ghi: fetchValue(ghiRows, metadata.h1Record.serialNo, metadata.h1Record.year),
      dhi: fetchValue(dhiRows, metadata.h1Record.serialNo, metadata.h1Record.year)
    };

    const resultH2 = {
      ghi: fetchValue(ghiRows, metadata.h2Record.serialNo, metadata.h2Record.year),
      dhi: fetchValue(dhiRows, metadata.h2Record.serialNo, metadata.h2Record.year)
    };

    const resultH3 = {
      ghi: fetchValue(ghiRows, metadata.h3Record.serialNo, metadata.h3Record.year),
      dhi: fetchValue(dhiRows, metadata.h3Record.serialNo, metadata.h3Record.year)
    };

    return { success: true, h1: resultH1, h2: resultH2, h3: resultH3, error: null };

  } catch (error) {
    return { success: false, h1: { ghi: 0, dhi: 0 }, h2: { ghi: 0, dhi: 0 }, h3: { ghi: 0, dhi: 0 },
      error: error.message || "Failed to extract matching irradiance values."
    };
  }
}
