import React, { useEffect, useRef, useState } from 'react';
import Icon from "../../../shared/components/Icon";
import Field from "../../../shared/components/Field";
import { BESS_TABS } from "../forms/bessTabs";
// import CalcPanel from "./CalcPanel";
import BessStepper from "./BessStepper";
import UploadZone from "../../pv/components/UploadZone";
// import ReportDoc from "../reports/ReportDoc";

// export default function FormScreen() {
//   return <div>Form Screen</div>;
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

function overallStatus(values, files) {
  const total = BESS_TABS.reduce((sum, tab) => sum + tabRequiredKeys(tab).length, 0);
  let done = 0;

  BESS_TABS.forEach((tab) => {
    tabRequiredKeys(tab).forEach((key) => {
      const isUpload = tab.uploads && tab.uploads.some((upload) => upload.key === key);
      const hasValue = isUpload
        ? !!files[key]
        : values[key] != null && String(values[key]).trim() !== '';

      if (hasValue) done += 1;
    });
  });

  return {
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
    complete: done === total,
  };
}

function docNumber(values) {
  if (!values) {
    return 'PVI-BESS-XXX-DBR-R0';
  }

  const code = (values.projectCode || 'XXX')
    .toUpperCase()
    .replace(/\s/g, '');

  const rev = values.revision || 'R0';

  return `PVI-BESS-${code}-DBR-${rev}`;
}

function StatusDot({ status }) {
  if (status === 'complete') {
    return (
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>
        <Icon name="check" size={11} stroke={3} />
      </span>
    );
  }

  const color = status === 'partial' ? 'var(--amber)' : 'var(--border-strong)';
  return <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${color}`, flex: 'none', background: status === 'partial' ? 'var(--amber-soft)' : 'transparent' }} />;
}

function ProgressMini({ status }) {
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>
        <span className="mono">{status.pct}%</span>
        <span>{status.done}/{status.total}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: status.pct + '%', background: 'var(--accent)', borderRadius: 99, transition: 'width .3s ease' }} />
      </div>
    </div>
  );
}

function SectionTitle({ tab }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name={tab.icon} size={17} style={{ color: 'var(--accent)' }} />
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>{tab.name}</h2>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '6px 0 0' }}>{tab.blurb}</p>
    </div>
  );
}

function TabBody({ tab, values, setValue, files, setFile, showErrors }) {
  const errFor = (field, isUpload = false) => {
    if (!showErrors || !field.required) return null;
    const hasValue = isUpload
      ? !!files[field.key]
      : values[field.key] != null && String(values[field.key]).trim() !== '';

    return hasValue ? null : 'Required';
  };

  if (tab.uploads) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {tab.uploads.map((upload) => (
          <div key={upload.key}>
            <UploadZone
              spec={upload}
              file={files[upload.key]}
              onSet={(value) => setFile(upload.key, value)}
              onClear={() => setFile(upload.key, null)}
            />
            {errFor(upload, true) && (
              <div className="field-hint" style={{ color: 'var(--red-text)', marginLeft: 4 }}>
                This datasheet is required.
              </div>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: 'var(--blue-soft)', borderRadius: 'var(--r-md)', marginTop: 4 }}>
          <Icon name="info" size={15} style={{ color: 'var(--blue-text)', marginTop: 1, flex: 'none' }} />
          <div style={{ fontSize: 12, color: 'var(--blue-text)', lineHeight: 1.5 }}>
           Uploaded battery, PCS and transformer datasheets are embedded in the report appendix and referenced throughout the sizing calculations.
          </div>
        </div>
      </div>
    );
  }

  if (tab.groups) {
    return (
      <div style={{ display: 'grid', gap: 26 }}>
        {tab.groups.map((group) => (
          <div key={group.title}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
              <h3 style={{ fontSize: 12.5, fontWeight: 600, margin: 0, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-2)' }}>{group.title}</h3>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
              {group.fields.map((field) => (
                <div key={field.key} style={{ gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto' }}>
                  <Field field={field} value={values[field.key]} onChange={(value) => setValue(field.key, value)} error={errFor(field)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
      {tab.fields.map((field) => (
        <div key={field.key} style={{ gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto' }}>
          <Field field={field} value={values[field.key]} onChange={(value) => setValue(field.key, value)} error={errFor(field)} />
        </div>
      ))}
    </div>
  );
}

function FormHeader({ report, vertical, values, status, onGenerate }) {
  return (
    <div style={{ padding: '22px 32px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--accent-soft)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Icon name="fileText" size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>{report.name}</h1>
            <span className="badge badge-coded"><Icon name="check" size={11} />Coded</span>
          </div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
            {docNumber(values)} - {vertical.name} / BESS
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          <button className="btn btn-ghost btn-sm"><Icon name="copy" size={14} />Save draft</button>
          <button className="btn btn-primary btn-sm" disabled={!status.complete} onClick={onGenerate}>
            <Icon name="zap" size={14} />Generate report
          </button>
        </div>
      </div>
    </div>
  );
}

function ChecklistRail({ values, files, step, setStep }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="label-eyebrow" style={{ marginBottom: 10 }}>Completion</div>
      {BESS_TABS.map((tab, index) => {
        const status = tabStatus(tab, values, files);
        const required = tabRequiredKeys(tab).length;

        return (
          <button key={tab.id} onClick={() => setStep(index)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 8px', border: 'none', borderRadius: 'var(--r-sm)', background: step === index ? 'var(--surface-2)' : 'transparent', cursor: 'pointer' }}>
            <StatusDot status={status} />
            <span style={{ fontSize: 12.5, fontWeight: step === index ? 600 : 400, flex: 1 }}>{tab.name}</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-4)' }}>{required || '-'}</span>
          </button>
        );
      })}
    </div>
  );
}

function FormFooter({ step, isLast, status, onBack, onNext, onGenerate }) {
  return (
    <div style={{ flex: 'none', borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <button className="btn btn-ghost" disabled={step === 0} onClick={onBack} style={{ opacity: step === 0 ? 0.4 : 1 }}>
        <Icon name="arrowL" size={15} />Back
      </button>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{status.done}/{status.total} required fields</span>
        {isLast ? (
          <button className="btn btn-primary" disabled={!status.complete} onClick={onGenerate}><Icon name="zap" size={15} />Generate report</button>
        ) : (
          <button className="btn btn-primary" onClick={onNext}>Next<Icon name="arrowR" size={15} /></button>
        )}
      </div>
    </div>
  );
}

export default function BessFormScreen({ report, vertical, sub, values, setValue, files, setFile, calc, layout, showCalc, onGenerate }) {
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const status = overallStatus(values, files);
  const scrollRef = useRef(null);

  useEffect(() => { setStep(0); setShowErrors(false); }, [report.id]);

  const tab = BESS_TABS[step];
  const isLast = step === BESS_TABS.length - 1;

  const next = () => {
    const st = tabStatus(tab, values, files);
    if (st !== 'complete') { setShowErrors(true); return; }
    setShowErrors(false);
    if (!isLast) { setStep(step + 1); if (scrollRef.current) scrollRef.current.scrollTop = 0; }
  };

  // ---------- SCROLL layout ----------
  if (layout === 'scroll') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <FormHeader report={report} vertical={vertical} values={values} status={status} onGenerate={onGenerate} />
        <div style={{ flex: 1, overflowY: 'auto' }} ref={scrollRef}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '26px 32px 80px', display: 'grid', gridTemplateColumns: showCalc ? '186px 1fr 250px' : '186px 1fr', gap: 28, alignItems: 'start' }}>
            {/* section nav */}
            <div style={{ position: 'sticky', top: 0, paddingTop: 4 }}>
              <div className="label-eyebrow" style={{ marginBottom: 10 }}>Sections</div>
              {BESS_TABS.map((t, i) => {
                const st = tabStatus(t, values, files);
                return (
                  <a key={t.id} href={'#sec_' + t.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', textDecoration: 'none', color: 'var(--text-2)' }}>
                    <StatusDot status={st} />
                    <span style={{ fontSize: 12.5 }}>{t.name}</span>
                  </a>
                );
              })}
              <ProgressMini status={status} />
            </div>
            {/* all sections */}
            <div style={{ display: 'grid', gap: 30, minWidth: 0 }}>
              {BESS_TABS.map(t => (
                <section key={t.id} id={'sec_' + t.id} className="card" style={{ padding: 22 }}>
                  <SectionTitle tab={t} />
                  <TabBody tab={t} values={values} setValue={setValue} files={files} setFile={setFile} showErrors={showErrors} />
                </section>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-lg" disabled={!status.complete} onClick={onGenerate}>
                  <Icon name="zap" size={16} />Generate report
                </button>
              </div>
            </div>
            {/* calc rail */}
            {showCalc && (
            <div style={{ position: 'sticky', top: 4, display: 'grid', gap: 12 }}>
              <CalcPanel calc={calc} />
            </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- SPLIT layout ----------
  if (layout === 'split') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <FormHeader report={report} vertical={vertical} values={values} status={status} onGenerate={onGenerate} />
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.05fr 1fr', minHeight: 0 }}>
          {/* form */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid var(--border)' }}>
            <BessStepper step={step} setStep={setStep} values={values} files={files} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 24px' }} ref={scrollRef}>
              <SectionTitle tab={tab} />
              <TabBody tab={tab} values={values} setValue={setValue} files={files} setFile={setFile} showErrors={showErrors} />
            </div>
            <FormFooter step={step} isLast={isLast} status={status} onBack={() => setStep(step - 1)} onNext={next} onGenerate={onGenerate} />
          </div>
          {/* live preview */}
          <div style={{ background: 'var(--surface-2)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, background: 'var(--surface-2)', zIndex: 1 }}>
              <Icon name="fileText" size={14} style={{ color: 'var(--text-3)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Live preview</span>
              <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-4)' }}>{docNumber(values)}</span>
            </div>
            <div style={{ padding: '20px 0', display: 'grid', placeItems: 'start center' }}>
              <div style={{ transform: 'scale(0.82)', transformOrigin: 'top center' }}>
                <ReportDoc values={values} calc={calc} files={files} mini />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- TABBED layout (default) ----------
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <FormHeader report={report} vertical={vertical} values={values} status={status} onGenerate={onGenerate} />
      <BessStepper step={step} setStep={setStep} values={values} files={files} />
      <div style={{ flex: 1, overflowY: 'auto' }} ref={scrollRef}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 32px 40px', display: 'grid', gridTemplateColumns: '1fr 256px', gap: 28, alignItems: 'start' }}>
          <div className="card fade-in" key={tab.id} style={{ padding: 24, minWidth: 0 }}>
            <SectionTitle tab={tab} />
            <TabBody tab={tab} values={values} setValue={setValue} files={files} setFile={setFile} showErrors={showErrors} />
          </div>
          <div style={{ display: 'grid', gap: 14, position: 'sticky', top: 0 }}>
            {showCalc && <CalcPanel calc={calc} />}
            <ChecklistRail values={values} files={files} step={step} setStep={setStep} />
          </div>
        </div>
      </div>
      <FormFooter step={step} isLast={isLast} status={status} onBack={() => setStep(step - 1)} onNext={next} onGenerate={onGenerate} />
    </div>
  );
}

// export default function BessFormScreen({ values, setValue }) {
//   return (
//     <div style={{ padding: 40 }}>
//       <h1>BESS Sizing Design Basis</h1>

//       {BESS_TABS.map(tab => (
//         <div key={tab.id} style={{ marginBottom: 30 }}>
//           <h2>{tab.name}</h2>

//           {tab.fields?.map(field => (
//             <div key={field.key} style={{ marginBottom: 12 }}>
//               <label>{field.label}</label>

//               <input
//                 type={field.type === "number" ? "number" : "text"}
//                 value={values[field.key] || ""}
//                 onChange={(e) =>
//                   setValue(field.key, e.target.value)
//                 }
//                 style={{
//                   width: "100%",
//                   padding: "8px",
//                   marginTop: "4px"
//                 }}
//               />
//             </div>
//           ))}
//         </div>
//       ))}
//     </div>
//   );
// }