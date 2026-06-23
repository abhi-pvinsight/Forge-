import React from 'react';
import { STRING_SIZE_TABS } from "../forms/stringSizingTabs";

// export default function Stepper() {
//   return <div>Stepper</div>;
// }

function tabRequiredKeys(tab) {
  const fields = tab.fields || (tab.groups || []).flatMap((group) => group.fields);
  const fieldKeys = fields.filter((field) => field.required).map((field) => field.key);
  const uploadKeys = (tab.uploads || []).filter((upload) => upload.required).map((upload) => upload.key);
  return [...fieldKeys, ...uploadKeys];
}

function tabStatus(tab, values, files) {
  const keys = tabRequiredKeys(tab);
  if (!keys.length) return 'complete';

  const filled = keys.filter((key) => {
    if (tab.uploads && tab.uploads.some((upload) => upload.key === key)) {
      return !!files[key];
    }

    return values[key] != null && String(values[key]).trim() !== '';
  }).length;

  if (filled === 0) return 'empty';
  if (filled < keys.length) return 'partial';
  return 'complete';
}

// ---- step stepper (horizontal) -----------------------------
export default function Stepper({ step, setStep, values, files }) {
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 32px', height: 52, borderBottom: '1px solid var(--border)', background: 'var(--surface)', overflowX: 'auto' }}>
      {STRING_SIZE_TABS.map((t, i) => {
        const st = tabStatus(t, values, files);
        const active = step === i;
        return (
          <React.Fragment key={t.id}>
            {i > 0 && <div style={{ width: 22, height: 1, background: 'var(--border-2)', flex: 'none' }} />}
            <button onClick={() => setStep(i)} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '6px 12px', borderRadius: 999,
              border: '1px solid ' + (active ? 'var(--accent-line)' : 'transparent'),
              background: active ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              <StepNum i={i} status={st} active={active} />
              <span style={{ fontSize: 12.5, fontWeight: active ? 600 : 500, color: active ? 'var(--accent-text)' : 'var(--text-2)' }}>{t.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StepNum({ i, status, active }) {
  if (status === 'complete') {
    return (
      <span style={{ width: 19, height: 19, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11 }}>
        {i + 1}
      </span>
    );
  }

  return (
    <span style={{
      width: 19,
      height: 19,
      borderRadius: '50%',
      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border-strong)'),
      display: 'grid',
      placeItems: 'center',
      fontSize: 11,
      color: active ? 'var(--accent-text)' : 'var(--text-3)',
      background: status === 'partial' ? 'var(--amber-soft)' : 'transparent',
    }}>
      {i + 1}
    </span>
  );
}
