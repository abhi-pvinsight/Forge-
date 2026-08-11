import React from 'react';
import template from "../templates/bessAmpacityReportTemplate.html?raw";

import coverPage from "../../../../../shared/reports/coverPage.html?raw";
import documentControlPage from "../../../../../shared/reports/documentControlPage.html?raw";
import listOfTables from "../../../../../shared/reports/listOfTables.html?raw";
import listOfAbbreviations from "../../../../../shared/reports/listOfAbbreviations.html?raw";
import tableOfContents from "../../../../../shared/reports/tableOfContents.html?raw";
import { scanAndNumberReportContent, renderSimpleList, renderSectionIfNotEmpty, renderAbbreviationsTable } from "../../../../../shared/reports/utils/tocScanner";
import { fillTemplate } from "../../../../report-engine/templateEngine";
import { buildReportMeta } from "../../../../../shared/reports/buildReportMeta";

export default function BessAmpacityReportDoc({ values = {}, files = {}, isEditMode = false, customHtml = null, onHtmlChange = null }) {
  const htmlToRender = customHtml || values.custom_html;

  if (htmlToRender) {
    return (
      <div 
        id="bess-ampacity-report" 
        contentEditable={isEditMode}
        suppressContentEditableWarning={true}
        onBlur={onHtmlChange ? (e) => onHtmlChange(e.currentTarget.innerHTML) : undefined}
        dangerouslySetInnerHTML={{ __html: htmlToRender }} 
      />
    );
  }

  // Cache for object URLs to prevent memory leaks
  const objectUrlsRef = React.useRef({});

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

  const ampacityFigures = {
    ambientTempChart: formatFigure(files?.ambientTempChart || files?.figAmbientTemp || values?.ambientTempChart || values?.figAmbientTemp, "Ambient Temperature Data"),
    soilTempChart: formatFigure(files?.soilTempChart || files?.figSoilTemp || values?.soilTempChart || values?.figSoilTemp, "Ground Soil Temperature Data"),
    loadProfileChart: formatFigure(files?.loadProfileChart || files?.figLoadProfile || values?.loadProfileChart || values?.figLoadProfile, "Load profile of BESS plant for one day"),
  };

  // 1. Fill the report body template to resolve its placeholders first
  const reportMeta = buildReportMeta(values, { name: values.reportTitle || "Cable Ampacity Calculation Report" });
  const initialValues = {
    ...values,
    ...ampacityFigures,
    ...reportMeta,
    REPORT_NAME: values.reportTitle || "Cable Ampacity Calculation Report",
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
  };

  const completeTemplate = `${coverPage} ${documentControlPage} ${tableOfContents} ${listOfTables} ${listOfAbbreviations} ${numberedBodyHtml}`;
  const reportHtml = fillTemplate(completeTemplate, finalValues);

  return (
    <div 
      id="bess-ampacity-report" 
      contentEditable={isEditMode}
      suppressContentEditableWarning={true}
      onBlur={onHtmlChange ? (e) => onHtmlChange(e.currentTarget.innerHTML) : undefined}
      dangerouslySetInnerHTML={{ __html: reportHtml }} 
    />
  );
}
