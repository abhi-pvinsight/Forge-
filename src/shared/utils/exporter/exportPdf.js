import { API_BASE_URL } from "../../../features/electrical/pv/pv-design/api/apiConfig";


async function inlineImages(htmlString) {
  const startInlining = performance.now();
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const images = doc.querySelectorAll("img");

  console.log(`[PROFILE] Starting inlineImages for ${images.length} images (parallel fetches).`);

  await Promise.all(
    Array.from(images).map(async (img, idx) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;
      
      const startFetch = performance.now();
      try {
        const response = await fetch(src);
        const blob = await response.blob();

        const base64 = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Max dimensions to prevent massive base64 strings blocking WeasyPrint
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = image.width;
            let height = image.height;

            // Only downscale if the image is too large
            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
              const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(image, 0, 0, width, height);

            // Preserve transparency for PNGs, compress JPEGs for speed
            if (blob.type === "image/png") {
              resolve(canvas.toDataURL("image/png"));
            } else {
              resolve(canvas.toDataURL("image/jpeg", 0.75));
            }
          };
          image.onerror = reject;
          image.src = URL.createObjectURL(blob);
        });

        img.setAttribute("src", base64);
        const endFetch = performance.now();
        console.log(`[PROFILE] Image [${idx}] fetch, compress & encode took ${(endFetch - startFetch).toFixed(2)}ms`);
      } catch (err) {
        console.warn(`Failed to inline image: ${src}`, err);
      }
    })
  );

  const endInlining = performance.now();
  console.log(`[PROFILE] inlineImages total time: ${(endInlining - startInlining).toFixed(2)}ms`);
  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}


function buildSolarAppendixValues(values = {}) {
  const storedValues = values.solarAppendixValues || {};
  const variantPrefixes = ["wp", "pstc", "voc", "vmp", "isc", "imp"];
  const keys = variantPrefixes.flatMap((prefix) =>
    Array.from({ length: 6 }, (_, index) => `${prefix}_${index + 1}`)
  );
  keys.push("temp_coeff_voc", "temp_coeff_pm", "temp_coeff_isc");

  const appendixValues = {};
  keys.forEach((key) => {
    const value = storedValues[key] ?? values[key];
    if (value !== undefined && value !== null && value !== "") {
      appendixValues[key] = value;
    }
  });

  appendixValues.tempMin =
    values.tempMin ?? storedValues.tempMin ?? values.temp_min ?? -5;
  appendixValues.tempMax =
    values.tempMax ?? storedValues.tempMax ?? values.temp_max ?? 32;
  return appendixValues;
}




export async function exportPdfWithToc(
  elementId,
  fileName = "Design Basis Report",
  pageSize = "letter",
  options = {}
) {
  const startTotal = performance.now();
  const element = document.getElementById(elementId);

  if (!element) {
    console.error("Report not found");
    return;
  }

  const docTitle = fileName.replace(".pdf", "");
  const sizeValue = pageSize.toLowerCase() === "a4" ? "A4" : "Letter";
  // Keep the existing effective horizontal spacing (10mm page margin +
  // 10mm container padding), but apply it entirely at page level so the same
  // spacing repeats at the top and bottom of every fragmented PDF page.
  const pageMargin = "20mm";
  const innerHeight = sizeValue === "A4" ? "257mm" : "239.4mm";

  // Parse HTML and extract styles to avoid preceding text nodes or wrappers in body
  const parser = new DOMParser();
  const tempDoc = parser.parseFromString(element.innerHTML, "text/html");
  const styleTags = Array.from(tempDoc.querySelectorAll("style"));
  let stylesText = "";
  styleTags.forEach((style) => {
    stylesText += style.textContent + "\n";
    style.remove();
  });

  // Preview-only placeholders and legacy rasterized appendix pages must never
  // enter Chromium. The native appendix PDF is merged by the backend instead.
  tempDoc
    .querySelectorAll('[data-pdf-export-exclude="true"]')
    .forEach((node) => node.remove());
  tempDoc
    .querySelectorAll(".appendix-page ~ .page")
    .forEach((node) => node.remove());

  const bodyContent = tempDoc.body.innerHTML.trim();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${docTitle}</title>
        <style>
          /* Styles collected from the report templates. Print rules below are
             deliberately declared afterward so template-level @page rules
             cannot override the PDF export layout. */
          ${stylesText}

          @page {
            size: ${sizeValue};
            width: auto;
            height: auto;
            margin: ${pageMargin};
          }

          @page cover {
            size: ${sizeValue};
            width: auto;
            height: auto;
            margin: 0;
          }

          *,
          html,
          body,
          p, td, th, div, span, h1, h2, h3, h4, h5, h6, table {
            font-family: "Segoe UI", sans-serif !important;
          }

          h1, h2, h3, h4, h5, h6,
          .doc-h1, .doc-h2, .doc-h3,
          .toc-heading,
          .table-caption, .toc-table-caption {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          table, .doc-table {
            width: 100%;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          th, td, .doc-table th, .doc-table td {
            border: 1px solid #000000 !important;
          }
          .page-break {
            page-break-before: always;
          }

          @media print {
            th {
              color: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            table, .doc-table {
              page-break-inside: auto !important;
              break-inside: auto !important;
            }
          }
          .cover-page {
            page: cover;
            width: 100% !important;
            max-width: 100% !important;
            height: 100vh !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
          .report-page {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
          }
          .report-page.doc-control-page {
            height: ${innerHeight} !important;
            min-height: ${innerHeight} !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            padding: 0 !important;
          }
          .doc-control-top {
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .doc-control-middle {
            width: 100% !important;
            text-align: center !important;
            margin: auto 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          .doc-control-middle .heading {
            font-size: 20pt !important;
            font-weight: 700 !important;
            color: #0f172a !important;
            margin: 0 !important;
            text-align: center !important;
          }
          .doc-control-bottom,
          .report-page.doc-control-page .bottom-layout-group {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            justify-content: flex-end !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin-top: auto !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding: 0 !important;
          }
          [id*="-report"] .doc-control-page .revision-section,
          .report-page.doc-control-page .revision-section,
          .doc-control-page .revision-section {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin: 5mm 0 !important;
            padding: 0 !important;
            align-self: stretch !important;
            position: static !important;
            left: auto !important;
            right: auto !important;
            transform: none !important;
          }
          .doc-control-page table.table,
          .revision-section table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .doc-control-page table.table th,
          .revision-section table th {
            box-sizing: border-box !important;
            padding: 10px !important;
            font-size: 8.5pt !important;
            font-weight: 600 !important;
            background-color: #163c7a !important;
            color: #ffffff !important;
            text-align: center !important;
            word-break: break-word !important;
            border: 1px solid #163c7a !important;
          }
          .doc-control-page table.table td,
          .revision-section table td {
            box-sizing: border-box !important;
            padding: 10px !important;
            font-size: 8.5pt !important;
            color: #475569 !important;
            line-height: 1.3 !important;
            text-align: center !important;
            word-break: break-word !important;
            border: 1px solid #cbd5e1 !important;
          }

          .compact-table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 7.5pt !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            margin-top: 10px !important;
            margin-bottom: 15px !important;
          }
          .compact-table th,
          .compact-table td {
            padding: 3px 2px !important;
            text-align: center !important;
            vertical-align: middle !important;
            line-height: 1.15 !important;
            border: 1px solid #d0d7e2 !important;
            font-size: 7.5pt !important;
          }
          .compact-table th {
            font-weight: 600 !important;
            background-color: #163c7a !important;
            color: #ffffff !important;
          }
          .compact-table col:nth-child(1) { width: 18% !important; }
          .compact-table col:nth-child(2) { width: 6% !important; }
          .compact-table col:nth-child(3) { width: 6% !important; }
          .compact-table col:nth-child(4) { width: 14% !important; }
          .compact-table col:nth-child(5),
          .compact-table col:nth-child(6),
          .compact-table col:nth-child(7),
          .compact-table col:nth-child(8),
          .compact-table col:nth-child(9),
          .compact-table col:nth-child(10) { width: 8% !important; }
          .compact-table col:nth-child(11) { width: 5% !important; }

          .toc-row {
            display: flex !important;
            align-items: flex-end !important;
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            box-sizing: border-box !important;
          }
          .toc-row.toc-level-1 {
            font-weight: bold !important;
            font-size: 13.5px !important;
            margin-left: 0 !important;
          }
          .toc-row.toc-level-2 {
            font-weight: normal !important;
            font-size: 12.5px !important;
            margin-left: 0 !important;
          }
          .toc-row.toc-level-2 .toc-title {
            padding-left: 20px !important;
          }
          .toc-row.toc-level-3 {
            font-weight: normal !important;
            font-size: 12px !important;
            margin-left: 0 !important;
          }
          .toc-row.toc-level-3 .toc-title {
            padding-left: 40px !important;
          }
          .toc-row.toc-level-4 {
            font-weight: normal !important;
            font-size: 12px !important;
            margin-left: 0 !important;
          }
          .toc-row.toc-level-4 .toc-title {
            padding-left: 60px !important;
          }
          .toc-title {
            background-color: #ffffff !important;
            padding-right: 4px !important;
            z-index: 1 !important;
            white-space: nowrap !important;
          }
          a.toc-link,
          a.toc-link:link,
          a.toc-link:visited,
          a.toc-link:hover,
          a.toc-link:active,
          a.toc-link *,
          .toc-row a,
          .toc-row a * {
            color: inherit !important;
            text-decoration: none !important;
            border-bottom: none !important;
            box-shadow: none !important;
            cursor: pointer !important;
          }
          .toc-dots {
            flex: 1 !important;
            border-bottom: 1px dotted #94a3b8 !important;
            margin: 0 0 3px 0 !important;
          }
          .toc-page-num {
            background-color: #ffffff !important;
            padding-left: 6px !important;
            z-index: 1 !important;
            text-align: right !important;
            min-width: 20px !important;
            white-space: nowrap !important;
          }

          #ashrae_table,
          table#ashrae_table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            box-sizing: border-box !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }

          .page {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
          table, img, div {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          table {
            margin-left: auto !important;
            margin-right: auto !important;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `;

  const inlinedHtml = await inlineImages(htmlContent);

  try {
    const requestPayload = { html: inlinedHtml };
    if (options.includeSolarAppendix) {
      requestPayload.solar_appendix_values = buildSolarAppendixValues(
        options.solarAppendixValues || {}
      );
    }

    const pvsystPdfData = options.values?.pvsyst_pdf_file || options.solarAppendixValues?.pvsyst_pdf_file;
    if (pvsystPdfData) {
      requestPayload.pvsyst_pdf_base64 = pvsystPdfData;
    }

    const payloadSizeMB = (new Blob([JSON.stringify(requestPayload)]).size / (1024 * 1024)).toFixed(2);
    console.log(`[PROFILE] POST Payload size: ${payloadSizeMB} MB`);

    const startPost = performance.now();
    console.log("[PROFILE] Sending POST request to backend...");

    const response = await fetch(`${API_BASE_URL}/api/generate-pdf-with-toc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const endPost = performance.now();
    console.log(`[PROFILE] POST request + backend generation complete. Duration: ${(endPost - startPost).toFixed(2)}ms`);

    const startBlob = performance.now();
    const blob = await response.blob();
    const endBlob = performance.now();
    console.log(`[PROFILE] Converting response to blob took ${(endBlob - startBlob).toFixed(2)}ms`);

    const endTotal = performance.now();
    console.log(`[PROFILE] exportPdfWithToc GRAND TOTAL: ${(endTotal - startTotal).toFixed(2)}ms`);
    return blob;
  } catch (err) {
    console.error("PDF generation with TOC failed:", err);
    alert("Failed to generate PDF with TOC. Please try again.");
    throw err;
  }
}
