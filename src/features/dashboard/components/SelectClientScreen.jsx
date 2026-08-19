import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../../shared/components/Icon';
import ReportRow from './ReportRow';
import { getStoredClients, saveClientProfile, deleteClientProfile } from '../../../data/clients';
import { DEFAULT_REVIEWERS, DEFAULT_ENGINEERS, getStoredProjects, saveProjectRecord, deleteProjectRecord } from '../../../data/projects';
import { fetchReportsApi, fetchReportDetailApi, deleteReportApi, fetchUsersApi, fetchProjectsApi, saveProjectApi, deleteProjectApi, fetchClientsApi, createClientApi, deleteClientApi } from '../../electrical/pv/pv-design/api/reportsApi';
import VersionHistoryDrawer from '../../reports/components/VersionHistoryDrawer';
import ReviewCommentsModal from '../../reports/components/ReviewCommentsModal';
import CloneOptionsModal from '../../reports/components/CloneOptionsModal';

const DRAFT_STATUSES = ['draft', 'generating'];

function getLogicalReportKey(report) {
  const rootId = report.lineage_id || report.parent_report_id || report.id;
  if (rootId) {
    return `lineage-${rootId}`;
  }
  const values = report.values || {};
  const projectKey = (
    values.projectId ||
    values.project_id ||
    values.projectName ||
    values.project_name ||
    values.plant_name ||
    report.project_name ||
    `report-${report.id}`
  ).toString().trim().toLowerCase();
  const reportKey = (report.report_type || report.report_title || 'report')
    .toString().trim().toLowerCase();

  return `${projectKey}::${reportKey}::${report.id}`;
}

export function formatPersonName(objOrString, defaultFallback = 'Senior Reviewer') {
  if (!objOrString) return defaultFallback;

  let raw = typeof objOrString === 'string'
    ? objOrString
    : (objOrString.full_name || objOrString.name || objOrString.user_metadata?.full_name || objOrString.user_metadata?.name || objOrString.email || '');
  raw = (raw || '').trim();

  if (raw && !raw.includes('@')) {
    if (raw.includes('.')) {
      return raw.split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    return raw;
  }

  if (raw.includes('@')) {
    const handle = raw.split('@')[0];
    if (handle) {
      return handle
        .replace(/[._-]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return defaultFallback;
}

export default function SelectClientScreen({ vertical, sub, report, user, onCancel, onContinue, onSelectRecent, onCloneReport, onAdvanceStage, onCloneToNewProject }) {
  const isReviewer =
    user?.role === 'reviewer' ||
    user?.role === 'admin' ||
    user?.isReviewer === true ||
    user?.isAdmin === true ||
    (user?.email || '').toLowerCase().trim() === 'abhaypratap.singh@pvinsightinc.com' ||
    (user?.email || '').toLowerCase().includes('abhay');

  const currentDept = vertical?.name || 'Electrical';
  const currentVert = sub?.name || 'PV';

  const [clients, setClients] = useState(getStoredClients);
  const [selectedId, setSelectedId] = useState(clients[0]?.id || null);
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  // Projects State
  const [projects, setProjects] = useState(getStoredProjects);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  const [allReports, setAllReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [cloningId, setCloningId] = useState(null);
  const [dbUsers, setDbUsers] = useState([]);

  // Drawer / Modal state
  const [versionHistoryReport, setVersionHistoryReport] = useState(null);
  const [reviewCommentsReport, setReviewCommentsReport] = useState(null);
  const [cloneModalSource, setCloneModalSource] = useState(null);

  // Load database users, reports, clients, and backend projects
  useEffect(() => {
    async function loadData() {
      setLoadingReports(true);
      try {
        const [repRes, usersRes, projRes, clientsRes] = await Promise.allSettled([
          fetchReportsApi(),
          fetchUsersApi(),
          fetchProjectsApi(),
          fetchClientsApi(),
        ]);
        if (repRes.status === 'fulfilled' && repRes.value.success) {
          setAllReports(repRes.value.reports || []);
        }
        if (usersRes.status === 'fulfilled' && usersRes.value.success) {
          setDbUsers(usersRes.value.users || []);
        }
        let activeClients = getStoredClients();
        if (clientsRes.status === 'fulfilled' && clientsRes.value.success && Array.isArray(clientsRes.value.clients)) {
          const dbClients = clientsRes.value.clients.map(c => ({
            id: c.id.toString().startsWith('client-') ? c.id : `client-${c.id}`,
            name: c.name || c.clientName,
            clientName: c.name || c.clientName,
            contact: c.primary_contact || c.contact || '',
            clientContact: c.primary_contact || c.contact || '',
            email: c.contact_email || c.email || '',
            clientEmail: c.contact_email || c.email || '',
            address: c.address || c.client_address || '',
            clientAddress: c.client_address || c.address || '',
            logo: c.logo || '',
            consultant: 'PV-Insight Engineering LLC',
            desc: 'Registered client profile.',
            icon: 'briefcase',
            iconColor: 'rgb(59, 130, 246)',
            iconBg: 'rgba(59, 130, 246, 0.1)',
          }));

          const clientMap = new Map();
          for (const c of [...activeClients, ...dbClients]) {
            const key = (c.name || '').toString().trim().toLowerCase();
            if (key && !clientMap.has(key)) {
              clientMap.set(key, c);
            }
          }
          activeClients = Array.from(clientMap.values());
          setClients(activeClients);
          if (activeClients.length > 0 && !selectedId) {
            setSelectedId(activeClients[0].id);
          }
        }
        const localProjs = getStoredProjects();
        if (projRes.status === 'fulfilled' && projRes.value.success && Array.isArray(projRes.value.projects)) {
          const dbProjs = projRes.value.projects.map(p => {
            let finalClientId = p.clientId;
            if (p.clientName) {
              const matched = clients.find(c =>
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
            const key = (p.name || p.id || '').toString().toLowerCase().trim();
            combinedMap.set(key, p);
          }
          setProjects(Array.from(combinedMap.values()));
        } else {
          setProjects(localProjs);
        }
      } catch (err) {
        console.error('Error loading data in SelectClientScreen:', err);
      } finally {
        setLoadingReports(false);
      }
    }
    loadData();
  }, []);

  // Filter engineers/creators strictly by current Department and Vertical
  const matchingEngineers = useMemo(() => {
    const rawList = [
      ...dbUsers.map(u => ({
        id: u.id,
        name: formatPersonName(u, 'Design Engineer'),
        role: u.role || 'Design Engineer',
        department: u.department || 'Electrical',
        vertical: u.vertical || 'PV',
        email: u.email
      })),
      ...DEFAULT_ENGINEERS
    ];

    const targetDept = (currentDept || '').toLowerCase().trim();
    const targetVert = (currentVert || '').toLowerCase().trim();

    const unique = [];
    const seen = new Set();

    for (const eng of rawList) {
      const key = (eng.name || '').toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);

      const engDept = (eng.department || '').toLowerCase().trim();
      const engVert = (eng.vertical || '').toLowerCase().trim();

      const deptMatches = !targetDept || !engDept || engDept.includes(targetDept) || targetDept.includes(engDept);
      const vertMatches = !targetVert || !engVert || engVert.includes(targetVert) || targetVert.includes(engVert);

      if (deptMatches && vertMatches) {
        unique.push(eng);
      }
    }

    if (unique.length === 0) {
      return [
        {
          id: 'eng-fallback',
          name: `${currentDept} ${currentVert} Design Engineer`,
          role: 'Design Engineer',
          department: currentDept,
          vertical: currentVert,
        }
      ];
    }

    return unique;
  }, [dbUsers, currentDept, currentVert]);

  // Dynamic reviewers list combining database users with default reviewers
  const matchingReviewers = useMemo(() => {
    const dbReviewers = dbUsers
      .filter(u => u.role === 'reviewer' || u.role === 'admin' || (u.email || '').toLowerCase().includes('abhay') || (u.full_name || u.name || '').toLowerCase().includes('abhay'))
      .map(u => ({
        id: u.id,
        name: formatPersonName(u, 'Senior Reviewer'),
        role: u.role === 'admin' ? 'Engineering Lead / Admin' : 'Senior Reviewer',
        department: u.department || 'Electrical',
        vertical: u.vertical || 'PV',
        email: u.email
      }));

    const rawList = [...dbReviewers, ...DEFAULT_REVIEWERS];
    const unique = [];
    const seen = new Set();

    for (const rev of rawList) {
      const key = (rev.name || '').toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(rev);
    }

    return unique;
  }, [dbUsers]);

  // New Client Modal Form State
  const [newClient, setNewClient] = useState({
    clientName: '',
    clientContact: '',
    clientEmail: '',
    clientAddress: '',
    logo: '',
    consultant: '',
    desc: '',
  });

  const loggedInReviewerName = formatPersonName(user, 'Senior Reviewer');

  // New Project Modal Form State
  const [newProject, setNewProject] = useState({
    name: '',
    county: '',
    state: '',
    assignedReviewer: loggedInReviewerName,
    assignedReviewerId: user?.id || null,
    assignedCreator: matchingEngineers[0]?.name || '',
    assignedCreatorId: matchingEngineers[0]?.id || null,
    desc: '',
  });

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewClient((prev) => ({ ...prev, logo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClient.clientName.trim()) return;

    // Save locally
    const updatedList = saveClientProfile(newClient);
    setClients(updatedList);
    const newest = updatedList[updatedList.length - 1];
    if (newest) setSelectedId(newest.id);

    // Save to Backend Database
    try {
      const apiRes = await createClientApi(newClient);
      if (apiRes && apiRes.success && apiRes.client) {
        const dbClient = {
          id: apiRes.client.id.toString().startsWith('client-') ? apiRes.client.id : `client-${apiRes.client.id}`,
          name: apiRes.client.name,
          clientName: apiRes.client.name,
          contact: apiRes.client.primary_contact || newClient.clientContact,
          clientContact: apiRes.client.primary_contact || newClient.clientContact,
          email: apiRes.client.contact_email || newClient.clientEmail,
          clientEmail: apiRes.client.contact_email || newClient.clientEmail,
          address: apiRes.client.address || newClient.clientAddress,
          clientAddress: apiRes.client.address || newClient.clientAddress,
          logo: apiRes.client.logo || newClient.logo,
          consultant: 'PV-Insight Engineering LLC',
          desc: 'Registered client profile.',
          icon: 'briefcase',
          iconColor: 'rgb(59, 130, 246)',
          iconBg: 'rgba(59, 130, 246, 0.1)',
        };
        setClients(prev => {
          const map = new Map();
          for (const c of [...prev, dbClient]) {
            map.set((c.name || '').trim().toLowerCase(), c);
          }
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('Error saving client to database:', err);
    }

    setShowAddClientModal(false);
    setNewClient({
      clientName: '',
      clientContact: '',
      clientEmail: '',
      clientAddress: '',
      logo: '',
      consultant: '',
      desc: '',
    });
  };

  const handleDeleteClientCard = async (clientToDelete, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const confirmDelete = window.confirm(`Are you sure you want to delete client profile "${clientToDelete.name}"?`);
    if (!confirmDelete) return;

    // Delete locally
    const updatedList = deleteClientProfile(clientToDelete.id);
    setClients(updatedList);
    if (selectedId === clientToDelete.id) {
      setSelectedId(updatedList[0]?.id || null);
    }

    // Delete from Backend Database
    try {
      await deleteClientApi(clientToDelete.id);
    } catch (err) {
      console.error('Error deleting client from database:', err);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();

    if (!newProject.name.trim() || !selectedClient) return;

    const baseProject = {
      ...newProject,
      assignedReviewer: loggedInReviewerName,
      assignedReviewerId: user?.id || null,
      assignedCreator: newProject.assignedCreator || matchingEngineers[0]?.name || 'Design Engineer',
      assignedCreatorId: newProject.assignedCreatorId || matchingEngineers[0]?.id || null,
      department: currentDept,
      vertical: currentVert,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
    };

    let finalId = 'proj-' + Date.now();
    let finalProject = { ...baseProject, id: finalId };

    // 1. Save to Backend Database
    try {
      const apiRes = await saveProjectApi(baseProject);
      if (apiRes && apiRes.success && apiRes.project_id) {
        finalId = apiRes.project_id.toString().startsWith('proj-') ? apiRes.project_id : `proj-${apiRes.project_id}`;
        finalProject.id = finalId;
      }
    } catch (err) {
      console.error('Error saving project to database:', err);
    }

    // 2. Save locally with single canonical ID
    const updated = saveProjectRecord(finalProject);

    // 3. Deduplicate state by project name
    setProjects(() => {
      const map = new Map();
      for (const p of updated) {
        const key = (p.name || p.id || '').toString().toLowerCase().trim();
        if (key) map.set(key, p);
      }
      return Array.from(map.values());
    });

    setShowNewProjectModal(false);
    setNewProject({
      name: '',
      county: '',
      state: '',
      department: currentDept,
      vertical: currentVert,
      assignedReviewer: loggedInReviewerName,
      assignedReviewerId: user?.id || null,
      assignedCreator: matchingEngineers[0]?.name || '',
      assignedCreatorId: matchingEngineers[0]?.id || null,
      desc: '',
    });
  };

  const handleDeleteProject = async (projId, projName, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!window.confirm(`Delete project "${projName}"?`)) return;

    // Delete locally
    const updated = deleteProjectRecord(projId);
    setProjects(updated);
    window.dispatchEvent(new Event('storage'));

    // Delete from Backend Database
    try {
      await deleteProjectApi(projId);
    } catch (err) {
      console.error('Error deleting project from database:', err);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedId) || null;

  // Filter projects for selected client
  const clientProjects = projects.filter((p) => p.clientId === selectedClient?.id);

  const getReportsForProject = (projectObj) => {
    if (!projectObj) return [];
    const pName = (projectObj.name || '').trim().toLowerCase();
    if (!pName) return [];

    const matched = allReports.filter((r) => {
      const vals = r.values || {};
      const rProjName = (
        r.project_name ||
        vals.projectName ||
        vals.project_name ||
        vals.plant_name
      )?.toString().trim().toLowerCase() || '';

      if (rProjName && (rProjName.includes(pName) || pName.includes(rProjName))) {
        return true;
      }
      return false;
    });

    // Deduplicate by report lineage to show only latest active version copy
    const map = new Map();
    for (const r of matched) {
      if (r.is_current_version === false) continue;
      const repKey = getLogicalReportKey(r);
      const existing = map.get(repKey);
      if (!existing) {
        map.set(repKey, r);
      } else {
        const existingVer = existing.version_number || 1;
        const currentVer = r.version_number || 1;
        const existingUpdated = new Date(existing.updated_at || existing.created_at || 0).getTime();
        const currentUpdated = new Date(r.updated_at || r.created_at || 0).getTime();

        if (currentVer > existingVer || (currentVer === existingVer && currentUpdated > existingUpdated)) {
          map.set(repKey, r);
        }
      }
    }

    return Array.from(map.values());
  };

  const getReportsForClient = (clientObj) => {
    if (!clientObj) return [];
    const cName = (clientObj.clientName || clientObj.name || '').trim().toLowerCase();
    if (!cName) return [];

    return allReports.filter((r) => {
      const vals = r.values || {};
      const rClientName = (
        r.client_name ||
        vals.clientName ||
        vals.client_name ||
        vals.client ||
        vals.client_company
      )?.toString().trim().toLowerCase() || '';

      if (rClientName && (rClientName.includes(cName) || cName.includes(rClientName))) {
        return true;
      }
      return false;
    });
  };

  const handleResumeReport = async (rep, targetPhase = 'form') => {
    if (!rep.id || !onSelectRecent) return;
    try {
      const detailRes = await fetchReportDetailApi(rep.id);
      if (detailRes.success && detailRes.data) {
        onSelectRecent(
          {
            report_id: rep.id,
            report_type: rep.report_type,
            status: rep.status,
            targetPhase: targetPhase,
          },
          detailRes.data
        );
      }
    } catch (err) {
      console.error('Error loading report detail:', err);
    }
  };

  const handleCloneReportClick = async (rep) => {
    if (!rep.id) return;
    setCloningId(rep.id);
    try {
      const detailRes = await fetchReportDetailApi(rep.id);
      if (detailRes.success && detailRes.data) {
        setCloneModalSource(detailRes.data);
      } else {
        setCloneModalSource(rep);
      }
    } catch (err) {
      console.error('Error cloning report:', err);
      setCloneModalSource(rep);
    } finally {
      setCloningId(null);
    }
  };
  const handleDeleteReportClick = async (rep) => {
    if (!rep.id) return;
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete "${rep.report_title || 'Unnamed Report'}"?`);
    if (!confirmDelete) return;

    try {
      const res = await deleteReportApi(rep.id);
      if (res.success) {
        // Also delete associated project assignment so it does not reappear as an uncompleted task
        const vals = rep.values || {};
        const pId = (rep.project_id || vals.projectId || vals.project_id || '').toString().trim();
        const pName = (
          rep.project_name ||
          vals.projectName ||
          vals.project_name ||
          vals.plant_name ||
          rep.report_title ||
          ''
        ).toString().trim().toLowerCase();

        const matchingProj = (projects || []).find(p => {
          const idMatch = pId && (p.id || '').toString().trim() === pId;
          const nameMatch = pName && (p.name || '').toString().trim().toLowerCase() === pName;
          return idMatch || nameMatch;
        });
        if (matchingProj) {
          const updatedProjects = deleteProjectRecord(matchingProj.id);
          setProjects(updatedProjects);
        }

        setAllReports((prev) => prev.filter((r) => r.id !== rep.id && r.parent_report_id !== rep.id));
        window.dispatchEvent(new Event('storage'));
        fetchClientData();
      } else {
        alert('Failed to delete report: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error deleting report:', err);
      alert('Error deleting report: ' + err.message);
    }
  };


  const handleStartReportForProject = (clientObj, projectObj) => {
    if (onContinue) {
      onContinue({
        ...clientObj,
        projectName: projectObj.name,
        assignedReviewer: projectObj.assignedReviewer,
        assignedCreator: projectObj.assignedCreator || matchingEngineers[0]?.name || 'Arman Shah',
        department: projectObj.department || currentDept,
        vertical: projectObj.vertical || currentVert,
        county: projectObj.county,
        state: projectObj.state,
      });
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '44px 40px 60px' }} className="fade-up">
        {/* Breadcrumb Header */}
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
          {vertical?.name} &rsaquo; {sub?.name} &rsaquo; {report?.name} &rsaquo;{' '}
          <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>Clients & Project Setup</span>
        </div>

        {/* Page Title */}
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
          Clients & Project Workspace
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-2)', margin: '0 0 28px', maxWidth: 640 }}>
          Select a client to view their project portfolio, assign engineering reviewers, and generate report copies.
        </p>

        {/* Clients Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {clients.map((c) => {
            const isSelected = c.id === selectedId;
            const clientProjs = projects.filter(p => p.clientId === c.id);

            return (
              <div
                key={c.id}
                className="card"
                onClick={() => setSelectedId(c.id)}
                style={{
                  padding: '20px 18px',
                  cursor: 'pointer',
                  borderRadius: 14,
                  border: isSelected ? '2px solid var(--accent, #3b82f6)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(59, 130, 246, 0.04)' : 'var(--surface)',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 200,
                  boxShadow: isSelected ? '0 4px 14px rgba(59, 130, 246, 0.15)' : 'none',
                  position: 'relative',
                }}
              >
                {/* Delete Client Card Button (Reviewer Only) */}
                {isReviewer && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    title={`Delete ${c.name} profile`}
                    onClick={(e) => handleDeleteClientCard(c, e)}
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      padding: '4px 6px',
                      color: 'var(--red-text, #ef4444)',
                      background: 'var(--red-soft, rgba(239, 68, 68, 0.08))',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      zIndex: 2,
                    }}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                )}

                <div>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: c.iconBg || 'var(--surface-3)',
                      color: c.iconColor || 'var(--accent)',
                      display: 'grid',
                      placeItems: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <Icon name={c.icon || 'briefcase'} size={20} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{c.name}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                      {clientProjs.length} project{clientProjs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.4 }}>
                    {c.desc}
                  </div>
                </div>

                {isSelected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 12, fontWeight: 600, marginTop: 12 }}>
                    <Icon name="check" size={14} stroke={3} />
                    <span>Selected Client</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add New Client Card (Reviewer Only) */}
          {isReviewer && (
            <div
              onClick={() => setShowAddClientModal(true)}
              style={{
                padding: '20px 18px',
                cursor: 'pointer',
                borderRadius: 14,
                border: '2px dashed var(--border-strong, #cbd5e1)',
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minHeight: 200,
                transition: 'all 0.18s ease',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: '1.5px dashed var(--border-strong)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--text-3)',
                  marginBottom: 12,
                }}
              >
                <Icon name="plus" size={18} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Add New Client</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, maxWidth: 150, lineHeight: 1.35 }}>
                Register client profile to attach projects & reports.
              </div>
            </div>
          )}
        </div>

        {/* Selected Client's Projects Dashboard View */}
        {selectedClient && (
          <div style={{ marginTop: 24, marginBottom: 40 }} className="fade-up">
            <div style={{
              background: 'var(--surface-2, #0f172a)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '20px 24px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div className="label-eyebrow" style={{ color: 'var(--accent)' }}>CLIENT PROJECTS DASHBOARD</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 2px', color: 'var(--text-1)' }}>
                  Projects for {selectedClient.name}
                </h2>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  Contact: <strong>{selectedClient.contact || 'Main Contact'}</strong> ({selectedClient.email || 'No email'}) · Consultant: <strong>{selectedClient.consultant}</strong>
                </div>
              </div>
              {isReviewer && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowNewProjectModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 600 }}
                >
                  <Icon name="plus" size={16} />
                  Create New Project for {selectedClient.name}
                </button>
              )}
            </div>

            {/* List of Client Projects */}
            {clientProjects.length === 0 ? (
              <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
                <Icon name="folder" size={32} style={{ marginBottom: 10, color: 'var(--accent)' }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>No Projects Created Yet</div>
                <p style={{ fontSize: 13, margin: '6px 0 16px' }}>
                  {isReviewer
                    ? `Create your first project for ${selectedClient.name} and assign an engineering reviewer.`
                    : `No projects registered for ${selectedClient.name} yet. Contact your reviewer to initialize a project.`}
                </p>
                {isReviewer && (
                  <button className="btn btn-primary btn-sm" onClick={() => setShowNewProjectModal(true)}>
                    + Create Project Now
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {clientProjects.map((proj) => {
                  const projReports = getReportsForProject(proj);
                  const underReviewReps = projReports.filter(r => ['in_review', 'changes_requested'].includes(r.status));
                  const approvedReps = projReports.filter(r => ['approved', 'completed'].includes(r.status));
                  const draftReps = projReports.filter(r => DRAFT_STATUSES.includes(r.status));

                  return (
                    <div
                      key={proj.id}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 14,
                        padding: 22,
                        boxShadow: 'var(--sh-xs)'
                      }}
                    >
                      {/* Project Header Bar */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>
                              {proj.name}
                            </h3>
                            <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 6 }}>
                              {proj.county ? `${proj.county}, ` : ''}{proj.state} {proj.country}
                            </span>
                          </div>
                          {proj.desc && (
                            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>
                              {proj.desc}
                            </div>
                          )}
                        </div>

                        {/* Assigned Creator & Reviewer Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: '#10b981',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            padding: '5px 10px',
                            borderRadius: 99,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5
                          }}>
                            <Icon name="user" size={13} />
                            <span>Creator: <strong>{proj.assignedCreator || matchingEngineers[0]?.name || 'Arman Shah'}</strong></span>
                          </div>

                          <div style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: '#3b82f6',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            padding: '5px 10px',
                            borderRadius: 99,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5
                          }}>
                            <Icon name="userCheck" size={13} />
                            <span>Reviewer: <strong>{proj.assignedReviewer}</strong></span>
                          </div>

                          <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>
                            {proj.department || currentDept} / {proj.vertical || currentVert}
                          </span>

                          {isReviewer && (
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Delete Project"
                              onClick={(e) => handleDeleteProject(proj.id, proj.name, e)}
                              style={{ color: '#ef4444', padding: 6 }}
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reports under this Project */}
                      <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <span className="label-eyebrow" style={{ fontSize: 11, margin: 0 }}>
                            PROJECT REPORTS ({projReports.length})
                          </span>
                          <button
                            className="btn btn-soft btn-sm"
                            onClick={() => handleStartReportForProject(selectedClient, proj)}
                            style={{ fontSize: 12, padding: '4px 10px', background: 'var(--surface)', color: 'var(--accent)', fontWeight: 600 }}
                          >
                            <Icon name="plus" size={12} />
                            + Add New Report to {proj.name}
                          </button>
                        </div>

                        {projReports.length === 0 ? (
                          <div style={{ fontSize: 12.5, color: 'var(--text-3)', padding: 10 }}>
                            No reports generated under this project yet. Click "+ Add New Report" to start.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {projReports.map((r) => {
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
                                  onClick={() => handleResumeReport(r, 'preview')}
                                  onOpenVersionHistory={(rep) => setVersionHistoryReport(rep)}
                                  onOpenComments={(rep) => setReviewCommentsReport(rep)}
                                  action={
                                    <div style={{ display: 'flex', gap: 6 }}>

                                      <button
                                        className="btn btn-soft btn-sm"
                                        title="Advance Stage or Clone for New Project"
                                        disabled={cloningId === r.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCloneReportClick(r);
                                        }}
                                      >
                                        <Icon name="copy" size={13} />
                                        {cloningId === r.id ? 'Loading...' : 'Clone'}
                                      </button>
                                      {!isApproved && (
                                        <button
                                          className="btn btn-soft btn-sm"
                                          title="Delete Report"
                                          style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', border: 'none' }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteReportClick(r);
                                          }}
                                        >
                                          <Icon name="trash" size={13} />
                                        </button>
                                      )}
                                    </div>
                                  }
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 20,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Showing {clients.length} client profile{clients.length > 1 ? 's' : ''}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-soft" onClick={onCancel} style={{ padding: '8px 20px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!selectedClient}
              onClick={() => {
                if (selectedClient) {
                  const defaultProj = clientProjects[0] || { name: 'Default Project', assignedReviewer: DEFAULT_REVIEWERS[0].name };
                  handleStartReportForProject(selectedClient, defaultProj);
                }
              }}
              style={{
                padding: '8px 24px',
                cursor: selectedClient ? 'pointer' : 'not-allowed',
                background: 'var(--accent, #3b82f6)',
                color: '#fff',
                fontWeight: 600,
                border: 'none',
                borderRadius: 6,
              }}
            >
              Start Report for {selectedClient?.name || 'Client'}
            </button>
          </div>
        </div>
      </div>

      {/* Add New Client Modal */}
      {showAddClientModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1100,
            padding: 20,
          }}
        >
          <div
            className="card fade-up"
            style={{
              width: '100%',
              maxWidth: 520,
              padding: 28,
              borderRadius: 16,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Register New Client Profile</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAddClientModal(false)}
                style={{ height: 28, width: 28, padding: 0 }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-2)' }}>
                  Client / Developer Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TerraWatt Energy Solutions"
                  value={newClient.clientName}
                  onChange={(e) => setNewClient({ ...newClient, clientName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 13.5 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-2)' }}>
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah Jenkins"
                    value={newClient.clientContact}
                    onChange={(e) => setNewClient({ ...newClient, clientContact: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 13.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-2)' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="contact@terrawatt.com"
                    value={newClient.clientEmail}
                    onChange={(e) => setNewClient({ ...newClient, clientEmail: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 13.5 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-2)' }}>
                  Headquarters Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 500 Solar Way, Austin, TX 78701"
                  value={newClient.clientAddress}
                  onChange={(e) => setNewClient({ ...newClient, clientAddress: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 13.5 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-2)' }}>
                  Company Logo (Upload Image file / Base64)
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    style={{ fontSize: 12, color: 'var(--text-2)' }}
                  />
                  {newClient.logo && (
                    <img
                      src={newClient.logo}
                      alt="Logo Preview"
                      style={{ height: 36, width: 'auto', maxHeight: 36, borderRadius: 4, objectFit: 'contain', border: '1px solid var(--border)', padding: 2 }}
                    />
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-2)' }}>
                  Assigned Engineering Consultant (PV-Insight)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PV-Insight Engineering LLC"
                  value={newClient.consultant}
                  onChange={(e) => setNewClient({ ...newClient, consultant: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 13.5 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-2)' }}>
                  Notes / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Key portfolio focus: Utility solar and microgrids..."
                  value={newClient.desc}
                  onChange={(e) => setNewClient({ ...newClient, desc: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 13.5, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="btn btn-soft" onClick={() => setShowAddClientModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Project Modal (With Creator & Reviewer Discipline Assignment!) */}
      {showNewProjectModal && selectedClient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1100,
            padding: 20,
          }}
        >
          <div
            className="card fade-up"
            style={{
              width: '100%',
              maxWidth: 580,
              padding: 28,
              borderRadius: 16,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div className="label-eyebrow" style={{ color: 'var(--accent)' }}>PROJECT ASSIGNMENT</div>
                <h2 style={{ fontSize: 20, fontWeight: 600, margin: '2px 0 0' }}>
                  Create New Project for {selectedClient.name}
                </h2>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowNewProjectModal(false)}
                style={{ height: 28, width: 28, padding: 0 }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* DISCIPLINE CONTEXT & SCOPE BANNER */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '12px 14px',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: '#10b981' }}>
                    DISCIPLINE CONTEXT & SCOPE
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginTop: 2 }}>
                    {currentDept} &rsaquo; {currentVert}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-2)', background: 'var(--surface)', padding: '4px 10px', borderRadius: 99, border: '1px solid var(--border)', fontWeight: 600 }}>
                  {matchingEngineers.length} {currentDept}/{currentVert} engineer{matchingEngineers.length !== 1 ? 's' : ''} available
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-2)' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Desert Star Solar Park (100MW)"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 13.5 }}
                />
              </div>

              {/* STRICT FILTERED CREATOR ASSIGNMENT SELECTOR */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: 14,
                borderRadius: 10
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: '#10b981' }}>
                  <Icon name="user" size={15} />
                  ASSIGN DESIGN ENGINEER (CREATOR) *
                </label>
                <select
                  required
                  value={newProject.assignedCreator}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    const eng = matchingEngineers.find(en => en.name === selectedName);
                    setNewProject({ ...newProject, assignedCreator: selectedName, assignedCreatorId: eng?.id || null });
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-1)',
                    fontSize: 13.5,
                    fontWeight: 600
                  }}
                >
                  {matchingEngineers.map(eng => (
                    <option key={eng.id || eng.name} value={eng.name} data-id={eng.id || ''}>
                      {eng.name} [{eng.role || 'Design Engineer'} · {eng.department}/{eng.vertical}]
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>
                  Strictly filtered: Only engineers working in <strong>{currentDept} &rarr; {currentVert}</strong> can be assigned to build this report.
                </div>
              </div>

              {/* AUTOMATIC REVIEWER ASSIGNMENT (CURRENT USER ASSIGNING PROJECT) */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                padding: '10px 14px',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="userCheck" size={16} style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>Project Reviewer:</span>
                  <strong style={{ fontSize: 13, color: '#3b82f6' }}>{loggedInReviewerName}</strong>
                </div>
                <span style={{ fontSize: 11, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                  Auto-Assigned
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-2)' }}>
                    County / Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kern County"
                    value={newProject.county}
                    onChange={(e) => setNewProject({ ...newProject, county: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 13.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-2)' }}>
                    State / Province
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CA"
                    value={newProject.state}
                    onChange={(e) => setNewProject({ ...newProject, state: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 13.5 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-2)' }}>
                  Project Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Utility-scale 100MW solar PV plant details..."
                  value={newProject.desc}
                  onChange={(e) => setNewProject({ ...newProject, desc: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 13.5, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="btn btn-soft" onClick={() => setShowNewProjectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--accent, #3b82f6)' }}>
                  Create Project & Assign Scope
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Render Version History Drawer */}
      {versionHistoryReport && (
        <VersionHistoryDrawer
          report={versionHistoryReport}
          onClose={() => setVersionHistoryReport(null)}
          onVersionCreated={async () => {
            const res = await fetchReportsApi();
            setAllReports(res.success && res.reports ? res.reports : []);
          }}
          onSelectVersion={(ver) => {
            setVersionHistoryReport(null);
            handleResumeReport(ver, "preview");
          }}
        />
      )}

      {/* Render Review & Commenting Modal */}
      {reviewCommentsReport && (
        <ReviewCommentsModal
          report={reviewCommentsReport}
          userRole="creator"
          onClose={() => setReviewCommentsReport(null)}
          onRefresh={async () => {
            const res = await fetchReportsApi();
            setAllReports(res.success && res.reports ? res.reports : []);
          }}
        />
      )}

      {/* Render Dual-Mode Clone & Stage Progression Modal */}
      {cloneModalSource && (
        <CloneOptionsModal
          isOpen={!!cloneModalSource}
          onClose={() => setCloneModalSource(null)}
          sourceReport={cloneModalSource}
          user={user}
          clients={clients}
          engineers={matchingEngineers}
          reviewers={matchingReviewers}
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
      )}
    </div>
  );
}
