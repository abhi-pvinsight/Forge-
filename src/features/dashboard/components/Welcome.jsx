import React from 'react';
import Icon from "../../../shared/components/Icon";

// export default function Welcome() {
//   return <div>Welcome</div>;
// }

export default function Welcome({ user }) {
  const recents = [
    { name: 'String Size Design Basis', path: 'Electrical · PV', code: 'STR', when: '2 days ago' },
    { name: 'Energy Yield Design Basis', path: 'Electrical · PV', code: 'EYD', when: '1 week ago' },
    { name: 'BESS Sizing Design Basis', path: 'Electrical · BESS', code: 'BSZ', when: '3 weeks ago' },
  ];
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '52px 40px 60px' }} className="fade-up">
        <div className="label-eyebrow">Welcome back</div>
        <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', margin: '6px 0 8px' }}>
          {user.name.split(' ')[0]}, let's build a report.
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', margin: 0, maxWidth: 560 }}>
          Pick a vertical and sub-vertical from the left to browse coded report templates, or jump back into a recent one.
        </p>

        <div className="label-eyebrow" style={{ marginTop: 40, marginBottom: 12 }}>Recent reports</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {recents.map(r => (
            <div key={r.name} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                <Icon name="fileText" size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.path}</div>
              </div>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-4)' }}>{r.when}</span>
              <Icon name="chevronR" size={16} style={{ color: 'var(--text-4)' }} />
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 36 }}>
          {[
            { icon: 'zap', t: 'Electrical', d: '6 PV reports · BESS · HV', c: 'rgb(234, 179, 8)' },
            { icon: 'building', t: 'Civil', d: 'Grading · Access roads', c: 'var(--blue)' },
            { icon: 'frame', t: 'Structure', d: 'Piles · Tracker structures', c: 'var(--accent)' },
          ].map(v => (
            <div key={v.t} className="card" style={{ padding: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface-2)', color: v.c, display: 'grid', placeItems: 'center' }}>
                <Icon name={v.icon} size={18} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>{v.t}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{v.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
