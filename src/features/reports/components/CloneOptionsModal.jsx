import React, { useState, useMemo } from 'react';
import Icon from '../../../shared/components/Icon';
import { DESIGN_STAGES, getNextDesignStage, DEFAULT_REVIEWERS, DEFAULT_ENGINEERS } from '../../../data/projects';

function formatPersonName(objOrString, defaultFallback = 'Senior Reviewer') {
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

export default function CloneOptionsModal({
  isOpen,
  onClose,
  sourceReport,
  user,
  clients = [],
  engineers = DEFAULT_ENGINEERS,
  reviewers = DEFAULT_REVIEWERS,
  onAdvanceStage,
  onCloneToNewProject
}) {
  if (!isOpen || !sourceReport) return null;

  const vals = sourceReport.values || sourceReport;
  const currentProjectName = (
    sourceReport.project_name ||
    vals.projectName ||
    vals.project_name ||
    vals.plant_name ||
    vals.PROJECT_NAME ||
    'Current Project'
  );

  const currentClientName = (
    sourceReport.client_name ||
    vals.clientName ||
    vals.client_name ||
    vals.client ||
    'Client'
  );

  const currentStage = (vals.designStage || vals.stage || '10').toString().replace(/[^0-9]/g, '') || '10';
  const nextStageDefault = getNextDesignStage(currentStage);

  const currentRevision = (vals.revision || vals.REVISION || '0').toString();

  // Mode: 'advance_stage' | 'clone_new_project'
  const [activeTab, setActiveTab] = useState('advance_stage');

  // Mode 1 State: Advance Stage / New Revision
  const [targetStage, setTargetStage] = useState(nextStageDefault);
  const [targetRevision, setTargetRevision] = useState(() => {
    if (nextStageDefault !== currentStage) return '0';
    const num = parseInt(currentRevision, 10);
    return isNaN(num) ? '1' : (num + 1).toString();
  });
  const [stageDescription, setStageDescription] = useState(() => {
    const stageObj = DESIGN_STAGES.find(s => s.id === nextStageDefault);
    return stageObj ? `${stageObj.short} Engineering Package` : 'Revised Engineering Package';
  });

  // Mode 2 State: Clone for New Project
  const loggedInReviewerName = formatPersonName(user, vals.assignedReviewer || 'Senior Reviewer');
  const [newProjectName, setNewProjectName] = useState('');
  const [newCounty, setNewCounty] = useState('');
  const [newState, setNewState] = useState('');
  const [newCountry, setNewCountry] = useState('USA');
  const [newStage, setNewStage] = useState('10');
  const [assignedCreator, setAssignedCreator] = useState(formatPersonName(vals.assignedCreator, engineers[0]?.name || 'Arman Shah'));
  const [assignedReviewer, setAssignedReviewer] = useState(loggedInReviewerName);
  const [newDesc, setNewDesc] = useState('');

  const handleStageSelect = (stageId) => {
    setTargetStage(stageId);
    if (stageId !== currentStage) {
      setTargetRevision('0');
      const stageObj = DESIGN_STAGES.find(s => s.id === stageId);
      setStageDescription(stageObj ? `${stageObj.short} Engineering Package` : '');
    } else {
      const num = parseInt(currentRevision, 10);
      setTargetRevision(isNaN(num) ? '1' : (num + 1).toString());
      setStageDescription('Revision Update');
    }
  };

  const handleAdvanceSubmit = (e) => {
    e.preventDefault();
    if (onAdvanceStage) {
      onAdvanceStage({
        sourceReport,
        targetStage,
        revision: targetRevision.trim() || '0',
        description: stageDescription.trim() || `${targetStage}% Milestone`,
      });
    }
    onClose();
  };

  const handleCloneNewProjectSubmit = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      alert('Please enter a name for the new project.');
      return;
    }
    if (onCloneToNewProject) {
      onCloneToNewProject({
        sourceReport,
        newProject: {
          name: newProjectName.trim(),
          county: newCounty.trim(),
          state: newState.trim(),
          country: newCountry.trim(),
          department: vals.department || 'Electrical',
          vertical: vals.vertical || 'PV',
          assignedCreator,
          assignedReviewer,
          desc: newDesc.trim() || 'Cloned engineering design project.',
          clientName: currentClientName,
        },
        targetStage: newStage,
        revision: '0',
      });
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1200,
        padding: 20,
      }}
    >
      <div
        className="card fade-up"
        style={{
          width: '100%',
          maxWidth: 640,
          background: 'var(--surface, #1e293b)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-2, #0f172a)',
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>
              Clone & Milestone Progression
            </h2>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
              Source: <strong style={{ color: 'var(--text-2)' }}>{currentProjectName}</strong> ({currentClientName})
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ padding: 6, color: 'var(--text-3)' }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-3, #090d16)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('advance_stage')}
            style={{
              padding: '14px 16px',
              border: 'none',
              background: activeTab === 'advance_stage' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'advance_stage' ? 'var(--accent, #3b82f6)' : 'var(--text-3)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              borderBottom: activeTab === 'advance_stage' ? '2px solid var(--accent, #3b82f6)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name="refresh" size={15} />
            <span>Advance Stage / New Rev</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clone_new_project')}
            style={{
              padding: '14px 16px',
              border: 'none',
              background: activeTab === 'clone_new_project' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'clone_new_project' ? 'var(--accent, #3b82f6)' : 'var(--text-3)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              borderBottom: activeTab === 'clone_new_project' ? '2px solid var(--accent, #3b82f6)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name="copy" size={15} />
            <span>Clone to New Project</span>
          </button>
        </div>

        {/* Tab 1: Advance Stage / New Revision (Same Project) */}
        {activeTab === 'advance_stage' && (
          <form onSubmit={handleAdvanceSubmit} style={{ padding: '24px', overflowY: 'auto' }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.5 }}>
              Advance this report to the next engineering milestone or create a revision for <strong>{currentProjectName}</strong>. All site data and calculation values will carry over.
            </div>

            {/* Design Stage Grid */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Select Milestone Design Stage
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {DESIGN_STAGES.map((s) => {
                  const isSelected = targetStage === s.id;
                  const isCurrent = currentStage === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleStageSelect(s.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: isSelected ? '2px solid var(--accent, #3b82f6)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--surface-2)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text-1)' }}>
                          {s.label}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: 10, background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-3)' }}>
                            Current
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.35 }}>
                        {s.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Revision & Description */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 14, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
                  Revision Code
                </label>
                <input
                  type="text"
                  className="input"
                  value={targetRevision}
                  onChange={(e) => setTargetRevision(e.target.value)}
                  placeholder="e.g. 0 or 1"
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13, fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
                  Milestone Package Description
                </label>
                <input
                  type="text"
                  className="input"
                  value={stageDescription}
                  onChange={(e) => setStageDescription(e.target.value)}
                  placeholder="e.g. 30% Basic Design Basis Deliverable"
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
              <button type="button" className="btn btn-soft" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="check" size={15} />
                <span>Advance to {DESIGN_STAGES.find(s => s.id === targetStage)?.short || 'Next Stage'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Clone as Template to New Project (Cross-Project) */}
        {activeTab === 'clone_new_project' && (
          <form onSubmit={handleCloneNewProjectSubmit} style={{ padding: '24px', overflowY: 'auto' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 20,
              fontSize: 12.5,
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}>
              <Icon name="check" size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: '#10b981' }}>Equipment & Calculation Preset Re-use:</strong> All inverter models, module datasheets, battery sizing inputs, cable ratings, and calculation standards will be copied. Site-specific names, GPS, and review comments will be reset.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
                  Client Name (Pre-selected)
                </label>
                <input
                  type="text"
                  className="input"
                  value={currentClientName}
                  disabled
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13, background: 'var(--surface-3)', opacity: 0.8 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
                  New Project Name *
                </label>
                <input
                  type="text"
                  className="input"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. SunValley Solar & BESS Phase 2 (75MW)"
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
                    County / Region
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newCounty}
                    onChange={(e) => setNewCounty(e.target.value)}
                    placeholder="e.g. Pima County"
                    style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
                    State / Province
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    placeholder="e.g. AZ"
                    style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
                  Assign Lead Design Engineer (Creator) *
                </label>
                <select
                  className="input"
                  value={assignedCreator}
                  onChange={(e) => setAssignedCreator(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                >
                  {engineers.map((eng) => (
                    <option key={eng.id || eng.name} value={eng.name}>
                      {eng.name} ({eng.vertical || 'Engineer'})
                    </option>
                  ))}
                </select>
              </div>

              {/* AUTOMATIC REVIEWER ASSIGNMENT */}
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
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
              <button type="button" className="btn btn-soft" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="copy" size={15} />
                <span>Create & Launch New Project Form</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
