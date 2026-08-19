import { saveAs } from "file-saver";
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  PageBreak, 
  WidthType, 
  BorderStyle, 
  HeadingLevel, 
  ImageRun, 
  LeaderType, 
  TabStopType, 
  AlignmentType,
  Bookmark,
  InternalHyperlink
} from "docx";

// ─── STYLING & CONVERSION HELPERS ──────────────────────────────────────────

function parseColorToHex(colorStr) {
  if (!colorStr) return null;
  const cleaned = colorStr.trim().toLowerCase();
  if (cleaned.startsWith('#')) {
    return cleaned.replace('#', '').toUpperCase();
  }
  const namedColors = {
    'white': 'FFFFFF',
    'black': '000000',
    'red': 'FF0000',
    'blue': '0000FF',
    'green': '008000',
    'gray': '808080',
    'lightgray': 'D3D3D3',
    'darkgray': 'A9A9A9',
    'silver': 'C0C0C0',
    'maroon': '800000',
    'olive': '808000',
    'teal': '008080',
    'navy': '000080',
    'purple': '800080'
  };
  return namedColors[cleaned] || null;
}

function parseFontSize(styleStr) {
  if (!styleStr) return null;
  const match = /font-size\s*:\s*([\d.]+)(pt|px|rem|em)/i.exec(styleStr);
  if (!match) return null;
  const val = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  
  if (unit === 'pt') return val * 2; // half-points
  if (unit === 'px') return Math.round(val * 0.75 * 2); // 1px ~ 0.75pt
  if (unit === 'rem' || unit === 'em') return Math.round(val * 12 * 2);
  return null;
}

function base64ToArrayBuffer(base64Str) {
  const parts = base64Str.split(',');
  const base64Data = parts[1] || parts[0];
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function createImageRun(src, width = 150, height = 150) {
  try {
    const data = base64ToArrayBuffer(src);
    return new ImageRun({
      data: data,
      transformation: {
        width: width,
        height: height
      }
    });
  } catch (err) {
    return null;
  }
}

function normalizeWhitespace(text, node = null) {
  if (!text) return "";
  const el = node ? (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement || node.parentNode) : null;
  if (el && el.closest && el.closest("pre, code")) {
    return text;
  }
  return text
    .replace(/[\t\n\r]+/g, " ")
    .replace(/ {2,}/g, " ");
}

// ─── BOOKMARK & HYPERLINK HELPERS ──────────────────────────────────────────

function sanitizeBookmarkId(id, fallbackIndex = 0) {
  if (!id) return `bm_heading_${fallbackIndex}`;
  let clean = String(id)
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  if (!clean || !/^[a-zA-Z]/.test(clean)) {
    clean = `bm_${clean}`;
  }
  return clean.substring(0, 38);
}

let headingBookmarkMap = new Map();
let domIdToBookmarkMap = new Map();

function buildHeadingBookmarkMaps(root) {
  headingBookmarkMap = new Map();
  domIdToBookmarkMap = new Map();
  const usedSet = new Set();

  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6, .toc-heading"));
  headings.forEach((h, index) => {
    const rawTitle = h.textContent.trim();
    const normTitle = normalizeWhitespace(rawTitle).toLowerCase();
    const domId = h.getAttribute("id");

    let base = sanitizeBookmarkId(domId || normTitle, index);
    let bookmarkId = base;
    let counter = 1;
    while (usedSet.has(bookmarkId)) {
      bookmarkId = `${base.substring(0, 32)}_${counter++}`;
    }
    usedSet.add(bookmarkId);

    if (domId) {
      domIdToBookmarkMap.set(domId, bookmarkId);
    }
    if (normTitle) {
      headingBookmarkMap.set(normTitle, bookmarkId);
      const titleNoNum = normTitle.replace(/^\d+[\d.]*\s*/, "").trim();
      if (titleNoNum) {
        headingBookmarkMap.set(titleNoNum, bookmarkId);
      }
    }
    h._docxBookmarkId = bookmarkId;
  });
}

// ─── DOM PRE-VALIDATION CHECK ────────────────────────────────────────────────

function validateDOM(root) {
  const errors = [];
  const walk = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const style = node.getAttribute("style") || "";
      const tagName = node.tagName.toLowerCase();
      
      // Allow flex display only if it is whitelisted as a math formula block
      if (/display\s*:\s*(flex|grid)/i.test(style)) {
        const isMath = /times new roman/i.test(node.style.fontFamily || style) || 
                       node.querySelector('sub') || node.querySelector('sup');
        const isPageContainer = node.classList && (node.classList.contains("report-page") || node.classList.contains("cover-page") || node.classList.contains("page"));
        if (!isMath && !isPageContainer) {
          errors.push(`Unsupported display style '${style.trim()}' found on <${tagName}> with class "${node.className}"`);
        }
      }
      if (/position\s*:\s*(absolute|fixed|sticky)/i.test(style)) {
        errors.push(`Unsupported positioning style '${style.trim()}' found on <${tagName}>`);
      }
      if (/float\s*:\s*(left|right)/i.test(style)) {
        errors.push(`Unsupported floating style '${style.trim()}' found on <${tagName}>`);
      }
      if (/grid-template-/i.test(style)) {
        errors.push(`Unsupported grid properties found on <${tagName}>`);
      }
      
      const unsupportedTags = ['canvas', 'iframe', 'video', 'audio', 'input'];
      if (unsupportedTags.includes(tagName)) {
        errors.push(`Unsupported HTML element <${tagName}> found`);
      }
      
      for (let child of node.childNodes) {
        walk(child);
      }
    }
  };
  
  walk(root);
  return errors;
}

// ─── INLINE PARSING ─────────────────────────────────────────────────────────

function parseParagraphChildren(node, currentStyle = { font: "Segoe UI" }) {
  let runs = [];
  
  for (let child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = normalizeWhitespace(child.textContent, child);
      if (text) {
        runs.push(new TextRun({
          text: text,
          ...currentStyle
        }));
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tagName = child.tagName.toLowerCase();
      const inlineStyle = child.getAttribute("style") || "";
      
      // Parse layout properties and inherit
      const isBold = tagName === 'strong' || tagName === 'b' || currentStyle.bold || /font-weight\s*:\s*bold/i.test(inlineStyle);
      const isItalic = tagName === 'em' || tagName === 'i' || currentStyle.italics || /font-style\s*:\s*italic/i.test(inlineStyle);
      const isUnderline = tagName === 'u' || currentStyle.underline || /text-decoration\s*:\s*underline/i.test(inlineStyle);
      const isSub = tagName === 'sub' || currentStyle.subScript;
      const isSup = tagName === 'sup' || currentStyle.superScript;
      
      let color = currentStyle.color;
      const colorMatch = /color\s*:\s*([^;]+)/i.exec(inlineStyle);
      if (colorMatch) {
        color = parseColorToHex(colorMatch[1].trim());
      }
      
      let size = currentStyle.size;
      const sizeVal = parseFontSize(inlineStyle);
      if (sizeVal) {
        size = sizeVal;
      }
      
      const newStyle = {
        font: "Segoe UI",
        bold: isBold,
        italics: isItalic,
        underline: isUnderline,
        subScript: isSub,
        superScript: isSup,
        color: color || undefined,
        size: size || undefined
      };
      
      if (tagName === 'span' || tagName === 'strong' || tagName === 'b' || tagName === 'em' || tagName === 'i' || tagName === 'u' || tagName === 'sub' || tagName === 'sup') {
        runs = runs.concat(parseParagraphChildren(child, newStyle));
      } else if (tagName === 'br') {
        runs.push(new TextRun({ text: "\n", font: "Segoe UI" }));
      } else if (tagName === 'img') {
        const src = child.getAttribute("src");
        if (src && src.startsWith("data:")) {
          let width = 150;
          let height = 150;
          if (child.classList.contains("logo-element")) { width = 150; height = 50; }
          else if (child.classList.contains("seal-img")) { width = 180; height = 180; }
          
          const imageRun = createImageRun(src, width, height);
          if (imageRun) runs.push(imageRun);
        }
      } else {
        runs = runs.concat(parseParagraphChildren(child, newStyle));
      }
    }
  }
  
  return runs;
}

// ─── MATH FORMULA COMPILING ─────────────────────────────────────────────────

function parseMathFormulaRuns(mathNode, runsArr = [], currentStyle = { font: "Times New Roman", italics: true }) {
  const walk = (node, style) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = normalizeWhitespace(node.textContent, node);
      if (text) {
        runsArr.push(new TextRun({
          text: text,
          ...style
        }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      const inlineStyle = node.getAttribute("style") || "";
      const isInlineFlexCol = /display\s*:\s*inline-flex/i.test(inlineStyle) && /flex-direction\s*:\s*column/i.test(inlineStyle);
      
      const newStyle = {
        ...style,
        bold: tagName === 'strong' || tagName === 'b' || style.bold,
        italics: tagName === 'em' || tagName === 'i' || tagName === 'span' ? !/font-style\s*:\s*normal/i.test(inlineStyle) : style.italics,
        subScript: tagName === 'sub' || style.subScript,
        superScript: tagName === 'sup' || style.superScript
      };
      
      if (isInlineFlexCol) {
        const children = Array.from(node.children);
        if (children.length >= 2) {
          runsArr.push(new TextRun({ text: " (", ...style }));
          walk(children[0], newStyle);
          runsArr.push(new TextRun({ text: ") / (", ...style }));
          walk(children[1], newStyle);
          runsArr.push(new TextRun({ text: ") ", ...style }));
        } else {
          for (let child of node.childNodes) {
            walk(child, newStyle);
          }
        }
      } else {
        for (let child of node.childNodes) {
          walk(child, newStyle);
        }
      }
    }
  };
  
  walk(mathNode, currentStyle);
  return runsArr;
}

// ─── TABLE PARSING ──────────────────────────────────────────────────────────

function parseTableElement(node, childrenList) {
  const isDocControlHeaderTable = node.closest(".doc-control-top") !== null || node.querySelector(".sub-heading") !== null;
  const isBorderless =
    (!isDocControlHeaderTable && node.getAttribute("border") === "0") ||
    node.classList.contains("calc-table") ||
    node.classList.contains("busbar-table") ||
    node.closest("#busbar-sizing-report") !== null ||
    node.closest(".busbar-report") !== null;

  const colWidths = [];
  const colgroup = node.querySelector("colgroup");
  if (colgroup) {
    for (let col of colgroup.children) {
      if (col.tagName.toLowerCase() === 'col') {
        const style = col.getAttribute("style") || "";
        const widthMatch = /width\s*:\s*([\d.]+)(%|px|pt)/i.exec(style);
        if (widthMatch) {
          colWidths.push({ value: parseFloat(widthMatch[1]), unit: widthMatch[2].toLowerCase() });
        } else {
          colWidths.push({ value: null, unit: 'auto' });
        }
      }
    }
  }
  
  // Total printable page width is 9360 dxa (6.5 inches)
  const PRINTABLE_WIDTH_DXA = 9360;
  let finalWidths = [];
  if (colWidths.length > 0) {
    let explicitSumPercent = 0;
    let explicitSumDxa = 0;
    let autoCount = 0;
    
    colWidths.forEach(w => {
      if (w.unit === '%') explicitSumPercent += w.value;
      else if (w.unit === 'px') explicitSumDxa += w.value * 15;
      else if (w.unit === 'pt') explicitSumDxa += w.value * 20;
      else autoCount++;
    });
    
    const remainingDxa = Math.max(0, PRINTABLE_WIDTH_DXA - explicitSumDxa - ((explicitSumPercent / 100) * PRINTABLE_WIDTH_DXA));
    const autoDxa = autoCount > 0 ? remainingDxa / autoCount : 0;
    
    finalWidths = colWidths.map(w => {
      if (w.unit === '%') return Math.round((w.value / 100) * PRINTABLE_WIDTH_DXA);
      if (w.unit === 'px') return Math.round(w.value * 15);
      if (w.unit === 'pt') return Math.round(w.value * 20);
      return Math.round(autoDxa);
    });
  }
  
  const docxRows = [];
  const trs = Array.from(node.querySelectorAll("tr"));
  const hasThead = node.querySelector("thead") !== null;
  
  for (let trIndex = 0; trIndex < trs.length; trIndex++) {
    const tr = trs[trIndex];
    const docxCells = [];
    const cells = Array.from(tr.children);
    
    let isHeaderRow = false;
    if (hasThead) {
      isHeaderRow = tr.closest("thead") !== null || (trIndex === 0 && cells.some(c => c.tagName.toLowerCase() === 'th'));
    } else {
      const hasTh = cells.some(c => c.tagName.toLowerCase() === 'th');
      if (trIndex === 0 && hasTh) {
        isHeaderRow = true;
      } else if (hasTh && cells.every(c => c.tagName.toLowerCase() === 'th')) {
        isHeaderRow = true;
      }
    }
    
    cells.forEach((cell, cellIndex) => {
      const isHeader = cell.tagName.toLowerCase() === 'th';
      const cellInlineStyle = cell.getAttribute("style") || "";
      
      let cellBg = null;
      if (isHeader) {
        cellBg = "163C7A"; // Theme Header Color #163C7A
      } else {
        const bgMatch = /background(?:-color)?\s*:\s*([^;]+)/i.exec(cellInlineStyle);
        if (bgMatch) {
          cellBg = parseColorToHex(bgMatch[1].trim());
        }
      }
      
      let align = AlignmentType.LEFT;
      const alignMatch = /text-align\s*:\s*([^;]+)/i.exec(cellInlineStyle);
      if (alignMatch) {
        const val = alignMatch[1].trim().toLowerCase();
        if (val === 'center') align = AlignmentType.CENTER;
        else if (val === 'right') align = AlignmentType.RIGHT;
        else if (val === 'justify') align = AlignmentType.BOTH;
      }
      
      const colSpanVal = parseInt(cell.getAttribute("colspan")) || 1;
      const rowSpanVal = parseInt(cell.getAttribute("rowspan")) || 1;
      
      const cellParagraphs = [];
      const blockChildren = Array.from(cell.childNodes).filter(n => 
        n.nodeType === Node.ELEMENT_NODE && ['p', 'div', 'ul', 'ol', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(n.tagName.toLowerCase())
      );
      
      if (blockChildren.length > 0) {
        for (let childNode of cell.childNodes) {
          if (childNode.nodeType === Node.ELEMENT_NODE) {
            processNode(childNode, cellParagraphs);
          } else if (childNode.nodeType === Node.TEXT_NODE && normalizeWhitespace(childNode.textContent, childNode).trim()) {
            const text = normalizeWhitespace(childNode.textContent, childNode);
            cellParagraphs.push(new Paragraph({
              children: [new TextRun({ text: text, color: isHeader ? "FFFFFF" : undefined, font: "Segoe UI" })]
            }));
          }
        }
      } else {
        const runs = parseParagraphChildren(cell, { color: isHeader ? "FFFFFF" : undefined, font: "Segoe UI" });
        cellParagraphs.push(new Paragraph({
          children: runs,
          alignment: align
        }));
      }
      
      const cellProps = {
        children: cellParagraphs,
        shading: cellBg ? { fill: cellBg } : undefined,
        columnSpan: colSpanVal > 1 ? colSpanVal : undefined,
        rowSpan: rowSpanVal > 1 ? rowSpanVal : undefined,
        margins: {
          top: 120, // 6pt padding
          bottom: 120,
          left: 120,
          right: 120
        },
        borders: isBorderless ? {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE }
        } : {
          top: { style: BorderStyle.SINGLE, size: 4, color: "D0D7E2" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "D0D7E2" },
          left: { style: BorderStyle.SINGLE, size: 4, color: "D0D7E2" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "D0D7E2" }
        }
      };
      
      if (finalWidths.length > 0 && finalWidths[cellIndex]) {
        cellProps.width = {
          size: finalWidths[cellIndex],
          type: WidthType.DXA
        };
      }
      
      docxCells.push(new TableCell(cellProps));
    });
    
    docxRows.push(new TableRow({
      tableHeader: isHeaderRow ? true : undefined,
      children: docxCells
    }));
  }
  
  childrenList.push(new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    columnWidths: finalWidths.length > 0 ? finalWidths : undefined,
    rows: docxRows,
    spacing: { before: 240, after: 240 }
  }));
}

// ─── RECURSIVE NODE PROCESSOR ───────────────────────────────────────────────

function processNode(node, childrenList) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = node.tagName.toLowerCase();
    const style = node.getAttribute("style") || "";
    
    if (/display\s*:\s*none/i.test(style) || node.getAttribute("data-display") === "none" || node.getAttribute("data-pdf-export-exclude") === "true" || node.getAttribute("data-docx-export-exclude") === "true") {
      return;
    }
    
    const isMath = /times new roman/i.test(node.style.fontFamily || style) || 
                   node.querySelector('sub') || node.querySelector('sup');
    
    if (isMath && /display\s*:\s*(flex|inline-flex)/i.test(style)) {
      const runs = parseMathFormulaRuns(node);
      childrenList.push(new Paragraph({
        children: runs,
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 }
      }));
      return;
    }
    
    if (node.classList && node.classList.contains("toc-row")) {
      const level = Array.from(node.classList)
        .filter(c => c.startsWith("toc-level-"))
        .map(c => parseInt(c.replace("toc-level-", "")))[0] || 1;
        
      const titleEl = node.querySelector(".toc-title");
      const pageNumEl = node.querySelector(".toc-page-num");
      const anchorEl = node.querySelector("a");
      
      const titleText = titleEl ? normalizeWhitespace(titleEl.textContent, titleEl).trim() : "";
      const pageNumText = pageNumEl ? normalizeWhitespace(pageNumEl.textContent, pageNumEl).trim() : "";
      
      let matchedBookmarkId = null;
      if (anchorEl) {
        const href = anchorEl.getAttribute("href") || "";
        const hrefId = href.replace(/^#/, "");
        if (hrefId && domIdToBookmarkMap.has(hrefId)) {
          matchedBookmarkId = domIdToBookmarkMap.get(hrefId);
        }
      }

      if (!matchedBookmarkId && titleText) {
        const normTOC = normalizeWhitespace(titleText).toLowerCase();
        const normNoNum = normTOC.replace(/^\d+[\d.]*\s*/, "").trim();
        matchedBookmarkId = headingBookmarkMap.get(normTOC) || headingBookmarkMap.get(normNoNum) || null;
      }

      let titleItem;
      if (matchedBookmarkId) {
        titleItem = new InternalHyperlink({
          anchor: matchedBookmarkId,
          children: [
            new TextRun({ text: titleText, bold: level === 1, font: "Segoe UI", style: "Hyperlink" })
          ]
        });
      } else {
        titleItem = new TextRun({ text: titleText, bold: level === 1, font: "Segoe UI" });
      }

      const runs = [
        titleItem,
        new TextRun({ text: "\t" }),
        new TextRun({ text: pageNumText, bold: level === 1, font: "Segoe UI" })
      ];
      
      childrenList.push(new Paragraph({
        children: runs,
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: 9360,
            leader: LeaderType.DOT
          }
        ],
        indent: { left: (level - 1) * 360 },
        spacing: { before: 60, after: 60 }
      }));
      return;
    }
    
    const hasPageBreakBefore = /page-break-before\s*:\s*always/i.test(style) || /break-before\s*:\s*page/i.test(style);
    const hasPageBreakAfter = /page-break-after\s*:\s*always/i.test(style) || /break-after\s*:\s*page/i.test(style);
    const isPageContainer = node.classList && (node.classList.contains("report-page") || node.classList.contains("cover-page") || node.classList.contains("page"));
    
    if (hasPageBreakBefore || isPageContainer) {
      if (childrenList.length > 0) {
        childrenList.push(new Paragraph({ children: [new PageBreak()] }));
      }
    }
    
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      const runs = parseParagraphChildren(node, { font: "Segoe UI" });
      let headingLevel = HeadingLevel.HEADING_1;
      if (tagName === 'h1') headingLevel = HeadingLevel.HEADING_1;
      else if (tagName === 'h2') headingLevel = HeadingLevel.HEADING_2;
      else if (tagName === 'h3') headingLevel = HeadingLevel.HEADING_3;
      else headingLevel = HeadingLevel.HEADING_4;
      
      const rawTitle = node.textContent.trim();
      const normTitle = normalizeWhitespace(rawTitle).toLowerCase();
      const domId = node.getAttribute("id");

      const bookmarkId = node._docxBookmarkId || 
                         (domId && domIdToBookmarkMap.get(domId)) || 
                         headingBookmarkMap.get(normTitle) || 
                         sanitizeBookmarkId(domId || normTitle, 0);

      childrenList.push(new Paragraph({
        heading: headingLevel,
        keepWithNext: true,
        children: [
          new Bookmark({
            id: bookmarkId,
            children: runs
          })
        ],
        spacing: { before: 240, after: 120 }
      }));
    } else if (tagName === 'p') {
      const runs = parseParagraphChildren(node, { font: "Segoe UI" });
      childrenList.push(new Paragraph({
        children: runs,
        spacing: { before: 120, after: 120 }
      }));
    } else if (tagName === 'ul' || tagName === 'ol') {
      const isOrdered = tagName === 'ol';
      let index = 1;
      for (let child of node.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li') {
          const runs = parseParagraphChildren(child, { font: "Segoe UI" });
          if (isOrdered) {
            runs.unshift(new TextRun({ text: `${index++}.  `, bold: true, font: "Segoe UI" }));
          }
          childrenList.push(new Paragraph({
            children: runs,
            bullet: isOrdered ? undefined : { level: 0 },
            spacing: { before: 60, after: 60 },
            indent: isOrdered ? { left: 720 } : undefined
          }));
        }
      }
    } else if (tagName === 'table') {
      parseTableElement(node, childrenList);
    } else if (tagName === 'img') {
      let src = node.src || node.getAttribute("src") || "";

      if (src && !src.startsWith("data:")) {
        try {
          const canvas = document.createElement("canvas");
          const w = node.naturalWidth || node.width || 600;
          const h = node.naturalHeight || node.height || 300;
          if (w > 0 && h > 0) {
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(node, 0, 0);
            src = canvas.toDataURL("image/png");
          }
        } catch (e) {
          console.warn("[exportDocx] Could not convert img src to canvas base64:", e);
        }
      }

      if (src && src.startsWith("data:")) {
        const isCoverImg = node.classList.contains("cover-img") || 
                           (node.parentElement && node.parentElement.classList.contains("cover-image")) ||
                           (node.closest && node.closest(".cover-image")) ||
                           node.getAttribute("alt") === "pv_backgroung";

        let width = 150;
        let height = 150;

        if (isCoverImg) {
          width = 580;  // Full printable page width in Word (dxa equivalent)
          height = 260; // Banner height matching HTML cover ratio
        } else if (node.classList.contains("logo-element")) {
          width = 150;
          height = 50;
        } else if (node.classList.contains("seal-img")) {
          width = 180;
          height = 180;
        } else {
          const widthMatch = /width\s*:\s*([\d.]+)/i.exec(style);
          const heightMatch = /height\s*:\s*([\d.]+)/i.exec(style);
          if (widthMatch) width = parseFloat(widthMatch[1]);
          if (heightMatch) height = parseFloat(heightMatch[1]);
        }
        
        const imageRun = createImageRun(src, width, height);
        if (imageRun) {
          childrenList.push(new Paragraph({
            children: [imageRun],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 120 }
          }));
        }
      }
    } else if (tagName === 'div' || tagName === 'section' || tagName === 'article' || tagName === 'header' || tagName === 'footer') {
      const classList = node.classList ? Array.from(node.classList) : [];

      if (classList.includes("cover-blue") || classList.includes("cover-green")) {
        const isBlue = classList.includes("cover-blue");
        const bgColor = isBlue ? "002060" : "005F5F";
        const innerParagraphs = [];
        for (let child of node.childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const runs = parseParagraphChildren(child, {
              font: "Segoe UI",
              color: "FFFFFF",
              size: 32,
              bold: isBlue || undefined
            });

            if (runs.length > 0) {
              innerParagraphs.push(new Paragraph({
                children: runs,
                spacing: { before: 30, after: 30 }
              }));
            }
          }
        }
        if (innerParagraphs.length > 0) {
          childrenList.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: innerParagraphs,
                    shading: { fill: bgColor },
                    margins: { top: 100, bottom: 100, left: 200, right: 200 },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE }
                    }
                  })
                ]
              })
            ],
            spacing: { before: 0, after: 0 }
          }));
        }
        return;
      }

      if (classList.includes("doc-control-middle")) {
        const runs = parseParagraphChildren(node, { font: "Segoe UI", color: "163C7A", size: 36, bold: true });
        if (runs.length > 0) {
          childrenList.push(new Paragraph({
            children: runs,
            alignment: AlignmentType.CENTER,
            spacing: { before: 360, after: 360 }
          }));
        }
        return;
      }

      const hasDirectText = Array.from(node.childNodes).some(n => 
        n.nodeType === Node.TEXT_NODE && normalizeWhitespace(n.textContent, n).trim().length > 0
      );

      const hasBlockChildren = Array.from(node.childNodes).some(n => 
        n.nodeType === Node.ELEMENT_NODE && ['div', 'p', 'table', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'img', 'picture', 'figure', 'header', 'footer'].includes(n.tagName.toLowerCase())
      );

      let textColor = undefined;
      let shadingBg = undefined;

      const isCoverBlue = classList.includes("cover-blue") || (node.closest && node.closest(".cover-blue"));
      const isCoverGreen = classList.includes("cover-green") || (node.closest && node.closest(".cover-green"));

      if (isCoverBlue) {
        textColor = "FFFFFF";
        shadingBg = "002060";
      } else if (isCoverGreen) {
        textColor = "FFFFFF";
        shadingBg = "005F5F";
      }

      let fontSize = undefined;
      let isBold = false;

      if (classList.includes("cover-project") || classList.includes("cover-report")) {
        fontSize = 32; // 16pt
        isBold = true;
      } else if (classList.includes("cover-footer-item")) {
        fontSize = 28; // 14pt
      } else if (classList.includes("org-name")) {
        fontSize = 24; // 12pt
        isBold = true;
      } else if (classList.includes("sub-heading")) {
        fontSize = 18; // 9pt
        textColor = "1D4ED8";
        isBold = true;
      } else if (classList.includes("address")) {
        fontSize = 19; // 9.5pt
      }

      if (hasBlockChildren) {
        for (let child of node.childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            processNode(child, childrenList);
          } else if (child.nodeType === Node.TEXT_NODE) {
            const txt = normalizeWhitespace(child.textContent, child).trim();
            if (txt.length > 0) {
              childrenList.push(new Paragraph({
                children: [new TextRun({ text: txt, font: "Segoe UI", color: textColor, size: fontSize })],
                shading: shadingBg ? { fill: shadingBg } : undefined,
                spacing: { before: 120, after: 120 }
              }));
            }
          }
        }
      } else {
        const textContentClean = normalizeWhitespace(node.textContent, node).trim();
        if (textContentClean.length > 0) {
          const runs = parseParagraphChildren(node, {
            font: "Segoe UI",
            color: textColor,
            size: fontSize,
            bold: isBold || undefined
          });

          if (runs.length > 0) {
            childrenList.push(new Paragraph({
              children: runs,
              shading: shadingBg ? { fill: shadingBg } : undefined,
              spacing: { before: 120, after: 120 }
            }));
          }
        }
      }
    } else {
      for (let child of node.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          processNode(child, childrenList);
        }
      }
    }
    
    if (hasPageBreakAfter) {
      childrenList.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }
}

// ─── EXPORT MAIN FUNCTION ────────────────────────────────────────────────────

export async function exportDocx(elementId, fileName) {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error("[exportDocx] Report element not found:", elementId);
    return;
  }

  // 1. Run DOM layout constraints validation
  const validationErrors = validateDOM(element);
  if (validationErrors.length > 0) {
    console.error("[exportDocx] Pre-export validation failed:\n" + validationErrors.join("\n"));
    alert(
      `Failed to generate DOCX document: The report contains layout elements that are not supported in Word format (e.g. flexbox/grid layout).\n\nDetails:\n- ${validationErrors[0]}`
    );
    return;
  }

  // 2. Traversal and AST parsing
  buildHeadingBookmarkMaps(element);
  const childrenElements = [];
  
  // Parse through top-level elements of the report
  for (let child of element.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      processNode(child, childrenElements);
    }
  }

  // 3. Construct OOXML Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch in twips
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        children: childrenElements
      }
    ]
  });

  // 4. Pack and trigger download
  try {
    const blob = await Packer.toBlob(doc);
    const finalName = fileName.toLowerCase().endsWith('.docx') ? fileName : `${fileName}.docx`;
    saveAs(blob, finalName);
  } catch (err) {
    console.error("[exportDocx] Failed to compile and pack OOXML DOCX document:", err);
    alert("An error occurred while compiling the Word Document. Please try again.");
  }
}