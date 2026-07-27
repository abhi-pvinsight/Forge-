"""Common PDF generation helper using WeasyPrint layout engine.

The front‑end `exportPdf` function POSTs JSON `{ html: "<full html>" }` to
`/api/generate-pdf`. This module renders PDF bytes locally using WeasyPrint.
"""
import fitz  # PyMuPDF
from bs4 import BeautifulSoup
import asyncio
import time
import gc
import psutil
import os
import json
from dotenv import load_dotenv

import sys

# Register MSYS2 GTK DLL directory on Windows Python 3.8+
if sys.platform == "win32":
    possible_gtk_paths = [
        r"C:\msys64\ucrt64\bin",
        r"C:\msys64\mingw64\bin",
        r"C:\Program Files\GTK3-Runtime Win64\bin",
    ]
    for gtk_path in possible_gtk_paths:
        if os.path.exists(gtk_path):
            try:
                os.add_dll_directory(gtk_path)
                os.environ["PATH"] = gtk_path + os.pathsep + os.environ.get("PATH", "")
            except Exception:
                pass

# Conditional WeasyPrint and xhtml2pdf imports to prevent startup crashes when running locally on Windows without GTK
try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError) as e:
    WEASYPRINT_AVAILABLE = False
    print(f"[WARNING] WeasyPrint could not be loaded (missing GTK libraries on Windows?): {e}")

try:
    from xhtml2pdf import pisa
    XHTML2PDF_AVAILABLE = True
except ImportError:
    XHTML2PDF_AVAILABLE = False
    print("[WARNING] xhtml2pdf could not be imported.")

# Load local environment variables from the absolute path of the root .env file
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(os.path.dirname(current_dir))
dotenv_path = os.path.join(root_dir, ".env")
load_dotenv(dotenv_path=dotenv_path)

def _render_pdf_locally_sync(html: str, fmt: str) -> bytes:
    """
    Synchronous WeasyPrint layout and rendering.
    Falls back to xhtml2pdf if WeasyPrint C-libraries (GTK/Pango/Cairo) are not loaded locally.
    Executed in a worker thread to keep the event loop non-blocking.
    """
    # 1. Prefer WeasyPrint (Production/Dockerized or local with GTK)
    if WEASYPRINT_AVAILABLE:
        if not fmt:
            fmt = "A4"
        css_string = f"@page {{ size: {fmt}; }}"
        stylesheets = [CSS(string=css_string)]
        return HTML(string=html).write_pdf(stylesheets=stylesheets)

    # 2. Fall back to pure-Python xhtml2pdf (Local development without GTK)
    if XHTML2PDF_AVAILABLE:
        print("[INFO] WeasyPrint GTK system libraries not found. Rendering locally via xhtml2pdf...")
        import io
        result_stream = io.BytesIO()
        pdf = pisa.pisaDocument(io.BytesIO(html.encode("utf-8")), result_stream)
        if not pdf.err:
            return result_stream.getvalue()
        else:
            raise RuntimeError(f"xhtml2pdf rendering failed with error code: {pdf.err}")

    # 3. Last Resort Fallback (neither WeasyPrint nor xhtml2pdf is available)
    raise RuntimeError(
        "No PDF rendering library (WeasyPrint or xhtml2pdf) is available. "
        "Please run 'pip install xhtml2pdf' inside your virtual environment to enable local fallback."
    )

async def render_html_to_pdf_locally(html: str, format: str = "A4") -> bytes:
    """Render HTML string to PDF bytes locally using WeasyPrint or xhtml2pdf in a worker thread."""
    return await asyncio.to_thread(_render_pdf_locally_sync, html, format)


def _container_memory_mb():
    """Return cgroup memory usage when running inside a Linux container."""
    for path in (
        "/sys/fs/cgroup/memory.current",
        "/sys/fs/cgroup/memory/memory.usage_in_bytes",
    ):
        try:
            with open(path, "r", encoding="ascii") as memory_file:
                return int(memory_file.read().strip()) / 1024 / 1024
        except (FileNotFoundError, OSError, ValueError):
            continue
    return None


def log_memory(label: str):
    """Log RSS for Python and all currently running child processes."""
    python_process = psutil.Process(os.getpid())
    processes = [python_process]
    try:
        processes.extend(python_process.children(recursive=True))
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        pass

    python_rss = 0
    child_rss = 0
    live_processes = 0
    for index, process in enumerate(processes):
        try:
            rss = process.memory_info().rss
            if index == 0:
                python_rss = rss
            else:
                child_rss += rss
            live_processes += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    python_mb = python_rss / 1024 / 1024
    child_mb = child_rss / 1024 / 1024
    tree_mb = python_mb + child_mb
    container_mb = _container_memory_mb()
    container_text = (
        f", container/cgroup={container_mb:.1f} MB"
        if container_mb is not None
        else ""
    )
    print(
        f"[MEMORY] {label}: tree RSS={tree_mb:.1f} MB "
        f"(Python={python_mb:.1f} MB, children={child_mb:.1f} MB, "
        f"child processes={max(0, live_processes - 1)}{container_text})"
    )
    return container_mb if container_mb is not None else tree_mb


async def generate_pdf_from_html(html: str, browser=None, *, format: str = "A4") -> bytes:
    """Render *html* locally using WeasyPrint layout engine."""
    t0 = time.time()
    try:
        pdf_bytes = await render_html_to_pdf_locally(html, format=format)
        t1 = time.time()
        print(f"[PROFILE] generate_pdf_from_html (locally via WeasyPrint) took: {t1 - t0:.3f}s")
        return pdf_bytes
    except Exception as e:
        print(f"[ERROR] generate_pdf_from_html failed: {e}")
        raise


def generate_pdf_sync(html: str, *, format: str = "A4") -> bytes:
    """Blocking wrapper around :func:`generate_pdf_from_html`."""
    return asyncio.run(generate_pdf_from_html(html, format=format))


def collect_headings_from_html(html: str):
    """Generic — works for any report, collects headings, tables, and figures."""
    soup = BeautifulSoup(html, "html.parser")
    
    headings = [
        {"title": h.get_text(strip=True), "level": int(h.get("data-toc-level", 1))}
        for h in soup.select(".toc-heading")
    ]
    
    tables = [
        {"title": t.get_text(strip=True), "level": 1}
        for t in soup.select(".toc-table-caption")
    ]
    
    figures = [
        {"title": f.get_text(strip=True), "level": 1}
        for f in soup.select(".toc-figure-caption")
    ]
    
    return headings + tables + figures

import re

def clean_text(text: str) -> str:
    """Collapse all whitespace groups (newlines, tabs, spaces) into a single space and strip."""
    return re.sub(r"\s+", " ", text).strip()

def extract_toc_entries(pdf_bytes: bytes, headings: list):
    """Find which page each heading text appears on."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    entries = []
    
    cleaned_headings = [
        {
            "title": clean_text(h["title"]),
            "original_title": h["title"],
            "level": h["level"]
        }
        for h in headings
    ]
    
    page_texts = [clean_text(doc[i].get_text()) for i in range(len(doc))]
    
    body_start_page = 1
    
    if cleaned_headings:
        first_title = cleaned_headings[0]["title"]
        occurrences = [
            i for i, pt in enumerate(page_texts) if first_title in pt
        ]
        if len(occurrences) >= 2:
            body_start_page = occurrences[1] + 1
        elif len(occurrences) == 1:
            body_start_page = occurrences[0] + 1
    
    body_start_page = max(3, body_start_page)
    print(f"[DEBUG] Dynamically detected body_start_page as {body_start_page}")

    for h in cleaned_headings:
        matched = False
        start_search_idx = max(0, body_start_page - 1)
        
        for page_num in range(start_search_idx, len(doc)):
            if h["title"] in page_texts[page_num]:
                entries.append({
                    "title": h["original_title"],
                    "level": h["level"],
                    "page": page_num + 1,
                })
                matched = True
                break
        
        if not matched:
            for page_num in range(start_search_idx, len(doc)):
                if h["title"].lower() in page_texts[page_num].lower():
                    entries.append({
                        "title": h["original_title"],
                        "level": h["level"],
                        "page": page_num + 1,
                    })
                    matched = True
                    break
        
        if not matched:
            print(f"[DEBUG] Could not find heading on any page: {h['title']!r}")
            entries.append({
                "title": h["original_title"],
                "level": h["level"],
                "page": None,
            })
                    
    doc.close()
    return entries


def render_toc_html(entries: list) -> str:
    """Generic — builds dotted-leader TOC markup from any entries list."""
    rows = []
    for e in entries:
        level_class = f"toc-level-{e['level']}"
        rows.append(
            f'<div class="toc-row {level_class}">'
            f'<span class="toc-title">{e["title"]}</span>'
            f'<span class="toc-dots"></span>'
            f'<span class="toc-page-num">{e["page"]}</span>'
            f'</div>'
        )
    return "\n".join(rows)    


pdf_generation_semaphore = asyncio.Semaphore(1)
TOC_PAGE_MARKER = "@@"


def _inject_toc_markers(soup: BeautifulSoup) -> list:
    """Reserve TOC number cells and return their titles in document order."""
    page_num_spans = soup.select(".toc-page-num")
    marker_titles = []
    for span in page_num_spans:
        row = span.find_parent(class_="toc-row")
        title_span = row.select_one(".toc-title") if row else None
        marker_titles.append(clean_text(title_span.get_text()) if title_span else "")
        span.clear()
        span.append(TOC_PAGE_MARKER)
    return marker_titles


def _patch_toc_page_numbers(
    pdf_bytes: bytes, toc_entries: list, expected_marker_count: int
) -> bytes:
    """Replace TOC markers in an existing PDF without re-rendering HTML."""
    if expected_marker_count == 0:
        return pdf_bytes

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        marker_locations = []
        for page_index, page in enumerate(doc):
            for rect in page.search_for(TOC_PAGE_MARKER):
                marker_locations.append((page_index, rect))

        marker_locations.sort(key=lambda item: (item[0], item[1].y0, item[1].x0))
        if len(marker_locations) != expected_marker_count:
            raise RuntimeError(
                "TOC marker count mismatch: "
                f"expected {expected_marker_count}, found {len(marker_locations)}"
            )
        if len(toc_entries) != expected_marker_count:
            raise RuntimeError(
                "TOC entry count mismatch: "
                f"expected {expected_marker_count}, got {len(toc_entries)}"
            )

        locations_by_page = {}
        for entry, (page_index, marker_rect) in zip(toc_entries, marker_locations):
            page = doc[page_index]
            redact_rect = fitz.Rect(
                marker_rect.x0 - 0.5,
                marker_rect.y0 - 0.5,
                marker_rect.x1 + 0.5,
                marker_rect.y1 + 0.5,
            )
            page.add_redact_annot(redact_rect, fill=(1, 1, 1), cross_out=False)
            locations_by_page.setdefault(page_index, []).append((entry, redact_rect))

        for page_index in locations_by_page:
            doc[page_index].apply_redactions()

        injected_count = 0
        for page_index, replacements in locations_by_page.items():
            page = doc[page_index]
            for entry, marker_rect in replacements:
                page_number = entry.get("page")
                if page_number is None:
                    continue
                text_rect = fitz.Rect(
                    marker_rect.x0 - 2,
                    marker_rect.y0 - 2,
                    marker_rect.x1 + 2,
                    marker_rect.y1 + 4,
                )
                spare_height = page.insert_textbox(
                    text_rect,
                    str(page_number),
                    fontname="helv",
                    fontsize=9,
                    color=(30 / 255, 41 / 255, 59 / 255),
                    align=fitz.TEXT_ALIGN_RIGHT,
                    overlay=True,
                )
                if spare_height < 0:
                    print(
                        f"[DEBUG ERROR] page.insert_textbox failed: "
                        f"text='{page_number}', "
                        f"rect=({text_rect.x0:.2f}, {text_rect.y0:.2f}, {text_rect.x1:.2f}, {text_rect.y1:.2f}), "
                        f"width={text_rect.width:.2f}, height={text_rect.height:.2f}, "
                        f"fontname='helv', fontsize=9, "
                        f"returned spare_height={spare_height}"
                    )
                    raise RuntimeError(
                        f"TOC page number {page_number} did not fit its marker cell (spare_height={spare_height})"
                    )
                injected_count += 1

        print(
            f"[PROFILE] Patched {injected_count}/{expected_marker_count} "
            "TOC page numbers directly in the PDF"
        )
        return doc.tobytes(garbage=3, deflate=True)
    finally:
        doc.close()


def merge_pdf_documents(main_pdf: bytes, appendix_pdf: bytes) -> bytes:
    """Append a native PDF to the main report without rasterizing its pages."""
    if not appendix_pdf:
        return main_pdf

    main_doc = fitz.open(stream=main_pdf, filetype="pdf")
    appendix_doc = fitz.open(stream=appendix_pdf, filetype="pdf")
    try:
        appendix_pages = len(appendix_doc)
        target_rect = main_doc[-1].rect
        for page_number in range(appendix_pages):
            target_page = main_doc.new_page(
                width=target_rect.width,
                height=target_rect.height,
            )
            target_page.show_pdf_page(
                target_page.rect,
                appendix_doc,
                page_number,
                keep_proportion=True,
            )
        merged_pdf = main_doc.tobytes(garbage=3, deflate=True)
        print(
            f"[PROFILE] Merged {appendix_pages} native appendix PDF pages "
            "at the main report page size"
        )
        return merged_pdf
    finally:
        appendix_doc.close()
        main_doc.close()


async def generate_pdf_with_toc(html: str, browser=None, *, format: str = "Letter") -> bytes:
    """Generate a PDF using WeasyPrint layout engine while preserving TOC patching."""
    async with pdf_generation_semaphore:
        return await _generate_pdf_with_toc_unlocked(html, browser, format=format)


async def _generate_pdf_with_toc_unlocked(
    html: str, browser=None, *, format: str = "Letter"
) -> bytes:
    t_start = time.time()
    log_memory("Function start")

    soup = BeautifulSoup(html, "html.parser")
    headings = [
        {"title": h.get_text(strip=True), "level": int(h.get("data-toc-level", 1))}
        for h in soup.select(".toc-heading")
    ]
    tables = [
        {"title": t.get_text(strip=True), "level": 1}
        for t in soup.select(".toc-table-caption")
    ]
    figures = [
        {"title": f.get_text(strip=True), "level": 1}
        for f in soup.select(".toc-figure-caption")
    ]
    headings = headings + tables + figures
    marker_titles = _inject_toc_markers(soup)
    marker_count = len(marker_titles)
    render_html = str(soup)
    del soup

    t_parse = time.time()
    print(
        f"[PROFILE] BS4 collect headings + TOC markers took: "
        f"{t_parse - t_start:.3f}s (Headings: {len(headings)}, markers: {marker_count})"
    )
    log_memory("After BS4 parse + marker injection")

    rendered_pdf = None
    t_render_start = time.time()
    try:
        rendered_pdf = await render_html_to_pdf_locally(render_html, format=format)
        del render_html
        t_render = time.time()
        print(f"[PROFILE] WeasyPrint render complete: {t_render - t_render_start:.3f}s")
    except Exception as e:
        print(f"[ERROR] WeasyPrint render failed: {e}")
        raise RuntimeError(f"WeasyPrint render failed: {e}") from e
    finally:
        gc.collect()
        log_memory("After WeasyPrint rendering + gc.collect()")

    if rendered_pdf is None:
        raise RuntimeError("WeasyPrint did not produce a PDF")

    print("[PROFILE] Starting PyMuPDF TOC scan and in-place patch...")
    t_scan = time.time()
    toc_entries = extract_toc_entries(rendered_pdf, headings)
    page_lookup = {
        clean_text(entry["title"]): entry.get("page")
        for entry in toc_entries
        if entry.get("page") is not None
    }
    toc_replacements = [
        {"title": title, "page": page_lookup.get(title)}
        for title in marker_titles
    ]
    final_pdf = _patch_toc_page_numbers(
        rendered_pdf, toc_replacements, marker_count
    )
    del rendered_pdf
    gc.collect()
    t_done = time.time()
    matched_count = sum(
        entry.get("page") is not None for entry in toc_replacements
    )
    print(
        f"[PROFILE] PyMuPDF TOC patch complete: {t_done - t_scan:.3f}s "
        f"(TOC rows matched: {matched_count}/{len(toc_replacements)})"
    )
    log_memory("After TOC patch")
    print(
        f"[PROFILE] generate_pdf_with_toc grand total time: "
        f"{t_done - t_start:.3f}s"
    )
    return final_pdf
