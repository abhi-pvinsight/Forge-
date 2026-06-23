import React from 'react';
import Icon from "../../../shared/components/Icon";

// export default function CalcPanel() {
//   return <section>Calc Panel</section>;
// }

export default function CalcPanel({ calc, compact }) {
  return (
    <div className="card" style={{ overflow: 'hidden', borderColor: 'var(--accent-line)' }}>
      <div style={{ padding: '12px 16px', background: 'var(--accent-soft)', borderBottom: '1px solid var(--accent-line)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="zap" size={15} style={{ color: 'var(--accent-text)' }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent-text)' }}>Live String Sizing</span>
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--accent-text)', opacity: 0.8 }}>auto-calc</span>
      </div>
      <div style={{ padding: 16 }}>
        {!calc.valid ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', textAlign: 'center', padding: '14px 0' }}>
            Enter module &amp; inverter values to compute the recommended string size.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <Stat label="Voc @ cold" value={calc.VocCold} unit="V" />
              <Stat label="Vmp @ hot" value={calc.VmpHot} unit="V" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Stat label="Min / string" value={calc.minMods} unit="mod" sub />
              <Stat label="Max / string" value={calc.maxMods} unit="mod" sub />
            </div>
            <div style={{ marginTop: 14, padding: '13px 14px', borderRadius: 'var(--r-md)', background: calc.feasible ? 'var(--accent)' : 'var(--red)', color: '#fff' }}>
              <div style={{ fontSize: 11, opacity: 0.85, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommended string size</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 3 }}>
                <span className="mono" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{calc.feasible ? calc.recommended : '—'}</span>
                <span style={{ fontSize: 13, opacity: 0.9 }}>modules in series</span>
              </div>
            </div>
            {!calc.feasible && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, fontSize: 11.5, color: 'var(--red-text)', alignItems: 'flex-start' }}>
                <Icon name="alert" size={14} style={{ marginTop: 1, flex: 'none' }} />
                <span>Min exceeds max — voltage window is infeasible. Review inverter MPPT range or temperature inputs.</span>
              </div>
            )}
            {calc.feasible && !compact && (
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 11, lineHeight: 1.5 }}>
                String Voc @ cold ≈ {calc.stringVocCold} V · headroom {calc.headroom} V to inverter max
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, unit, sub }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '9px 11px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
        <span className="mono" style={{ fontSize: sub ? 19 : 17, fontWeight: 600, color: 'var(--text)' }}>
          {value}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{unit}</span>
      </div>
    </div>
  );
}
