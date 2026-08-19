import React from 'react';

// export default function ReportDoc() {
//   return <div>Report Document</div>;
// }

import template from "../templates/bessReportTemplate.html?raw";

import coverPage from "../../../../../shared/reports/coverPage.html?raw";
import documentControlPage from "../../../../../shared/reports/documentControlPage.html?raw";
import listOfTables from "../../../../../shared/reports/listOfTables.html?raw";
import listOfAbbreviations from "../../../../../shared/reports/listOfAbbreviations.html?raw";
import tableOfContents from "../../../../../shared/reports/tableOfContents.html?raw";
import { scanAndNumberReportContent, renderSimpleList, renderSectionIfNotEmpty, renderAbbreviationsTable } from "../../../../../shared/reports/utils/tocScanner";
// <-- NEW: bring in the navigation helper
import { getReportNodeById } from "../../../../../data/navigation";

import { fillTemplate } from "../../../../report-engine/templateEngine";

// Force Vite reload raw import
import ashraeTableTemplate from "../../../../../backend/Ashrae/ASHARE.html?raw";
// import reportTemplate from "../templates/bessReportTemplate.html?raw";
console.log(ashraeTableTemplate);

import Logo from "../../../../../shared/components/Logo";
import { buildReportMeta } from "../../../../../shared/reports/buildReportMeta";

const TODAY = new Date().toLocaleDateString("en-GB");

function V(value, fallback = "—") {
  return value === undefined || value === null || value === ""
    ? fallback
    : value;
}

function docNumber(values) {
  return '807004A-DE3-04000';
}

function DocPage({ children }) {
  return (
    <div
      style={{
        width: "100%",
        minHeight: 900,
        background: "#fff",
        padding: 40,
        boxShadow: "0 2px 8px rgba(0,0,0,.08)",
      }}
    >
      {children}
    </div>
  );
}

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

function DocH({ n, t }) {
  return (
    <h3 style={{ marginTop: 20 }}>
      {n}. {t}
    </h3>
  );
}

CoverStat.displayName = 'CoverStat';
function CoverStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function DocRow({ k, v }) {
  return (
    <tr>
      <td>{k}</td>
      <td>{v}</td>
    </tr>
  );
}

export default function BessReportDoc({ values = {}, files = {}, showStamp = false, isEditMode = false, customHtml = null, onHtmlChange = null }) {
  const htmlToRender = customHtml || values.custom_html;

  if (htmlToRender) {
    return (
      <div 
        id="bess-report" 
        contentEditable={isEditMode}
        suppressContentEditableWarning={true}
        onBlur={onHtmlChange ? (e) => onHtmlChange(e.currentTarget.innerHTML) : undefined}
        dangerouslySetInnerHTML={{ __html: htmlToRender }} 
      />
    );
  }

  const safeValues = values;
  const safeFiles = files;

  // Cache for object URLs to prevent memory leaks from creating them on every render
  const objectUrlsRef = React.useRef({});

  // Clean up object URLs on unmount
  React.useEffect(() => {
    const currentUrls = objectUrlsRef.current;
    return () => {
      Object.values(currentUrls).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const getFileUrl = (fileObj) => {
    if (!fileObj) return null;
    if (typeof fileObj === 'string' && fileObj.trim() !== '') return fileObj;
    if (fileObj.file) {
      const cacheKey = fileObj.name + '_' + fileObj.size + '_' + fileObj.lastModified;
      if (objectUrlsRef.current[cacheKey]) {
        return objectUrlsRef.current[cacheKey];
      }
      const url = URL.createObjectURL(fileObj.file);
      objectUrlsRef.current[cacheKey] = url;
      return url;
    }
    return null;
  };

  const formatFigure = (fileObj, captionText, altText = "") => {
    const url = getFileUrl(fileObj);
    if (!url) return "";
    const imgHtml = url.startsWith("<img")
      ? url
      : `<img src="${url}" alt="${altText || captionText}" />`;
    return `<figure class="fig-wrap">${imgHtml}<div class="fig-caption toc-figure-caption">${captionText}</div></figure>`;
  };

  const sldSrc = files?.singleLineDiagram || values?.singleLineDiagram;
  const loadProfileSrc = files?.loadProfileChart || values?.loadProfileChart;
  const sitePhotoSrc = files?.sitePhoto || values?.sitePhoto;
  const siteMapSrc = files?.siteMap || values?.siteMap;

  // Combine aux cable parts (Core No, Size, Material) into single fields for the report template
  const compiledAuxCables = {};
  for (let i = 1; i <= 9; i++) {
    const core = values[`auxCable${i}CoreNo`]?.trim();
    const size = values[`auxCable${i}Size`]?.trim();
    const mat = values[`auxCable${i}Material`]?.trim();
    if (core || size || mat) {
      compiledAuxCables[`auxCable${i}`] = [core, size, mat].filter(Boolean).join(", ");
    }
  }

  const reportMeta = buildReportMeta({
    ...values,
    reportTitle: "Design Basis Report - Bess Electrical",
    documentNumber: "807004A-DE3-04000",
  });

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

  // 1. Fill the BESS report body template to resolve its placeholders first
  const initialValues = {
    ...values,
    ...compiledAuxCables,
    ...reportMeta,
    reportTitle: "Design Basis Report - Bess Electrical",
    documentNo: "807004A-DE3-04000",
    preparedDate: new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }),
    groundingSoftware: "WinIGS",
    groundConductorBess: "500 KCMIL Cu",
    groundConductorPcs: "600 KCMIL Cu",
    groundConductorAux: "#4/0 AWG Cu",
    groundConductorMisc: "#6 AWG Cu",
    ASHRAE_TABLE: renderAshraeTableHtml(ashraeTableTemplate, values),
    REPORT_NAME: " Design Basis Report - Bess Electrical",
    singleLineDiagram: formatFigure(sldSrc, "Single Line Diagram"),
    loadProfileChart: formatFigure(loadProfileSrc, "Load profile of BESS plant for one day"),
    sitePhoto: formatFigure(sitePhotoSrc, "Site Layout / Aerial View"),
    siteMap: formatFigure(siteMapSrc, "Site Location Map"),
  };
  const bodyHtml = fillTemplate(template, initialValues);

  // 2. Scan and number the resolved body HTML
  const { numberedBodyHtml, headings, tables, figures, abbreviations } = scanAndNumberReportContent(bodyHtml);

  // 3. Assemble final values with list placeholders
  const finalValues = {
    ...initialValues,
    TOC_PLACEHOLDER: renderSimpleList(headings),
    LIST_OF_TABLES_PLACEHOLDER: renderSectionIfNotEmpty("List of Tables", tables, { key: "title" }),
    LIST_OF_FIGURES_PLACEHOLDER: renderSectionIfNotEmpty("List of Figures", figures, { key: "title" }),
    LIST_OF_ABBREVIATIONS_PLACEHOLDER: renderAbbreviationsTable(abbreviations),
    SHOW_STAMP: showStamp ? "flex" : "none",
    SEAL_CONTENT: sealContent,
  };

  const appendixPages = values.appendixPages || [];
  let appendixTemplate = "";

  if (appendixPages.length > 0) {
    appendixTemplate = `
      <div class="report-page appendix-page" style="page-break-before: always; page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box;">
        <h1 style="font-size: 36pt; color: #163c7a; font-weight: 700; margin-top: 250px;">Annexures</h1>
        <p style="font-size: 14pt; color: #64748b; margin-top: 15px;">Solar String Sizing Calculations &amp; Specs</p>
      </div>
      
      ${appendixPages.map((imgData, index) => `
        <div class="page" style="page-break-before: always; padding: 0 !important; display: flex; justify-content: center; align-items: center;">
          <img src="${imgData}" style="width: 100%; height: 100%; object-fit: contain; display: block;" alt="Appendix Page ${index + 1}" />
        </div>
      `).join('')}
    `;
  }

  // 4. Concatenate and fill final template
  const lotHtml = tables.length > 0 || figures.length > 0 ? listOfTables : "";
  const loaHtml = abbreviations.length > 0 ? listOfAbbreviations : "";

  const completeTemplate = `${coverPage} ${documentControlPage} ${tableOfContents} ${lotHtml} ${loaHtml} ${numberedBodyHtml} ${appendixTemplate}`;
  const reportHtml = fillTemplate(completeTemplate, finalValues);




  React.useEffect(() => {
    // Temporary debug logging to trace async prop initialization.
    console.debug("[BessReportDoc] values prop:", values);
    console.debug("[BessReportDoc] files prop:", files);
    console.debug("[BessReportDoc] safeFiles.batteryDs:", safeFiles.batteryDs);
  }, [values, files, safeFiles.batteryDs]);

  return (

    <div 
      id="bess-report" 
      contentEditable={isEditMode}
      suppressContentEditableWarning={true}
      onBlur={onHtmlChange ? (e) => onHtmlChange(e.currentTarget.innerHTML) : undefined}
      dangerouslySetInnerHTML={{ __html: reportHtml }} 
    />

  );
}
