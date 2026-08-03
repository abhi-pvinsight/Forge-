import React, { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import ReportRow from './ReportRow';
import { getStoredClients, saveClientProfile, deleteClientProfile } from '../../../data/clients';
import { fetchReportsApi, fetchReportDetailApi, deleteReportApi } from '../../electrical/pv/pv-design/api/reportsApi';

const DRAFT_STATUSES = ['draft', 'generating'];

export default function SelectClientScreen({ vertical, sub, report, onCancel, onContinue, onSelectRecent, onCloneReport }) {
  const [clients, setClients] = useState(getStoredClients);
  const [selectedId, setSelectedId] = useState(clients[0]?.id || null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [allReports, setAllReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [cloningId, setCloningId] = useState(null);

  // New Client Modal Form State
  const [newClient, setNewClient] = useState({
    clientName: '',
    clientContact: '',
    clientEmail: '',
    clientAddress: '',
    consultant: '',
    desc: '',
  });

  useEffect(() => {
    async function loadReports() {
      setLoadingReports(true);
      try {
        const res = await fetchReportsApi();
        setAllReports(res.success && res.reports ? res.reports : []);
      } catch (err) {
        console.error('Error loading reports in SelectClientScreen:', err);
        setAllReports([]);
      } finally {
        setLoadingReports(false);
      }
    }
    loadReports();
  }, []);

  const handleCreateClient = (e) => {
    e.preventDefault();
    if (!newClient.clientName.trim()) return;
    const updatedList = saveClientProfile(newClient);
    setClients(updatedList);
    const newest = updatedList[updatedList.length - 1];
    if (newest) setSelectedId(newest.id);
    setShowAddModal(false);
    setNewClient({
      clientName: '',
      clientContact: '',
      clientEmail: '',
      clientAddress: '',
      consultant: '',
      desc: '',
    });
  };

  const handleDeleteClientCard = (clientToDelete, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const confirmDelete = window.confirm(`Are you sure you want to delete client profile "${clientToDelete.name}"?`);
    if (!confirmDelete) return;

    const updatedList = deleteClientProfile(clientToDelete.id);
    setClients(updatedList);
    if (selectedId === clientToDelete.id) {
      setSelectedId(updatedList[0]?.id || null);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedId) || null;

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

  const clientReports = getReportsForClient(selectedClient);
  const submittedReports = clientReports.filter((r) => r.status === 'completed');
  const draftReports = clientReports.filter((r) => DRAFT_STATUSES.includes(r.status));

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
    if (!rep.id || !onCloneReport) return;
    setCloningId(rep.id);
    try {
      const detailRes = await fetchReportDetailApi(rep.id);
      if (detailRes.success && detailRes.data) {
        onCloneReport({ report_id: rep.id, report_type: rep.report_type }, detailRes.data);
      }
    } catch (err) {
      console.error('Error cloning report:', err);
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
        setAllReports((prev) => prev.filter((r) => r.id !== rep.id));
      } else {
        alert('Failed to delete report: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error deleting report:', err);
      alert('Error deleting report: ' + err.message);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '44px 40px 60px' }} className="fade-up">
        {/* Breadcrumb Header */}
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
          {vertical?.name} &rsaquo; {sub?.name} &rsaquo; {report?.name} &rsaquo;{' '}
          <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>Select Client</span>
        </div>

        {/* Page Title */}
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
          Select a Client
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-2)', margin: '0 0 32px', maxWidth: 580 }}>
          Choose an existing client for this report or add a new one. Common information will be pre-filled automatically.
        </p>

        {/* Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 36 }}>
          {clients.map((c) => {
            const isSelected = c.id === selectedId;
            const reportCount = getReportsForClient(c).length;

            return (
              <div
                key={c.id}
                className="card"
                onClick={() => setSelectedId(c.id)}
                style={{
                  padding: '24px 20px',
                  cursor: 'pointer',
                  borderRadius: 14,
                  border: isSelected ? '2px solid var(--accent, #10b981)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--surface)' : 'var(--surface)',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 220,
                  boxShadow: isSelected ? '0 4px 14px rgba(16, 185, 129, 0.12)' : 'none',
                  position: 'relative',
                }}
              >
                {/* Delete Client Card Button */}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title={`Delete ${c.name} profile`}
                  onClick={(e) => handleDeleteClientCard(c, e)}
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
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

                <div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: c.iconBg || 'var(--surface-3)',
                      color: c.iconColor || 'var(--accent)',
                      display: 'grid',
                      placeItems: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <Icon name={c.icon || 'briefcase'} size={22} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>{c.name}</span>
                    {reportCount === 0 ? (
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'var(--amber-text, #d97706)',
                          background: 'var(--amber-soft, rgba(245, 158, 11, 0.12))',
                          padding: '2px 7px',
                          borderRadius: 999,
                        }}
                      >
                        Unused
                      </span>
                    ) : (
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {reportCount} report{reportCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.45 }}>
                    {c.desc}
                  </div>
                </div>

                {isSelected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 12, fontWeight: 600, marginTop: 16 }}>
                    <Icon name="check" size={14} stroke={3} />
                    <span>Selected</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add New Client Card */}
          <div
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '24px 20px',
              cursor: 'pointer',
              borderRadius: 14,
              border: '2px dashed var(--border-strong, #cbd5e1)',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: 220,
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'var(--surface-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong, #cbd5e1)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                border: '1.5px dashed var(--border-strong)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--text-3)',
                marginBottom: 14,
              }}
            >
              <Icon name="plus" size={20} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Add New Client</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, maxWidth: 160, lineHeight: 1.4 }}>
              Register a new client profile to start their project basis report.
            </div>
          </div>
        </div>

        {/* Selected Client Reports Section */}
        {selectedClient && (
          <div style={{ marginTop: 24, marginBottom: 40 }} className="fade-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="label-eyebrow">CLIENT REPORTS</div>
                <h2 style={{ fontSize: 20, fontWeight: 600, margin: '2px 0 0' }}>
                  Reports for {selectedClient.name}
                </h2>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onContinue(selectedClient)}
                style={{ background: 'var(--accent, #10b981)', color: '#fff', border: 'none', fontWeight: 600 }}
              >
                + Start New Report for {selectedClient.name}
              </button>
            </div>

            {/* Submitted Reports for Selected Client */}
            <div className="label-eyebrow" style={{ marginTop: 20, marginBottom: 10 }}>
              Submitted reports ({submittedReports.length})
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {submittedReports.length === 0 && !loadingReports && (
                <div className="card" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-3)' }}>
                  No submitted reports for {selectedClient.name} yet.
                </div>
              )}
              {submittedReports.map((r) => (
                <ReportRow
                  key={r.id}
                  report={r}
                  onClick={() => handleResumeReport(r, 'preview')}
                  action={
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-soft btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResumeReport(r, 'form');
                        }}
                      >
                        <Icon name="edit" size={13} />
                        Edit
                      </button>
                      <button
                        className="btn btn-soft btn-sm"
                        disabled={cloningId === r.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloneReportClick(r);
                        }}
                      >
                        <Icon name="copy" size={13} />
                        Clone
                      </button>
                      <button
                        className="btn btn-soft btn-sm"
                        style={{
                          color: 'var(--red-text, #ef4444)',
                          background: 'var(--red-soft, rgba(239, 68, 68, 0.08))',
                          border: 'none',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReportClick(r);
                        }}
                      >
                        <Icon name="trash" size={13} />
                        Delete
                      </button>
                    </div>
                  }
                />
              ))}
            </div>

            {/* Draft Reports for Selected Client */}
            <div className="label-eyebrow" style={{ marginTop: 28, marginBottom: 10 }}>
              Draft reports ({draftReports.length})
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {draftReports.length === 0 && !loadingReports && (
                <div className="card" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-3)' }}>
                  No draft reports in progress for {selectedClient.name}.
                </div>
              )}
              {draftReports.map((r) => (
                <ReportRow
                  key={r.id}
                  report={r}
                  onClick={() => handleResumeReport(r, 'form')}
                  action={
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-soft btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResumeReport(r, 'form');
                        }}
                      >
                        <Icon name="edit" size={13} />
                        Edit Draft
                      </button>
                      <button
                        className="btn btn-soft btn-sm"
                        style={{
                          color: 'var(--red-text, #ef4444)',
                          background: 'var(--red-soft, rgba(239, 68, 68, 0.08))',
                          border: 'none',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReportClick(r);
                        }}
                      >
                        <Icon name="trash" size={13} />
                        Delete
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
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
            Showing {clients.length} client{clients.length > 1 ? 's' : ''}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-soft" onClick={onCancel} style={{ padding: '8px 20px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!selectedClient}
              onClick={() => selectedClient && onContinue(selectedClient)}
              style={{
                padding: '8px 24px',
                cursor: selectedClient ? 'pointer' : 'not-allowed',
                background: 'var(--accent, #10b981)',
                color: '#fff',
                fontWeight: 600,
                border: 'none',
                borderRadius: 6,
              }}
            >
              Start New Report for {selectedClient?.name || 'Client'}
            </button>
          </div>
        </div>
      </div>

      {/* Add New Client Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
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
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Register New Client</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAddModal(false)}
                style={{ height: 28, width: 28, padding: 0 }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateClient}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Client / Company Name *
                  </label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. Clenera Renewables LLC"
                    value={newClient.clientName}
                    onChange={(e) => setNewClient({ ...newClient, clientName: e.target.value })}
                    style={{ width: '100%', height: 38 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Primary Contact
                    </label>
                    <input
                      className="input"
                      placeholder="Full Name"
                      value={newClient.clientContact}
                      onChange={(e) => setNewClient({ ...newClient, clientContact: e.target.value })}
                      style={{ width: '100%', height: 38 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Contact Email
                    </label>
                    <input
                      className="input"
                      type="email"
                      placeholder="name@company.com"
                      value={newClient.clientEmail}
                      onChange={(e) => setNewClient({ ...newClient, clientEmail: e.target.value })}
                      style={{ width: '100%', height: 38 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Client Address
                  </label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Street, City, State, Country"
                    value={newClient.clientAddress}
                    onChange={(e) => setNewClient({ ...newClient, clientAddress: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Consultant / EPC Organization
                  </label>
                  <input
                    className="input"
                    placeholder="Preparing organization"
                    value={newClient.consultant}
                    onChange={(e) => setNewClient({ ...newClient, consultant: e.target.value })}
                    style={{ width: '100%', height: 38 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Brief Description
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Utility-scale solar & energy storage developer"
                    value={newClient.desc}
                    onChange={(e) => setNewClient({ ...newClient, desc: e.target.value })}
                    style={{ width: '100%', height: 38 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button type="button" className="btn btn-soft" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'var(--accent, #10b981)', color: '#fff', border: 'none' }}
                >
                  Save & Select Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
