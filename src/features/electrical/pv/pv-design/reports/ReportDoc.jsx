import React from 'react';
import { getReportNodeById } from "../../../../../data/navigation";

import template from "../templates/pvReportTemplate.html?raw";
import { buildVocTable, buildIscTable, buildMinVoltageDegradationTable, buildPvsystTables, calculateNMin, buildSolarVocTemplateValues, buildPvsystLossTemplateValues } from "../forms/utils/buildVoc&IscTable";
import coverPage from "../../../../../shared/reports/coverPage.html?raw";
import documentControlPage from "../../../../../shared/reports/documentControlPage.html?raw";
import listOfTables from "../../../../../shared/reports/listOfTables.html?raw";
import listOfAbbreviations from "../../../../../shared/reports/listOfAbbreviations.html?raw";
import { fillTemplate } from "../../../../report-engine/templateEngine";
import tableOfContents from "../../../../../shared/reports/tableOfContents.html?raw";
import { scanAndNumberReportContent, renderSimpleList, renderSectionIfNotEmpty, renderAbbreviationsTable } from "../../../../../shared/reports/utils/tocScanner";
// Force Vite reload raw import
import ashraeTableTemplate from "../../../../../backend/Ashrae/ASHARE.html?raw";
import { buildReportMeta } from "../../../../../shared/reports/buildReportMeta";



import Logo from "../../../../../shared/components/Logo";

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

function DocH({ n, t }) { return (<h3 style={{ marginTop: 20 }}> {n}. {t} </h3>); }

function CoverStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function DocRow({ k, v }) { return (<tr> <td>{k}</td> <td>{v}</td> </tr>); }

function renderAshraeTableHtml(rawHtml, values) {
  if (!rawHtml) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");

    // 1. Update station header title
    const headerTitle = doc.getElementById("station_header_title");
    if (headerTitle) {
      const city = values.weather_station_city || "PHOENIX SKY HARBOR";
      const state = values.weather_station_state ? `, ${values.weather_station_state}` : "";
      const country = values.weather_station_country ? `, ${values.weather_station_country}` : ", USA";
      const wmo = values.weather_station_id || "722780";

      headerTitle.innerHTML = `<div class="baloon_icon" style="display:inline-block;background-position:0px 0px;position: relative;right: 10;"></div><b>${city}${state}${country} (WMO: ${wmo})</b>`;
    }

    // 2. Loop over all elements with data-key attributes and fill them
    const cells = doc.querySelectorAll("[data-key]");
    cells.forEach((cell) => {
      const key = cell.getAttribute("data-key");
      if (key && values[key] !== undefined && values[key] !== null) {
        cell.innerHTML = `<b>${values[key]}</b>`;
      }
    });

    // DOMParser moves top-level <style> tags into <head>. Preserve them when
    // returning the populated fragment so ASHRAE print sizing is not lost.
    const templateStyles = Array.from(doc.head.querySelectorAll("style"))
      .map((style) => style.outerHTML)
      .join("");

    return `${templateStyles}${doc.body.innerHTML}`;
  } catch (err) {
    console.error("Failed to dynamically populate ASHRAE table:", err);
    return rawHtml;
  }
}

export default function ReportDoc({ values = {}, calc = {}, files = {}, solarCalcValues = null, showStamp = false, isEditMode = false, customHtml = null, onHtmlChange = null }) {
  const htmlToRender = customHtml || values.custom_html;

  if (htmlToRender) {
    return (
      <div
        id="PV_DBR-report"
        contentEditable={isEditMode}
        suppressContentEditableWarning={true}
        onBlur={onHtmlChange ? (e) => onHtmlChange(e.currentTarget.innerHTML) : undefined}
        dangerouslySetInnerHTML={{ __html: htmlToRender }}
      />
    );
  }

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
    Number(values.moduleVmp) * Number(values.modules_series), Number(values.moduleDegradation), 30);

  const degradationRows = [];

  for (let year = 1; year <= 30; year += 1) {
    if (degradationData[`year${year}`] == null) break;

    degradationRows.push(`
    <tr>
      <td style="text-align: center;">${degradationData[`year${year}`]}</td>
      <td style="text-align: center;">${degradationData[`year${year}_min`]}</td>
      <td style="text-align: center;">${degradationData[`year${year}_deg`]}</td>
      <td style="text-align: center;">${degradationData[`year${year}_after`]}</td>
    </tr>
  `);
  }

  const safeSolarCalcValues = solarCalcValues || values.solarCalcValues || values.calc_values || {};

  console.log("solarCalcValues in form in report state state====>>:", solarCalcValues);


  const solarVocTemplateValues = buildSolarVocTemplateValues({
    solarCalcValues: safeSolarCalcValues,
    tempMin: values?.tempMin,
    tempCellMax: values?.tempCellMax,
  });
  const vmpMaxTempVal = calc.VmpHot
    ? Number(calc.VmpHot)
    : (safeSolarCalcValues?.Vmp_Tmax?.[0] || 36.9);
  const nMin = calculateNMin(values.PCS_Min_PV_Input_Voltage || 875, vmpMaxTempVal);
  const { irradiationTable, energyTable } = buildPvsystTables(values.pvsystData || {});
  const pvsystLossTemplateValues = buildPvsystLossTemplateValues(values.pvsystData || {});
  const reportMeta = buildReportMeta(values, { name: values.reportName || values?.report?.name || "Design Basis Report" });

  console.log("ReportDoc degradationData:", degradationData);
  console.log("ReportDoc values.minVoltageDegradationTable:", values.minVoltageDegradationTable);
  console.log("PVsyst Data:", values.pvsystData);

  console.log("values =", values);
  console.log("solarCalcValues Safest Value  =", safeSolarCalcValues);


  const peakTableData = values?.peakTableData || {};


  const voltImg = values["Results_of_26-year_voltage"] || values["Results_of_26-year_Voltage"] || "";
  const currImg = values["Results_of_26-year_current"] || values["Results_of_26-year_Current"] || "";

  const formatImgReplacement = (imgData) => {
    if (!imgData) return 'style="display: none;"';
    const base64 = imgData.startsWith('src="')
      ? imgData.match(/src="([^"]+)"/)?.[1] || imgData
      : imgData;

    return `src="${base64}" style="max-width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 6px; display: block; margin: 15px auto;"`;
  };

  const formatPvFigure = (imgData, captionText) => {
    if (!imgData) return "";
    const base64 = imgData.startsWith('src="')
      ? imgData.match(/src="([^"]+)"/)?.[1] || imgData
      : imgData;
    if (!base64 || base64.trim() === "" || base64 === 'style="display: none;"') return "";
    return `<figure class="fig-wrap"><img src="${base64}" style="max-width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 6px; display: block; margin: 15px auto;" /><div class="fig-caption toc-figure-caption">${captionText}</div></figure>`;
  };

  const voltReplacement = formatImgReplacement(voltImg);
  const currReplacement = formatImgReplacement(currImg);
  const voltBlock = formatPvFigure(voltImg, "Results of 26-years Historical SAM Simulation Voltage");
  const currBlock = formatPvFigure(currImg, "Results of 26-years Historical SAM Simulation Current");

  const sealContent = values.SEAL_IMAGE
    ? `<img src="${values.SEAL_IMAGE}" alt="Professional Engineer Seal" class="seal-img" />`
    : `
        <div class="seal-placeholder">
          <strong>STATE OF TEXAS</strong><br>
          JOSHUA D. MILLS<br>
          No. 129710<br>
          LICENSED PROFESSIONAL ENGINEER<br>
          ${reportMeta.ISSUE_DATE || TODAY}
        </div>
      `;

  const summary = values.yearlyVocSummary || [];
  const allTimeMaxVocVal = values.allTimeMaxVoc
    ? values.allTimeMaxVoc
    : (summary.length > 0
      ? summary.reduce((max, row) => (row.maxVoltage > max ? row.maxVoltage : max), -Infinity)
      : 1441.33);

  const degradationYear30After = degradationData ? degradationData.year30_after : 1031.42;

  const minStringVoltageVmp = (Number(values.moduleVmp || 0) * Number(values.modules_series || 0));
  const minStringVoltageVmpStr = minStringVoltageVmp > 0 ? minStringVoltageVmp.toFixed(2) : "1173.76";

  const pvAreaVal = Number(values.pv_area || 0);
  const dcCapVal = Number(values.dc_capacity || 0);
  const pvAreaPerMwDcStr = dcCapVal > 0 ? (pvAreaVal / dcCapVal).toFixed(2) : "—";

  const albedoMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthlyAlbedoList = albedoMonths
    .map((m) => values[`albedo_${m}`])
    .filter((v) => v !== undefined && v !== null && v !== "" && !isNaN(Number(v)))
    .map(Number);

  let calcAlbedoHigh = "0.30";
  let calcAlbedoLow = "0.15";
  let calcAlbedoAvg = "0.20";

  if (monthlyAlbedoList.length > 0) {
    const maxVal = Math.max(...monthlyAlbedoList);
    const minVal = Math.min(...monthlyAlbedoList);
    const sumVal = monthlyAlbedoList.reduce((acc, curr) => acc + curr, 0);
    const avgVal = sumVal / monthlyAlbedoList.length;

    calcAlbedoHigh = maxVal.toFixed(2);
    calcAlbedoLow = minVal.toFixed(2);
    calcAlbedoAvg = avgVal.toFixed(2);
  } else if (values.albedo_avg != null && values.albedo_avg !== "" && !isNaN(Number(values.albedo_avg))) {
    calcAlbedoAvg = Number(values.albedo_avg).toFixed(2);
  }

  const templateValues = {
    ...values,
    allTimeMaxVoc: typeof allTimeMaxVocVal === 'number' ? allTimeMaxVocVal.toFixed(2) : allTimeMaxVocVal,
    vmpMaxTemp: typeof vmpMaxTempVal === 'number' ? vmpMaxTempVal.toFixed(1) : vmpMaxTempVal,
    degradation_year30_after: degradationYear30After,
    minStringVoltageVmp: minStringVoltageVmpStr,
    pvAreaPerMwDc: pvAreaPerMwDcStr,
    ...reportMeta,
    ...peakTableData, // Spreads t1_datetime, t1_ghi, t2_... etc. directly into your template context
    ...solarVocTemplateValues,
    ...pvsystLossTemplateValues,
    submittedTo: values.clientContact || "Signal Energy",
    submittedToAddress: values.clientAddress || "2034 Hamilton Place BLVD. Suite 100 Chattanooga, TN 37421",
    albedo_avg: values.albedo_avg ?? calcAlbedoAvg,
    albedo_high: values.albedo_high ?? calcAlbedoHigh,
    albedo_low: values.albedo_low ?? calcAlbedoLow,
    perc_high: values.perc_high ?? "0.75",
    perc_avg: values.perc_avg ?? "0.70",
    perc_low: values.perc_low ?? "0.65",
    hjt_high: values.hjt_high ?? "0.95",
    hjt_avg: values.hjt_avg ?? "0.90",
    hjt_low: values.hjt_low ?? "0.85",
    weather_station_city: values.weather_station_city,
    weather_station_state: values.weather_station_state,
    weather_station_country: values.weather_station_country,
    weather_station_id: values.weather_station_id,
    minVoltageDegradationTable: degradationRows.join(""),
    YEARLY_ISC_TABLE: yearlyIscTable,
    ASHRAE_TABLE: renderAshraeTableHtml(ashraeTableTemplate, values),
    // Dynamically resolve report title from navigation data
    REPORT_NAME: (
      (() => {
        const node = getReportNodeById(values?.report?.id || values?.reportId);
        return node?.reportTitle || values.reportName || values?.report?.name || "Design Basis Report – PV Electrical";
      })()
    ),
    YEARLY_VOC_TABLE: buildVocTable(values.yearlyVocSummary || []),
    PVSYST_IRRADIATION_TABLE: irradiationTable,
    PVSYST_ENERGY_TABLE: energyTable,

    N_MIN: nMin.exact,
    N_MIN_ROUNDED: nMin.rounded,
    SHOW_STAMP: showStamp ? "flex" : "none",
    "Results_of_26-year_voltage": voltReplacement,
    "Results_of_26-year_Voltage": voltReplacement,
    "Results_of_26-year_current": currReplacement,
    "Results_of_26-year_Current": currReplacement,
    "Results_of_26-year_voltage_BLOCK": voltBlock,
    "Results_of_26-year_Voltage_BLOCK": voltBlock,
    "Results_of_26-year_current_BLOCK": currBlock,
    "Results_of_26-year_Current_BLOCK": currBlock,
    SEAL_CONTENT: sealContent,
  };

  console.log("ReportDoc values prop:", values);
  console.log("[ReportDoc] Results_of_26-year_voltage length:", (values["Results_of_26-year_voltage"] || "").length);
  console.log("[ReportDoc] Results_of_26-year_current length:", (values["Results_of_26-year_current"] || "").length);
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




  const appendixPages = values.appendixPages || [];
  const hasSolarAppendix = Boolean(
    values.hasSolarAppendix || values.solarAppendixValues || appendixPages.length
  );
  const hasPvsystPdf = Boolean(values.pvsyst_pdf_file || values.pvsyst_pdf);

  // Build List of Annexures (LOA) for Front Matter
  const annexuresList = [];
  if (hasSolarAppendix) {
    annexuresList.push({ title: "Annexure 1: Solar String Sizing Calculations & Specs" });
  }
  if (hasPvsystPdf) {
    annexuresList.push({ title: "Annexure 2: PVsyst Report" });
  }

  let appendixTemplate = "";

  if (hasSolarAppendix) {
    appendixTemplate += `
      <div class="report-page appendix-page" style="page-break-before: always; page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box;">
        <h1 style="font-size: 36pt; color: #163c7a; font-weight: 700; margin-top: 250px;">Annexure 1</h1>
        <p style="font-size: 14pt; color: #64748b; margin-top: 15px;">Solar String Sizing Calculations &amp; Specs</p>
      </div>
      <div class="page appendix-native-preview" data-pdf-export-exclude="true" style="page-break-before: always; min-height: 180px; padding: 40px !important; display: flex; justify-content: center; align-items: center; text-align: center; color: #64748b;">
        Native Annexure 1 pages will be merged into the downloaded PDF.
      </div>
    `;
  }

  if (hasPvsystPdf) {
    appendixTemplate += `
      <div class="report-page appendix-page" style="page-break-before: always; page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box;">
        <h1 style="font-size: 36pt; color: #163c7a; font-weight: 700; margin-top: 250px;">Annexure 2</h1>
        <p style="font-size: 14pt; color: #64748b; margin-top: 15px;">PVsyst Report</p>
      </div>
      <div class="page appendix-native-preview" data-pdf-export-exclude="true" style="page-break-before: always; min-height: 180px; padding: 40px !important; display: flex; justify-content: center; align-items: center; text-align: center; color: #64748b;">
        Uploaded PVsyst Report PDF will be appended as Annexure 2 in the downloaded PDF.
      </div>
    `;
  }

  // 1. Fill the report body template with templateValues to resolve all its placeholders
  const bodyHtml = fillTemplate(template, templateValues);

  // 2. Scan and number the resolved body HTML
  const { numberedBodyHtml, headings, tables, figures, abbreviations } = scanAndNumberReportContent(bodyHtml);

  // 3. Assemble final values including the list placeholders
  const finalValues = {
    ...templateValues,
    TOC_PLACEHOLDER: renderSimpleList(headings),
    LIST_OF_TABLES_PLACEHOLDER: renderSectionIfNotEmpty("List of Tables", tables, { key: "title" }),
    LIST_OF_FIGURES_PLACEHOLDER: renderSectionIfNotEmpty("List of Figures", figures, { key: "title" }),
    LIST_OF_ANNEXURES_PLACEHOLDER: renderSectionIfNotEmpty("List of Annexures", annexuresList, { key: "title" }),
    LIST_OF_ABBREVIATIONS_PLACEHOLDER: renderAbbreviationsTable(abbreviations),
  };

  // 4. Concatenate all template parts and fill placeholders
  const completeTemplate = `${coverPage} ${documentControlPage} ${tableOfContents} ${listOfTables} ${listOfAbbreviations} ${numberedBodyHtml} ${appendixTemplate}`;
  const reportHtml = fillTemplate(completeTemplate, finalValues);





  React.useEffect(() => {
    // Temporary debug logging to trace async prop initialization.
    console.debug("[BessReportDoc] values prop:", values);
    console.debug("[BessReportDoc] files prop:", files);
    console.debug("[BessReportDoc] safeFiles.batteryDs:", safeFiles.batteryDs);
  }, [values, files, safeFiles.batteryDs]);

  return (

    <div
      id="PV_DBR-report"
      contentEditable={isEditMode}
      suppressContentEditableWarning={true}
      onBlur={onHtmlChange ? (e) => onHtmlChange(e.currentTarget.innerHTML) : undefined}
      dangerouslySetInnerHTML={{ __html: reportHtml }}
    />

  );
}

