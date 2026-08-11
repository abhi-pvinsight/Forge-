import React from 'react';
import Icon from './Icon';

const errStyle = {
  borderColor: 'var(--red)',
  boxShadow: '0 0 0 3px oklch(0.58 0.17 25 / 0.13)',
};

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

export default function Field({ field, value, onChange, error }) {
  const id = 'f_' + field.key;

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const formElements = Array.from(
        document.querySelectorAll('input:not([type="file"]):not([placeholder*="Search"]):not([type="search"]), textarea, select')
      );
      const currentIndex = formElements.indexOf(event.target);
      if (currentIndex === -1) return;

      // Find next empty field forward
      for (let i = currentIndex + 1; i < formElements.length; i++) {
        const nextEl = formElements[i];
        if (!nextEl.value || nextEl.value.trim() === '') {
          nextEl.focus();
          return;
        }
      }

      // Wrap around from the beginning
      for (let i = 0; i < currentIndex; i++) {
        const nextEl = formElements[i];
        if (!nextEl.value || nextEl.value.trim() === '') {
          nextEl.focus();
          return;
        }
      }

      // Fallback: move to next element regardless
      if (currentIndex + 1 < formElements.length) {
        formElements[currentIndex + 1].focus();
      }
    }
  };

  const commonProps = {
    id,
    value: (value !== undefined && value !== null && String(value).trim() !== '') ? value : (field.defaultValue ?? ''),
    placeholder: field.placeholder,
    onChange: (event) => onChange(event.target.value),
    onKeyDown: handleKeyDown,
  };

  let control;

  if (field.type === 'textarea') {
    control = (
      <textarea
        {...commonProps}
        className="input"
        style={error ? errStyle : null}
      />
    );
  } else if (field.type === 'file') {
    const cleanImgSrc = typeof value === 'string' && value.startsWith('src=')
      ? value.replace(/^src=["']?|["']?$/g, '')
      : value;

    control = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          id={id}
          type="file"
          accept={field.accept || "image/*,.png,.jpg,.jpeg,.svg,.webp"}
          className="input"
          onChange={(event) => {
            const file = event.target.files[0];
            if (file) {
              const maxFileSize = 25 * 1024 * 1024;
              if (file.size > maxFileSize) {
                alert(`File size exceeds 25MB limit.`);
                return;
              }
              const reader = new FileReader();
              reader.onloadend = async () => {
                const originalDataUrl = reader.result;
                if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                  console.log(`[Field] PDF uploaded, size: ${(originalDataUrl.length / 1024).toFixed(1)} KB`);
                  onChange(originalDataUrl);
                } else {
                  const compressedDataUrl = await compressImage(originalDataUrl, 1200, 0.8);
                  onChange(compressedDataUrl);
                }
              };
              reader.readAsDataURL(file);
            }
          }}
          style={error ? errStyle : null}
        />
        {cleanImgSrc && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {typeof cleanImgSrc === 'string' && cleanImgSrc.startsWith('data:application/pdf') ? 'Attached Document:' : 'Current logo:'}
            </span>
            {typeof cleanImgSrc === 'string' && cleanImgSrc.startsWith('data:application/pdf') ? (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#163c7a', background: '#e2e8f0', padding: '4px 8px', borderRadius: 4 }}>
                📄 PVsyst PDF Attached
              </span>
            ) : (
              <img 
                src={cleanImgSrc} 
                alt="Preview" 
                style={{ 
                  maxHeight: 36, 
                  maxWidth: 120, 
                  objectFit: 'contain', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--r-xs)', 
                  padding: 4, 
                  backgroundColor: '#ffffff'
                }} 
              />
            )}
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => {
                onChange('');
                const inputEl = document.getElementById(id);
                if (inputEl) inputEl.value = '';
              }}
              style={{ color: 'var(--red-text)', fontSize: 11, padding: '2px 8px' }}
            >
              Remove logo
            </button>
          </div>
        )}
      </div>
    );
  } else if (field.type === 'select') {
    control = (
      <select
        id={id}
        className="select"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        style={error ? errStyle : null}
      >
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  } else if (field.type === 'revision-table') {
    const list = Array.isArray(value) ? value : [];

    const updateRow = (index, key, val) => {
      const newList = [...list];
      newList[index] = { ...newList[index], [key]: val };
      onChange(newList);
    };

    const addRow = () => {
      const nextRev = list.length.toString();
      const todayStr = new Date().toLocaleDateString("en-GB").replaceAll("/", ".");
      onChange([...list, { revision: nextRev, issueDate: todayStr, documentName: '', description: '' }]);
    };

    const removeRow = (index) => {
      const newList = list.filter((_, i) => i !== index);
      onChange(newList);
    };

    control = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '8px 12px', fontWeight: 600, width: '15%', color: 'var(--text-1)' }}>Revision</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, width: '20%', color: 'var(--text-1)' }}>Issue Date</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, width: '35%', color: 'var(--text-1)' }}>Document Name</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, width: '25%', color: 'var(--text-1)' }}>Description</th>
              <th style={{ padding: '8px 12px', width: '5%' }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 8px' }}>
                  <input
                    type="text"
                    className="input"
                    style={{ padding: '4px 8px', fontSize: 13, height: 'auto' }}
                    value={row.revision || ''}
                    onChange={(e) => updateRow(idx, 'revision', e.target.value)}
                    placeholder="e.g. 0 or A"
                  />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <input
                    type="text"
                    className="input"
                    style={{ padding: '4px 8px', fontSize: 13, height: 'auto' }}
                    value={row.issueDate || ''}
                    onChange={(e) => updateRow(idx, 'issueDate', e.target.value)}
                    placeholder="e.g. DD.MM.YYYY"
                  />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <input
                    type="text"
                    className="input"
                    style={{ padding: '4px 8px', fontSize: 13, height: 'auto' }}
                    value={row.documentName || ''}
                    onChange={(e) => updateRow(idx, 'documentName', e.target.value)}
                    placeholder="e.g. DBR Report"
                  />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <input
                    type="text"
                    className="input"
                    style={{ padding: '4px 8px', fontSize: 13, height: 'auto' }}
                    value={row.description || ''}
                    onChange={(e) => updateRow(idx, 'description', e.target.value)}
                    placeholder="e.g. Initial Release"
                  />
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: 4, height: 'auto', color: 'var(--red)' }}
                    onClick={() => removeRow(idx)}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '12px', textAlign: 'center', color: 'var(--text-3)' }}>
                  No revision records. Click "Add Revision Row" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div>
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={addRow}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Icon name="plus" size={13} />
            Add Revision Row
          </button>
        </div>
      </div>
    );
  } else if (field.unit) {
    control = (
      <div className="input-affix" style={error ? errStyle : null}>
        <input
          {...commonProps}
          className={'input' + (field.mono ? ' mono' : '')}
          inputMode={field.type === 'number' ? 'decimal' : 'text'}
        />
        <span className="affix">{field.unit}</span>
      </div>
    );
  } else {
    control = (
      <input
        {...commonProps}
        className={'input' + (field.mono ? ' mono' : '')}
        inputMode={field.type === 'number' ? 'decimal' : 'text'}
        style={error ? errStyle : null}
      />
    );
  }

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {field.label}
        {field.required && <span className="req">*</span>}
      </label>
      {control}
      {error ? (
        <div className="field-hint" style={{ color: 'var(--red-text)' }}>
          {error}
        </div>
      ) : field.hint ? (
        <div className="field-hint">{field.hint}</div>
      ) : null}
    </div>
  );
}
