import { useEffect, useState } from 'react';
import Icon from "../../../shared/components/Icon";
import ReportRow from "./ReportRow";
import { fetchReportsApi, fetchReportDetailApi, deleteReportApi } from "../../electrical/pv/pv-design/api/reportsApi";
import { NAV } from "../../../data/navigation";

const DRAFT_STATUSES = ['draft', 'generating'];

export default function Welcome({ user, onSelectRecent, onCloneReport, sel, onSelectVertical, onSelectSub }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cloningId, setCloningId] = useState(null);

  // Local vertical selection state to guarantee immediate UI updates on card click
  const [localVerticalId, setLocalVerticalId] = useState(() => sel?.vertical?.id || null);

  useEffect(() => {
    setLocalVerticalId(sel?.vertical?.id || null);
  }, [sel?.vertical?.id]);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      try {
        const res = await fetchReportsApi();
        setReports(res.success && res.reports ? res.reports : []);
      } catch (err) {
        console.error("Error loading reports:", err);
        setReports([]);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const handleVerticalClick = (verticalId) => {
    setLocalVerticalId(verticalId);
    if (onSelectVertical) {
      onSelectVertical(verticalId);
    }
  };

  const activeVerticalId = sel?.vertical?.id || localVerticalId;
  const activeVertical = NAV.find((v) => v.id === activeVerticalId);

  const submitted = reports.filter(r => r.status === 'completed');
  const drafts = reports.filter(r => DRAFT_STATUSES.includes(r.status));

  const handleResume = async (report, targetPhase) => {
    if (!report.id || !onSelectRecent) return;
    try {
      const detailRes = await fetchReportDetailApi(report.id);
      if (detailRes.success && detailRes.data) {
        onSelectRecent({
          report_id: report.id,
          report_type: report.report_type,
          status: report.status,
          targetPhase: targetPhase
        }, detailRes.data);
      }
    } catch (err) {
      console.error("Error loading report detail:", err);
    }
  };

  const handleClone = async (report) => {
    if (!report.id || !onCloneReport) return;
    setCloningId(report.id);
    try {
      const detailRes = await fetchReportDetailApi(report.id);
      if (detailRes.success && detailRes.data) {
        onCloneReport({ report_id: report.id, report_type: report.report_type }, detailRes.data);
      }
    } catch (err) {
      console.error("Error cloning report:", err);
    } finally {
      setCloningId(null);
    }
  };

  const handleDelete = async (report) => {
    if (!report.id) return;
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete "${report.report_title || 'Unnamed Report'}"?`);
    if (!confirmDelete) return;

    try {
      const res = await deleteReportApi(report.id);
      if (res.success) {
        setReports(prev => prev.filter(r => r.id !== report.id));
      } else {
        alert("Failed to delete report: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error deleting report:", err);
      alert("Error deleting report: " + err.message);
    }
  };

  const subStyles = {
    pv: { bg: 'rgba(234, 179, 8, 0.1)', color: 'rgb(234, 179, 8)', icon: 'zap' },
    bess: { bg: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)', icon: 'cpu' },
    hv: { bg: 'rgba(168, 85, 247, 0.1)', color: 'rgb(168, 85, 247)', icon: 'box' },
    tline: { bg: 'rgba(16, 185, 129, 0.1)', color: 'rgb(16, 185, 129)', icon: 'trendingUp' },
  };

  const mainStyles = {
    electrical: { bg: 'rgba(234, 179, 8, 0.1)', color: 'rgb(234, 179, 8)', icon: 'zap' },
    civil: { bg: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)', icon: 'building' },
    structure: { bg: 'rgba(16, 185, 129, 0.1)', color: 'rgb(16, 185, 129)', icon: 'frame' },
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '44px 40px 60px' }} className="fade-up">
        {/* Back breadcrumb navigation when viewing subverticals */}
        {activeVertical && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button
              className="btn btn-soft btn-sm"
              onClick={() => handleVerticalClick(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Icon name="arrowL" size={14} />
              <span>All Verticals</span>
            </button>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              Home / <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{activeVertical.name}</span>
            </div>
          </div>
        )}

        {/* Welcome Header */}
        <div className="label-eyebrow">WELCOME BACK</div>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', margin: '6px 0 8px' }}>
          {user.name.split(' ')[0]}, let's build a report.
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-2)', margin: 0, maxWidth: 580, lineHeight: 1.5 }}>
          Pick a vertical and sub-vertical from the left to browse coded report templates, or jump back into one of yours below.
        </p>

        {/* Level 2 Sub-Vertical Choices View (when Vertical is selected from main dashboard or sidebar) */}
        {activeVertical ? (
          <div style={{ marginTop: 36 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {activeVertical.subs.map((sub) => {
                const styleMeta = subStyles[sub.id] || { bg: 'var(--surface-2)', color: 'var(--accent)', icon: sub.icon };
                return (
                  <div
                    key={sub.id}
                    className="card"
                    onClick={() => onSelectSub && onSelectSub(activeVertical.id, sub.id)}
                    style={{
                      padding: '24px 20px',
                      cursor: 'pointer',
                      borderRadius: 14,
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s ease',
                      background: 'var(--surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 170,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        background: styleMeta.bg,
                        color: styleMeta.color,
                        display: 'grid',
                        placeItems: 'center',
                        marginBottom: 16,
                      }}
                    >
                      <Icon name={styleMeta.icon || sub.icon} size={18} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>{sub.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.45 }}>
                      {sub.desc || 'Report templates and calculations'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Level 1 Main Verticals View */
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 36 }}>
              {NAV.map((v) => {
                const styleMeta = mainStyles[v.id] || { bg: 'var(--surface-2)', color: 'var(--accent)', icon: v.icon };
                return (
                  <div
                    key={v.id}
                    className="card"
                    onClick={() => handleVerticalClick(v.id)}
                    style={{
                      padding: '24px 20px',
                      cursor: 'pointer',
                      borderRadius: 14,
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s ease',
                      background: 'var(--surface)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: styleMeta.bg, color: styleMeta.color, display: 'grid', placeItems: 'center' }}>
                      <Icon name={styleMeta.icon || v.icon} size={18} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginTop: 14 }}>{v.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>{v.blurb}</div>
                  </div>
                );
              })}
            </div>

            {/* Submitted Reports */}
            <div className="label-eyebrow" style={{ marginTop: 40, marginBottom: 12 }}>Submitted reports</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {submitted.length === 0 && !loading && (
                <div className="card" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-3)' }}>
                  No submitted reports yet.
                </div>
              )}
              {submitted.map((r) => (
                <ReportRow
                  key={r.id}
                  report={r}
                  onClick={() => handleResume(r, "preview")}
                  action={
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-soft btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleResume(r, "form"); }}
                      >
                        <Icon name="edit" size={13} />
                        Edit
                      </button>
                      <button
                        className="btn btn-soft btn-sm"
                        disabled={cloningId === r.id}
                        onClick={(e) => { e.stopPropagation(); handleClone(r); }}
                      >
                        <Icon name="copy" size={13} />
                        Clone
                      </button>
                      <button
                        className="btn btn-soft btn-sm"
                        style={{
                          color: 'var(--red-text, #ef4444)',
                          background: 'var(--red-soft, rgba(239, 68, 68, 0.08))',
                          border: 'none'
                        }}
                        onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
                      >
                        <Icon name="trash" size={13} />
                        Delete
                      </button>
                    </div>
                  }
                />
              ))}
            </div>

            {/* Draft Reports */}
            <div className="label-eyebrow" style={{ marginTop: 32, marginBottom: 12 }}>Draft reports</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {drafts.length === 0 && !loading && (
                <div className="card" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-3)' }}>
                  No draft reports in progress.
                </div>
              )}
              {drafts.map((r) => (
                <ReportRow
                  key={r.id}
                  report={r}
                  onClick={() => handleResume(r, "form")}
                  action={
                    <button
                      className="btn btn-soft btn-sm"
                      style={{
                        color: 'var(--red-text, #ef4444)',
                        background: 'var(--red-soft, rgba(239, 68, 68, 0.08))',
                        border: 'none'
                      }}
                      onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
                    >
                      <Icon name="trash" size={13} />
                      Delete
                    </button>
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
