
import React, { useEffect, useRef, useState } from 'react';
import Icon from "../../../../../shared/components/Icon";
import Field from "../../../../../shared/components/Field";
import { STRING_SIZE_TABS } from "../forms/stringSizingTabs";
import CalcPanel from "./CalcPanel";
import Stepper from "../../../../../shared/components/Stepper";
import UploadZone from "../../../../../shared/components/UploadZone";
import ReportDoc from "../reports/ReportDoc";
import Papa from "papaparse";
import { calculateYearlyVoc, calculateYearlyIsc, prepareTableData } from "../calculations/calculateYearlyVoc&Isc";
import { buildMinVoltageDegradationTable } from "../forms/utils/buildVoc&IscTable";
import { extractPvsyst, generateAshrae, } from '../api/extractionApi';
import { API_BASE_URL } from "../api/apiConfig";
import { parseModuleExcel } from "../forms/utils/parseModuleExcel";
import { fetchLastPvReportApi } from "../api/reportsApi";

function compressImage(dataUrl, maxDim = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Limit longest side to maxDim, preserving aspect ratio
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl); // Fallback to original
    img.src = dataUrl;
  });
}

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

function SamSimulationTabBody({ values, setValue }) {
  const [simMode, setSimMode] = useState("pysam");
  const [isRunning, setIsRunning] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [previewResult, setPreviewResult] = useState(null);
  const [isAccepted, setIsAccepted] = useState(!!values.yearlyVocSummary);
  const [showTable, setShowTable] = useState(false);

  const handleRunPySAM = async () => {
    try {
      setIsRunning(true);
      setProgressText("Initializing weather download...");
      setProgressPct(0);
      setPreviewResult(null);

      const response = await fetch(`${API_BASE_URL}/api/run-pysam-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
        body: JSON.stringify({ values: values })
      });

      if (!response.body) throw new Error("ReadableStream not supported in this browser.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let resData = null;
      let doneReading = false;
      let buffer = "";

      while (!doneReading) {
        const { value, done } = await reader.read();
        if (done) {
          doneReading = true;
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6).trim();
            if (dataStr) {
              try {
                const event = JSON.parse(dataStr);
                if (event.type === "progress") {
                  setProgressText(event.message);
                  if (event.pct !== undefined) setProgressPct(event.pct);
                } else if (event.type === "result") {
                  resData = { success: true, data: event.data };
                } else if (event.type === "error") {
                  throw new Error(event.message);
                }
              } catch (e) {
                // ignore
              }
            }
          }
        }
      }

      setIsRunning(false);

      if (!resData || !resData.success) {
        alert("PySAM simulation failed or returned no data.");
        return;
      }

      const resultsData = resData.data;
      const vocSummaryData = resultsData.voc_summary || [];
      const iscSummaryData = resultsData.isc_summary || [];

      const allTimeMaxVoc = vocSummaryData.length > 0 ? Math.max(...vocSummaryData.map(s => s.maxVoltage)) : 0;
      const max_voc_obj = vocSummaryData.find(s => s.maxVoltage === allTimeMaxVoc);
      const max_voc_year = max_voc_obj ? max_voc_obj.year : "";

      const max_3hr_isc = iscSummaryData.length > 0 ? Math.max(...iscSummaryData.map(s => s.avg)) : 0;
      const max_isc_obj = iscSummaryData.find(s => s.avg === max_3hr_isc);
      const max_isc_year = max_isc_obj ? max_isc_obj.year : "";

      const initialVoltage = Number(values.moduleVmp || 43.4) * Number(values.modules_series || values.string_size || 28);
      const degradationTable = buildMinVoltageDegradationTable(initialVoltage, Number(values.moduleDegradation || 0.5), 30);

      const max_isc_year_obj = iscSummaryData.find(s => s.avg === max_3hr_isc);
      const peakData = max_isc_year_obj ? {
        t1_datetime: max_isc_year_obj.t1_datetime,
        t2_datetime: max_isc_year_obj.t2_datetime,
        t3_datetime: max_isc_year_obj.t3_datetime,
        t1_ghi: max_isc_year_obj.t1_ghi,
        t2_ghi: max_isc_year_obj.t2_ghi,
        t3_ghi: max_isc_year_obj.t3_ghi,
        t1_dhi: max_isc_year_obj.t1_dhi,
        t2_dhi: max_isc_year_obj.t2_dhi,
        t3_dhi: max_isc_year_obj.t3_dhi,
        t1_isc: max_isc_year_obj.t1_isc,
        t2_isc: max_isc_year_obj.t2_isc,
        t3_isc: max_isc_year_obj.t3_isc
      } : {};

      const rated_isc = Number(values.moduleIsc) || Number(values.isc_1) || 0;
      let gain_percentage = "0.00%";
      if (rated_isc > 0) {
        gain_percentage = (((max_3hr_isc - rated_isc) / rated_isc) * 100).toFixed(2) + "%";
      }

      setPreviewResult({
        vocSummaryData,
        iscSummaryData,
        allTimeMaxVoc,
        max_voc_year,
        max_3hr_isc,
        max_isc_year,
        degradationTable,
        peakData,
        rated_isc: rated_isc.toFixed(2),
        gain_percentage
      });
      setIsAccepted(false);
    } catch (err) {
      setIsRunning(false);
      alert("Failed to execute PySAM simulation: " + err.message);
    }
  };

  const handleVocCsvUpload = (file) => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = calculateYearlyVoc(results.data);
        if (parsed.success) {
          const vocSummaryData = parsed.data || [];
          const allTimeMaxVoc = parsed.allTimeMax || 0;
          const max_voc_obj = vocSummaryData.find(s => s.maxVoltage === allTimeMaxVoc);
          const max_voc_year = max_voc_obj ? max_voc_obj.year : "";

          const initialVoltage = Number(values.moduleVmp || 43.4) * Number(values.modules_series || values.string_size || 28);
          const degradationTable = buildMinVoltageDegradationTable(initialVoltage, Number(values.moduleDegradation || 0.5), 30);

          setPreviewResult(prev => ({
            ...(prev || {}),
            vocSummaryData,
            allTimeMaxVoc,
            max_voc_year,
            degradationTable
          }));
          setIsAccepted(false);
        } else {
          alert("Failed to parse Voc CSV: " + parsed.error);
        }
      }
    });
  };

  const handleIscCsvUpload = (file) => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = calculateYearlyIsc(results.data);
        if (parsed.success) {
          const iscSummaryData = parsed.data || [];
          const max_3hr_isc = parsed.max_3hr_isc !== undefined && parsed.max_3hr_isc !== null ? parsed.max_3hr_isc : (parsed.allTimeMaxIsc || 0);
          const max_isc_year = parsed.max_isc_year || (iscSummaryData.find(s => s.avg === max_3hr_isc)?.year || "");

          const prepRes = prepareTableData([], []);
          const max_isc_year_obj = iscSummaryData.find(s => s.year === max_isc_year || s.avg === max_3hr_isc);
          
          const peakData = prepRes.success && prepRes.tableTemplateData ? prepRes.tableTemplateData : (max_isc_year_obj ? {
            t1_datetime: max_isc_year_obj.t1_datetime || "",
            t2_datetime: max_isc_year_obj.t2_datetime || "",
            t3_datetime: max_isc_year_obj.t3_datetime || "",
            t1_ghi: max_isc_year_obj.t1_ghi || "",
            t2_ghi: max_isc_year_obj.t2_ghi || "",
            t3_ghi: max_isc_year_obj.t3_ghi || "",
            t1_dhi: max_isc_year_obj.t1_dhi || "",
            t2_dhi: max_isc_year_obj.t2_dhi || "",
            t3_dhi: max_isc_year_obj.t3_dhi || "",
            t1_isc: max_isc_year_obj.t1_isc || "",
            t2_isc: max_isc_year_obj.t2_isc || "",
            t3_isc: max_isc_year_obj.t3_isc || ""
          } : {});

          const rated_isc = Number(values.moduleIsc) || Number(values.isc_1) || 0;
          let gain_percentage = "0.00%";
          if (rated_isc > 0) {
            gain_percentage = (((max_3hr_isc - rated_isc) / rated_isc) * 100).toFixed(2) + "%";
          }

          setPreviewResult(prev => ({
            ...(prev || {}),
            iscSummaryData,
            max_3hr_isc,
            max_isc_year,
            peakData,
            rated_isc: rated_isc.toFixed(2),
            gain_percentage
          }));
          setIsAccepted(false);
        } else {
          alert("Failed to parse Isc CSV: " + parsed.error);
        }
      }
    });
  };

  const handleAcceptResults = () => {
    if (!previewResult) return;

    if (previewResult.vocSummaryData) setValue("yearlyVocSummary", previewResult.vocSummaryData);
    if (previewResult.allTimeMaxVoc) setValue("allTimeMaxVoc", previewResult.allTimeMaxVoc);
    if (previewResult.max_voc_year) setValue("max_voc_year", previewResult.max_voc_year);
    if (previewResult.iscSummaryData) setValue("yearlyIscSummary", previewResult.iscSummaryData);
    if (previewResult.max_3hr_isc) setValue("max_3hr_isc", previewResult.max_3hr_isc);
    if (previewResult.max_isc_year) setValue("max_isc_year", previewResult.max_isc_year);
    if (previewResult.degradationTable) setValue("minVoltageDegradationTable", previewResult.degradationTable);
    if (previewResult.rated_isc) setValue("rated_isc", previewResult.rated_isc);
    if (previewResult.gain_percentage) setValue("gain_percentage", previewResult.gain_percentage);

    if (previewResult.peakData) {
      setValue("peakTableData", previewResult.peakData);
      Object.entries(previewResult.peakData).forEach(([k, v]) => {
        setValue(k, String(v));
      });
    }

    setIsAccepted(true);
  };

  const maxInverterDc = Number(values.PCS_Max_DC_Input_Voltage) || 1500;
  
  const currentVocMax = (previewResult && previewResult.allTimeMaxVoc)
    ? previewResult.allTimeMaxVoc
    : (values.allTimeMaxVoc || (values.yearlyVocSummary && values.yearlyVocSummary.length > 0 ? Math.max(...values.yearlyVocSummary.map(s => Number(s.maxVoltage || 0))) : 0));
    
  const currentVocYear = (previewResult && previewResult.max_voc_year)
    ? previewResult.max_voc_year
    : (values.max_voc_year || (values.yearlyVocSummary && values.yearlyVocSummary.length > 0 ? values.yearlyVocSummary.find(s => Number(s.maxVoltage || 0) === currentVocMax)?.year : ""));

  const currentIscMax = (previewResult && previewResult.max_3hr_isc)
    ? previewResult.max_3hr_isc
    : (values.max_3hr_isc || (values.yearlyIscSummary && values.yearlyIscSummary.length > 0 ? Math.max(...values.yearlyIscSummary.map(s => Number(s.avg || s.isc || 0))) : 0));

  const currentIscYear = (previewResult && previewResult.max_isc_year)
    ? previewResult.max_isc_year
    : (values.max_isc_year || (values.yearlyIscSummary && values.yearlyIscSummary.length > 0 ? values.yearlyIscSummary.find(s => Number(s.avg || s.isc || 0) === currentIscMax)?.year : ""));

  const hasIscResult = Number(currentIscMax) > 0 || !!currentIscYear;
  const passesVocCheck = currentVocMax ? currentVocMax <= maxInverterDc : null;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Mode Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div 
          onClick={() => setSimMode("pysam")}
          style={{
            padding: 16, border: '2px solid',
            borderColor: simMode === "pysam" ? "#0ea5e9" : "#e5e7eb",
            borderRadius: 8, cursor: 'pointer', background: simMode === "pysam" ? "rgba(14, 165, 233, 0.05)" : "transparent"
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
            <span style={{ color: simMode === "pysam" ? "#0ea5e9" : "#64748b" }}>🟢 Option A: PySAM Automated Simulation</span>
          </div>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
            Run live 26-year historical NREL PySAM physics engine using site NSRDB weather data.
          </p>
        </div>

        <div 
          onClick={() => setSimMode("manual")}
          style={{
            padding: 16, border: '2px solid',
            borderColor: simMode === "manual" ? "#0ea5e9" : "#e5e7eb",
            borderRadius: 8, cursor: 'pointer', background: simMode === "manual" ? "rgba(14, 165, 233, 0.05)" : "transparent"
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
            <span style={{ color: simMode === "manual" ? "#0ea5e9" : "#64748b" }}>🟡 Option B: Manual CSV Uploads</span>
          </div>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
            Manually upload custom 26-year Voc.csv, Isc.csv, and weather data export files.
          </p>
        </div>
      </div>

      {/* Option A: PySAM Trigger Card */}
      {simMode === "pysam" && (
        <div className="card" style={{ padding: 20, background: '#f8fafc', borderRadius: 8 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600 }}>Automated 26-Year PySAM Execution</h4>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            Will run calculations using Module: <b>{values.module_make || 'Generic'} ({values.moduleVoc || '52'}V Voc)</b>, PCS: <b>{maxInverterDc}V Max DC</b>, Strings: <b>{values.modules_series || values.string_size || '28'} in Series</b>.
          </p>

          <button 
            className="btn btn-primary" 
            disabled={isRunning} 
            onClick={handleRunPySAM}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Icon name="cpu" size={16} />
            {isRunning ? "Running PySAM Engine..." : "Run PySAM 26-Year Simulation"}
          </button>

          {/* Progress Bar */}
          {isRunning && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span>{progressText || "Processing..."}</span>
                <span>{Math.round(progressPct)}%</span>
              </div>
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: '#10b981', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Option B: Manual File Uploads */}
      {simMode === "manual" && (
        <div className="card" style={{ padding: 20, background: '#f8fafc', borderRadius: 8 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Upload Manual Simulation CSV Files</h4>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            Select your exported 26-year historical simulation CSV files to parse and calculate metrics.
          </p>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>26-Year Historical Voc CSV File</label>
              <input 
                type="file" 
                accept=".csv" 
                onChange={(e) => e.target.files?.[0] && handleVocCsvUpload(e.target.files[0])}
                style={{ fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>26-Year Historical Isc CSV File</label>
              <input 
                type="file" 
                accept=".csv" 
                onChange={(e) => e.target.files?.[0] && handleIscCsvUpload(e.target.files[0])}
                style={{ fontSize: 13 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview & Results Card */}
      {(previewResult || values.yearlyVocSummary) && (
        <div className="card" style={{ padding: 20, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="checkCircle" size={18} style={{ color: '#10b981' }} />
              Simulation Results Preview & Engineering Verification
            </h4>
            {isAccepted ? (
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                ✓ Accepted & Saved to Report
              </span>
            ) : (
              <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                Pending Acceptance
              </span>
            )}
          </div>

          {/* 4-Card Sanity Verification Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {/* Card 1: Max Voc */}
            <div style={{ padding: 12, background: passesVocCheck ? '#f0fdf4' : '#fef2f2', border: '1px solid', borderColor: passesVocCheck ? '#bbf7d0' : '#fecaca', borderRadius: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>All-Time Max Voc</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: passesVocCheck ? '#166534' : '#991b1b', marginTop: 4 }}>
                {currentVocMax ? `${currentVocMax} V` : 'N/A'}
              </div>
              <div style={{ fontSize: 11, color: passesVocCheck ? '#15803d' : '#dc2626', marginTop: 4 }}>
                {passesVocCheck ? `✓ Within ${maxInverterDc}V Limit` : `⚠️ Exceeds ${maxInverterDc}V Limit!`}
              </div>
            </div>

            {/* Card 2: Peak Voc Year */}
            <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Peak Voc Year</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#334155', marginTop: 4 }}>
                {currentVocYear || 'N/A'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Coldest Voc year
              </div>
            </div>

            {/* Card 3: Max 3-Hr Avg Isc */}
            <div style={{ padding: 12, background: hasIscResult ? '#f0fdf4' : '#fffbeb', border: '1px solid', borderColor: hasIscResult ? '#bbf7d0' : '#fde68a', borderRadius: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Max 3-Hr Avg Isc</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: hasIscResult ? '#166534' : '#b45309', marginTop: 4 }}>
                {hasIscResult ? `${currentIscMax} A` : (simMode === "pysam" ? "Pending PySAM Run" : "Upload Isc.csv")}
              </div>
              <div style={{ fontSize: 11, color: hasIscResult ? '#15803d' : '#d97706', marginTop: 4 }}>
                {hasIscResult ? 'Peak Solar Noon Current' : (simMode === "pysam" ? "Run PySAM simulation" : "Select Isc.csv file")}
              </div>
            </div>

            {/* Card 4: Peak Isc Year */}
            <div style={{ padding: 12, background: currentIscYear ? '#f8fafc' : '#fffbeb', border: '1px solid', borderColor: currentIscYear ? '#e2e8f0' : '#fde68a', borderRadius: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Peak Isc Year</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: currentIscYear ? '#334155' : '#b45309', marginTop: 4 }}>
                {currentIscYear || (simMode === "pysam" ? "Pending PySAM Run" : "Upload Isc.csv")}
              </div>
              <div style={{ fontSize: 11, color: currentIscYear ? '#64748b' : '#d97706', marginTop: 4 }}>
                {currentIscYear ? 'Highest irradiance year' : (simMode === "pysam" ? "Run PySAM simulation" : "Select Isc.csv file")}
              </div>
            </div>
          </div>

          {/* Expandable Table Preview */}
          <div style={{ marginBottom: 16 }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setShowTable(!showTable)}
              style={{ fontSize: 12 }}
            >
              {showTable ? "Hide 26-Year Summary Table" : "Show 26-Year Summary Table Preview"}
            </button>

            {showTable && (
              <div style={{ marginTop: 12, maxHeight: 240, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>Year</th>
                      <th style={{ padding: '8px 12px' }}>Max Voc (V)</th>
                      <th style={{ padding: '8px 12px' }}>Min Voc (V)</th>
                      <th style={{ padding: '8px 12px' }}>3-Hr Peak Isc (A)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((previewResult ? previewResult.vocSummaryData : values.yearlyVocSummary) || []).map((row, idx) => {
                      const iscRow = ((previewResult ? previewResult.iscSummaryData : values.yearlyIscSummary) || [])[idx] || {};
                      return (
                        <tr key={row.year} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 12px', fontWeight: 600 }}>{row.year}</td>
                          <td style={{ padding: '6px 12px', color: '#15803d' }}>{row.maxVoltage}</td>
                          <td style={{ padding: '6px 12px' }}>{row.minVoltage}</td>
                          <td style={{ padding: '6px 12px', color: '#0369a1' }}>{iscRow.avg || 'N/A'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Accept Button */}
          {previewResult && !isAccepted && (
            <button 
              className="btn btn-primary"
              onClick={handleAcceptResults}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#10b981', borderColor: '#059669' }}
            >
              <Icon name="check" size={16} />
              Accept & Apply Results to Report
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TabBody({ tab, values, setValue, files, setFile, showErrors }) {
  const [solarCalcTable, setSolarCalcTable] = useState(null);
  const [solarCalcValues, setSolarCalcValues] = useState(null);

  if (tab.id === 'simulations') {
    return <SamSimulationTabBody values={values} setValue={setValue} />;
  }

  const errFor = (field, isUpload = false) => {
    if (!showErrors || !field.required) return null;
    const hasValue = isUpload
      ? !!files[field.key]
      : values[field.key] != null && String(values[field.key]).trim() !== '';

    return hasValue ? null : 'Required';
  };

  const updateStcSpecsFromSelectedWps = (wp1, wp2, variantsList) => {
    const variants = variantsList || values.availableWpVariants || [];
    if (!variants || variants.length === 0) return;

    const num1 = parseFloat(String(wp1 || "").replace(/[^\d.]/g, ""));
    const num2 = parseFloat(String(wp2 || "").replace(/[^\d.]/g, ""));

    const selectedVariants = variants.filter(v => 
      (!isNaN(num1) && Math.abs(v.numericWp - num1) < 1) ||
      (!isNaN(num2) && Math.abs(v.numericWp - num2) < 1)
    );

    const targetVariant = selectedVariants.length > 0
      ? selectedVariants.reduce((max, curr) => (curr.numericWp > max.numericWp ? curr : max), selectedVariants[0])
      : variants.reduce((max, curr) => (curr.numericWp > max.numericWp ? curr : max), variants[0]);

    if (targetVariant) {
      console.log(`[FormScreen] Auto-anchoring STC specs to highest selected variant: ${targetVariant.wpLabel} (Module Rated Power: ${targetVariant.numericWp})`);
      if (targetVariant.voc) setValue("moduleVoc", targetVariant.voc);
      if (targetVariant.vmp) setValue("moduleVmp", targetVariant.vmp);
      if (targetVariant.isc) setValue("moduleIsc", targetVariant.isc);
      if (targetVariant.imp) setValue("moduleImp", targetVariant.imp);
      if (targetVariant.numericWp || targetVariant.rawWp) setValue("modulePmax", String(targetVariant.numericWp || targetVariant.rawWp));
    }
  };

  // Handler to sync electrical parameters whenever user changes module_wp1 or module_wp2
  const handleFieldValueChange = (key, val) => {
    setValue(key, val);

    if (key === "module_wp1" || key === "module_wp2") {
      const nextWp1 = key === "module_wp1" ? val : values.module_wp1;
      const nextWp2 = key === "module_wp2" ? val : values.module_wp2;
      updateStcSpecsFromSelectedWps(nextWp1, nextWp2, values.availableWpVariants);
    }
  };

  if (tab.uploads) {

    // ==========================
    // PVSYST PDF EXTRACTION
    // ==========================


    // Uploading the Pvsyst File 
    const handleFileUpload = async (key, value) => {
      // Safety file size check (20MB limit)
      const maxFileSize = 20 * 1024 * 1024; // 20 MB
      if (value && value.file && value.file.size > maxFileSize) {
        alert(`File size exceeds 20MB limit. Please upload a smaller file.`);
        return;
      }

      setFile(key, value);

      // ===================
      // 26-YEAR HISTORICAL IMAGES
      // ===================
      if (key === "Results_of_26-year_voltage" || key === "Results_of_26-year_current") {
        if (value && value.file) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const originalDataUrl = reader.result;
            const originalLength = originalDataUrl.length;
            console.log(`[FormScreen] Converted ${key} to Base64, original size: ${(originalLength / 1024).toFixed(1)} KB`);

            const compressedDataUrl = await compressImage(originalDataUrl, 1200, 0.8);
            const compressedLength = compressedDataUrl.length;
            console.log(`[FormScreen] Compressed ${key} Base64 size: ${(compressedLength / 1024).toFixed(1)} KB (Reduced by ${((originalLength - compressedLength) / originalLength * 100).toFixed(1)}%)`);

            setValue(key, `src="${compressedDataUrl}"`);
          };
          reader.readAsDataURL(value.file);
        } else {
          setValue(key, "");
        }
      }

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
          async function syncSolarReportData(excelMetrics) {
            try {
              // Fetch calculation values now; build the native appendix only
              // during final PDF export so it never becomes base64 HTML images.
              console.log("Fetching structured metrics data...");
              const dataResponse = await fetch(
                `${API_BASE_URL}/generate-solar-report-data`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    values: excelMetrics,
                  }),
                }
              );

              if (!dataResponse.ok) {
                throw new Error(`Data fetch failed: ${dataResponse.status}`);
              }

              const dataResult = await dataResponse.json();
              console.log("Solar report JSON data result:", dataResult);

              // Access calculation table and structured scalar values
              const calcTable = dataResult?.calc_table;
              const calcValues = dataResult?.calc_values;

              // Use standard react/form hooks to automatically fill placeholders
              if (calcValues) {
                console.log("Injecting calculated constants to placeholders:", calcValues);
                setSolarCalcValues(calcValues);
                setValue("solarCalcValues", calcValues);
                console.log("solarCalcValues in form state====>>:", solarCalcValues);
                // Set selected modules value straight into form management state
                if (calcValues.selected_modules && calcValues.selected_modules.length > 0) {
                  setValue("SELECTED_MODULES_IN_SERIES", calcValues.selected_modules[0]);
                }
              }


              // console.log("solarCalcValues in form state:", getValues("solarCalcValues"));

              // Keep local preview synchronized
              if (calcTable) {
                setSolarCalcTable(calcTable);
              }

              setValue("solarAppendixValues", excelMetrics);
              setValue("hasSolarAppendix", true);
              setValue("appendixPages", []);
            } catch (dataError) {
              console.error("Solar Report Processing Error:", dataError);
              alert(`Failed to sync solar calculations: ${dataError.message}`);
            }
          }

          // 2. Map all extracted values directly into the template context state
          Object.entries(result.values || {}).forEach(([parsedKey, val]) => {
            if (val !== undefined && val !== "") {
              console.log(`Setting parsed module value: ${parsedKey} ->`, val);
              setValue(parsedKey, val);
            }
          });

          // Store available Wp variants in form state for dynamic dropdowns
          const variants = result.availableWpVariants || [];
          if (variants.length > 0) {
            setValue("availableWpVariants", variants);
            
            // Force reset selected module Wp values to extracted Excel variants
            const defaultWp1 = variants[0]?.wpLabel || `${variants[0]?.numericWp} Wp`;
            const defaultWp2 = variants.length > 1
              ? (variants[variants.length - 1]?.wpLabel || `${variants[variants.length - 1]?.numericWp} Wp`)
              : "None";

            setValue("module_wp1", defaultWp1);
            setValue("module_wp2", defaultWp2);

            // Auto-anchor STC electrical values to the highest selected module variant
            updateStcSpecsFromSelectedWps(defaultWp1, defaultWp2, variants);
          }

          // Send the parsed payload to the backend once for calculation data.
          await syncSolarReportData(result.values);

          // 3. Fallback/Safeguard check for complex split layout variables 
          const templateFallbacks = [
            "module_length", "module_width", "module_height",
            "wind_load", "snow_load",
            "deg_year1", "deg_year30", "deg_yearly",
            "warranty_product", "warranty_performance"
          ];

          templateFallbacks.forEach((fallbackKey) => {
            if (result.values && result.values[fallbackKey] !== undefined && result.values[fallbackKey] !== "") {
              setValue(fallbackKey, result.values[fallbackKey]);
            } else {
              console.warn(`Template field "${fallbackKey}" was not captured from Excel sheet. Keeping user's existing value.`);
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
              onClear={() => {
                setFile(upload.key, null);
                if (upload.key === "Results_of_26-year_voltage" || upload.key === "Results_of_26-year_current") {
                  setValue(upload.key, "");
                }
                if (upload.key === "moduleExcel") {
                  setValue("solarAppendixValues", null);
                  setValue("hasSolarAppendix", false);
                  setValue("appendixPages", []);
                  setValue("availableWpVariants", []);
                }
              }}
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
              {group.fields.map((field) => {
                let dynamicField = { ...field };

                // 1. Dynamic Wp selection options
                if ((field.key === 'module_wp1' || field.key === 'module_wp2') && values.availableWpVariants && values.availableWpVariants.length > 0) {
                  const wpOptions = values.availableWpVariants.map(v => v.wpLabel || `${v.numericWp} Wp`);
                  dynamicField = {
                    ...field,
                    type: 'select',
                    options: field.required ? wpOptions : ["None", ...wpOptions]
                  };
                }

                // 2. Dynamic module quantity labels
                if (field.key === "module_qty_615") {
                  const wp1Label = values.module_wp1 || "Primary Module";
                  dynamicField.label = `Total Number of PV Modules (${wp1Label})`;
                }
                if (field.key === "module_qty_620") {
                  const wp2Label = values.module_wp2 || "Secondary Module";
                  dynamicField.label = `Total Number of PV Modules (${wp2Label})`;
                }

                return (
                  <div
                    key={field.key}
                    style={{
                      gridColumn: isTrackerSheet ? field.size === 'full' ? '1 / -1' : field.size === 'large' ? 'span 2' : 'span 1' : (field.type === 'textarea' || field.type === 'revision-table') ? '1 / -1' : 'auto',
                    }}
                  >
                    <Field
                      field={dynamicField}
                      value={values[field.key]}
                      onChange={(value) => handleFieldValueChange(field.key, value)}
                      error={errFor(field)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
      {tab.fields.map((field) => {
        let dynamicField = { ...field };
        if ((field.key === 'module_wp1' || field.key === 'module_wp2') && values.availableWpVariants && values.availableWpVariants.length > 0) {
          const wpOptions = values.availableWpVariants.map(v => v.wpLabel || `${v.numericWp} Wp`);
          dynamicField = {
            ...field,
            type: 'select',
            options: field.required ? wpOptions : ["None", ...wpOptions]
          };
        }
        if (field.key === "module_qty_615") {
          const wp1Label = values.module_wp1 || "Primary Module";
          dynamicField.label = `Total Number of PV Modules (${wp1Label})`;
        }
        if (field.key === "module_qty_620") {
          const wp2Label = values.module_wp2 || "Secondary Module";
          dynamicField.label = `Total Number of PV Modules (${wp2Label})`;
        }
        return (
          <div key={field.key} style={{ gridColumn: (field.type === 'textarea' || field.type === 'revision-table') ? '1 / -1' : 'auto' }}>
            <Field field={dynamicField} value={values[field.key]} onChange={(value) => handleFieldValueChange(field.key, value)} error={errFor(field)} />
          </div>
        );
      })}
    </div>
  );
}

function AlertBanner({ banner, onClose }) {
  if (!banner) return null;
  
  const bg = banner.type === 'success' ? 'var(--green-soft)' : banner.type === 'warning' ? 'var(--amber-soft)' : 'var(--red-soft)';
  const color = banner.type === 'success' ? 'var(--green-text)' : banner.type === 'warning' ? 'var(--amber-text)' : 'var(--red-text)';
  const icon = banner.type === 'success' ? 'check' : banner.type === 'warning' ? 'info' : 'alert';
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      background: bg,
      color: color,
      borderRadius: 'var(--r-md)',
      marginBottom: 20,
      border: `1px solid ${color}20`,
      fontSize: 13,
      lineHeight: 1.4,
      animation: 'fadeIn 0.2s ease-out',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <Icon name={icon} size={16} style={{ color: color, flex: 'none' }} />
      <div style={{ flex: 1 }}>{banner.text}</div>
      <button 
        onClick={onClose} 
        style={{
          background: 'transparent',
          border: 'none',
          color: color,
          cursor: 'pointer',
          padding: 4,
          display: 'grid',
          placeItems: 'center',
          opacity: 0.6
        }}
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

function FormHeader({ report, vertical, values, status, onGenerate, onSaveDraft, onLoadLastEntry, onClearAll }) {
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

export default function FormScreen({ report, vertical, sub, values, setValue, files, setFile, calc, layout, showCalc, onGenerate, onSaveDraft, onClearAll }) {
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [sourceEntityId, setSourceEntityId] = useState(null);
  const [banner, setBanner] = useState(null);
  const [isProcessingPySAM, setIsProcessingPySAM] = useState(false);
  const [pySamProgressText, setPySamProgressText] = useState("");
  const [pySamProgressPct, setPySamProgressPct] = useState(0);
  const status = overallStatus(values, files);
  const scrollRef = useRef(null);

  useEffect(() => { 
    setStep(0); 
    setShowErrors(false); 
    setBanner(null); 

    // Pre-fill fields with defaultValue if empty or not present in form state
    STRING_SIZE_TABS.forEach((tabItem) => {
      const fields = tabItem.fields || (tabItem.groups || []).flatMap((g) => g.fields || []);
      fields.forEach((f) => {
        if (f.defaultValue !== undefined) {
          const currentVal = values[f.key];
          if (currentVal === undefined || currentVal === null || String(currentVal).trim() === "") {
            setValue(f.key, f.defaultValue);
          }
        }
      });
    });
  }, [report.id]);

  // Auto-fetch ASHRAE weather data when coordinates change
  useEffect(() => {
    if (values.latitude && values.longitude) {
      const lat = Number(values.latitude);
      const lon = Number(values.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        const timer = setTimeout(async () => {
          try {
            console.log(`[FormScreen] Auto-fetching ASHRAE for coordinates: ${lat}, ${lon}`);
            const ashrae = await generateAshrae(lat, lon);
            const ashraeData = ashrae?.data || ashrae;
            if (ashraeData) {
              const updates = {};
              Object.entries(ashraeData).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== "N/A") {
                  updates[k] = String(v);
                }
              });
              
              const tempMin = ashraeData.extreme_annual_DB_mean_min;
              const tempCellMax = ashraeData.extreme_annual_DB_mean_max;
              if (tempMin !== undefined && tempMin !== null && tempMin !== "N/A") {
                updates["tempMin"] = String(tempMin);
              }
              if (tempCellMax !== undefined && tempCellMax !== null && tempCellMax !== "N/A") {
                updates["tempCellMax"] = String(tempCellMax);
              }
              
              setValue(updates);
            }
          } catch (e) {
            console.error("Auto ASHRAE fetch failed:", e);
          }
        }, 1000); // 1-second debounce to prevent spamming during typing
        return () => clearTimeout(timer);
      }
    }
  }, [values.latitude, values.longitude]);

  const loadLastEntry = async () => {
    try {
      setBanner(null);
      const res = await fetchLastPvReportApi();
      if (res.success && res.data) {
        const reportData = res.data;
        const metadata = reportData.metadata || {};
        const metadata_json = metadata.metadata_json || {};
        
        const inputs = reportData.inputs || {};
        const details = inputs.details || inputs;
        
        const flatPv = {
          module_make: details.module_manufacturer || "",
          module_model: details.module_model || "",
        };
        
        const jsonColumns = [
          "electrical_characteristics",
          "mechanical_characteristics",
          "temperature_coefficients",
          "pvsyst_results",
          "irradiation_data",
          "energy_yield",
          "loss_analysis",
          "voc_calculations",
          "isc_calculations",
          "degradation_tables",
          "site_conditions",
        ];
        
        jsonColumns.forEach(col => {
          if (details[col] && typeof details[col] === "object") {
            Object.entries(details[col]).forEach(([key, val]) => {
              flatPv[key] = val;
            });
          }
        });

        const mergedValues = {
          ...metadata_json,
          ...flatPv
        };

        // Pre-fill form fields
        setValue(mergedValues);

        // Store source entity's id separately
        setSourceEntityId(metadata.id);
        
        setBanner({
          type: "success",
          text: `Loaded details from last PV entry (Source ID: ${metadata.id}).`
        });
      } else {
        setBanner({
          type: "warning",
          text: "No previous entry found."
        });
      }
    } catch (err) {
      console.error("Error loading last PV entry:", err);
      setBanner({
        type: "error",
        text: `Failed to load last entry: ${err.message}`
      });
    }
  };

  const tab = STRING_SIZE_TABS[step];
  const isLast = step === STRING_SIZE_TABS.length - 1;

  const continueNext = () => {
    setShowErrors(false);

    if (!isLast) {
      setStep(step + 1);

      if (scrollRef.current) { scrollRef.current.scrollTop = 0; }
    }
  };

  const next = async () => {
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
      try {
        const ashrae = await generateAshrae(
          Number(values.latitude),
          Number(values.longitude)
        );

        const ashraeData = ashrae?.data || ashrae;
        if (ashraeData) {
          Object.entries(ashraeData).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "N/A") {
              setValue(k, String(v));
            }
          });
          
          const tempMin = ashraeData.extreme_annual_DB_mean_min;
          const tempCellMax = ashraeData.extreme_annual_DB_mean_max;
          if (tempMin !== undefined && tempMin !== null && tempMin !== "N/A") {
            setValue("tempMin", String(tempMin));
          }
          if (tempCellMax !== undefined && tempCellMax !== null && tempCellMax !== "N/A") {
            setValue("tempCellMax", String(tempCellMax));
          }
        }
      } catch (error) {
        console.error("ASHRAE fetch failed:", error);
      }
    }

    continueNext();
  };

  useEffect(() => {
    console.log("FormScreen mounted");
  }, []);

  const renderProgressOverlay = () => {
    if (!isProcessingPySAM) return null;
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, color: 'white'
      }}>
        <div className="card" style={{ padding: 40, width: 400, textAlign: 'center', background: '#fff', color: '#111' }}>
          <Icon name="download" size={32} style={{ marginBottom: 20, color: '#10b981' }} />
          <h3 style={{ marginBottom: 12, fontSize: 20, fontWeight: 600 }}>Downloading Weather Data</h3>
          <p style={{ color: 'var(--text-2)', marginBottom: 24, fontSize: 14 }}>
            {pySamProgressText || "Initializing..."}
          </p>
          <div style={{
            height: 6, width: '100%', backgroundColor: '#e5e7eb',
            borderRadius: 3, overflow: 'hidden', marginBottom: 8
          }}>
            <div style={{
              height: '100%', width: `${pySamProgressPct}%`,
              backgroundColor: '#10b981', transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
            <span>Progress</span>
            <span>{Math.round(pySamProgressPct)}%</span>
          </div>
        </div>
      </div>
    );
  };

  // ---------- SCROLL layout ----------
  if (layout === 'scroll') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {renderProgressOverlay()}
        <FormHeader report={report} vertical={vertical} values={values} status={status} onGenerate={onGenerate} onSaveDraft={onSaveDraft} onLoadLastEntry={loadLastEntry} onClearAll={onClearAll} />
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
              <AlertBanner banner={banner} onClose={() => setBanner(null)} />
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
        {renderProgressOverlay()}
        <FormHeader report={report} vertical={vertical} values={values} status={status} onGenerate={onGenerate} onSaveDraft={onSaveDraft} onLoadLastEntry={loadLastEntry} onClearAll={onClearAll} />
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.05fr 1fr', minHeight: 0 }}>
          {/* form */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid var(--border)' }}>
            <Stepper step={step} setStep={setStep} values={values} files={files} tabs={STRING_SIZE_TABS} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 24px' }} ref={scrollRef}>
              <AlertBanner banner={banner} onClose={() => setBanner(null)} />
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
                <ReportDoc values={values} calc={calc} files={files} mini solarCalcValues={values?.solarCalcValues} />
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
      {renderProgressOverlay()}
      <FormHeader report={report} vertical={vertical} values={values} status={status} onGenerate={onGenerate} onSaveDraft={onSaveDraft} onLoadLastEntry={loadLastEntry} onClearAll={onClearAll} />
      <Stepper step={step} setStep={setStep} values={values} files={files} tabs={STRING_SIZE_TABS} />
      <div style={{ flex: 1, overflowY: 'auto' }} ref={scrollRef}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 32px 40px', display: 'grid', gridTemplateColumns: '1fr 256px', gap: 28, alignItems: 'start' }}>
          <div className="card fade-in" key={tab.id} style={{ padding: 24, minWidth: 0 }}>
            <AlertBanner banner={banner} onClose={() => setBanner(null)} />
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
