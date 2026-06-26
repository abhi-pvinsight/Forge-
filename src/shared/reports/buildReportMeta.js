import coverImage from "../../assets/report-cover.jpg";
import pvLogo from "../../assets/PV insight Logo.png";
import defaultClientLogo from "../../assets/signal Energy.png";

function formatIssueDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB").format(date).replaceAll("/", ".");
}

export function buildReportMeta(values = {}, report = {}) {
  return {
    PROJECT_NAME:
      values.projectName || "",

    REPORT_TITLE:
      values.reportTitle ||
      report?.name ||
      "",

    CLIENT_NAME:
      values.clientName || "",

    PREPARED_BY:
      values.preparedBy ||
      "PVinsight Inc",

    REVISION:
      values.revision || "R0",

    ISSUE_DATE:
      values.issueDate ||
      formatIssueDate(),

    DOCUMENT_NUMBER:
      values.documentNumber || "",

    COVER_IMAGE:
      values.coverImage || coverImage,

    PV_LOGO:
      values.pvLogo || pvLogo,

    CLIENT_LOGO:
      values.clientLogo || defaultClientLogo,
  };
}