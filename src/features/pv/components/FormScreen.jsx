
import React, { useEffect, useRef, useState } from 'react';
import Icon from "../../../shared/components/Icon";
import Field from "../../../shared/components/Field";
import { STRING_SIZE_TABS } from "../forms/stringSizingTabs";
import CalcPanel from "./CalcPanel";
import Stepper from "./Stepper";
import UploadZone from "./UploadZone";
import ReportDoc from "../reports/ReportDoc";
import Papa from "papaparse";
import { calculateYearlyVoc, calculateYearlyIsc, } from "../calculations/calculateYearlyVoc&Isc";
import { buildMinVoltageDegradationTable } from "../forms/utils/buildVoc&IscTable";
import { extractPvsyst, generateAshrae, } from '../api/extractionApi';
import { parseModuleExcel } from "../forms/utils/parseModuleExcel";

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
// Handing the UPLOAD CSV FILE

function overallStatus(values, files) {
  const total = STRING_SIZE_TABS.reduce((sum, tab) => sum + tabRequiredKeys(tab).length, 0);
  let done = 0;

  STRING_SIZE_TABS.forEach((tab) => {
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
  const code = (values.projectCode || 'XXX').toUpperCase().replace(/\s/g, '');
  const rev = values.revision || 'R0';
  return `PVI-STR-${code}-DBR-${rev}`;
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

    // ==========================
    // PVSYST PDF EXTRACTION
    // ==========================


    // Uploading the Pvsyst File 
    const handleFileUpload = async (key, value) => {

      setFile(key, value);

      // ===================
      // PVSYST PDF
      // ===================

      if (key === "pvsystReport" && !values.pvsystData) {

        try {

          console.log("Starting PVsyst extraction...");
          const result = await extractPvsyst(value.file);
          setValue("pvsystData", result.data);
          console.log("PVsyst extraction complete");

        } catch (err) {

          console.error(
            "PVsyst extraction failed",
            err
          );
        }
      }

      // ===================
      // MODULE EXCEL
      // ===================

      if (key === "moduleExcel") {
        try {
          console.log("Starting Module Excel parsing...");
          const result = await parseModuleExcel(value.file);

          console.log("parseModuleExcel result:", result);

          // Guard Clause: If parsing failed completely, stop here safely
          if (!result || !result.values) {
            console.error("Parsing completed but 'result' or 'result.values' is missing entirely.");
            return;
          }

          // 1. Set the raw generated variant table HTML
          setValue("MODULE_VARIANT_TABLE", result.variantTable || "");

          if (!result.values || Object.keys(result.values).length === 0) {
            console.warn("parseModuleExcel returned an empty or missing values object:", result);
          }

          async function triggerPdfCompilation(excelMetrics) {
            try {
              const response = await fetch('http://127.0.0.1:5000/api/generate-solar-report', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values: excelMetrics }),
              });

              if (!response.ok) {
                const faultData = await response.json().catch(() => ({}));
                throw new Error(faultData.details || `Server response fault: ${response.status}`);
              }

              const pdfBlob = await response.blob();
              const sessionUrl = window.URL.createObjectURL(pdfBlob);
              window.open(sessionUrl, '_blank');
              setTimeout(() => window.URL.revokeObjectURL(sessionUrl), 15000);
            } catch (pdfError) {
              console.error("PDF Pipeline Error:", pdfError);
              alert(`Failed to auto-generate PDF Report: ${pdfError.message}`);
            }
          }

          // 2. Map all extracted values directly into the template context state
          Object.entries(result.values || {}).forEach(([parsedKey, val]) => {
            console.log(`Setting parsed module value: ${parsedKey} ->`, val);
            setValue(parsedKey, val);
          });

          // Send the full parsed payload to the backend once
          await triggerPdfCompilation(result.values);

          // 3. Fallback/Safeguard check for complex split layout variables 
          // This guarantees defaults exist even if string splits encountered unexpected characters
          const templateFallbacks = [
            "module_length", "module_width", "module_height",
            "wind_load", "snow_load",
            "deg_year1", "deg_year30", "deg_yearly",
            "warranty_product", "warranty_performance"
          ];



          templateFallbacks.forEach((fallbackKey) => {
            if (result.values && result.values[fallbackKey] !== undefined) {
              setValue(fallbackKey, result.values[fallbackKey]);
            } else {
              // Prevent undefined breaking template injection by setting a blank fallback string if missing
              console.warn(`Template field "${fallbackKey}" was not captured from Excel sheet. Initializing as empty.`);
              setValue(fallbackKey, "");
            }
          });

          console.log("Module Excel parsing and structural synchronization complete.");
        } catch (err) {
          console.error("Module Excel parsing failed", err);
        }
      }
    };
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {tab.uploads.map((upload) => (
          <div key={upload.key}>
            <UploadZone
              spec={upload}
              file={files[upload.key]}
              onSet={(value) => handleFileUpload(upload.key, value)}
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
            Uploaded datasheets are embedded in the report appendix and cross-referenced against the Technical Inputs you provide in the next step.
          </div>

        </div>
      </div>

    );
  }

  if (tab.groups) {
    const isTrackerSheet = tab.id === 'tracker'; // adjust ID

    return (
      <div style={{ display: 'grid', gap: 26 }}>
        {tab.groups.map((group) => (
          <div key={group.title}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
              <h3
                style={{
                  fontSize: 12.5, fontWeight: 600, margin: 0,
                  fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-2)',
                }}>
                {group.title}
              </h3>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isTrackerSheet ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '16px 20px',
              }}  >
              {group.fields.map((field) => (
                <div
                  key={field.key}
                  style={{
                    gridColumn: isTrackerSheet ? field.size === 'full' ? '1 / -1' : field.size === 'large' ? 'span 2' : 'span 1' : field.type === 'textarea' ? '1 / -1' : 'auto',
                  }}
                >
                  <Field
                    field={field}
                    value={values[field.key]}
                    onChange={(value) => setValue(field.key, value)}
                    error={errFor(field)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
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
                <div key={field.key} style={{ gridColumn: field.size === 'full' ? '1 / -1' : field.size === 'large' ? 'span 2' : 'span 1' }}>
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
            {docNumber(values)} - {vertical.name} / PV
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
      {STRING_SIZE_TABS.map((tab, index) => {
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

export default function FormScreen({ report, vertical, sub, values, setValue, files, setFile, calc, layout, showCalc, onGenerate, }) {
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const status = overallStatus(values, files);
  const scrollRef = useRef(null);

  useEffect(() => { setStep(0); setShowErrors(false); }, [report.id]);

  const tab = STRING_SIZE_TABS[step];
  const isLast = step === STRING_SIZE_TABS.length - 1;



  const continueNext = () => {
    setShowErrors(false);

    if (!isLast) {
      setStep(step + 1);

      if (scrollRef.current) { scrollRef.current.scrollTop = 0; }
    }
  };

  const next =  () => {
    const st = tabStatus(tab, values, files);

    if (st !== "complete") { setShowErrors(true); return; }


  // ==========================
  // ASHRAE FETCH
  // ==========================
if (
  tab.id === "project" &&
  values.latitude &&
  values.longitude
) {
  generateAshrae(
    Number(values.latitude),
    Number(values.longitude)
  );
}

  // }

  // const next =  () => {
  //   const st = tabStatus(tab, values, files);

  //   if (st !== "complete") { setShowErrors(true); return; }
    // ==========================
    // VOC CSV PROCESSING
    // ==========================

    // Process Voc CSV if uploaded
    if (files?.vocCsv?.file) {
      Papa.parse(files.vocCsv.file, {
        header: true, skipEmptyLines: true,
        complete: (results) => {

          const vocSummary = calculateYearlyVoc(results.data);
          if (!vocSummary.success) { alert(vocSummary.error); return; }
          const iscSummary = calculateYearlyIsc(results.data);
          if (!iscSummary.success) { alert(iscSummary.error); return; }

          console.log("VOC Summary:");
          console.log(vocSummary.data);
          console.log(iscSummary.data);

          setValue("yearlyVocSummary", vocSummary.data);
          setValue("yearlyIscSummary", iscSummary.data);

          console.log("Form values for degradation:", {
            moduleVmp: values.moduleVmp,
            numberOfModules: values.numberOfModules,
            moduleDegradation: values.moduleDegradation,
          });

          // Generate degradation table from form input
          const initialVoltage = Number(values.moduleVmp) * Number(values.numberOfModules);
          const degradationTable = buildMinVoltageDegradationTable(initialVoltage, Number(values.moduleDegradation), 30);

          setValue("minVoltageDegradationTable", degradationTable);
          console.log("Saved minVoltageDegradationTable:", degradationTable);
          continueNext();
        },

        error: (err) => {
          alert(
            err?.message ||
            "Failed to parse CSV file."
          );
        },
      });

      return;
    }

    continueNext();
  };
  // const next = () => {
  //   const st = tabStatus(tab, values, files);
  //   if (st !== 'complete') { setShowErrors(true); return; }

  //   setShowErrors(false);
  //   if (!isLast) { setStep(step + 1); if (scrollRef.current) scrollRef.current.scrollTop = 0; }
  // };
  useEffect(() => {
    console.log("FormScreen mounted");
  }, []);

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
              {STRING_SIZE_TABS.map((t, i) => {
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
              {STRING_SIZE_TABS.map(t => (
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
            <Stepper step={step} setStep={setStep} values={values} files={files} />
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
      <Stepper step={step} setStep={setStep} values={values} files={files} />
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
