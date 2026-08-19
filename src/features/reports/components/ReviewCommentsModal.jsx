import React, { useEffect, useState } from 'react';
import Icon from '../../../shared/components/Icon';
import { addReportCommentApi, fetchReportCommentsApi, updateReportStatusApi, resolveCommentApi, saveReportApi } from '../../electrical/pv/pv-design/api/reportsApi';
import { DEFAULT_ENGINEERS } from '../../../data/projects';

export default function ReviewCommentsModal({ report, userRole, onClose, onRefresh }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sectionKey, setSectionKey] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState(() => report.assigned_creator || 'Arman Shah');
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [resubmitNotes, setResubmitNotes] = useState('');

  useEffect(() => {
    if (report?.assigned_creator) {
      setSelectedAssignee(report.assigned_creator);
    }
  }, [report?.assigned_creator]);

  const loadComments = async () => {
    if (!report?.id) return;
    setLoading(true);
    try {
      const res = await fetchReportCommentsApi(report.id);
      if (res.success && res.comments) {
        setComments(res.comments);
      }
    } catch (err) {
      console.error("Failed loading comments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [report?.id]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await addReportCommentApi(report.id, {
        section_key: sectionKey,
        comment_text: commentText,
        author_role: userRole,
        author_name: userRole === 'reviewer' ? 'Senior Reviewer' : 'Report Creator'
      });
      if (res.success) {
        setCommentText('');
        loadComments();
      }
    } catch (err) {
      alert("Failed to add comment: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveComment = async (commentId) => {
    try {
      const res = await resolveCommentApi(commentId);
      if (res.success) {
        loadComments();
      }
    } catch (err) {
      alert("Failed to resolve comment: " + err.message);
    }
  };

  const handleSendBack = async () => {
    if (comments.filter(c => c.status === 'open').length === 0 && !actionNotes.trim()) {
      if (!window.confirm("Send back report for revisions without new comments?")) return;
    }
    setSubmitting(true);
    try {
      const res = await updateReportStatusApi(
        report.id, 
        'changes_requested', 
        actionNotes || 'Changes requested by reviewer.',
        'Senior Reviewer',
        selectedAssignee
      );
      if (res.success) {
        if (selectedAssignee && selectedAssignee !== report.assigned_creator) {
          alert(`Report sent back for revisions and successfully reassigned to ${selectedAssignee}!`);
        } else {
          alert("Report sent back to Creator with comments.");
        }
        if (onRefresh) onRefresh('changes_requested');
        onClose();
      }
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const res = await updateReportStatusApi(report.id, 'approved', actionNotes || 'Report approved by reviewer.');
      if (res.success) {
        alert("Report approved successfully!");
        if (onRefresh) onRefresh('approved');
        onClose();
      }
    } catch (err) {
      alert("Failed to approve report: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Creator Resubmit with a NEW Version Copy!
  const handleCreatorResubmitNewVersion = async () => {
    setSubmitting(true);
    try {
      const res = await saveReportApi({
        report_id: report.id,
        parent_report_id: report.parent_report_id || report.id,
        report_type: report.report_type || 'pv',
        document_no: report.document_no,
        // Keep the engineering revision independent from the internal version number.
        revision: report.revision || 'R0',
        prepared_date: report.prepared_date,
        report_title: report.report_title,
        status: 'in_review',
        values: report.values || report.metadata_json || {},
        create_new_version: true,
        version_notes: resubmitNotes || `Updated version copy v${(report.version_number || 1) + 1} resubmitted for review.`,
        created_by_role: 'creator',
        created_by_name: 'Report Creator'
      });

      if (res.success) {
        alert(`New version copy v${res.version_number} created and submitted to Reviewer! Only this latest copy will be shown on the main dashboard.`);
        if (onRefresh) onRefresh('in_review', res);
        onClose();
      }
    } catch (err) {
      alert("Failed to resubmit updated version: " + err.message);
    } finally {
      setSubmitting(false);
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
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: 1100,
      display: 'grid',
      placeItems: 'center',
      padding: 20
    }}>
      <div style={{
        width: '100%',
        maxWidth: 680,
        maxHeight: '90vh',
        backgroundColor: 'var(--surface, #1e293b)',
        borderRadius: 16,
        border: '1px solid var(--border, #334155)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'var(--surface-2, #0f172a)',
          borderBottom: '1px solid var(--border, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="label-eyebrow" style={{ color: 'var(--accent, #3b82f6)' }}>REVIEW & COMMENTING FEED</span>
              <span className="mono" style={{ fontSize: 11, background: 'var(--surface)', padding: '2px 6px', borderRadius: 4 }}>
                Copy v{report.version_number || 1}
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: '4px 0 0', color: 'var(--text-1)' }}>
              {report.report_title || report.projectName || 'Report Workspace'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} style={{ marginBottom: 24, background: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <select
                value={sectionKey}
                onChange={(e) => setSectionKey(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'var(--surface)',
                  color: 'var(--text-1)',
                  border: '1px solid var(--border)',
                  fontSize: 13
                }}
              >
                <option value="general">General Section</option>
                <option value="pv_array">PV Array & Module Setup</option>
                <option value="string_sizing">String Sizing & Voltages</option>
                <option value="site_conditions">Site Conditions & Temperature</option>
                <option value="degradation">Degradation & Financials</option>
              </select>
              <span style={{ fontSize: 12, color: 'var(--text-3)', alignSelf: 'center' }}>
                Adding comment as <strong>{userRole === 'reviewer' ? 'Reviewer' : 'Creator'}</strong>
              </span>
            </div>
            <textarea
              rows={3}
              placeholder="Type revision comment or feedback here..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                background: 'var(--surface)',
                color: 'var(--text-1)',
                border: '1px solid var(--border)',
                fontSize: 13.5,
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="submit" disabled={submitting || !commentText.trim()} className="btn btn-primary btn-sm">
                <Icon name="send" size={14} />
                Post Comment
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>
              Comments & Requested Changes ({comments.length})
            </h4>
            {loading ? (
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading feedback...</div>
            ) : comments.length === 0 ? (
              <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 8, color: 'var(--text-3)', fontSize: 13 }}>
                No comments posted yet for this report version.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {comments.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: c.status === 'resolved' ? 'rgba(34, 197, 94, 0.05)' : 'var(--surface-2)',
                      border: c.status === 'resolved' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)' }}>
                          [{c.section_key}]
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
                          {c.author_name || c.author_role}
                        </span>
                        <span style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 99,
                          background: c.status === 'resolved' ? '#22c55e' : '#f59e0b',
                          color: '#fff'
                        }}>
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.4 }}>
                        {c.comment_text}
                      </div>
                    </div>

                    {c.status !== 'resolved' && (
                      <button
                        onClick={() => handleResolveComment(c.id)}
                        className="btn btn-soft btn-sm"
                        style={{ fontSize: 11, padding: '4px 8px' }}
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workflow Action Controls */}
          <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            {userRole === 'reviewer' ? (
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 10 }}>
                  Reviewer Workflow & Reassignment Actions
                </h4>

                {/* Optional Creator Reassignment Selector */}
                <div style={{
                  marginBottom: 12,
                  padding: '10px 14px',
                  background: 'var(--surface-2)',
                  borderRadius: 8,
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                      Reassign to Creator (Optional):
                    </label>
                    <span style={{ fontSize: 11, color: 'var(--accent, #38bdf8)', fontWeight: 500 }}>
                      Current: <strong>{report.assigned_creator || 'Arman Shah'}</strong>
                    </span>
                  </div>
                  <select
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: 'var(--surface)',
                      color: 'var(--text-1)',
                      border: '1px solid var(--border)',
                      fontSize: 13
                    }}
                  >
                    <option value={report.assigned_creator || 'Arman Shah'}>
                      Keep Current ({report.assigned_creator || 'Arman Shah'})
                    </option>
                    {DEFAULT_ENGINEERS
                      .filter(eng => eng.name !== (report.assigned_creator || 'Arman Shah'))
                      .map(eng => (
                        <option key={eng.id} value={eng.name}>
                          {eng.name} ({eng.department} › {eng.vertical} — {eng.role})
                        </option>
                      ))}
                  </select>
                  {selectedAssignee && selectedAssignee !== (report.assigned_creator || 'Arman Shah') && (
                    <div style={{ fontSize: 11.5, color: '#38bdf8', marginTop: 6 }}>
                      ⚡ When sending back, this report will immediately transfer to <strong>{selectedAssignee}</strong>'s dashboard.
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Optional review note / decision summary..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'var(--surface-2)',
                    color: 'var(--text-1)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    marginBottom: 12
                  }}
                />
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={handleSendBack}
                    disabled={submitting}
                    className="btn btn-soft"
                    style={{ flex: 1, borderColor: '#ef4444', color: '#f87171', justifyContent: 'center' }}
                  >
                    <Icon name="arrowL" size={16} />
                    Send Back to Creator (Request Changes)
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ flex: 1, background: '#16a34a', borderColor: '#16a34a', justifyContent: 'center' }}
                  >
                    <Icon name="check" size={16} />
                    Approve Report
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
                  Creator Actions: Revisions & Resubmission
                </h4>
                {!showResubmitForm ? (
                  <button
                    onClick={() => setShowResubmitForm(true)}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Icon name="plus" size={16} />
                    Create Updated Version Copy (v{(report.version_number || 1) + 1}) & Resubmit
                  </button>
                ) : (
                  <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--accent)' }}>
                      Create Version Copy v{(report.version_number || 1) + 1}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 10px' }}>
                      This action creates a brand new version snapshot copy (v{(report.version_number || 1) + 1}). The main dashboard will ONLY display this new copy as current!
                    </p>
                    <input
                      type="text"
                      placeholder="Summary of changes in this copy (e.g. Corrected string sizing per review comments)..."
                      value={resubmitNotes}
                      onChange={(e) => setResubmitNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: 'var(--surface)',
                        color: 'var(--text-1)',
                        border: '1px solid var(--border)',
                        fontSize: 13,
                        marginBottom: 10
                      }}
                    />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => setShowResubmitForm(false)}
                        className="btn btn-soft"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreatorResubmitNewVersion}
                        disabled={submitting}
                        className="btn btn-primary"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        Confirm & Resubmit Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
