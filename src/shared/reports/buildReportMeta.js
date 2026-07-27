import coverImage from "../../assets/report-cover.jpg";
import bessCoverImage from "../../assets/bess-cover.jpg";
import hvCoverImage from "../../assets/HV - Cover.jpg";
import pvLogo from "../../assets/PV insight Logo.png";
import defaultClientLogo from "../../assets/signal Energy.png";

function formatIssueDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB").format(date).replaceAll("/", ".");
}

function renderRevisionHistoryRows(values, reportName, issueDate, revision) {
  const rows = [];
  const tdStyle = `padding: 10px; border: 1px solid #cbd5e1; color: #475569; line-height: 1.4; text-align: center; font-size: 9pt; word-break: break-word; overflow-wrap: break-word;`;

  const defaultDocNo = values.documentNumber || values.documentNo || (values.projectCode ? `${values.projectCode}-STR-${revision || values.revision || "R0"}` : "—");

  // 1. Check if values has a structured list of revisions (array of objects)
  if (Array.isArray(values.revisions) && values.revisions.length > 0) {
    values.revisions.forEach((rev) => {
      rows.push(`
        <tr class="tr">
          <td class="td" style="${tdStyle}">${rev.revision ?? ""}</td>
          <td class="td" style="${tdStyle}">${rev.issueDate ?? ""}</td>
          <td class="td" style="${tdStyle}">${rev.documentNumber ?? rev.documentNo ?? rev.docNo ?? defaultDocNo}</td>
          <td class="td" style="${tdStyle}">${rev.documentName ?? reportName}</td>
          <td class="td" style="${tdStyle}">${rev.description ?? ""}</td>
        </tr>
      `);
    });
  }
  // 2. Check if we have the legacy/rigid HV-DBR fields
  else if (
    values.rev0Number || values.rev0Date || values.rev0Description ||
    values.rev1Number || values.rev1Date || values.rev1Description ||
    values.rev2Number || values.rev2Date || values.rev2Description
  ) {
    const legacyRevs = [
      { num: values.rev0Number, date: values.rev0Date, desc: values.rev0Description },
      { num: values.rev1Number, date: values.rev1Date, desc: values.rev1Description },
      { num: values.rev2Number, date: values.rev2Date, desc: values.rev2Description }
    ];
    legacyRevs.forEach((rev, idx) => {
      if (rev.num || rev.date || rev.desc) {
        rows.push(`
          <tr class="tr">
            <td class="td" style="${tdStyle}">${rev.num ?? idx}</td>
            <td class="td" style="${tdStyle}">${rev.date ?? issueDate}</td>
            <td class="td" style="${tdStyle}">${defaultDocNo}</td>
            <td class="td" style="${tdStyle}">${reportName}</td>
            <td class="td" style="${tdStyle}">${rev.desc ?? ""}</td>
          </tr>
        `);
      }
    });
  }

  // 3. Fallback: current revision details as a single row
  if (rows.length === 0) {
    rows.push(`
      <tr class="tr">
        <td class="td" style="${tdStyle}">${revision ?? "0"}</td>
        <td class="td" style="${tdStyle}">${issueDate}</td>
        <td class="td" style="${tdStyle}">${defaultDocNo}</td>
        <td class="td" style="${tdStyle}">${reportName}</td>
        <td class="td" style="${tdStyle}">Initial Release</td>
      </tr>
    `);
  }

  return rows.join("");
}

export function buildReportMeta(values = {}, report = {}) {
  let rawReportTitle =
    values.reportTitle ||
    values.reportName ||
    report?.name ||
    "Design Basis Report – PV Electrical";

  if (rawReportTitle === "Design Basis Report" || rawReportTitle === "PV Design Basis Report") {
    rawReportTitle = "Design Basis Report – PV Electrical";
  }

  const projectCode = values.projectCode ? `${values.projectCode}`.trim() : "";
  let reportTitle = rawReportTitle;
  if (projectCode && !rawReportTitle.toLowerCase().includes(projectCode.toLowerCase())) {
    reportTitle = `${projectCode} ${rawReportTitle}`;
  }

  const acCapVal = (values.ac_capacity !== undefined && values.ac_capacity !== null && values.ac_capacity !== "")
    ? `${values.ac_capacity}`.trim().replace(/\s*MW(ac)?$/i, "")
    : "";

  const acCapStr = acCapVal ? `${acCapVal}MWac ` : "";
  const rawProjectName = values.projectName || values.plant_name || "";

  let projectName = rawProjectName;
  if (acCapStr && rawProjectName) {
    if (!rawProjectName.toLowerCase().includes("mwac") && !rawProjectName.toLowerCase().includes("solar power plant")) {
      projectName = `${acCapStr}Solar Power Plant – ${rawProjectName}`;
    } else if (!rawProjectName.toLowerCase().includes("mwac")) {
      projectName = `${acCapStr}${rawProjectName}`;
    }
  } else if (acCapStr && !rawProjectName) {
    projectName = `${acCapStr}Solar Power Plant`;
  }

  const revision = values.revision || "R0";
  const issueDate = values.issueDate || formatIssueDate();

  return {
    PROJECT_NAME: projectName,

    REPORT_TITLE: reportTitle,

    CLIENT_NAME:
      values.clientName || values.submittedToCompany || "",

    PREPARED_BY:
      values.preparedBy ||
      "PVinsight Inc",

    REVISION: revision,

    ISSUE_DATE: issueDate,

    DOCUMENT_NUMBER:
      values.documentNumber || values.documentNo || "",

    COVER_IMAGE:
      values.coverImage ||
      ((values.bessManufacturer || values.noOfPCS || report?.id?.includes('battery') || report?.vertical === 'battery')
        ? bessCoverImage
        : (report?.id?.includes('hv') || report?.vertical === 'hv')
          ? hvCoverImage
          : coverImage),

    PV_LOGO:
      values.pvLogo || pvLogo,

    CLIENT_LOGO:
      values.clientLogo || defaultClientLogo,

    submittedTo:
      values.submittedToCompany ||
      values.clientContact ||
      values.clientName ||
      "Signal Energy",

    submittedToAddress:
      (values.submittedToAddress ||
        values.clientAddress ||
        "2034 Hamilton Place BLVD. Suite 100 Chattanooga, TN 37421").replace(/\r?\n/g, '<br>'),

    REVISION_HISTORY_ROWS:
      renderRevisionHistoryRows(values, reportTitle, issueDate, revision),
  };
}