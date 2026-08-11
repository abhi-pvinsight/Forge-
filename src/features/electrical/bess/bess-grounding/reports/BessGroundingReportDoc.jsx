import React from 'react';
import template from "../templates/bessGroundingReportTemplate.html?raw";

import coverPage from "../../../../../shared/reports/coverPage.html?raw";
import documentControlPage from "../../../../../shared/reports/documentControlPage.html?raw";
import listOfTables from "../../../../../shared/reports/listOfTables.html?raw";
import listOfAbbreviations from "../../../../../shared/reports/listOfAbbreviations.html?raw";
import tableOfContents from "../../../../../shared/reports/tableOfContents.html?raw";
import { scanAndNumberReportContent, renderSimpleList, renderSectionIfNotEmpty, renderAbbreviationsTable } from "../../../../../shared/reports/utils/tocScanner";
import { fillTemplate } from "../../../../report-engine/templateEngine";
import { buildReportMeta } from "../../../../../shared/reports/buildReportMeta";

export default function BessGroundingReportDoc({ values = {}, files = {}, isEditMode = false, customHtml = null, onHtmlChange = null }) {
  const htmlToRender = customHtml || values.custom_html;

  if (htmlToRender) {
    return (
      <div 
        id="bess-grounding-report" 
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

  const groundingFigures = {
    figInverterSource: formatFigure(files?.figInverterSource || values?.figInverterSource, "Inverter Equivalent Source with 6 PCS in a Circuit"),
    figMvTransformer: formatFigure(files?.figMvTransformer || values?.figMvTransformer, "MV Transformer (MVT)"),
    figMainPowerTransformer: formatFigure(files?.figMainPowerTransformer || values?.figMainPowerTransformer, "Main Power Transformer (MPT)"),
    figGenTieOhtl: formatFigure(files?.figGenTieOhtl || values?.figGenTieOhtl, "138kV Gen-Tie Overhead Transmission Line"),
    figPoiSource: formatFigure(files?.figPoiSource || values?.figPoiSource, "Point of Interconnection (POI) Equivalent Source"),
    figGroundingLayout: formatFigure(files?.figGroundingLayout || values?.figGroundingLayout, "Grounding Layout"),
    figNetworkModel: formatFigure(files?.figNetworkModel || values?.figNetworkModel, "Electrical System Network Model"),
    figMvtSkidModel: formatFigure(files?.figMvtSkidModel || values?.figMvtSkidModel, "Typical MVT Skid Network Model"),
    figGeometricGroundModel: formatFigure(files?.figGeometricGroundModel || values?.figGeometricGroundModel, "Geometric Ground Model"),
    figSoilModelFit: formatFigure(files?.figSoilModelFit || values?.figSoilModelFit, "Soil Model and Soil Parameters"),
    figSoilModelParams: formatFigure(files?.figSoilModelParams || values?.figSoilModelParams, "Soil Model and Soil Parameters"),
    figGpr: formatFigure(files?.figGpr || values?.figGpr, "Ground Potential Rise (GPR)"),
    figSafetyCriteria: formatFigure(files?.figSafetyCriteria || values?.figSafetyCriteria, "Safety Criteria"),
    figTouchVoltage2D: formatFigure(files?.figTouchVoltage2D || values?.figTouchVoltage2D, "Touch Voltage Contours – 2D Plot"),
    figTouchVoltage3D: formatFigure(files?.figTouchVoltage3D || values?.figTouchVoltage3D, "Touch Voltage Contours – 3D Plot"),
    figStepVoltage2D: formatFigure(files?.figStepVoltage2D || values?.figStepVoltage2D, "Step Voltage Contours – 2D Plot"),
    figStepVoltage3D: formatFigure(files?.figStepVoltage3D || values?.figStepVoltage3D, "Step Voltage Contours – 3D Plot"),
  };

  const reportMeta = buildReportMeta(values, { name: values.reportTitle || "Grounding Design Basis Report" });
  const initialValues = {
    ...values,
    ...groundingFigures,
    ...reportMeta,
    REPORT_NAME: values.reportTitle || "Grounding Design Basis Report",
  };
  const bodyHtml = fillTemplate(template, initialValues);

  const { numberedBodyHtml, headings, tables, figures, abbreviations } = scanAndNumberReportContent(bodyHtml);

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
      id="bess-grounding-report" 
      contentEditable={isEditMode}
      suppressContentEditableWarning={true}
      onBlur={onHtmlChange ? (e) => onHtmlChange(e.currentTarget.innerHTML) : undefined}
      dangerouslySetInnerHTML={{ __html: reportHtml }} 
    />
  );
}
