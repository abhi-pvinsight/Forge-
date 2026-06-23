import React from 'react';

// export default function ReportDoc() {
//   return <div>Report Document</div>;
// }

import template from "../templates/bessReportTemplate.html?raw";

import { fillTemplate } from "../../report-engine/templateEngine";

import ashraeTableTemplate from "../../../backend/Ashrae/ASHARE.html?raw";
// import reportTemplate from "../templates/bessReportTemplate.html?raw";
console.log(ashraeTableTemplate);

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

function DocH({ n, t }) {
  return (
    <h3 style={{ marginTop: 20 }}>
      {n}. {t}
    </h3>
  );
}

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

export default function BessReportDoc({ values = {}, files = {} }) {
  const safeValues = values;
  const safeFiles = files;

  
const finalValues = {
  ...values,
  ASHRAE_TABLE: ashraeTableTemplate, // ✅ injected here
};


 const reportHtml = fillTemplate(template, finalValues);




  React.useEffect(() => {
    // Temporary debug logging to trace async prop initialization.
    console.debug("[BessReportDoc] values prop:", values);
    console.debug("[BessReportDoc] files prop:", files);
    console.debug("[BessReportDoc] safeFiles.batteryDs:", safeFiles.batteryDs);
  }, [values, files, safeFiles.batteryDs]);

  return (
   
        <div   id="bess-report" dangerouslySetInnerHTML={{__html: reportHtml}}/>

  );
}
