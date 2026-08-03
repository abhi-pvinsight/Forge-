import React from 'react';
import Icon from "../../../shared/components/Icon";
import { STATUS_META } from "../../../data/navigation";

function EmptySub() {
  return (
    <div className="card" style={{ padding: 22, color: "var(--text-3)", fontSize: 13 }}>
      No coded reports are available for this discipline yet.
    </div>
  );
}

export default function ReportList({ vertical, sub, onSelectReport, onGoBack, onGoHome }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '44px 40px 60px' }} className="fade-up">
        {/* Navigation Bar with Back buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          {onGoBack && (
            <button
              type="button"
              className="btn btn-soft btn-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onGoBack) onGoBack();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Icon name="arrowL" size={14} />
              <span>Back to {vertical?.name || 'Vertical'}</span>
            </button>
          )}
          {onGoHome && (
            <button
              type="button"
              className="btn btn-soft btn-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onGoHome) onGoHome();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <span>All Verticals</span>
            </button>
          )}
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 'auto' }}>
            Home / {vertical.name} / <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{sub.name}</span>
          </div>
        </div>

        {/* Title Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--accent)'
            }}
          >
            <Icon name={sub.icon} size={20} />
          </div>
          <div>
            <div className="label-eyebrow">{vertical.name.toUpperCase()}</div>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', margin: '2px 0 0' }}>
              {sub.name} Reports
            </h1>
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '8px 0 28px', maxWidth: 620 }}>
          {sub.reports.length} coded {sub.reports.length === 1 ? 'template' : 'templates'} available. Select one to load its template and enter inputs.
        </p>

        {sub.reports.length === 0 ? (
          <EmptySub />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {sub.reports.map((r) => {
              const meta = STATUS_META[r.status];
              const disabled = r.status === 'soon';
              return (
                <button
                  key={r.id}
                  disabled={disabled}
                  onClick={() => !disabled && onSelectReport(vertical.id, sub.id, r.id)}
                  className="report-card"
                  style={{
                    textAlign: 'left',
                    padding: 20,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)',
                    background: 'var(--surface)',
                    boxShadow: 'var(--sh-xs)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transition: 'all .18s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
                      {r.code}
                    </span>
                    <span className={`badge ${meta.cls}`} style={{ fontSize: 10 }}>
                      {meta.label}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                      {r.reportTitle || r.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
