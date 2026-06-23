// import HTMLtoDOCX from "html-to-docx";
// import { saveAs } from "file-saver";

export async function exportDocx(
  elementId,
  fileName
) {
  const element =
    document.getElementById(elementId);

  if (!element) {
    console.error("Report not found");
    return;
  }

  const html = element.outerHTML;

  const blob = await HTMLtoDOCX(html);

  saveAs(blob, `${fileName}.docx`);
}