import { useEffect, useState, useMemo } from 'react';
import Icon from "../../../shared/components/Icon";
import ReportRow from "./ReportRow";
import { fetchReportsApi, fetchReportDetailApi, deleteReportApi, fetchProjectsApi } from "../../electrical/pv/pv-design/api/reportsApi";
import { NAV } from "../../../data/navigation";
import { getStoredProjects, deleteProjectRecord } from "../../../data/projects";
import { getStoredClients } from "../../../data/clients";
import VersionHistoryDrawer from "../../reports/components/VersionHistoryDrawer";
import ReviewCommentsModal from "../../reports/components/ReviewCommentsModal";
import CloneOptionsModal from "../../reports/components/CloneOptionsModal";

const DRAFT_STATUSES = ['draft', 'generating'];

function getLogicalReportKey(report) {
  const rootId = report.lineage_id || report.parent_report_id || report.id;
  const projectKey = (report.project_id || report.values?.projectId || report.values?.project_id || 'no-proj').toString().toLowerCase().trim();
  const vertKey = (report.vertical || report.vertical_id || 'no-vert').toString().toLowerCase().trim();
  const deptKey = (report.department || report.department_id || 'no-dept').toString().toLowerCase().trim();
  const typeKey = (report.report_type || 'no-type').toString().toLowerCase().trim();

  return `lineage-${rootId}::proj-${projectKey}::vert-${vertKey}::dept-${deptKey}::type-${typeKey}`;
}

export default function Welcome({ user, onSelectRecent, onCloneReport, onAdvanceStage, onCloneToNewProject, onStartAssignedProject, sel, onSelectVertical, onSelectSub }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cloningId, setCloningId] = useState(null);
  const [projects, setProjects] = useState(getStoredProjects);

  // Active Role Switcher state ('creator' | 'reviewer')
  const [userRole, setUserRole] = useState('creator');

  const isReviewer =
    user?.role === 'reviewer' ||
    user?.role === 'admin' ||
    user?.isReviewer === true ||
    user?.isAdmin === true ||
    userRole === 'reviewer' ||
    (user?.email || '').toLowerCase().trim() === 'abhaypratap.singh@pvinsightinc.com';

  // Drawer / Modal states
  const [versionHistoryReport, setVersionHistoryReport] = useState(null);
  const [reviewCommentsReport, setReviewCommentsReport] = useState(null);
  const [cloneModalSource, setCloneModalSource] = useState(null);

  // Local vertical selection state to guarantee immediate UI updates on card click
  const [localVerticalId, setLocalVerticalId] = useState(() => sel?.vertical?.id || null);

  useEffect(() => {
    setLocalVerticalId(sel?.vertical?.id || null);
  }, [sel?.vertical?.id]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [repRes, projRes] = await Promise.allSettled([
        fetchReportsApi(),
        fetchProjectsApi()
      ]);

      if (repRes.status === 'fulfilled' && repRes.value.success) {
        setReports(repRes.value.reports || []);
      } else {
        setReports([]);
      }

      const localClients = getStoredClients();
      const localProjs = getStoredProjects();
      if (projRes.status === 'fulfilled' && projRes.value.success && Array.isArray(projRes.value.projects)) {
        const dbProjs = projRes.value.projects.map(p => {
          let finalClientId = p.clientId;
          if (p.clientName) {
            const matched = localClients.find(c =>
              (c.name || '').trim().toLowerCase() === (p.clientName || '').trim().toLowerCase()
            );
            if (matched) {
              finalClientId = matched.id;
            }
          }
          if (finalClientId && !finalClientId.toString().startsWith('client-')) {
            finalClientId = `client-${finalClientId}`;
          }
          return { ...p, clientId: finalClientId };
        });
        const combinedMap = new Map();
        for (const p of [...localProjs, ...dbProjs]) {
          const key = (p.id || p.name).toString().toLowerCase().trim();
          combinedMap.set(key, p);
        }
        setProjects(Array.from(combinedMap.values()));
      } else {
        setProjects(localProjs);
      }
    } catch (err) {
      console.error("Error loading reports and projects:", err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const refreshData = () => {
      loadReports();
    };
    refreshData();

    window.addEventListener('storage', refreshData);
    window.addEventListener('focus', refreshData);
    return () => {
      window.removeEventListener('storage', refreshData);
      window.removeEventListener('focus', refreshData);
    };
  }, []);

  // Filter projects specifically assigned to this creator that DO NOT yet have a report in review/completed
  const assignedProjects = useMemo(() => {

    const normalize = (str) => (str || '')
      .toLowerCase()
      .replace(/@.*$/, '') // strip email domain
      .replace(/[._\-+]/g, ' ') // convert punctuation to space
      .trim();

    const userTokens = [
      user?.name,
      user?.full_name,
      user?.email,
    ].filter(Boolean).map(normalize).filter(Boolean);

    if (userTokens.length === 0) return [];

    return projects.filter(p => {
      const creator = normalize(p.assignedCreator);
      if (!creator) return false;

      const isAssignedToUser = userTokens.some(tok => {
        if (!tok) return false;
        if (creator === tok || creator.includes(tok) || tok.includes(creator)) return true;
        const tokParts = tok.split(' ').filter(part => part.length >= 3);
        const creatorParts = creator.split(' ').filter(part => part.length >= 3);
        return tokParts.some(tp => creator.includes(tp)) || creatorParts.some(cp => tok.includes(cp));
      });

      if (!isAssignedToUser) return false;

      // Check if this project already has an existing report (draft, review, revision, or completed)
      const pName = normalize(p.name);
      const pId = (p.id || '').toString().trim();

      const hasExistingReport = reports.some(r => {
        const vals = r.values || {};
        const rProjId = (r.project_id || vals.projectId || vals.project_id || '').toString().trim();
        if (pId && rProjId && pId === rProjId) return true;

        // Only check actual project name fields, not generic report type titles
        const candidateProjectNames = [
          r.project_name,
          vals.projectName,
          vals.project_name,
          vals.projectTitle,
          vals.plant_name,
          vals.PROJECT_NAME,
        ].filter(Boolean).map(normalize);

        return candidateProjectNames.some(cand => cand && cand === pName);
      });

      return !hasExistingReport;
    });

  }, [projects, reports, user]);


  const handleVerticalClick = (verticalId) => {
    setLocalVerticalId(verticalId);
    if (onSelectVertical) {
      onSelectVertical(verticalId);
    }
  };

  const activeVerticalId = sel?.vertical?.id || localVerticalId;
  const activeVertical = NAV.find((v) => v.id === activeVerticalId);

  // Single Latest Version Deduplication per Report Lineage (No duplicate version rows)
  const deduplicatedReports = useMemo(() => {
    if (!Array.isArray(reports) || reports.length === 0) return [];

    const map = new Map();
    for (const r of reports) {
      if (r.is_current_version === false && !['approved', 'completed'].includes(r.status)) continue;
      const projKey = getLogicalReportKey(r);

      const existing = map.get(projKey);
      if (!existing) {
        map.set(projKey, r);
      } else {
        const existingVer = existing.version_number || 1;
        const currentVer = r.version_number || 1;
        const existingUpdated = new Date(existing.updated_at || existing.created_at || 0).getTime();
        const currentUpdated = new Date(r.updated_at || r.created_at || 0).getTime();

        if (currentVer > existingVer || (currentVer === existingVer && currentUpdated > existingUpdated)) {
          map.set(projKey, r);
        }
      }
    }

    return Array.from(map.values());
  }, [reports]);
  const underReview = deduplicatedReports.filter(r => ['in_review', 'under_review', 'changes_requested'].includes(r.status));
  const approvedOrCompleted = deduplicatedReports.filter(r => ['approved', 'completed'].includes(r.status));
  const drafts = deduplicatedReports.filter(r => DRAFT_STATUSES.includes(r.status));

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
    if (!report.id) return;
    setCloningId(report.id);
    try {
      const detailRes = await fetchReportDetailApi(report.id);
      if (detailRes.success && detailRes.data) {
        setCloneModalSource(detailRes.data);
      } else {
        setCloneModalSource(report);
      }
    } catch (err) {
      console.error("Error cloning report:", err);
      setCloneModalSource(report);
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
        // Also delete associated project assignment so it does not reappear as an uncompleted task
        const vals = report.values || {};
        const pId = (report.project_id || vals.projectId || vals.project_id || '').toString().trim();
        const pName = (
          report.project_name ||
          vals.projectName ||
          vals.project_name ||
          vals.plant_name ||
          report.report_title ||
          ''
        ).toString().trim().toLowerCase();

        const matchingProj = projects.find(p => {
          const idMatch = pId && (p.id || '').toString().trim() === pId;
          const nameMatch = pName && (p.name || '').toString().trim().toLowerCase() === pName;
          return idMatch || nameMatch;
        });

        if (matchingProj) {
          const updatedProjects = deleteProjectRecord(matchingProj.id);
          setProjects(updatedProjects);
        }

        setReports(prev => prev.filter(r => r.id !== report.id && r.parent_report_id !== report.id));
        window.dispatchEvent(new Event('storage'));
        loadReports();
      } else {
        alert("Failed to delete report: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error deleting report:", err);
      alert("Error deleting report: " + err.message);
    }
  };

  const handleDeleteAssignedProject = (projId, projName, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!window.confirm(`Permanently remove assigned project "${projName}"?`)) return;
    const updatedProjects = deleteProjectRecord(projId);
    setProjects(updatedProjects);
    window.dispatchEvent(new Event('storage'));
  };

  const subStyles = {
    pv: { bg: 'rgba(234, 179, 8, 0.1)', color: 'rgb(234, 179, 8)', icon: 'zap' },
    bess: { bg: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)', icon: 'cpu' },
    hv: { bg: 'rgba(168, 85, 247, 0.1)', color: 'rgb(168, 85, 247)', icon: 'box' },
    tline: { bg: 'rgba(16, 185, 129, 0.1)', color: 'rgb(16, 185, 129)', icon: 'trendingUp' },
  };

  const mainStyles = {
    electrical: { bg: 'rgba(234, 179, 8, 0.12)', color: 'rgb(202, 138, 4)', icon: 'zap' },
    civil: { bg: 'rgba(59, 130, 246, 0.12)', color: 'rgb(37, 99, 235)', icon: 'building' },
    structure: { bg: 'rgba(16, 185, 129, 0.12)', color: 'rgb(5, 150, 105)', icon: 'frame' },
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '36px 40px 60px' }} className="fade-up">
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
        <div className="label-eyebrow" style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em' }}>
          WELCOME BACK
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: '4px 0 8px' }}>
          {`${(user?.name || user?.full_name || user?.email?.split('@')[0] || 'User').split(' ')[0]}, let's build a report.`}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0, maxWidth: 640, lineHeight: 1.5 }}>
          Pick a vertical and sub-vertical from the left to browse coded report templates, or jump back into one of yours below.
        </p>

        {/* Level 2 Sub-Vertical Choices View */}
        {activeVertical ? (
          <div style={{ marginTop: 28 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 28 }}>
              {NAV.map((v) => {
                const styleMeta = mainStyles[v.id] || { bg: 'var(--surface-2)', color: 'var(--accent)', icon: v.icon };
                return (
                  <div
                    key={v.id}
                    className="card"
                    onClick={() => handleVerticalClick(v.id)}
                    style={{
                      padding: '20px 18px',
                      cursor: 'pointer',
                      borderRadius: 14,
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s ease',
                      background: 'var(--surface)',
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: styleMeta.bg, color: styleMeta.color, display: 'grid', placeItems: 'center' }}>
                      <Icon name={styleMeta.icon || v.icon} size={18} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{v.blurb}</div>
                  </div>
                );
              })}
            </div>

            {/* Projects assigned to the signed-in creator */}
            <div
              className="label-eyebrow"
              style={{
                marginTop: 36,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                color: 'var(--text-3)'
              }}
            >
              <span>MY ASSIGNED PROJECTS</span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                background: '#dcfce7',
                color: '#15803d',
                padding: '2px 8px',
                borderRadius: 99,
              }}>

                {assignedProjects.length}
              </span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {assignedProjects.length === 0 && !loading && (
                <div className="card" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-3)' }}>
                  No projects are currently assigned to you.
                </div>
              )}

              {assignedProjects.map((project) => (
                <div
                  key={project.id || project.name}
                  className="card"
                  onClick={() => onStartAssignedProject?.(project)}
                  style={{
                    padding: '16px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    cursor: onStartAssignedProject ? 'pointer' : 'default',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                      {project.name || 'Unnamed Project'}
                    </div>
                    <div style={{ marginTop: 5, fontSize: 12.5, color: 'var(--text-3)' }}>
                      {project.clientName || 'Client'} · {project.department || 'Electrical'} · {project.vertical || 'PV'}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={(event) => {
                      event.stopPropagation();

                      onStartAssignedProject?.(project);
                    }}
                  >
                    Start Report
                  </button>
                </div>
              ))}
            </div>

            {/* Draft reports */}
            <div className="label-eyebrow" style={{
              marginTop: 36,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.08em',
              color: 'var(--text-3)'
            }}>
              <span>DRAFT REPORTS</span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                background: '#fef3c7',
                color: '#b45309',
                padding: '2px 8px',
                borderRadius: 99,
              }}>
                {drafts.length}
              </span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {drafts.length === 0 && !loading && (
                <div className="card" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-3)' }}>
                  No draft reports available.
                </div>
              )}
              {drafts.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  onClick={() => handleResume(report, 'form')}
                  onOpenVersionHistory={(item) => setVersionHistoryReport(item)}
                  action={
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleResume(report, 'form');
                      }}
                    >
                      Resume Draft
                    </button>
                  }
                />
              ))}
            </div>

            {/* Reports Under Review / Revision Requested */}
            <div
              className="label-eyebrow"
              style={{
                marginTop: 36,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                color: 'var(--text-3)'
              }}
            >
              <span>REPORTS IN REVIEW & REVISION CYCLE</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: '#e0f2fe',
                  color: '#0284c7',
                  padding: '2px 8px',
                  borderRadius: 99,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 18,
                  height: 18
                }}
              >
                {underReview.length}
              </span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {underReview.length === 0 && !loading && (
                <div className="card" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-3)' }}>
                  No reports currently undergoing review or requested changes.
                </div>
              )}
              {underReview.map((r) => {
                const isApproved = ['approved', 'completed'].includes(r.status);
                const isUnderReview = ['in_review', 'under_review'].includes(r.status);
                const isChangesRequested = r.status === 'changes_requested';
                const isDraft = !isApproved && !isUnderReview && !isChangesRequested;
                const creatorHasBall = isDraft || isChangesRequested;
                const reviewerHasBall = isUnderReview;
                const canEditRow = !isApproved && (creatorHasBall || (isReviewer && reviewerHasBall));

                return (
                  <ReportRow
                    key={r.id}
                    report={r}
                    onClick={() => handleResume(r, "preview")}
                    onOpenVersionHistory={(rep) => setVersionHistoryReport(rep)}
                    action={
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => { e.stopPropagation(); handleResume(r, "preview"); }}
                          title="View and Review Report Preview"
                          style={{
                            background: '#059669',
                            borderColor: '#059669',
                            color: '#fff',
                            fontWeight: 600,
                            padding: '7px 16px',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span style={{ fontSize: 14 }}>•</span> View
                        </button>

                        <button
                          className="btn btn-soft btn-sm"
                          onClick={(e) => { e.stopPropagation(); setReviewCommentsReport(r); }}
                          title="Open Review & Comments Discussion"
                          style={{
                            background: 'transparent',
                            border: '1.5px solid #f59e0b',
                            color: '#d97706',
                            fontWeight: 600,
                            padding: '7px 16px',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span style={{ fontSize: 14 }}>•</span> Comments
                        </button>



                        {isReviewer && (
                          <button
                            className="btn btn-soft btn-sm"
                            title="Delete Report"
                            style={{
                              background: '#ffe4e6',
                              border: '1.5px solid #fecdd3',
                              color: '#e11d48',
                              fontWeight: 600,
                              padding: '7px 14px',
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                            onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
                          >
                            <Icon name="trash" size={13} />
                            Delete
                          </button>
                        )}
                      </div>
                    }
                  />
                );
              })}
            </div>

            {/* Approved and completed reports */}
            <div className="label-eyebrow" style={{
              marginTop: 36,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.08em',
              color: 'var(--text-3)'
            }}>
              <span>APPROVED &amp; COMPLETED REPORTS</span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                background: '#dcfce7',
                color: '#15803d',
                padding: '2px 8px',
                borderRadius: 99,
              }}>
                {approvedOrCompleted.length}
              </span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {approvedOrCompleted.length === 0 && !loading && (
                <div className="card" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-3)' }}>
                  No approved or completed reports available.
                </div>
              )}
              {approvedOrCompleted.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  onClick={() => handleResume(report, 'preview')}
                  onOpenVersionHistory={(item) => setVersionHistoryReport(item)}
                  action={
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleResume(report, 'preview');
                      }}
                      style={{ background: '#059669', borderColor: '#059669' }}
                    >
                      View Report
                    </button>
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Render Version History Drawer */}
      {
        versionHistoryReport && (
          <VersionHistoryDrawer
            report={versionHistoryReport}
            onClose={() => setVersionHistoryReport(null)}
            onVersionCreated={loadReports}
            onSelectVersion={(ver) => {
              setVersionHistoryReport(null);
              handleResume(ver, "preview");
            }}
          />
        )
      }

      {/* Render Review & Commenting Modal */}
      {
        reviewCommentsReport && (
          <ReviewCommentsModal
            report={reviewCommentsReport}
            userRole={isReviewer ? 'reviewer' : 'creator'}
            onClose={() => setReviewCommentsReport(null)}
            onRefresh={loadReports}
          />
        )
      }

      {/* Render Dual-Mode Clone & Stage Progression Modal */}
      {
        cloneModalSource && (
          <CloneOptionsModal
            isOpen={!!cloneModalSource}
            onClose={() => setCloneModalSource(null)}
            sourceReport={cloneModalSource}
            projects={projects}
            onAdvanceStage={(opts) => {
              if (onAdvanceStage) {
                onAdvanceStage(opts);
              } else if (onCloneReport) {
                onCloneReport({ report_id: cloneModalSource.id, report_type: cloneModalSource.report_type }, {
                  ...cloneModalSource.values,
                  designStage: opts.targetStage,
                  revision: opts.revision,
                });
              }
            }}
            onCloneToNewProject={(opts) => {
              if (onCloneToNewProject) {
                onCloneToNewProject(opts);
              } else if (onCloneReport) {
                onCloneReport({ report_id: cloneModalSource.id, report_type: cloneModalSource.report_type }, {
                  ...cloneModalSource.values,
                  projectName: opts.newProject.name,
                  county: opts.newProject.county,
                  state: opts.newProject.state,
                  assignedCreator: opts.newProject.assignedCreator,
                  assignedReviewer: opts.newProject.assignedReviewer,
                  designStage: opts.targetStage,
                  revision: '0',
                });
              }
            }}
          />
        )
      }
    </div >
  );
}
