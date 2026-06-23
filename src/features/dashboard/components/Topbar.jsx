
import React from 'react';
import Icon from "../../../shared/components/Icon";

// export default function Topbar() {
//   return <header>Topbar</header>;
// }

export default function Topbar({ crumbs, right, theme, onToggleTheme }) {
  return (
    <header style={{
      height: 'var(--topbar-h)', flex: 'none', borderBottom: '1px solid var(--border)',
      background: 'var(--surface)', display: 'flex', alignItems: 'center', padding: '0 22px', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chevronR" size={14} style={{ color: 'var(--text-4)', flex: 'none' }} />}
            <span style={{
              fontSize: 13, whiteSpace: 'nowrap',
              fontWeight: i === crumbs.length - 1 ? 600 : 400,
              color: i === crumbs.length - 1 ? 'var(--text)' : 'var(--text-3)',
            }}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {right}
        <button className="btn btn-ghost btn-sm" onClick={onToggleTheme} style={{ width: 32, padding: 0 }} title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
        </button>
        <button className="btn btn-ghost btn-sm" style={{ width: 32, padding: 0 }} title="Notifications"><Icon name="bell" size={16} /></button>
      </div>
    </header>
  );
}
