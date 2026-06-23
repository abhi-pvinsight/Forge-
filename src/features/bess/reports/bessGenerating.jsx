// import React from 'react';
import React, { useState, useEffect, useRef } from 'react';
import Icon from "../../../shared/components/Icon.jsx";
import { bessDocNumber } from "../forms/utils/bessDocNumber.js";

//   return <div>Generating Report</div>;
// }

// function docNumber(values) {
//   const code = values?.projectCode || "SH2";
//   const rev = values?.revision || "R0";

//   return `${code}-STR-${rev}`;
// }
// ---- Generating ---------------------------------------------
export default function BessGenerating({ values, onDone }) {
  const steps = ['Validating inputs', 'Resolving template & formulae', 'Computing string voltages', 'Composing document', 'Finalizing PDF'];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= steps.length) { const t = setTimeout(onDone, 450); return () => clearTimeout(t); }
    const t = setTimeout(() => setI(i + 1), 520);
    return () => clearTimeout(t);
  }, [i]);
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 340, textAlign: 'center' }} className="fade-up">
        <div style={{ width: 60, height: 60, borderRadius: 15, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 22px' }}>
          <Icon name="settings" size={28} className="spin" style={{ color: 'var(--accent)' }} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px' }}>Generating report</h2>
        <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 24 }}>{bessDocNumber(values)}.docx</div>
        <div style={{ display: 'grid', gap: 9, textAlign: 'left' }}>
          {steps.map((s, idx) => {
            const done = idx < i, active = idx === i;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 11, opacity: done || active ? 1 : 0.4, transition: 'opacity .3s' }}>
                {done ? <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="check" size={12} stroke={3} /></span>
                  : active ? <Icon name="settings" size={20} className="spin" style={{ color: 'var(--accent)', flex: 'none' }} />
                  : <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border-strong)', flex: 'none' }} />}
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>{s}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
