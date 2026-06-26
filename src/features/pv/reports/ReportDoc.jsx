import React from 'react';

import template from "../templates/pvReportTemplate.html?raw";
import { buildVocTable, buildIscTable, buildMinVoltageDegradationTable, buildPvsystTables, calculateNMin, buildSolarVocTemplateValues } from "../forms/utils/buildVoc&IscTable";
import coverPage from "../../../shared/reports/coverPage.html?raw";
import documentControlPage from "../../../shared/reports/documentControlPage.html?raw";
import listOfTables from "../../../shared/reports/listOfTables.html?raw";
import { fillTemplate } from "../../report-engine/templateEngine";
import tableOfContents from "../../../shared/reports/tableOfContents.html?raw";
//C:\Users\AbhayPratapSingh\work\June\260605\HV DBR\Forge\forge-react\src\backend\Ashrae
import ashraeTableTemplate from "../../../backend/Ashrae/ASHARE.html?raw";
import { buildReportMeta } from "../../../shared/reports/buildReportMeta";
console.log(ashraeTableTemplate);
import { prepareTableData } from '../calculations/calculateYearlyVoc&Isc';



import Logo from "../../../shared/components/Logo";

const TODAY = new Date().toLocaleDateString("en-GB");

function V(value, fallback = "—") {
  return value === undefined || value === null || value === ""
    ? fallback
    : value;
}

function docNumber(values) {
  return `${values?.projectCode || "SH2"}-STR-${values?.revision || "R0"}`;
}

function DocPage({ children }) {
  return (
    <div
      style={{ width: "100%", minHeight: 900, background: "#fff", padding: 40, boxShadow: "0 2px 8px rgba(0,0,0,.08)", }}
    >
      {children}
    </div>
  );
}

function DocH({ n, t }) { return ( <h3 style={{ marginTop: 20 }}> {n}. {t} </h3> ); }

function CoverStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function DocRow({ k, v }) { return ( <tr> <td>{k}</td> <td>{v}</td> </tr> ); }

export default function ReportDoc( { values = {}, files = {}, solarCalcValues = null })
 {
  const safeValues = values;
  const safeFiles = files;

  
let yearlyIscTable = "";
try {
  yearlyIscTable = buildIscTable(values.yearlyIscSummary || []);
} catch (error) {
  console.error("buildIscTable failed:", error, values.yearlyIscSummary);
  yearlyIscTable = "";
}

const degradationData = buildMinVoltageDegradationTable(
   Number(values.moduleVmp) *Number(values.modules_series), Number(values.moduleDegradation), 30);

const degradationRows = [];

for (let year = 1; year <= 30; year += 1) {
  if (degradationData[`year${year}`] == null) break;

  degradationRows.push(`
    <tr>
      <td>${degradationData[`year${year}`]}</td>
      <td>${degradationData[`year${year}_min`]}</td>
      <td>${degradationData[`year${year}_deg`]}</td>
      <td>${degradationData[`year${year}_after`]}</td>
    </tr>
  `);
}

const safeSolarCalcValues = solarCalcValues || values.solarCalcValues || values.calc_values || {};

console.log("solarCalcValues in form in report state state====>>:",solarCalcValues);


const solarVocTemplateValues = buildSolarVocTemplateValues({
  solarCalcValues: safeSolarCalcValues,
  tempMin: values?.tempMin,
  tempCellMax: values?.tempCellMax,
});
const nMin = calculateNMin( values.PCS_Min_PV_Input_Voltage, values.vmpMaxTemp );
const {irradiationTable,energyTable} = buildPvsystTables(values.pvsystData || {});
const reportMeta = buildReportMeta( values, { name: "PV Electrical Design Basis Report" } );

console.log("ReportDoc degradationData:", degradationData);
console.log("ReportDoc values.minVoltageDegradationTable:", values.minVoltageDegradationTable);
console.log("PVsyst Data:",values.pvsystData);

console.log("values =", values);
console.log("solarCalcValues Safest Value  =", safeSolarCalcValues);


const peakTableData = values?.peakTableData || {};

const templateValues = {
  ...values,
  ...reportMeta,
  ...peakTableData, // Spreads t1_datetime, t1_ghi, t2_... etc. directly into your template context
  ...solarVocTemplateValues,
  weather_station_city: values.weather_station_city,
  weather_station_state: values.weather_station_state,
  weather_station_country: values.weather_station_country,
  weather_station_id: values.weather_station_id,
  minVoltageDegradationTable: degradationRows.join(""),
  YEARLY_ISC_TABLE: yearlyIscTable,
  ASHRAE_TABLE: ashraeTableTemplate,
  YEARLY_VOC_TABLE: buildVocTable(values.yearlyVocSummary || []),
  PVSYST_IRRADIATION_TABLE:irradiationTable,
  PVSYST_ENERGY_TABLE:energyTable,

  N_MIN: nMin.exact,
  N_MIN_ROUNDED: nMin.rounded,
  
};

console.log("ReportDoc values prop:", values);
console.log("ReportDoc templateValues:", templateValues);

  console.log(
  "ReportDoc template value keys:",
  Object.keys(templateValues).filter((k) => [
    // Existing variants
    "module_model",
    "wp_1", "wp_2", "wp_3", "wp_4", "wp_5", "wp_6",
    "pstc_1", "pstc_2", "pstc_3", "pstc_4", "pstc_5", "pstc_6",
    "voc_1", "voc_2", "voc_3", "voc_4", "voc_5", "voc_6",
    "vmp_1", "vmp_2", "vmp_3", "vmp_4", "vmp_5", "vmp_6",
    "isc_1", "isc_2", "isc_3", "isc_4", "isc_5", "isc_6",
    "imp_1", "imp_2", "imp_3", "imp_4", "imp_5", "imp_6",
    "eff_1", "eff_2", "eff_3", "eff_4", "eff_5", "eff_6",
    
    // New Technical & Mechanical variables
    "temp_coeff_isc", "temp_coeff_voc", "temp_coeff_pm", "noct", "fuse_rating", "module_length", "module_width", "module_height", 
    "cell_count", "cell_type", "front_glass", "back_glass", "output_cable", "connector",
    "junction_box", "wind_load", "snow_load", "deg_year1", "deg_year30", "deg_yearly",
    "warranty_product",
    "warranty_performance"
  ].includes(k))
);

// const degradationValues =
//   buildMinVoltageDegradationTable(
//     Number(values.moduleVmp) *
//       Number(values.numberOfModules),
//     Number(values.moduleDegradation),
//     30
//   );${coverPage} ${documentControlPage} ${tableOfContents} ${listOfTables}


const completeTemplate = `${coverPage} ${documentControlPage} ${tableOfContents} ${listOfTables} ${template} `;
const reportHtml = fillTemplate(completeTemplate, templateValues);





  React.useEffect(() => {
    // Temporary debug logging to trace async prop initialization.
    console.debug("[BessReportDoc] values prop:", values);
    console.debug("[BessReportDoc] files prop:", files);
    console.debug("[BessReportDoc] safeFiles.batteryDs:", safeFiles.batteryDs);
  }, [values, files, safeFiles.batteryDs]);

  return (
   
        <div   id="PV_DBR-report" dangerouslySetInnerHTML={{__html: reportHtml}}/>

  );
}
  
