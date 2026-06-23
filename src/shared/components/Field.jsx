import React from 'react';

const errStyle = {
  borderColor: 'var(--red)',
  boxShadow: '0 0 0 3px oklch(0.58 0.17 25 / 0.13)',
};

export default function Field({ field, value, onChange, error }) {
  const id = 'f_' + field.key;
  const commonProps = {
    id,
    value: value || '',
    placeholder: field.placeholder,
    onChange: (event) => onChange(event.target.value),
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
  } else if (field.type === 'select') {
    control = (
      <select
        id={id}
        className="select"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        style={error ? errStyle : null}
      >
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
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
