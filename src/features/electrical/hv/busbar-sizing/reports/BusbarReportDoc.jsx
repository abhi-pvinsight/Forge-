import React from 'react';
import template from "../templates/busbarReportTemplate.html?raw";

import coverPage from "../../../../../shared/reports/coverPage.html?raw";
import documentControlPage from "../../../../../shared/reports/documentControlPage.html?raw";
import listOfTables from "../../../../../shared/reports/listOfTables.html?raw";
import listOfAbbreviations from "../../../../../shared/reports/listOfAbbreviations.html?raw";
import tableOfContents from "../../../../../shared/reports/tableOfContents.html?raw";
import { scanAndNumberReportContent, renderSimpleList, renderSectionIfNotEmpty, renderAbbreviationsTable } from "../../../../../shared/reports/utils/tocScanner";
import { fillTemplate } from "../../../../report-engine/templateEngine";
import { buildReportMeta } from "../../../../../shared/reports/buildReportMeta";
import { runBusbarCalculation } from "../utils/busbarCalculations";
import { generateSkinEffectSvg } from "../utils/skinEffectGraphSvg";

const TODAY = new Date().toLocaleDateString("en-GB");

function fmt(value, decimals = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toFixed(decimals);
}

function fmtExp(value, decimals = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toExponential(decimals).replace('e', ' × 10^').replace('+', '');
}

export default function BusbarReportDoc({ values = {}, files = {}, showStamp = false, isEditMode = false, customHtml = null, onHtmlChange = null }) {
  const htmlToRender = customHtml || values.custom_html;

  if (htmlToRender) {
    return (
      <div
        id="busbar-sizing-report"
        contentEditable={isEditMode}
        suppressContentEditableWarning={true}
        onBlur={onHtmlChange ? (e) => onHtmlChange(e.currentTarget.innerHTML) : undefined}
        dangerouslySetInnerHTML={{ __html: htmlToRender }}
      />
    );
  }

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
    if (!fileObj || !fileObj.file) return null;
    const cacheKey = fileObj.name + '_' + fileObj.size + '_' + fileObj.lastModified;
    if (objectUrlsRef.current[cacheKey]) {
      return objectUrlsRef.current[cacheKey];
    }
    const url = URL.createObjectURL(fileObj.file);
    objectUrlsRef.current[cacheKey] = url;
    return url;
  };

  const coverPhotoUrl = getFileUrl(files?.coverPhoto);

  const reportMeta = buildReportMeta(values, {
    name: "Aluminium Bus Bar Sizing Report (IEEE 605-2023)",
    vertical: "hv",
    id: "busbar-sizing"
  });

  const calc = runBusbarCalculation(values);

  const continuousResultClass = calc.continuousPass ? 'pass' : 'fail';
  const continuousResultLabel = calc.continuousPass
    ? `PASS — ${values.conductorType || 'selected'} conductor is adequate to carry continuous ${values.continuousCurrentRatingA || 2000} A`
    : `FAIL — ${values.conductorType || 'selected'} conductor does NOT meet the continuous ${values.continuousCurrentRatingA || 2000} A requirement; select a larger tube size`;

  const shortCircuitResultClass = calc.shortCircuitPass ? 'pass' : 'fail';
  const shortCircuitResultLabel = calc.shortCircuitPass
    ? `PASS — meets the minimum cross-section area requirement for ${values.shortCircuitRatingKA || 63} kA / ${values.faultDurationSec || 0.25} s`
    : `FAIL — does NOT meet the minimum cross-section area requirement for ${values.shortCircuitRatingKA || 63} kA / ${values.faultDurationSec || 0.25} s; select a larger tube size`;

  const conclusionText = (calc.continuousPass && calc.shortCircuitPass)
    ? `Hence, the ${values.conductorType || 'selected'} Aluminum Tube conductor is adequate for both the continuous current rating (${values.continuousCurrentRatingA || 2000} A required, ${fmt(calc.I)} A calculated) and the short-circuit withstand rating (${values.shortCircuitRatingKA || 63} kA required, ${fmt(calc.IscKA, 1)} kA calculated).`
    : `The ${values.conductorType || 'selected'} Aluminum Tube conductor does NOT meet one or both of the required ratings — review the continuous current and/or short-circuit results above and select a larger conductor.`;

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

  const initialValues = {
    ...values,
    ...reportMeta,
    documentNo: values.documentNo || "PVI-BUS-001",
    REPORT_NAME: values.reportTitle || "Aluminium Bus Bar Sizing & Ampacity Report",

    R: fmtExp(calc.R, 2),
    chartParameterX: fmt(calc.chartParameterX, 3),
    thicknessToDiameterRatio: fmt(calc.thicknessToDiameterRatio, 5),
    F: fmt(calc.F, 2),
    skinEffectSource: calc.skinEffectSource,
    RF: fmtExp(calc.RF, 3),
    qc: fmt(calc.qc, 2),
    qr: fmt(calc.qr, 2),
    theta: fmt(calc.theta, 0),
    qs: fmt(calc.qs, 2),
    I: fmt(calc.I, 2),
    IscA: fmt(calc.IscA, 2),
    IscKA: fmt(calc.IscKA, 1),
    continuousResultClass,
    continuousResultLabel,
    shortCircuitResultClass,
    shortCircuitResultLabel,
    conclusionText,
  };

  const bodyHtml = fillTemplate(template, initialValues);

  const { numberedBodyHtml, headings, tables, figures, abbreviations } = scanAndNumberReportContent(bodyHtml);

  const skinEffectGraphSvg = generateSkinEffectSvg({
    X: calc.chartParameterX || 73.04,
    F: calc.F || 1.05,
    tOverD: calc.thicknessToDiameterRatio || 0.0423,
    conductorType: values.conductorType || '6.0" (Sch 40)',
    RdcMicroOhmFt: calc.R ? calc.R * 1e6 : 3.43,
    frequencyHz: parseFloat(values.systemFrequencyHz) || 60
  });

  const finalValues = {
    ...initialValues,
    COVER_IMAGE: coverPhotoUrl || reportMeta.COVER_IMAGE,
    SKIN_EFFECT_GRAPH_SVG: skinEffectGraphSvg,
    TOC_PLACEHOLDER: renderSimpleList(headings),
    LIST_OF_TABLES_PLACEHOLDER: renderSectionIfNotEmpty("List of Tables", tables, { key: "title" }),
    LIST_OF_FIGURES_PLACEHOLDER: renderSectionIfNotEmpty("List of Figures", figures, { key: "title" }),
    LIST_OF_ABBREVIATIONS_PLACEHOLDER: renderAbbreviationsTable(abbreviations),
    SHOW_STAMP: showStamp ? "flex" : "none",
    SEAL_CONTENT: sealContent,
  };

  const lotHtml = tables.length > 0 || figures.length > 0 ? listOfTables : "";
  const loaHtml = abbreviations.length > 0 ? listOfAbbreviations : "";

  const completeTemplate = `${coverPage} ${documentControlPage} ${tableOfContents} ${lotHtml} ${loaHtml} ${numberedBodyHtml}`;
  const reportHtml = fillTemplate(completeTemplate, finalValues);

  return (
    <div
      id="busbar-sizing-report"
      contentEditable={isEditMode}
      suppressContentEditableWarning={true}
      onBlur={onHtmlChange ? (e) => onHtmlChange(e.currentTarget.innerHTML) : undefined}
      dangerouslySetInnerHTML={{ __html: reportHtml }}
    />
  );
}
