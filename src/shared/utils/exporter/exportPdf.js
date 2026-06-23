
export function exportPdf(elementId) {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error("Report not found");
    return;
  }

  const printWindow = window.open("", "_blank");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Design Basis Report</title>

        <style>
          @page {
           size: A4; margin: 10mm;
          }

          body {
            font-family: "Segoe UI", sans-serif;
            margin: 0;
            padding: 0;
            background: white;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          img {
            max-width: 100%;
          }

          .page-break {
            page-break-before: always4;
          }

          @media print {
          th {
            // background-color: #163c7a !important;
            color: white !important;

           -webkit-print-color-adjust: exact;
             print-color-adjust: exact;
           }
          
          @media print {

          thead {
            display: table-header-group;   /* ✅ Repeat header on every page */
           }

          tfoot {
           display: table-footer-group;
          }

          //  tr {
          //    page-break-inside: avoid;      /* ✅ Prevent row split */
          //  }

           table {
           page-break-inside: auto;
           }
            }


          }

        </style>
      </head>

      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();

    setTimeout(() => { printWindow.close(); }, 500); }; }