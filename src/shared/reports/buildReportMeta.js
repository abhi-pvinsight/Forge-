import coverImage from "../../assets/report-cover.jpg";

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
      new Date().toLocaleDateString("en-GB"),

    DOCUMENT_NUMBER:
      values.documentNumber || "",

    COVER_IMAGE:
      values.coverImage ||
      coverImage,
  };
}