import React, { useState, useEffect } from "react";
import Icon from "./Icon";
import { exportPdfWithToc } from "../utils/exporter/exportPdf";
import { exportDocx } from "../utils/exporter/exportDocx";
import CircularProgressLoader from "./CircularProgressLoader";
import { resyncReportDom, attachTableEditControls, cleanReportEditControls } from "../reports/utils/tocScanner";
import ReviewCommentsModal from "../../features/reports/components/ReviewCommentsModal";
import CloneOptionsModal from "../../features/reports/components/CloneOptionsModal";

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
  user,
  reportId,
  onBack,
  onNew,
  onCloneToRevision,
  onAdvanceStage,
  onCloneToNewProject,
  onSave,
  fname,
  documentDetails = [],
  showStampOption = false,
  railCollapsible = false,
  pdfExportOptions = {},
  children
}) {
  const isReviewer = 
    user?.role === 'reviewer' || 
    user?.role === 'admin' || 
    user?.isReviewer === true || 
    user?.isAdmin === true || 
    (user?.email || '').toLowerCase().trim() === 'abhaypratap.singh@pvinsightinc.com';

  const [currentStatus, setCurrentStatus] = useState(() => values?.status || 'draft');

  useEffect(() => {
    if (values?.status) {
      setCurrentStatus(values.status);
    }
  }, [values?.status]);

  const normStatus = (currentStatus || '').toString().toLowerCase().trim();
  const isApproved = normStatus === 'approved';
  const isUnderReview = normStatus === 'in_review' || normStatus === 'under_review';
  const isChangesRequested = normStatus === 'changes_requested';
  const isDraft = !isApproved && !isUnderReview && !isChangesRequested;
  const isHistoricalRecord = values?.is_current_version === false;

  // Dynamic Ball-Ownership Token:
  // Reviewer has the ball when under review; Creator has the ball during draft or requested changes.
  const creatorHasBall = isDraft || isChangesRequested;
  const reviewerHasBall = isUnderReview;
  const hasBall = (isReviewer && reviewerHasBall) || creatorHasBall;
  const canEdit = !isHistoricalRecord && !isApproved && hasBall;

  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [selectedPageSize, setPageSize] = useState("A4");
  const [showStamp, setShowStamp] = useState(false);

  const [showCloneModal, setShowCloneModal] = useState(false);
  const [activeSnapshotVersion, setActiveSnapshotVersion] = useState(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [tempHtml, setTempHtml] = useState(() => values?.custom_html || values?.customHtml || null);

  useEffect(() => {
    if (values?.custom_html || values?.customHtml) {
      setTempHtml(values.custom_html || values.customHtml);
    }
  }, [values?.custom_html, values?.customHtml]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [isSendingToReviewer, setIsSendingToReviewer] = useState(false);
  const [isSentToReviewer, setIsSentToReviewer] = useState(() => isUnderReview);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [loaderText, setLoaderText] = useState("Preparing document...");

  useEffect(() => {
    if (values?.status === 'in_review' || values?.status === 'under_review') {
      setIsSentToReviewer(true);
    }
  }, [values?.status]);

  const handleSendToReviewer = async () => {
    setIsSendingToReviewer(true);
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

      setCurrentStatus('in_review');

      await onSave({
        ...values,
        status: 'in_review',
        assigned_reviewer: values.assignedReviewer || values.assigned_reviewer || 'Senior Reviewer',
        assigned_creator: values.assignedCreator || values.assigned_creator || 'Creator',
        custom_html: finalHtml
      });

      setIsSavedToDb(true);
      setIsSentToReviewer(true);
      if (isEditMode) {
        setIsEditMode(false);
      }
      alert("Report successfully submitted to Reviewer! The status is now 'Under Review' and it appears in the review cycle.");
    } catch (err) {
      console.error("Failed to send report to reviewer:", err);
      alert("Failed to send report to reviewer: " + err.message);
    } finally {
      setIsSendingToReviewer(false);
    }
  };

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
      {/* Historical snapshot banner if viewing a past version */}
      {(activeSnapshotVersion || isHistoricalRecord) && (
        <div style={{ padding: '10px 24px', background: 'rgba(245, 158, 11, 0.15)', borderBottom: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>
            <Icon name="history" size={16} />
            <span>
              Viewing Historical Snapshot: <strong>v{activeSnapshotVersion?.version_number || values?.version_number || activeSnapshotVersion?.revision || values?.revision}</strong>
              {' '}({activeSnapshotVersion?.version_notes || values?.version_notes || 'Past version copy'}) — Read-Only
            </span>
          </div>
          {activeSnapshotVersion && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setActiveSnapshotVersion(null);
                setTempHtml(null);
              }}
              style={{ fontSize: 12, padding: '4px 12px' }}
            >
              Return to Active Version
            </button>
          )}
        </div>
      )}
      {/* status banner & actions */}
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'nowrap',
          overflowX: 'auto',
          minHeight: 56,
        }}
      >
        {/* Left Action: Back/Dashboard */}
        {onBack ? (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onBack}
            disabled={isEditMode}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <Icon name="arrowL" size={14} /> Back
          </button>
        ) : onNew ? (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onNew}
            disabled={isEditMode}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <Icon name="arrowL" size={14} /> Dashboard
          </button>
        ) : null}

        {/* Status Pill Badge */}
        {isEditMode ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--accent)',
              background: 'rgba(14, 165, 233, 0.1)',
              padding: '4px 12px',
              borderRadius: 99,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Icon name="edit" size={13} /> Editing Report Content...
          </span>
        ) : isApproved ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#15803d',
              background: '#dcfce7',
              padding: '4px 12px',
              borderRadius: 99,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Icon name="check" size={13} /> Approved Report
          </span>
        ) : isChangesRequested ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#d97706',
              background: '#fef3c7',
              padding: '4px 12px',
              borderRadius: 99,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Icon name="messageSquare" size={13} /> Revisions Requested
          </span>
        ) : isUnderReview ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#0284c7',
              background: '#e0f2fe',
              padding: '4px 12px',
              borderRadius: 99,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Icon name="send" size={13} /> Under Review
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#475569',
              background: '#f1f5f9',
              padding: '4px 12px',
              borderRadius: 99,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Icon name="fileText" size={13} /> Draft Report
          </span>
        )}

        {/* Right Actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {isEditMode ? (
            <>
              <button className="btn btn-soft btn-sm" onClick={handleCancelEdits} disabled={isSaving} style={{ whiteSpace: 'nowrap' }}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveEdits} disabled={isSaving} style={{ whiteSpace: 'nowrap' }}>
                <Icon name="save" size={14} />{isSaving ? "Saving..." : "Save Edits"}
              </button>
            </>
          ) : (
            <>
              {canEdit && (values.custom_html || tempHtml) && (
                <button
                  className="btn btn-soft btn-sm"
                  style={{ color: 'var(--error, #ef4444)', whiteSpace: 'nowrap' }}
                  onClick={handleRegenerate}
                  disabled={isSaving}
                >
                  <Icon name="refresh" size={14} /> Regenerate
                </button>
              )}

              {canEdit && onBack && (
                <button
                  className="btn btn-soft btn-sm"
                  onClick={onBack}
                  disabled={isSaving}
                  title="Edit input parameters"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <Icon name="edit" size={14} /> Edit Form
                </button>
              )}

              {canEdit && !activeSnapshotVersion && (
                <button
                  className="btn btn-soft btn-sm"
                  onClick={() => setIsEditMode(true)}
                  disabled={isSaving}
                  title="Edit document content directly in preview"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <Icon name="fileText" size={14} /> Edit Report
                </button>
              )}

              {(onAdvanceStage || onCloneToNewProject || onCloneToRevision) && (
                <button
                  className="btn btn-soft btn-sm"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={() => setShowCloneModal(true)}
                  disabled={isSaving}
                  title="Advance milestone stage or clone equipment specs to a new project"
                >
                  <Icon name="copy" size={14} /> {isApproved ? "Advance / Clone" : "Clone"}
                </button>
              )}

              {/* Review & Decision modal trigger */}
              {!isHistoricalRecord && !isApproved && (
                <button
                  className="btn btn-soft btn-sm"
                  style={{
                    background: isReviewer ? '#3b82f6' : isChangesRequested ? '#fef3c7' : '#e0f2fe',
                    color: isReviewer ? '#ffffff' : isChangesRequested ? '#b45309' : '#0284c7',
                    border: '1px solid ' + (isReviewer ? '#2563eb' : isChangesRequested ? '#fde68a' : '#bae6fd'),
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap'
                  }}
                  onClick={() => setShowReviewModal(true)}
                  title={isReviewer ? "Review document and post decision" : "View reviewer comments & notes"}
                >
                  <Icon name="messageSquare" size={14} />
                  <span>{isReviewer ? "Review & Decision" : "Comments"}</span>
                </button>
              )}

              {/* Submit to Reviewer button */}
              {!isHistoricalRecord && !isApproved && (isDraft || isChangesRequested) && (
                <button
                  className="btn btn-soft btn-sm"
                  style={{
                    background: '#e0f2fe',
                    color: '#0284c7',
                    border: '1px solid #bae6fd',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}
                  onClick={handleSendToReviewer}
                  disabled={isSaving || isSendingToReviewer}
                  title={isSendingToReviewer ? "Submitting..." : isSentToReviewer ? "Resubmit Report to Reviewer" : "Submit Report to Reviewer"}
                >
                  <Icon name={isSentToReviewer ? "check" : "send"} size={14} />
                  {isSendingToReviewer ? "Submitting..." : isChangesRequested ? "Resubmit to Reviewer" : "Submit to Reviewer"}
                </button>
              )}

              {/* Download PDF Button */}
              <button
                className="btn btn-primary btn-sm"
                onClick={handleDownload}
                disabled={isSaving || isDownloading}
                style={{
                  background: '#059669',
                  borderColor: '#059669',
                  color: '#ffffff',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
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
                    Generating...
                  </>
                ) : (
                  <>
                    <Icon name="download" size={14} /> Download .{selectedFormat}
                  </>
                )}
              </button>
            </>
          )}

          {railCollapsible && (
            <button
              onClick={toggleRail}
              className="btn btn-ghost btn-sm"
              style={{ padding: 0, width: 28, height: 28, display: 'grid', placeItems: 'center', marginLeft: 4, flexShrink: 0 }}
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
              {!isApproved && (
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
              )}

              {isReviewer ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowReviewModal(true)}
                  title="Review Document & Add Comments or Approve"
                  style={{ 
                    width: 40, 
                    height: 40, 
                    padding: 0, 
                    display: 'grid', 
                    placeItems: 'center', 
                    borderRadius: 8,
                    background: '#2563eb',
                    color: '#ffffff',
                    border: '1px solid #1d4ed8',
                    cursor: 'pointer'
                  }}
                >
                  <Icon name="messageSquare" size={16} />
                </button>
              ) : isApproved ? (
                <div
                  title="Approved and locked by reviewer"
                  style={{ 
                    width: 40, 
                    height: 40, 
                    display: 'grid', 
                    placeItems: 'center', 
                    borderRadius: 8,
                    background: 'rgba(22, 163, 74, 0.15)',
                    color: '#16a34a',
                    border: '1px solid rgba(22, 163, 74, 0.3)'
                  }}
                >
                  <Icon name="check" size={16} />
                </div>
              ) : (
                <button
                  className="btn btn-soft"
                  onClick={handleSendToReviewer}
                  disabled={isSendingToReviewer}
                  title={isSendingToReviewer ? "Submitting..." : isSentToReviewer ? "Resubmit Report to Reviewer" : "Send Report to Reviewer"}
                  style={{ 
                    width: 40, 
                    height: 40, 
                    padding: 0, 
                    display: 'grid', 
                    placeItems: 'center', 
                    borderRadius: 8,
                    background: isSentToReviewer ? 'rgba(59, 130, 246, 0.15)' : '#2563eb',
                    color: isSentToReviewer ? '#2563eb' : '#ffffff',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    cursor: 'pointer'
                  }}
                >
                  <Icon name={isSentToReviewer ? "check" : "send"} size={16} />
                </button>
              )}

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

                {!isApproved && (
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
                )}

                {isReviewer ? (
                  <button 
                    className="btn btn-primary" 
                    style={{ 
                      width: '100%', 
                      marginTop: 8,
                      background: '#2563eb',
                      color: '#ffffff',
                      border: '1px solid #1d4ed8',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer'
                    }} 
                    onClick={() => setShowReviewModal(true)}
                    title="Review Document & Add Comments or Approve"
                  >
                    <Icon name="messageSquare" size={15} />
                    Review & Comments
                  </button>
                ) : isApproved ? (
                  <div style={{
                    width: '100%',
                    marginTop: 12,
                    padding: '10px 14px',
                    background: 'rgba(22, 163, 74, 0.1)',
                    border: '1px solid rgba(22, 163, 74, 0.3)',
                    borderRadius: 8,
                    color: '#16a34a',
                    fontSize: 12.5,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}>
                    <Icon name="check" size={15} />
                    Approved by Senior Reviewer
                  </div>
                ) : (
                  <button 
                    className="btn" 
                    style={{ 
                      width: '100%', 
                      marginTop: 8,
                      background: isSentToReviewer ? 'rgba(59, 130, 246, 0.12)' : '#2563eb',
                      color: isSentToReviewer ? '#2563eb' : '#ffffff',
                      border: isSentToReviewer ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #1d4ed8',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer'
                    }} 
                    onClick={handleSendToReviewer} 
                    disabled={isSavingToDb || isSendingToReviewer}
                    title={isSendingToReviewer ? "Submitting..." : isSentToReviewer ? "Resubmit Report to Reviewer" : "Submit Report to Reviewer"}
                  >
                    <Icon name={isSentToReviewer ? "check" : "send"} size={15} />
                    {isSendingToReviewer ? "Submitting..." : isSentToReviewer ? "Resubmit to Reviewer" : "Submit to Reviewer"}
                  </button>
                )}

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
              </div>

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
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  type="button"
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
                  type="button"
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

              {/* Document Version History & Audit Trail */}
              <div style={{ marginTop: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div className="label-eyebrow" style={{ margin: 0 }}>DOCUMENT VERSION HISTORY</div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                    {Array.isArray(values.revisions) && values.revisions.length > 0 ? `${values.revisions.length} records` : 'Current'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Current Active Version Card */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: !activeSnapshotVersion ? '1.5px solid var(--accent, #3b82f6)' : '1px solid var(--border)',
                      background: !activeSnapshotVersion ? 'rgba(59, 130, 246, 0.06)' : 'var(--surface-2)',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-1)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                        <span>Rev {values.revision || values.REVISION || '0'} (Active Copy)</span>
                      </div>
                      <span style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 600 }}>
                        {values.designStage ? `${values.designStage}% Design` : 'Current'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      Author: <strong>{values.assignedCreator || values.prepared_by || 'Author'}</strong> · {values.issueDate || 'Today'}
                    </div>
                  </div>

                  {/* Past Historical Revisions if present */}
                  {Array.isArray(values.revisions) && values.revisions.length > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                      {values.revisions.slice(0, -1).reverse().map((revItem, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'var(--surface-2)',
                            fontSize: 11.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>
                              Rev {revItem.revision} — {revItem.description || 'Historical Copy'}
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--text-4)' }}>
                              {revItem.issueDate || 'Past date'}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            title={`Inspect historical Rev ${revItem.revision} snapshot`}
                            onClick={() => {
                              setActiveSnapshotVersion({
                                version_number: revItem.revision,
                                revision: revItem.revision,
                                version_notes: revItem.description,
                              });
                            }}
                            style={{ fontSize: 11, padding: '3px 7px', color: 'var(--accent)' }}
                          >
                            <Icon name="eye" size={12} />
                            <span>View</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

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

      {/* Render Review & Commenting / Decision Modal */}
      {showReviewModal && (
        <ReviewCommentsModal
          report={{
            id: values.id || values.report_id || reportId,
            report_title: values.REPORT_TITLE || values.reportTitle || 'Engineering Report',
            status: currentStatus,
            document_no: values.DOCUMENT_NO || 'PVI-GEN-001',
            revision: values.REVISION || 'A',
            version_number: values.version_number || 1,
            is_current_version: values.is_current_version !== false,
            parent_report_id: values.parent_report_id,
            report_type: values.report_type,
            prepared_date: values.prepared_date || values.PREPARATION_DATE,
            values,
            assigned_creator: values.assignedCreator || 'Creator',
            assigned_reviewer: values.assignedReviewer || 'Senior Reviewer',
          }}
          userRole={isReviewer ? 'reviewer' : 'creator'}
          onClose={() => setShowReviewModal(false)}
          onRefresh={async (newStatus, result) => {
            const finalStatus = newStatus || 'in_review';
            setCurrentStatus(finalStatus);
            // Review actions already persist status through the workflow endpoint.
            // Saving the whole report again here could overwrite its document title
            // with project metadata or write back to a newly historical source row.
            if (result?.is_new_version) return;
          }}
        />
      )}

      {/* Render Dual-Mode Clone & Stage Progression Modal */}
      {showCloneModal && (
        <CloneOptionsModal
          isOpen={showCloneModal}
          onClose={() => setShowCloneModal(false)}
          sourceReport={values}
          onAdvanceStage={(opts) => {
            if (onAdvanceStage) {
              onAdvanceStage(opts);
            } else if (onCloneToRevision) {
              onCloneToRevision(opts.revision, opts.description);
            }
          }}
          onCloneToNewProject={(opts) => {
            if (onCloneToNewProject) {
              onCloneToNewProject(opts);
            }
          }}
        />
      )}
    </div>
  );
}
