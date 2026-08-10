import React, { useEffect, useRef, useState, useMemo } from 'react';
import Icon from "../../../../../shared/components/Icon";
import Field from "../../../../../shared/components/Field";
import Stepper from "../../../../../shared/components/Stepper";
import { BUSBAR_TABS } from "../forms/busbarTabs";
import { ALUMINUM_TUBE_SPECS, ALUMINUM_TUBE_CATALOG_CONSTANTS, calcTubeCrossSectionAreaIn2 } from "../forms/busbarDefaults";
import { runBusbarCalculation } from "../utils/busbarCalculations";
import BusbarReportDoc from "../reports/BusbarReportDoc";
import { fetchLastReportApi } from "../../../pv/pv-design/api/reportsApi";

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
  const total = BUSBAR_TABS.reduce((sum, tab) => sum + tabRequiredKeys(tab).length, 0);
  let done = 0;

  BUSBAR_TABS.forEach((tab) => {
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
    return 'PVI-BUS-XXX-DBR-R0';
  }
  const code = (values.projectCode || values.documentNo || 'XXX')
    .toUpperCase()
    .replace(/\s/g, '');
  const rev = values.revision || 'A';
  return `PVI-BUS-${code}-DBR-${rev}`;
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
        <Icon name={tab.icon || 'fileText'} size={17} style={{ color: 'var(--accent)' }} />
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

  const handleTubeSelect = (label) => {
    const tube = ALUMINUM_TUBE_SPECS.find((t) => t.label === label);
    if (!tube) return;
    const crossSectionAreaIn2 = calcTubeCrossSectionAreaIn2(tube.outerDiameterIn, tube.innerDiameterIn);
    
    setValue({
      ...values,
      conductorType: tube.label,
      outerDiameterIn: tube.outerDiameterIn,
      thicknessIn: tube.thicknessIn,
      crossSectionAreaIn2,
      conductivityPctIACS: ALUMINUM_TUBE_CATALOG_CONSTANTS.conductivityPctIACS,
      emissivity: ALUMINUM_TUBE_CATALOG_CONSTANTS.emissivity,
      solarAbsorption: ALUMINUM_TUBE_CATALOG_CONSTANTS.solarAbsorption,
      skinEffectFactorOverride: undefined,
    });
  };

  const handleFieldChange = (key, val) => {
    if (key === 'conductorType') {
      const tube = ALUMINUM_TUBE_SPECS.find((t) => t.label === val);
      if (tube) {
        const crossSectionAreaIn2 = calcTubeCrossSectionAreaIn2(tube.outerDiameterIn, tube.innerDiameterIn);
        setValue({
          ...values,
          conductorType: tube.label,
          outerDiameterIn: tube.outerDiameterIn,
          thicknessIn: tube.thicknessIn,
          crossSectionAreaIn2,
          conductivityPctIACS: ALUMINUM_TUBE_CATALOG_CONSTANTS.conductivityPctIACS,
          emissivity: ALUMINUM_TUBE_CATALOG_CONSTANTS.emissivity,
          solarAbsorption: ALUMINUM_TUBE_CATALOG_CONSTANTS.solarAbsorption,
          skinEffectFactorOverride: undefined,
        });
        return;
      }
    }
    setValue(key, val);
  };

  let fieldsContent = null;

  if (tab.id === 'conductorSpec') {
    fieldsContent = (
      <div style={{ display: 'grid', gap: 20 }}>
        <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)' }}>
          Selecting a <strong>Tube Type / Size</strong> from the ALCOA catalog auto-populates Outer Diameter, Wall Thickness, Cross-Sectional Area, and Conductivity (% IACS).
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
          {tab.fields.map((field) => (
            <div key={field.key} style={{ gridColumn: (field.type === 'textarea' || field.type === 'revision-table' || field.type === 'file') ? '1 / -1' : 'auto' }}>
              <Field field={field} value={values[field.key]} onChange={(value) => handleFieldChange(field.key, value)} error={errFor(field)} />
            </div>
          ))}
        </div>
      </div>
    );
  } else if (tab.groups) {
    fieldsContent = (
      <div style={{ display: 'grid', gap: 26 }}>
        {tab.groups.map((group) => (
          <div key={group.title}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
              <h3 style={{ fontSize: 12.5, fontWeight: 600, margin: 0, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-2)' }}>{group.title}</h3>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
              {group.fields.map((field) => (
                <div key={field.key} style={{ gridColumn: (field.type === 'textarea' || field.type === 'revision-table' || field.type === 'file') ? '1 / -1' : 'auto' }}>
                  <Field field={field} value={values[field.key]} onChange={(value) => handleFieldChange(field.key, value)} error={errFor(field)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  } else if (tab.fields) {
    fieldsContent = (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
        {tab.fields.map((field) => (
          <div key={field.key} style={{ gridColumn: (field.type === 'textarea' || field.type === 'revision-table' || field.type === 'file') ? '1 / -1' : 'auto' }}>
            <Field field={field} value={values[field.key]} onChange={(value) => handleFieldChange(field.key, value)} error={errFor(field)} />
          </div>
        ))}
      </div>
    );
  }

  return fieldsContent || null;
}

function SummaryRail({ values }) {
  const calc = useMemo(() => {
    try {
      return runBusbarCalculation(values);
    } catch (e) {
      return null;
    }
  }, [values]);

  if (!calc) return null;

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <Icon name="bolt" size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>IEEE 605 Calculations</span>
      </div>

      <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-3)' }}>DC Resistance (R):</span>
          <span className="mono">{calc.R.toExponential(2)} Ω/ft</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-3)' }}>Skin Effect Factor (F):</span>
          <span className="mono">{calc.F}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-3)' }}>Effective Res. (RF):</span>
          <span className="mono">{calc.RF.toExponential(2)} Ω/ft</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-3)' }}>Convection Loss (qc):</span>
          <span className="mono">{calc.qc.toFixed(2)} W/ft</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-3)' }}>Radiation Loss (qr):</span>
          <span className="mono">{calc.qr.toFixed(2)} W/ft</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-3)' }}>Solar Heat Gain (qs):</span>
          <span className="mono">{calc.qs.toFixed(2)} W/ft</span>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

        <div style={{ padding: '8px 10px', borderRadius: 6, background: calc.continuousPass ? 'var(--green-soft)' : 'var(--red-soft)', color: calc.continuousPass ? 'var(--green-text)' : 'var(--red-text)' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Continuous Ampacity (I)</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            {calc.I.toFixed(2)} A {calc.continuousPass ? '✓ PASS' : '✗ FAIL'}
          </div>
        </div>

        <div style={{ padding: '8px 10px', borderRadius: 6, background: calc.shortCircuitPass ? 'var(--green-soft)' : 'var(--red-soft)', color: calc.shortCircuitPass ? 'var(--green-text)' : 'var(--red-text)' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Short-Circuit Rating (I'sc)</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            {calc.IscKA.toFixed(1)} kA {calc.shortCircuitPass ? '✓ PASS' : '✗ FAIL'}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormHeader({ report, vertical, values, status, onGenerate, onSaveDraft, onLoadLastEntry, onClearAll }) {
  return (
    <div style={{ padding: '22px 32px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--accent-soft)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Icon name="bolt" size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>{report.name || 'Aluminium Bus Bar Sizing & Ampacity'}</h1>
            <span className="badge badge-coded"><Icon name="check" size={11} />Coded</span>
          </div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
            {docNumber(values)} - {vertical?.name || 'Electrical'} / HV
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          {onLoadLastEntry && (
            <button className="btn btn-ghost btn-sm" onClick={onLoadLastEntry}>
              <Icon name="download" size={14} />Start from last entry
            </button>
          )}
          {onClearAll && (
            <button className="btn btn-ghost btn-sm" onClick={onClearAll}>
              <Icon name="trash" size={14} />Clear all fields
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => onSaveDraft && onSaveDraft(values)}><Icon name="copy" size={14} />Save draft</button>
          <button className="btn btn-primary btn-sm" disabled={!status.complete} onClick={onGenerate}>
            <Icon name="zap" size={14} />Generate report
          </button>
        </div>
      </div>
    </div>
  );
}

function Banner({ banner, onClose }) {
  return (
    <div style={{ padding: '10px 32px', background: banner.type === 'success' ? 'var(--green-soft)' : banner.type === 'warning' ? 'var(--yellow-soft)' : 'var(--red-soft)', color: banner.type === 'success' ? 'var(--green-text)' : banner.type === 'warning' ? 'var(--yellow-text)' : 'var(--red-text)', fontSize: 13, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon name={banner.type === 'success' ? 'check' : 'info'} size={15} />
      <span>{banner.text}</span>
      <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}><Icon name="x" size={14} /></button>
    </div>
  );
}

function ChecklistRail({ values, files, step, setStep }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="label-eyebrow" style={{ marginBottom: 10 }}>Completion</div>
      {BUSBAR_TABS.map((tab, index) => {
        const st = tabStatus(tab, values, files);
        return (
          <button key={tab.id} onClick={() => setStep(index)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 0', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
            <StatusDot status={st} />
            <span style={{ fontSize: 12, fontWeight: step === index ? 600 : 400, color: step === index ? 'var(--text-1)' : 'var(--text-3)' }}>{tab.name}</span>
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

export default function BusbarFormScreen({ report = {}, vertical = {}, sub = {}, values = {}, setValue = () => {}, files = {}, setFile = () => {}, calc, layout, showCalc, onGenerate, onSaveDraft, onClearAll }) {
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [banner, setBanner] = useState(null);
  const status = overallStatus(values, files);
  const scrollRef = useRef(null);

  useEffect(() => { setStep(0); setShowErrors(false); setBanner(null); }, [report.id]);

  const loadLastEntry = async () => {
    try {
      setBanner(null);
      const res = await fetchLastReportApi("busbar-sizing");
      if (res.success && res.data) {
        const reportData = res.data;
        const metadata = reportData.metadata || {};
        const metadata_json = metadata.metadata_json || {};
        const inputs = reportData.inputs || {};
        
        setValue({
          ...metadata_json,
          ...inputs
        });
        
        setBanner({
          type: "success",
          text: `Loaded details from last Busbar Sizing entry (Source ID: ${metadata.id}).`
        });
      } else {
        setBanner({
          type: "warning",
          text: "No previous entry found."
        });
      }
    } catch (err) {
      console.error("Error loading last Busbar entry:", err);
      setBanner({
        type: "error",
        text: `Failed to load last entry: ${err.message}`
      });
    }
  };

  const tab = BUSBAR_TABS[step];
  const isLast = step === BUSBAR_TABS.length - 1;

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
        <FormHeader report={report} vertical={vertical} values={values} status={status} onGenerate={onGenerate} onSaveDraft={onSaveDraft} onLoadLastEntry={loadLastEntry} onClearAll={onClearAll} />
        {banner && <Banner banner={banner} onClose={() => setBanner(null)} />}
        <div style={{ flex: 1, overflowY: 'auto' }} ref={scrollRef}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '26px 32px 80px', display: 'grid', gridTemplateColumns: '186px 1fr 280px', gap: 28, alignItems: 'start' }}>
            <div style={{ position: 'sticky', top: 0, paddingTop: 4 }}>
              <div className="label-eyebrow" style={{ marginBottom: 10 }}>Sections</div>
              {BUSBAR_TABS.map((t, i) => {
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
            <div style={{ display: 'grid', gap: 30, minWidth: 0 }}>
              {BUSBAR_TABS.map(t => (
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
            <div style={{ position: 'sticky', top: 4, display: 'grid', gap: 12 }}>
              <SummaryRail values={values} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- SPLIT layout ----------
  if (layout === 'split') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <FormHeader report={report} vertical={vertical} values={values} status={status} onGenerate={onGenerate} onSaveDraft={onSaveDraft} onLoadLastEntry={loadLastEntry} onClearAll={onClearAll} />
        {banner && <Banner banner={banner} onClose={() => setBanner(null)} />}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.05fr 1fr', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid var(--border)' }}>
            <Stepper step={step} setStep={setStep} values={values} files={files} tabs={BUSBAR_TABS} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 24px' }} ref={scrollRef}>
              <SectionTitle tab={tab} />
              <TabBody tab={tab} values={values} setValue={setValue} files={files} setFile={setFile} showErrors={showErrors} />
            </div>
            <FormFooter step={step} isLast={isLast} status={status} onBack={() => setStep(step - 1)} onNext={next} onGenerate={onGenerate} />
          </div>
          <div style={{ background: 'var(--surface-2)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, background: 'var(--surface-2)', zIndex: 1 }}>
              <Icon name="fileText" size={14} style={{ color: 'var(--text-3)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Live preview</span>
              <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-4)' }}>{docNumber(values)}</span>
            </div>
            <div style={{ padding: '20px 0', display: 'grid', placeItems: 'start center' }}>
              <div style={{ transform: 'scale(0.82)', transformOrigin: 'top center' }}>
                <BusbarReportDoc values={values} files={files} />
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
      <FormHeader report={report} vertical={vertical} values={values} status={status} onGenerate={onGenerate} onSaveDraft={onSaveDraft} onLoadLastEntry={loadLastEntry} onClearAll={onClearAll} />
      {banner && <Banner banner={banner} onClose={() => setBanner(null)} />}
      <Stepper step={step} setStep={setStep} values={values} files={files} tabs={BUSBAR_TABS} />
      <div style={{ flex: 1, overflowY: 'auto' }} ref={scrollRef}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 32px 40px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 28, alignItems: 'start' }}>
          <div className="card fade-in" key={tab.id} style={{ padding: 24, minWidth: 0 }}>
            <SectionTitle tab={tab} />
            <TabBody tab={tab} values={values} setValue={setValue} files={files} setFile={setFile} showErrors={showErrors} />
          </div>
          <div style={{ display: 'grid', gap: 14, position: 'sticky', top: 0 }}>
            <SummaryRail values={values} />
            <ChecklistRail values={values} files={files} step={step} setStep={setStep} />
          </div>
        </div>
      </div>
      <FormFooter step={step} isLast={isLast} status={status} onBack={() => setStep(step - 1)} onNext={next} onGenerate={onGenerate} />
    </div>
  );
}
