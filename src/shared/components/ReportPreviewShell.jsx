import React, { useState, useEffect } from "react";
import Icon from "./Icon";
import { exportPdfWithToc } from "../utils/exporter/exportPdf";
import { exportDocx } from "../utils/exporter/exportDocx";
import CircularProgressLoader from "./CircularProgressLoader";
import { resyncReportDom, attachTableEditControls, cleanReportEditControls } from "../reports/utils/tocScanner";

const TODAY = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

function V(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return value;
}

function getNextRevision(currentRev) {
  if (!currentRev) return "1";
  const num = parseInt(currentRev, 10);
  if (!isNaN(num)) {
    return (num + 1).toString();
  }
  // Try character increment (e.g. A -> B, B -> C)
  if (currentRev.length === 1) {
    const charCode = currentRev.charCodeAt(0);
    if ((charCode >= 65 && charCode < 90) || (charCode >= 97 && charCode < 122)) {
      return String.fromCharCode(charCode + 1);
    }
  }
  return currentRev + "_New";
}

export default function ReportPreviewShell({
  reportElementId,
  values,
  onBack,
  onNew,
  onCloneToRevision,
  onSave,
  fname,
  documentDetails = [],
  showStampOption = false,
  railCollapsible = false,
  pdfExportOptions = {},
  children
}) {
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [selectedPageSize, setPageSize] = useState("A4");
  const [showStamp, setShowStamp] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [tempHtml, setTempHtml] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [loaderText, setLoaderText] = useState("Preparing document...");

  // Collapse state for the right download rail panel
  const [railCollapsed, setRailCollapsed] = useState(() => {
    if (!railCollapsible) return false;
    try {
      const saved = localStorage.getItem("forge_rail_collapsed");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleRail = () => {
    if (!railCollapsible) return;
    setRailCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("forge_rail_collapsed", JSON.stringify(next));
      } catch (e) {
        // Ignore Storage block
      }
      return next;
    });
  };

  useEffect(() => {
    let timer = null;

    if (isEditMode) {
      const initControls = () => {
        const reportEl = document.getElementById(reportElementId);
        if (reportEl) {
          attachTableEditControls(reportEl);
        }
      };

      timer = setTimeout(initControls, 100);

      return () => {
        if (timer) clearTimeout(timer);
      };
    } else {
      const reportEl = document.getElementById(reportElementId);
      if (reportEl) {
        cleanReportEditControls(reportEl);
      }
    }
  }, [isEditMode, reportElementId]);

  const handleSaveToDatabase = async () => {
    setIsSavingToDb(true);
    try {
      const reportEl = document.getElementById(reportElementId);
      if (isEditMode && reportEl) {
        resyncReportDom(reportEl);
      }
      const finalHtml = isEditMode 
        ? (reportEl ? reportEl.innerHTML : tempHtml) 
        : (tempHtml || values.custom_html || null);

      if (finalHtml) {
        setTempHtml(finalHtml);
      }

      await onSave({
        ...values,
        custom_html: finalHtml
      });
      setIsSavedToDb(true);
      if (isEditMode) {
        setIsEditMode(false);
      }
    } catch (err) {
      console.error("Failed to save report to database:", err);
      alert("Failed to save report: " + err.message);
      throw err;
    } finally {
      setIsSavingToDb(false);
    }
  };

  const handleDownload = async () => {
    if (selectedFormat !== "pdf") {
      setIsDownloading(true);
      try {
        if (!isSavedToDb) {
          try {
            await handleSaveToDatabase();
          } catch (err) {
            console.warn("Background auto-save failed before download:", err);
          }
        }
        await exportDocx(reportElementId, fname);
      } finally {
        setIsDownloading(false);
      }
      return;
    }

    // PDF Download - Start Circular Progress Loader
    setIsDownloading(true);
    setShowLoader(true);
    setLoaderProgress(0);
    setLoaderText("Initializing PDF engine...");

    // Start simulated progress timer (8 seconds to reach 90%)
    let currentProgress = 0;
    const intervalTime = 100; // ms
    const totalSimulatedTime = 8000; // 8s
    const steps = totalSimulatedTime / intervalTime;
    const increment = 90 / steps;

    const timer = setInterval(() => {
      currentProgress = Math.min(currentProgress + increment, 90);
      setLoaderProgress(Math.round(currentProgress));

      // Premium text status updates
      if (currentProgress < 25) {
        setLoaderText("Rendering document layout...");
      } else if (currentProgress < 50) {
        setLoaderText("Generating the PDF in one pass...");
      } else if (currentProgress < 75) {
        setLoaderText("Adding Table of Contents page numbers...");
      } else {
        setLoaderText(
          pdfExportOptions.includeSolarAppendix
            ? "Merging native appendix pages..."
            : "Finalizing document pages..."
        );
      }
    }, intervalTime);

    try {
      if (!isSavedToDb) {
        try {
          await handleSaveToDatabase();
        } catch (err) {
          console.warn("Background auto-save failed before download:", err);
        }
      }

      // Fetch the PDF blob from the backend helper
      const blob = await exportPdfWithToc(
        reportElementId,
        fname.replace(".docx", ".pdf"),
        selectedPageSize,
        pdfExportOptions
      );

      // Stop simulated timer and snap to 100%
      clearInterval(timer);
      setLoaderProgress(100);
      setLoaderText("Download starting!");

      // Hold briefly to show completed state
      await new Promise((resolve) => setTimeout(resolve, 600));
      setShowLoader(false);

      // Trigger the file download in the browser
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const docTitle = fname.replace(".docx", ".pdf");
      a.download = docTitle.endsWith(".pdf") ? docTitle : `${docTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      clearInterval(timer);
      setShowLoader(false);
      console.error("PDF generation failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveEdits = async () => {
    setIsSaving(true);
    try {
      const reportEl = document.getElementById(reportElementId);

      // Re-sync TOC, List of Tables, List of Figures, and heading numbering
      // against what the user has left in the live DOM before snapshotting.
      if (reportEl) {
        resyncReportDom(reportEl);
      }

      const finalHtml = reportEl ? reportEl.innerHTML : tempHtml;
      
      // Update local state immediately so React renders finalHtml in Preview
      setTempHtml(finalHtml);

      await onSave({
        ...values,
        custom_html: finalHtml
      });
      setIsSavedToDb(true);
      setIsEditMode(false);
    } catch (err) {
      alert("Failed to save edits: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdits = () => {
    setTempHtml(null);
    setIsEditMode(false);
  };

  const handleRegenerate = async () => {
    if (confirm("Are you sure you want to regenerate the report? This will discard all your custom content edits and rebuild it from the input forms.")) {
      setIsSaving(true);
      try {
        await onSave({
          ...values,
          custom_html: null
        });
        setTempHtml(null);
        setIsSavedToDb(true);
        setIsEditMode(false);
      } catch (err) {
        alert("Failed to regenerate report: " + err.message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
      <style>{`
        @keyframes loadingBarProgress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      {isDownloading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: 'rgba(14, 165, 233, 0.1)',
          overflow: 'hidden',
          zIndex: 9999
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'var(--accent, #0ea5e9)',
            animation: 'loadingBarProgress 2s infinite ease-in-out'
          }} />
        </div>
      )}
      {/* success banner */}
      <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} disabled={isEditMode}>
          <Icon name="arrowL" size={14} />Edit inputs
        </button>
        
        {isEditMode ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginLeft: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>Editing Report Content...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginLeft: 4 }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>
              <Icon name="check" size={15} stroke={3} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Report generated</span>
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {isEditMode ? (
            <>
              <button className="btn btn-soft btn-sm" onClick={handleCancelEdits} disabled={isSaving}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveEdits} disabled={isSaving}>
                <Icon name="save" size={14} />{isSaving ? "Saving..." : "Save Edits"}
              </button>
            </>
          ) : (
            <>
              {(values.custom_html || tempHtml) && (
                <button className="btn btn-soft btn-sm" style={{ color: 'var(--error, #ef4444)' }} onClick={handleRegenerate} disabled={isSaving}>
                  <Icon name="refresh" size={14} />Regenerate
                </button>
              )}
              <button className="btn btn-soft btn-sm" onClick={() => setIsEditMode(true)} disabled={isSaving}>
                <Icon name="edit" size={14} />Edit Report
              </button>
              <button className="btn btn-soft btn-sm" onClick={onNew} disabled={isSaving}>
                <Icon name="plus" size={14} />New report
              </button>
              {onCloneToRevision && (
                <button
                  className="btn btn-soft btn-sm"
                  onClick={() => {
                    const currentRev = values.revision || values.REVISION || "0";
                    const suggestedRev = getNextRevision(currentRev);
                    const newRev = prompt(`Enter new revision code (current is ${currentRev}):`, suggestedRev);
                    if (newRev === null) return;
                    
                    const desc = prompt("Enter description for the new revision:", "Revised Version");
                    if (desc === null) return;
                    
                    onCloneToRevision(newRev.trim(), desc.trim());
                  }}
                  disabled={isSaving}
                >
                  <Icon name="copy" size={14} />New Revision
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={handleDownload} disabled={isSaving || isDownloading}>
                {isDownloading ? (
                  <>
                    <span style={{
                      display: 'inline-block',
                      width: 12,
                      height: 12,
                      border: '2px solid currentColor',
                      borderRightColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.75s linear infinite',
                      marginRight: 6
                    }} />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Icon name="download" size={14} />Download .{selectedFormat}
                  </>
                )}
              </button>
            </>
          )}

          {railCollapsible && (
            <button
              onClick={toggleRail}
              className="btn btn-ghost btn-sm"
              style={{ padding: 0, width: 28, height: 28, display: 'grid', placeItems: 'center', marginLeft: 4 }}
              title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon name={railCollapsed ? "arrowL" : "arrowR"} size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main layout wrapper */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* doc canvas */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-2)', padding: '34px 0' }}>
          <div style={{ display: 'grid', placeItems: 'start center' }} className={`fade-up preview-size-${selectedPageSize.toLowerCase()}`}>
            {children({
              showStamp,
              isEditMode,
              tempHtml,
              setTempHtml
            })}
          </div>
        </div>

        {/* download rail */}
        <div style={{
          width: railCollapsed ? 64 : 320,
          borderLeft: '1px solid var(--border)',
          background: 'var(--surface)',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: railCollapsed ? '20px 0' : 20,
          transition: 'width 0.25s ease, padding 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: railCollapsed ? 'center' : 'stretch',
          flexShrink: 0
        }}>
          {railCollapsed ? (
            /* Collapsed State View */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
              <button
                className={isSavedToDb ? "btn" : "btn btn-primary"}
                onClick={handleSaveToDatabase}
                disabled={isSavingToDb || isSavedToDb}
                title={isSavingToDb ? "Saving..." : isSavedToDb ? "Saved to Database" : "Save Report to Database"}
                style={{ 
                  width: 40, 
                  height: 40, 
                  padding: 0, 
                  display: 'grid', 
                  placeItems: 'center', 
                  borderRadius: 8,
                  background: isSavedToDb ? 'var(--green-soft)' : undefined,
                  color: isSavedToDb ? 'var(--green-text)' : undefined,
                  border: isSavedToDb ? '1px solid var(--green-line)' : undefined,
                  cursor: isSavedToDb ? 'default' : 'pointer'
                }}
              >
                <Icon name={isSavedToDb ? "check" : "save"} size={16} />
              </button>

              <button
                className="btn btn-soft"
                onClick={handleDownload}
                disabled={isSaving || isDownloading}
                title={isDownloading ? "Downloading..." : `Download standard document: ${fname}`}
                style={{ width: 40, height: 40, padding: 0, display: 'grid', placeItems: 'center', borderRadius: 8 }}
              >
                {isDownloading ? (
                  <span style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    border: '2px solid var(--accent, #0ea5e9)',
                    borderRightColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.75s linear infinite'
                  }} />
                ) : (
                  <Icon name="download" size={16} />
                )}
              </button>

              <div
                title="Generated from coded template STR v2.4. Formulae and static text are locked to the approved engineering standard."
                style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center', cursor: 'help' }}
              >
                <Icon name="shield" size={16} />
              </div>
            </div>
          ) : (
            /* Expanded State View */
            <>
              <div className="card" style={{ padding: 16, borderColor: 'var(--accent-line)' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 44, height: 52, borderRadius: 6, background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                    <Icon name="fileText" size={22} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="label-eyebrow">Standard document name</div>
                    <div className="mono" style={{ fontSize: 12, fontWeight: 600, marginTop: 4, wordBreak: 'break-all', lineHeight: 1.4 }}>{fname}</div>
                  </div>
                </div>

                <button 
                  className={isSavedToDb ? "btn" : "btn btn-primary"} 
                  style={{ 
                    width: '100%', 
                    marginTop: 14, 
                    background: isSavedToDb ? 'var(--green-soft)' : undefined,
                    color: isSavedToDb ? 'var(--green-text)' : undefined,
                    border: isSavedToDb ? '1px solid var(--green-line)' : undefined,
                    cursor: isSavedToDb ? 'default' : 'pointer'
                  }} 
                  onClick={handleSaveToDatabase} 
                  disabled={isSavingToDb || isSavedToDb}
                >
                  <Icon name={isSavedToDb ? "check" : "save"} size={15} />
                  {isSavingToDb ? "Saving..." : isSavedToDb ? "Saved to Database" : "Save Report to Database"}
                </button>

                <button 
                  className="btn btn-soft" 
                  style={{ 
                    width: '100%', 
                    marginTop: 8 
                  }} 
                  onClick={handleDownload}
                  disabled={isSaving || isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <span style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        border: '2px solid var(--accent, #0ea5e9)',
                        borderRightColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.75s linear infinite',
                        marginRight: 6
                      }} />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Icon name="download" size={15} />Download
                    </>
                  )}
                </button>

                {/* Dynamic Page Size Control */}
                <div className="segmented-control" style={{ marginTop: "10px" }}>
                  <div className={`segmented-control-pill ${selectedPageSize === "Letter" ? "left" : "right"}`} />
                  <div
                    onClick={() => setPageSize("Letter")}
                    className={`segmented-control-option ${selectedPageSize === "Letter" ? "active" : ""}`}
                  >
                    Letter
                  </div>
                  <div
                    onClick={() => setPageSize("A4")}
                    className={`segmented-control-option ${selectedPageSize === "A4" ? "active" : ""}`}
                  >
                    A4
                  </div>
                </div>

                {/* Stamp Certification switch */}
                {showStampOption && (
                  <>
                    <div className="label-eyebrow" style={{ marginTop: "14px", marginBottom: "6px" }}>Certification Stamp</div>
                    <div className="segmented-control">
                      <div className={`segmented-control-pill ${!showStamp ? "left" : "right"}`} />
                      <div
                        onClick={() => setShowStamp(false)}
                        className={`segmented-control-option ${!showStamp ? "active" : ""}`}
                      >
                        No Stamp
                      </div>
                      <div
                        onClick={() => setShowStamp(true)}
                        className={`segmented-control-option ${showStamp ? "active" : ""}`}
                      >
                        Add Stamp
                      </div>
                    </div>
                  </>
                )}

                {/* Format selection */}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    className="btn btn-soft btn-sm"
                    style={{
                      flex: 1,
                      color: selectedFormat === "docx" ? "var(--accent-text)" : "var(--text-3)",
                      background: selectedFormat === "docx" ? "var(--accent-soft)" : "transparent",
                      border: selectedFormat === "docx" ? "1px solid var(--accent-line)" : "1px solid transparent"
                    }}
                    onClick={() => setSelectedFormat("docx")}
                  >
                    .docx
                  </button>
                  <button
                    className="btn btn-soft btn-sm"
                    style={{
                      flex: 1,
                      color: selectedFormat === "pdf" ? "var(--accent-text)" : "var(--text-3)",
                      background: selectedFormat === "pdf" ? "var(--accent-soft)" : "transparent",
                      border: selectedFormat === "pdf" ? "1px solid var(--accent-line)" : "1px solid transparent"
                    }}
                    onClick={() => setSelectedFormat("pdf")}
                  >
                    .pdf
                  </button>
                </div>
              </div>

              {/* Document details table */}
              {documentDetails.length > 0 && (
                <>
                  <div className="label-eyebrow" style={{ marginTop: 22, marginBottom: 10 }}>Document details</div>
                  <div style={{ display: 'grid', gap: 1, background: 'var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {documentDetails.map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, background: 'var(--surface)', padding: '9px 12px' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{k}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, textAlign: 'right' }}>{V(v)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 9, marginTop: 18, padding: '11px 13px', background: 'var(--accent-soft)', borderRadius: 'var(--r-md)' }}>
                <Icon name="shield" size={14} style={{ color: 'var(--accent-text)', marginTop: 1, flex: 'none' }} />
                <div style={{ fontSize: 11.5, color: 'var(--accent-text)', lineHeight: 1.5 }}>Generated from coded template <b>STR v2.4</b>. Formulae and static text are locked to the approved engineering standard.</div>
              </div>
            </>
          )}
        </div>
      </div>

      <CircularProgressLoader
        progress={loaderProgress}
        loadingText={loaderText}
        visible={showLoader}
        fname={fname}
      />
    </div>
  );
}
