import React, { useEffect, useState } from 'react';
import Icon from '../../../shared/components/Icon';
import { fetchReportVersionsApi, fetchReportCommentsApi, saveReportApi } from '../../electrical/pv/pv-design/api/reportsApi';

export default function VersionHistoryDrawer({ report, onClose, onSelectVersion, onVersionCreated }) {
  const [versions, setVersions] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState(null);

  useEffect(() => {
    async function loadData() {
      if (!report?.id) return;
      setLoading(true);
      try {
        const [verRes, commRes] = await Promise.all([
          fetchReportVersionsApi(report.id),
          fetchReportCommentsApi(report.id)
        ]);
        if (verRes.success && verRes.versions) {
          setVersions(verRes.versions);
        }
        if (commRes.success && commRes.comments) {
          setComments(commRes.comments);
        }
      } catch (err) {
        console.error("Failed loading version history:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [report?.id]);

  const copyAsCurrentVersion = async (version) => {
    const shownVersion = version.display_version_number || version.version_number;
    if (!window.confirm(`Create a new current draft using the content from v${shownVersion}?`)) return;

    setCopyingId(version.id);
    try {
      const result = await saveReportApi({
        report_id: version.id,
        parent_report_id: version.parent_report_id || version.id,
        report_type: version.report_type || report.report_type,
        document_no: version.document_no || report.document_no,
        revision: version.revision || report.revision || 'R0',
        prepared_date: version.prepared_date,
        report_title: version.report_title || report.report_title,
        status: 'draft',
        values: version.metadata_json || {},
        create_new_version: true,
        version_notes: `New draft copied from historical version v${shownVersion}.`,
        created_by_role: 'creator',
        created_by_name: 'Report Creator',
      });

      if (result.success) {
        if (onVersionCreated) await onVersionCreated(result);
        alert(`Version v${result.version_number} is now the current draft. The source version was not changed.`);
        onClose();
      }
    } catch (err) {
      alert(`Failed to copy historical version: ${err.message}`);
    } finally {
      setCopyingId(null);
    }
  };

  if (!report) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(3px)',
      zIndex: 1100,
      display: 'flex',
      justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        height: '100%',
        backgroundColor: 'var(--surface, #1e293b)',
        borderLeft: '1px solid var(--border, #334155)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.3)',
      }}>
        {/* Drawer Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-2, #0f172a)'
        }}>
          <div>
            <div className="label-eyebrow" style={{ color: 'var(--accent, #3b82f6)', fontSize: 11 }}>VERSION HISTORY & COPIES</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '2px 0 0', color: 'var(--text-1, #f8fafc)' }}>
              {report.report_title || report.name || 'Report Lineage'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-3, #94a3b8)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Info Banner */}
        <div style={{
          padding: '12px 20px',
          background: 'rgba(59, 130, 246, 0.08)',
          borderBottom: '1px solid var(--border, #334155)',
          fontSize: 12.5,
          color: 'var(--text-2, #cbd5e1)',
          display: 'flex',
          gap: 10,
          alignItems: 'center'
        }}>
          <Icon name="info" size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
          <div>
            Only the <strong>Current Active Copy</strong> is displayed on the main report list. Older version copies are preserved below for full audit history.
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 40 }}>
              Loading version copies...
            </div>
          ) : versions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 40 }}>
              No previous version copies found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {versions.map((ver) => {
                const isCurrent = ver.is_current_version || ver.id === report.id;
                const shownVersion = ver.display_version_number || ver.version_number;
                const verComments = comments.filter(c =>
                  c.report_id === ver.id ||
                  (!c.report_id && c.version_number === ver.version_number)
                );

                return (
                  <div
                    key={ver.id}
                    style={{
                      border: isCurrent ? '2px solid var(--accent, #3b82f6)' : '1px solid var(--border, #334155)',
                      borderRadius: 12,
                      padding: 16,
                      background: isCurrent ? 'rgba(59, 130, 246, 0.04)' : 'var(--surface-2, #0f172a)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: isCurrent ? 'var(--accent, #3b82f6)' : 'var(--text-1, #f8fafc)'
                        }}>
                          Version Copy v{shownVersion}
                        </span>
                        {isCurrent && (
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            background: 'var(--accent, #3b82f6)',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: 99
                          }}>
                            ACTIVE CURRENT COPY
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 11,
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: ver.status === 'approved' ? 'rgba(34, 197, 94, 0.15)' : ver.status === 'changes_requested' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: ver.status === 'approved' ? '#4ade80' : ver.status === 'changes_requested' ? '#f87171' : '#fbbf24'
                      }}>
                        {ver.status || 'draft'}
                      </span>
                    </div>

                    <div style={{ fontSize: 12.5, color: 'var(--text-3, #94a3b8)', marginBottom: 10 }}>
                      Created by: <strong style={{ color: 'var(--text-2)' }}>{ver.created_by_name || 'Creator'}</strong> ({ver.created_by_role || 'creator'})
                    </div>

                    {ver.version_notes && (
                      <div style={{
                        fontSize: 12,
                        background: 'var(--surface, #1e293b)',
                        padding: '8px 12px',
                        borderRadius: 6,
                        color: 'var(--text-2, #cbd5e1)',
                        marginBottom: 10,
                        borderLeft: '3px solid var(--accent, #3b82f6)'
                      }}>
                        {ver.version_notes}
                      </div>
                    )}

                    {/* Associated Comments */}
                    {verComments.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border, #334155)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
                          REVIEWER FEEDBACK ({verComments.length}):
                        </div>
                        {verComments.map(c => (
                          <div key={c.id} style={{ fontSize: 11.5, color: 'var(--text-2)', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid #ef4444' }}>
                            <strong>[{c.section_key || 'General'}]</strong>: {c.comment_text} ({c.status})
                          </div>
                        ))}
                      </div>
                    )}

                    {!isCurrent && onSelectVersion && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                        <button
                          className="btn btn-soft btn-sm"
                          onClick={() => onSelectVersion(ver)}
                          style={{ justifyContent: 'center', fontSize: 12 }}
                        >
                          Inspect v{shownVersion}
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={copyingId === ver.id}
                          onClick={() => copyAsCurrentVersion(ver)}
                          style={{ justifyContent: 'center', fontSize: 12 }}
                        >
                          {copyingId === ver.id ? 'Copying...' : 'Copy as New Draft'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
