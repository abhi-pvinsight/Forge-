import React, { useState, useRef } from 'react';
import Icon from "../../../shared/components/Icon";
// export default function UploadZone() {
//   return <div>Upload Zone</div>;
// }

// ---- Upload zone -------------------------------------------
export default function UploadZone({ spec, file, onSet, onClear }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const pick = (f) => {
  if (!f) return;
 onSet({
    name: f.name,
    size: f.size,
    type: f.type,
    lastModified: f.lastModified,
    file: f,
  });
};
  if (file) {
    return (
      <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, borderColor: 'var(--accent-line)', background: 'var(--accent-soft)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface)', display: 'grid', placeItems: 'center', color: 'var(--accent-text)', border: '1px solid var(--accent-line)' }}>
          <Icon name="fileText" size={18} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--accent-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="check" size={12} /> Uploaded · {(file.size ? (file.size/1024/1024).toFixed(1) : (1.2 + Math.random()).toFixed(1))} MB
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClear} style={{ height: 30, padding: '0 10px' }}>
          <Icon name="x" size={14} /> Remove
        </button>
      </div>
    );
  }
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      //onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files && e.dataTransfer.files[0] || { name: spec.label.replace(/[^a-z]/gi,'_') + '.pdf', size: (1.4)*1024*1024 }); }}
      onDrop={(e) => {e.preventDefault();setDrag(false);const droppedFile = e.dataTransfer.files?.[0];if (droppedFile) {pick(droppedFile);}}}
      onClick={() => inputRef.current && inputRef.current.click()}
      style={{
        border: `1.5px dashed ${drag ? 'var(--accent)' : 'var(--border-2)'}`,
        background: drag ? 'var(--accent-soft)' : 'var(--surface-2)',
        borderRadius: 'var(--r-lg)', padding: '16px 16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 13, transition: 'all .14s ease',
      }}
    >
      <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={e => pick(e.target.files[0])} />
      <div style={{ width: 40, height: 40, borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: drag ? 'var(--accent)' : 'var(--text-3)', flex: 'none' }}>
        <Icon name="upload" size={19} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          {spec.label}{spec.required && <span style={{ color: 'var(--red-text)', marginLeft: 4 }}>*</span>}
        </div>
        <div className="field-hint" style={{ margin: 0 }}>
          <span style={{ color: 'var(--accent-text)', fontWeight: 500 }}>Click to browse</span> or drag &amp; drop · {spec.hint}
        </div>
      </div>
    </div>
  );
}


