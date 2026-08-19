export const DESIGN_STAGES = [
  { id: '10', label: '10% Preliminary Design', short: '10% Preliminary', desc: 'Conceptual sizing and feasibility basis' },
  { id: '30', label: '30% Basic Design', short: '30% Basic', desc: 'Interconnection and permitting deliverable' },
  { id: '60', label: '60% Detailed Design', short: '60% Detailed', desc: 'EPC procurement and equipment finalization' },
  { id: '100', label: '100% Issued for Construction', short: '100% IFC', desc: 'Final sealed deliverable for construction' }
];

export function getNextDesignStage(currentStageId) {
  const norm = (currentStageId || '10').toString().replace(/[^0-9]/g, '');
  if (norm === '10') return '30';
  if (norm === '30') return '60';
  if (norm === '60') return '100';
  return '100';
}

export function getDesignStageInfo(stageId) {
  const norm = (stageId || '10').toString().replace(/[^0-9]/g, '');
  return DESIGN_STAGES.find(s => s.id === norm) || DESIGN_STAGES[0];
}

export const DEFAULT_REVIEWERS = [
  { id: 'rev-1', name: 'Senior Electrical Reviewer (John Smith)', role: 'Electrical Lead', department: 'Electrical', vertical: 'PV' },
  { id: 'rev-2', name: 'Lead Structural & Mechanical Reviewer (Elena Vance)', role: 'Structural Lead', department: 'Structural', vertical: 'PV' },
  { id: 'rev-3', name: 'Principal PV System Engineer (Robert Chang)', role: 'PV Principal', department: 'Electrical', vertical: 'PV' },
  { id: 'rev-4', name: 'Grid Interconnection Lead (Marcus Thorne)', role: 'Grid Specialist', department: 'Electrical', vertical: 'HV & Substation' },
  { id: 'rev-5', name: 'Quality & Compliance Officer (Amanda Lewis)', role: 'QA/QC Lead', department: 'Electrical', vertical: 'BESS' }
];

export const DEFAULT_ENGINEERS = [
  { id: 'eng-1', name: 'Arman Shah', role: 'Electrical Design Engineer', department: 'Electrical', vertical: 'PV', email: 'arman.shah@pvinsightinc.com' },
  { id: 'eng-2', name: 'Siddharth Rao', role: 'PV System Engineer', department: 'Electrical', vertical: 'PV', email: 'siddharth.rao@pvinsightinc.com' },
  { id: 'eng-3', name: 'Priya Patel', role: 'BESS Sizing Engineer', department: 'Electrical', vertical: 'BESS', email: 'priya.patel@pvinsightinc.com' },
  { id: 'eng-4', name: 'Kavita Verma', role: 'Substation & HV Engineer', department: 'Electrical', vertical: 'HV & Substation', email: 'kavita.verma@pvinsightinc.com' },
  { id: 'eng-5', name: 'Rahul Nair', role: 'Transmission Line Engineer', department: 'Electrical', vertical: 'TL Lines', email: 'rahul.nair@pvinsightinc.com' },
  { id: 'eng-6', name: 'Vikram Joshi', role: 'Civil Site Engineer', department: 'Civil', vertical: 'PV', email: 'vikram.joshi@pvinsightinc.com' },
  { id: 'eng-7', name: 'Ananya Deshmukh', role: 'Structural Pile Engineer', department: 'Structural', vertical: 'PV', email: 'ananya.deshmukh@pvinsightinc.com' },
];

export const DEFAULT_PROJECTS = [
  {
    id: 'proj-1',
    clientId: 'client-demo',
    clientName: 'Demo',
    name: 'Desert Star Solar Park (100MW)',
    county: 'Kern County',
    state: 'CA',
    country: 'USA',
    department: 'Electrical',
    vertical: 'PV',
    assignedReviewer: 'Senior Electrical Reviewer (John Smith)',
    assignedCreator: 'Arman Shah',
    status: 'in_review',
    desc: 'Utility-scale 100MW solar PV plant with central inverters and 34.5kV collector system.',
    createdAt: '2026-08-01'
  },
  {
    id: 'proj-2',
    clientId: 'client-demo',
    clientName: 'Demo',
    name: 'SunValley Solar & BESS Project',
    county: 'Pima County',
    state: 'AZ',
    country: 'USA',
    department: 'Electrical',
    vertical: 'BESS',
    assignedReviewer: 'Quality & Compliance Officer (Amanda Lewis)',
    assignedCreator: 'Priya Patel',
    status: 'active',
    desc: '50MWac Solar PV + 40MW/160MWh Battery Energy Storage System.',
    createdAt: '2026-08-10'
  }
];

import { saveProjectApi, deleteProjectApi } from '../features/electrical/pv/pv-design/api/reportsApi';

export function getStoredProjects() {
  try {
    const saved = localStorage.getItem('forge_project_records');
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(p => 
          !['client-1', 'client-2', 'client-3'].includes(p.clientId) &&
          !['greenpower solar', 'apex engineering', 'global renewables'].includes((p.clientName || '').toLowerCase().trim())
        );
        if (filtered.length > 0) {
          return filtered;
        }
        localStorage.removeItem('forge_project_records');
      }
    }
  } catch (e) {
    console.error('Error reading stored projects:', e);
  }
  return DEFAULT_PROJECTS;
}

export function saveProjectRecord(projData) {
  const current = getStoredProjects();
  const newProj = {
    id: projData.id || 'proj-' + Date.now(),
    clientId: projData.clientId || 'client-demo',
    clientName: projData.clientName || 'Client',
    name: projData.name || 'New Engineering Project',
    county: projData.county || '',
    state: projData.state || '',
    country: projData.country || 'USA',
    department: projData.department || 'Electrical',
    vertical: projData.vertical || 'PV',
    assignedReviewer: projData.assignedReviewer || DEFAULT_REVIEWERS[0].name,
    assignedReviewerId: projData.assignedReviewerId || null,
    assignedCreator: projData.assignedCreator || DEFAULT_ENGINEERS[0].name,
    assignedCreatorId: projData.assignedCreatorId || null,
    status: projData.status || 'active',
    desc: projData.desc || 'Standard engineering design project.',
    createdAt: new Date().toISOString().split('T')[0]
  };

  // Sync to database asynchronously so all users on any device see this project
  saveProjectApi(newProj).catch(err => console.error('Failed to sync project to backend DB:', err));

  const updated = [...current.filter(p => p.id !== newProj.id), newProj];
  try {
    localStorage.setItem('forge_project_records', JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving project record:', e);
  }
  return updated;
}


export function deleteProjectRecord(projectId) {
  const current = getStoredProjects();
  const updated = current.filter(p => p.id !== projectId);

  deleteProjectApi(projectId).catch(err => console.error('Failed to delete project from backend DB:', err));

  try {
    localStorage.setItem('forge_project_records', JSON.stringify(updated));
  } catch (e) {
    console.error('Error deleting project record:', e);
  }
  return updated;
}
