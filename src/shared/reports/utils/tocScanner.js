// Generic scanner + numbering + renderer — works for any report, no report-specific logic.

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: slugify a heading title into a safe id
// ─────────────────────────────────────────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

// ─────────────────────────────────────────────────────────────────────────────
// renderSimpleList — renders TOC rows as clickable anchor links
// ─────────────────────────────────────────────────────────────────────────────
export function renderSimpleList(entries, { key = "displayTitle" } = {}) {
  return entries
    .map((e) => {
      const pageNum = e.page != null ? e.page : "";
      const title = e[key] || e.title;
      const anchorId = e.anchorId || "";
      const linkOpen = anchorId
        ? `<a href="#${anchorId}" class="toc-link" style="color: inherit !important; text-decoration: none !important; border: none !important; outline: none !important;" onclick="event.preventDefault(); const t=document.getElementById('${anchorId}'); if(t){t.scrollIntoView({behavior:'smooth',block:'start'});}; return false;">`
        : "<span>";
      const linkClose = anchorId ? `</a>` : `</span>`;
      return `<div class="toc-row toc-level-${e.level || 1}">
        ${linkOpen}<span class="toc-title" style="color: inherit !important; text-decoration: none !important;">${title}</span>${linkClose}
        <span class="toc-dots"></span>
        <span class="toc-page-num">${pageNum}</span>
      </div>`;
    })
    .join("\n");
}

export function renderSectionIfNotEmpty(title, entries, { key = "displayTitle" } = {}) {
  if (!entries || entries.length === 0) return "";
  return `<h2 class="heading">${title}</h2><div class="toc-section">${renderSimpleList(entries, { key })}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// scanAndNumberReportContent — parse HTML string, number headings, stamp ids
// ─────────────────────────────────────────────────────────────────────────────
export function scanAndNumberReportContent(bodyHtml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(bodyHtml, "text/html");

  const usedIds = new Set();

  // 1. Headings
  const headingEls = Array.from(doc.querySelectorAll(".toc-heading"));
  const rawHeadings = headingEls.map((el) => ({
    title: el.textContent.trim(),
    level: Number(el.getAttribute("data-toc-level")) || 1,
  }));

  const numberedHeadings = assignHeadingNumbers(rawHeadings);

  headingEls.forEach((el, i) => {
    el.textContent = numberedHeadings[i].displayTitle;
    const raw = slugify(numberedHeadings[i].displayTitle);
    let id = raw;
    let counter = 1;
    while (usedIds.has(id)) { id = `${raw}-${counter++}`; }
    usedIds.add(id);
    el.id = id;
    numberedHeadings[i].anchorId = id;
  });

  // 2. Tables
  const tableEls = Array.from(doc.querySelectorAll(".toc-table-caption"));
  const tables = tableEls.map((el, i) => {
    const rawText = el.textContent.trim().replace(/^Table\s+\d+[\s:.-]*/i, "");
    const title = rawText ? `Table ${i + 1}: ${rawText}` : el.textContent.trim();
    el.textContent = title;
    
    const rawId = slugify(title || `table-${i + 1}`);
    let id = rawId;
    let counter = 1;
    while (usedIds.has(id)) { id = `${rawId}-${counter++}`; }
    usedIds.add(id);
    el.id = id;

    return { title, anchorId: id };
  });

  // 3. Figures
  const figureEls = Array.from(doc.querySelectorAll(".toc-figure-caption"));
  const figures = figureEls.map((el, i) => {
    const rawText = el.textContent.trim().replace(/^Figure\s+\d+[\s:.-]*/i, "");
    const title = rawText ? `Figure ${i + 1}: ${rawText}` : el.textContent.trim();
    el.textContent = title;

    const rawId = slugify(title || `figure-${i + 1}`);
    let id = rawId;
    let counter = 1;
    while (usedIds.has(id)) { id = `${rawId}-${counter++}`; }
    usedIds.add(id);
    el.id = id;

    return { title, anchorId: id };
  });

  const abbreviations = Array.from(doc.querySelectorAll(".toc-abbreviation")).map((el) => ({
    term: el.getAttribute("data-term") || "",
    meaning: el.textContent.trim(),
  }));

  const numberedBodyHtml = doc.body.innerHTML;

  return { numberedBodyHtml, headings: numberedHeadings, tables, figures, abbreviations };
}

// ─────────────────────────────────────────────────────────────────────────────
// resyncReportDom — re-scans a live DOM element, renumbers headings/tables/
// figures that are still present, and rewrites the TOC / list pages in-place.
// Call this just before saving custom_html so the snapshot is consistent.
// Returns the corrected innerHTML of the container element.
// ─────────────────────────────────────────────────────────────────────────────
export function resyncReportDom(containerEl) {
  if (!containerEl) return null;

  cleanReportEditControls(containerEl);

  const usedIds = new Set();

  // ── 1. Re-number headings that still exist in the body ───────────────────
  const headingEls = Array.from(containerEl.querySelectorAll(".toc-heading"));
  const rawHeadings = headingEls.map((el) => {
    const text = el.textContent.trim();
    const strippedTitle = text.replace(/^[\d.]+\s+/, "");
    return {
      title: strippedTitle,
      level: Number(el.getAttribute("data-toc-level")) || 1,
    };
  });

  const numberedHeadings = assignHeadingNumbers(rawHeadings);

  headingEls.forEach((el, i) => {
    el.textContent = numberedHeadings[i].displayTitle;
    const raw = slugify(numberedHeadings[i].displayTitle);
    let id = raw;
    let counter = 1;
    while (usedIds.has(id)) { id = `${raw}-${counter++}`; }
    usedIds.add(id);
    el.id = id;
    numberedHeadings[i].anchorId = id;
  });

  // ── 2. Re-number table captions still in the body & assign anchor IDs ───
  const tableCapEls = Array.from(containerEl.querySelectorAll(".toc-table-caption"));
  const tables = tableCapEls.map((el, i) => {
    const rawText = el.textContent.trim().replace(/^Table\s+\d+[\s:.-]*/i, "");
    const title = `Table ${i + 1}: ${rawText}`;
    el.textContent = title;

    const rawId = slugify(title);
    let id = rawId;
    let counter = 1;
    while (usedIds.has(id)) { id = `${rawId}-${counter++}`; }
    usedIds.add(id);
    el.id = id;

    return { title, anchorId: id };
  });

  // ── 3. Re-number figure captions still in the body & assign anchor IDs ──
  const figCapEls = Array.from(containerEl.querySelectorAll(".toc-figure-caption"));
  const figures = figCapEls.map((el, i) => {
    const rawText = el.textContent.trim().replace(/^Figure\s+\d+[\s:.-]*/i, "");
    const title = `Figure ${i + 1}: ${rawText}`;
    el.textContent = title;

    const rawId = slugify(title);
    let id = rawId;
    let counter = 1;
    while (usedIds.has(id)) { id = `${rawId}-${counter++}`; }
    usedIds.add(id);
    el.id = id;

    return { title, anchorId: id };
  });

  // ── 4. Rewrite TOC page ───────────────────────────────────────────────────
  const tocContent = containerEl.querySelector("#toc-content");
  if (tocContent) {
    tocContent.innerHTML = renderSimpleList(numberedHeadings);
  }

  // ── 5. Rewrite List of Tables page ───────────────────────────────────────
  const lotContent = containerEl.querySelector("#lot-content");
  if (lotContent) {
    lotContent.innerHTML = tables.length > 0
      ? `<h2 class="heading">List of Tables</h2><div class="toc-section">${renderSimpleList(tables.map(t => ({ ...t, displayTitle: t.title, level: 1 })), { key: "title" })}</div>`
      : "";
  }

  // ── 6. Rewrite List of Figures page ──────────────────────────────────────
  const lofContent = containerEl.querySelector("#lof-content");
  if (lofContent) {
    lofContent.innerHTML = figures.length > 0
      ? `<h2 class="heading">List of Figures</h2><div class="toc-section">${renderSimpleList(figures.map(f => ({ ...f, displayTitle: f.title, level: 1 })), { key: "title" })}</div>`
      : "";
  }

  return containerEl.innerHTML;
}

function assignHeadingNumbers(rawHeadings) {
  const counters = [];

  return rawHeadings.map((h) => {
    const levelIndex = h.level - 1;

    counters.length = levelIndex + 1;
    counters[levelIndex] = (counters[levelIndex] || 0) + 1;

    const number = counters.slice(0, levelIndex + 1).join(".");

    return {
      ...h,
      number,
      displayTitle: `${number} ${h.title}`,
    };
  });
}

if (typeof window !== "undefined") {
  window.__addAbbreviationRow = function (btn) {
    const page = btn.closest(".loa-page, #loa-content") || document;
    const tbody = page.querySelector(".abbreviations-table tbody");
    if (!tbody) return;
    const tr = document.createElement("tr");
    tr.className = "abbreviation-row";
    tr.innerHTML = `
      <td class="loa-term-cell" contenteditable="true">NEW</td>
      <td class="loa-meaning-cell" contenteditable="true">Description</td>
      <td class="loa-action-cell" data-pdf-export-exclude="true" style="width: 32px; text-align: center; vertical-align: middle;">
        <button type="button" class="loa-del-btn" title="Remove row" onclick="this.closest('tr').remove()">&times;</button>
      </td>
    `;
    tbody.appendChild(tr);
    const termCell = tr.querySelector(".loa-term-cell");
    if (termCell) termCell.focus();
  };

  window.__syncAndCleanAbbreviations = function (btn) {
    const container = btn.closest('[id$="-report"]') || document.querySelector('[id$="-report"]') || document.body;
    const table = (btn.closest(".loa-page, #loa-content") || document).querySelector(".abbreviations-table");
    if (!table || !container) return;

    // Collect body text (excluding TOC, LOA, and Cover pages)
    const bodyPages = Array.from(container.querySelectorAll(".report-page, .page"))
      .filter((p) => !p.classList.contains("loa-page") && !p.classList.contains("toc-page") && !p.classList.contains("cover-page"));

    const bodyText = (bodyPages.length > 0 ? bodyPages : [container])
      .map((el) => el.textContent || "")
      .join(" ");

    const rows = Array.from(table.querySelectorAll("tbody tr"));
    const unusedItems = [];

    rows.forEach((tr) => {
      const termCell = tr.querySelector(".loa-term-cell") || tr.cells[0];
      const meaningCell = tr.querySelector(".loa-meaning-cell") || tr.cells[1];
      if (!termCell) return;
      const term = termCell.textContent.trim();
      const meaning = meaningCell ? meaningCell.textContent.trim() : "";
      if (!term) return;

      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (!regex.test(bodyText)) {
        unusedItems.push({ term, meaning, tr });
      }
    });

    if (unusedItems.length === 0) {
      alert("Sync complete! All listed abbreviations are present in the report text.");
      return;
    }

    const termListStr = unusedItems
      .map((item) => `• ${item.term}: ${item.meaning}`)
      .join("\n");

    const confirmMessage = `The following ${unusedItems.length} abbreviation(s) were NOT found in the report text:\n\n${termListStr}\n\nDo you want to delete these unused abbreviation(s)?`;

    const userApproved = window.confirm(confirmMessage);
    if (userApproved) {
      unusedItems.forEach((item) => item.tr.remove());
      alert(`Deleted ${unusedItems.length} unused abbreviation(s).`);
    }
  };
}

export function renderAbbreviationsTable(entries) {
  if (!entries || entries.length === 0) return "";

  const uniqueMap = new Map();
  entries.forEach((e) => {
    const key = e.term.trim().toUpperCase();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, { term: e.term.trim(), meaning: e.meaning.trim() });
    }
  });

  const sorted = Array.from(uniqueMap.values()).sort((a, b) =>
    a.term.localeCompare(b.term)
  );

  const rows = sorted
    .map(
      (e) => `
      <tr class="abbreviation-row">
        <td class="loa-term-cell" contenteditable="true">${e.term}</td>
        <td class="loa-meaning-cell" contenteditable="true">${e.meaning}</td>
        <td class="loa-action-cell" data-pdf-export-exclude="true" style="width: 32px; text-align: center; vertical-align: middle;">
          <button type="button" class="loa-del-btn" title="Remove row" onclick="this.closest('tr').remove()">&times;</button>
        </td>
      </tr>
    `
    )
    .join("\n");

  return `
    <h2 class="heading">List of Abbreviations</h2>
    <table class="abbreviations-table">
      <thead>
        <tr>
          <th style="width: 25%;">Abbreviation</th>
          <th>Term/Phrase/Name</th>
          <th class="loa-action-cell" data-pdf-export-exclude="true" style="width: 32px;"></th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div class="loa-edit-controls" data-pdf-export-exclude="true">
      <button type="button" class="loa-add-btn" onclick="window.__addAbbreviationRow && window.__addAbbreviationRow(this)">
        + Add Abbreviation Row
      </button>
      <button type="button" class="loa-clean-btn" onclick="window.__syncAndCleanAbbreviations && window.__syncAndCleanAbbreviations(this)">
        &#8635; Sync & Clean Unused
      </button>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Table Editing Helpers (Dynamic Row Addition / Insertion / Deletion)
// ─────────────────────────────────────────────────────────────────────────────

export function cleanReportEditControls(containerEl) {
  if (!containerEl) return;
  const excludeEls = containerEl.querySelectorAll('.table-action-cell, .table-row-actions, .table-add-row-btn');
  excludeEls.forEach((el) => el.remove());

  // Clean inline position: relative added to td:last-child during edit mode while preserving border style
  const positionedCells = containerEl.querySelectorAll('td[style*="position"]');
  positionedCells.forEach((cell) => {
    cell.style.position = "";
    if (!cell.getAttribute("style")) {
      cell.removeAttribute("style");
    }
  });
}

export function attachTableEditControls(containerEl) {
  if (!containerEl) return;

  // Scrub any legacy/duplicate generic controls first
  cleanReportEditControls(containerEl);

  const tables = containerEl.querySelectorAll("table");
  tables.forEach((table) => {
    // Skip special abbreviations table as it has its own handlers
    if (table.classList.contains("abbreviations-table")) {
      const cells = table.querySelectorAll("td.loa-term-cell, td.loa-meaning-cell");
      cells.forEach((cell) => {
        cell.setAttribute("contenteditable", "true");
        cell.setAttribute("suppresscontenteditablewarning", "true");
      });
      return;
    }

    // Skip layout tables (e.g. cover page header/footer layout tables with border="0" or no-edit class)
    if (table.classList.contains("no-edit") || table.classList.contains("cover-table") || table.classList.contains("doc-header-table") || table.getAttribute("border") === "0") {
      return;
    }

    // Ensure collapse style on table
    table.style.borderCollapse = "collapse";

    // Make all table data cells editable and enforce explicit cell border
    const cells = table.querySelectorAll("td, th");
    cells.forEach((cell) => {
      cell.setAttribute("contenteditable", "true");
      cell.setAttribute("suppresscontenteditablewarning", "true");
      if (!cell.style.border) {
        cell.style.border = "1px solid #000000";
      }
    });

    const allTrs = Array.from(table.querySelectorAll("tr"));
    const bodyTrs = allTrs.filter((tr) => tr.querySelector("td"));

    // Attach overlay action handle inside the LAST cell of each body row
    bodyTrs.forEach((tr) => {
      tr.classList.add("editable-table-row");

      const lastTd = tr.querySelector("td:last-child");
      if (lastTd && !tr.querySelector(".table-row-actions")) {
        lastTd.style.position = "relative";
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "table-row-actions";
        actionsDiv.setAttribute("data-pdf-export-exclude", "true");
        actionsDiv.setAttribute("contenteditable", "false");
        actionsDiv.innerHTML = `
          <button type="button" class="table-row-btn" title="Insert row above" onclick="window.__insertTableRow(this, 'above')">+▲</button>
          <button type="button" class="table-row-btn" title="Insert row below" onclick="window.__insertTableRow(this, 'below')">+▼</button>
          <button type="button" class="table-row-btn btn-del" title="Remove row" onclick="window.__removeTableRow(this)">&times;</button>
        `;
        lastTd.appendChild(actionsDiv);
      }
    });

    // Add "+ Add Row" button below table
    if (!table.nextElementSibling || !table.nextElementSibling.classList.contains("table-add-row-btn")) {
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "table-add-row-btn";
      addBtn.setAttribute("data-pdf-export-exclude", "true");
      addBtn.innerHTML = "+ Add Row";
      addBtn.onclick = function () {
        window.__addTableRowToTable(table);
      };
      if (table.nextSibling) {
        table.parentNode.insertBefore(addBtn, table.nextSibling);
      } else {
        table.parentNode.appendChild(addBtn);
      }
    }
  });
}

if (typeof window !== "undefined") {
  window.__insertTableRow = function (btn, position) {
    const tr = btn.closest("tr");
    if (!tr) return;
    const tbody = tr.parentElement;
    const newTr = tr.cloneNode(true);

    // Remove existing actions div from cloned row to avoid duplication
    const oldActions = newTr.querySelector(".table-row-actions");
    if (oldActions) oldActions.remove();

    // Clear content of contenteditable cells in the cloned row and enforce borders
    const cells = newTr.querySelectorAll("td, th");
    cells.forEach((cell) => {
      cell.setAttribute("contenteditable", "true");
      cell.setAttribute("suppresscontenteditablewarning", "true");
      cell.style.border = "1px solid #000000";
      cell.textContent = "—";
    });

    // Attach fresh actions div to last cell of new row
    const lastTd = newTr.querySelector("td:last-child");
    if (lastTd) {
      lastTd.style.position = "relative";
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "table-row-actions";
      actionsDiv.setAttribute("data-pdf-export-exclude", "true");
      actionsDiv.setAttribute("contenteditable", "false");
      actionsDiv.innerHTML = `
        <button type="button" class="table-row-btn" title="Insert row above" onclick="window.__insertTableRow(this, 'above')">+▲</button>
        <button type="button" class="table-row-btn" title="Insert row below" onclick="window.__insertTableRow(this, 'below')">+▼</button>
        <button type="button" class="table-row-btn btn-del" title="Remove row" onclick="window.__removeTableRow(this)">&times;</button>
      `;
      lastTd.appendChild(actionsDiv);
    }

    if (position === "above") {
      tbody.insertBefore(newTr, tr);
    } else {
      tbody.insertBefore(newTr, tr.nextSibling);
    }

    const firstEditable = newTr.querySelector("td");
    if (firstEditable) firstEditable.focus();
  };

  window.__removeTableRow = function (btn) {
    const tr = btn.closest("tr");
    if (!tr) return;
    const tbody = tr.parentElement;
    const trCount = tbody.querySelectorAll("tr").length;
    if (trCount <= 1) {
      if (!window.confirm("Delete the last remaining row in this table?")) return;
    }
    tr.remove();
  };

  window.__addTableRowToTable = function (tableOrBtn) {
    const table = tableOrBtn.tagName === "TABLE" ? tableOrBtn : tableOrBtn.previousElementSibling;
    if (!table) return;
    const tbody = table.querySelector("tbody") || table;
    const lastTr = tbody.querySelector("tr:last-child");

    if (lastTr) {
      const btn = lastTr.querySelector(".table-row-btn");
      if (btn) {
        window.__insertTableRow(btn, "below");
      } else {
        const newTr = lastTr.cloneNode(true);
        const oldActions = newTr.querySelector(".table-row-actions");
        if (oldActions) oldActions.remove();
        newTr.querySelectorAll("td, th").forEach((cell) => {
          cell.setAttribute("contenteditable", "true");
          cell.style.border = "1px solid #000000";
          cell.textContent = "—";
        });
        const lastTd = newTr.querySelector("td:last-child");
        if (lastTd) {
          lastTd.style.position = "relative";
          const actionsDiv = document.createElement("div");
          actionsDiv.className = "table-row-actions";
          actionsDiv.setAttribute("data-pdf-export-exclude", "true");
          actionsDiv.setAttribute("contenteditable", "false");
          actionsDiv.innerHTML = `
            <button type="button" class="table-row-btn" title="Insert row above" onclick="window.__insertTableRow(this, 'above')">+▲</button>
            <button type="button" class="table-row-btn" title="Insert row below" onclick="window.__insertTableRow(this, 'below')">+▼</button>
            <button type="button" class="table-row-btn btn-del" title="Remove row" onclick="window.__removeTableRow(this)">&times;</button>
          `;
          lastTd.appendChild(actionsDiv);
        }
        tbody.appendChild(newTr);
      }
    }
  };
}

