import React, { useState } from "react";
import Icon from "../../../shared/components/Icon";
import { bessDocNumber } from "../forms/utils/bessDocNumber.js";
import BessReportDoc from "./BessReportDoc.jsx";
import { exportPdf } from "../../../shared/utils/exporter/exportPdf";
import { exportDocx } from "../../../shared/utils/exporter/exportDocx";
// export default function Preview() {
//   return <div>Preview</div>;
// }

function V(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }
    return value;
}

const TODAY = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

// ---- Preview + download ------------------------------------
export default function BessPreview({ values, calc, files, onBack, onNew }) {
    const fname = bessDocNumber(values) + '.docx';
   const [selectedFormat, setSelectedFormat] = useState("pdf");
   const handleDownload = () => {
    if (selectedFormat === "pdf") {
        exportPdf(
            "bess-report",
            fname.replace(".docx", ".pdf")
        );
    } else {
        exportDocx(
            "bess-report",
            fname
        );
    }
};
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* success banner */}
            <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <button className="btn btn-ghost btn-sm" onClick={onBack}><Icon name="arrowL" size={14} />Edit inputs</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginLeft: 4 }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="check" size={15} stroke={3} /></span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Report generated</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button className="btn btn-soft btn-sm" onClick={onNew}><Icon name="plus" size={14} />New report</button>
                    <button className="btn btn-primary btn-sm"><Icon name="download" size={14} />Download .docx</button>
                </div>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: 0 }}>
                {/* doc canvas */}
                <div style={{ overflowY: 'auto', background: 'var(--surface-2)', padding: '34px 0' }}>
                    <div style={{ display: 'grid', placeItems: 'start center' }} className="fade-up">
                        <BessReportDoc values={values} files={files} />
                    </div>
                </div>
                {/* download rail */}
                <div style={{ borderLeft: '1px solid var(--border)', background: 'var(--surface)', overflowY: 'auto', padding: 20 }}>
                    <div className="card" style={{ padding: 16, borderColor: 'var(--accent-line)' }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ width: 44, height: 52, borderRadius: 6, background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="fileText" size={22} /></div>
                            <div style={{ minWidth: 0 }}>
                                <div className="label-eyebrow">Standard document name</div>
                                <div className="mono" style={{ fontSize: 12, fontWeight: 600, marginTop: 4, wordBreak: 'break-all', lineHeight: 1.4 }}>{fname}</div>
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={handleDownload}>
                            <Icon name="download" size={15} />Download
                        </button>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button className="btn btn-soft btn-sm" style={{
                                flex: 1,
                                color:
                                    selectedFormat === "docx"
                                        ? "var(--accent-text)"
                                        : "var(--text-3)",
                                background:
                                    selectedFormat === "docx"
                                        ? "var(--accent-soft)"
                                        : "transparent",
                                border:
                                    selectedFormat === "docx"
                                        ? "1px solid var(--accent-line)"
                                        : undefined
                            }} onClick={() => exportDocx('bess-report', fname)}>
                                .docx
                            </button>
                            <button className="btn btn-soft btn-sm" style={{ flex: 1 }} onClick={() => exportPdf("bess-report", fname.replace('.docx', '.pdf'))}>
                                .pdf
                            </button>
                        </div>
                    </div>

                    <div className="label-eyebrow" style={{ marginTop: 22, marginBottom: 10 }}>Document details</div>
                    <div style={{ display: 'grid', gap: 1, background: 'var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        {[['Project', V(values.projectName)], ['Client', V(values.clientName)], ['Revision', V(values.revision)], ['String size', calc?.valid && calc?.feasible ? calc?.recommended + ' modules' : '—'], ['Pages', '3'], ['Generated', TODAY]].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, background: 'var(--surface)', padding: '9px 12px' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{k}</span>
                                <span style={{ fontSize: 12, fontWeight: 500, textAlign: 'right' }}>{v}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 9, marginTop: 18, padding: '11px 13px', background: 'var(--accent-soft)', borderRadius: 'var(--r-md)' }}>
                        <Icon name="shield" size={14} style={{ color: 'var(--accent-text)', marginTop: 1, flex: 'none' }} />
                        <div style={{ fontSize: 11.5, color: 'var(--accent-text)', lineHeight: 1.5 }}>Generated from coded template <b>STR v2.4</b>. Formulae and static text are locked to the approved engineering standard.</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
