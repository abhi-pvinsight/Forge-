import React, { useState } from "react";

import Logo from "../../../shared/components/Logo";
import Icon from "../../../shared/components/Icon";

import { NAV, STATUS_META } from "../../../data/navigation";

function treeRow(depth, active, collapsed) {
  return {
    display: 'flex', 
    alignItems: 'center', 
    gap: collapsed ? 0 : 8, 
    padding: collapsed ? '8px 0' : '4px 8px', 
    borderRadius: 4,
    border: '1px solid ' + (active ? 'var(--accent-line)' : 'transparent'),
    background: active ? 'var(--accent-soft)' : 'transparent', 
    cursor: 'pointer', 
    whiteSpace: 'nowrap',
    marginLeft: collapsed ? 0 : (depth === 0 ? 0 : depth === 1 ? 12 : 24),
    justifyContent: collapsed ? 'center' : 'flex-start',
    width: '100%',
  };
}

export default function Sidebar({ 
  sel, 
  onSelectReport, 
  onSelectSub, 
  user, 
  onSignOut, 
  query, 
  setQuery,
  collapsed,
  toggleCollapsed 
}) {
  // expansion state
  const [openV, setOpenV] = useState({});
  const [openS, setOpenS] = useState({});

  const toggleV = (id) => setOpenV(s => ({ ...s, [id]: !s[id] }));
  const toggleS = (key) => setOpenS(s => ({ ...s, [key]: !s[key] }));

  const q = (query || '').trim().toLowerCase();

  return (
    <aside style={{
      width: collapsed ? 72 : 286, 
      flex: 'none', 
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)', 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      transition: "width .25s ease",
      overflow: "hidden",
    }}>
      {/* brand */}
      <div style={{ 
        height: 'var(--topbar-h)', 
        display: 'flex', 
        alignItems: 'center', 
        gap: 10, 
        padding: collapsed ? '0' : '0 16px', 
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        {!collapsed && (
          <>
            <Logo size={26} />
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>Forge</div>
            <span className="badge badge-neutral" style={{ marginLeft: 'auto', marginRight: 4, height: 19, fontSize: 10 }}>v2.4</span>
          </>
        )}
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={toggleCollapsed} 
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ height: 30, width: 30, padding: 0, display: 'grid', placeItems: 'center' }}
        >
          <Icon name={collapsed ? "chevronR" : "menu"} size={16} />
        </button>
      </div>

      {/* search */}
      {!collapsed && (
        <div style={{ padding: '12px 12px 8px', flexShrink: 0 }}>
          <div className="input-affix" style={{ height: 36 }}>
            <span style={{ paddingLeft: 11, color: 'var(--text-3)', display: 'flex' }}><Icon name="search" size={15} /></span>
            <input className="input" placeholder="Search reports…" value={query} onChange={e => setQuery(e.target.value)} style={{ height: 34 }} />
          </div>
        </div>
      )}

      {/* tree */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '8px 4px' : '4px 8px 12px' }}>
        {NAV.map(v => {
          // If collapsed, we force-close menus visually and only show the main vertical icons
          const vOpen = collapsed ? false : (openV[v.id] || q);
          const subsMatch = v.subs.map(s => ({
            ...s,
            reports: q ? s.reports.filter(r => r.name.toLowerCase().includes(q)) : s.reports,
          })).filter(s => !q || s.reports.length);
          
          if (q && !subsMatch.length) return null;
          
          return (
            <div key={v.id} style={{ marginBottom: collapsed ? 8 : 2 }}>
              <button 
                onClick={() => !collapsed && toggleV(v.id)} 
                className="tree-row" 
                style={treeRow(0, false, collapsed)}
                title={collapsed ? v.name : undefined}
              >
                {!collapsed && (
                  <Icon name={vOpen ? 'chevronD' : 'chevronR'} size={14} style={{ color: 'var(--text-4)' }} />
                )}
                <span style={{ 
                  width: collapsed ? 36 : 20, 
                  height: collapsed ? 36 : 20, 
                  borderRadius: 5, 
                  background: 'var(--surface-3)', 
                  display: 'grid', 
                  placeItems: 'center', 
                  color: 'var(--text-2)',
                  transition: 'all .25s ease'
                }}>
                  <Icon name={v.icon} size={collapsed ? 16 : 13} stroke={2} />
                </span>
                {!collapsed && <span style={{ fontWeight: 600, fontSize: 13 }}>{v.name}</span>}
              </button>
              
              {vOpen && (subsMatch.length ? subsMatch : v.subs).map(s => {
                const key = v.id + '/' + s.id;
                const sOpen = openS[key] || q;
                const hasReports = s.reports.length > 0;
                return (
                  <div key={s.id}>
                    <button 
                      onClick={() => { if (hasReports) { toggleS(key); onSelectSub(v.id, s.id); } }} 
                      className={'tree-row' + (hasReports ? '' : ' tree-row-static') + (sel.sub && sel.sub.id === s.id && sel.vertical.id === v.id && !sel.report ? ' tree-row-active' : '')} 
                      style={{ ...treeRow(1, false, collapsed), opacity: hasReports ? 1 : 0.5, cursor: hasReports ? 'pointer' : 'default' }}
                    >
                      <Icon name={hasReports ? (sOpen ? 'chevronD' : 'chevronR') : 'dot'} size={13} style={{ color: 'var(--text-4)' }} />
                      <Icon name={s.icon} size={14} style={{ color: 'var(--text-3)' }} />
                      <span style={{ fontWeight: 500, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{s.name}</span>
                      {!hasReports && <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-4)' }}>soon</span>}
                    </button>
                    
                    {sOpen && hasReports && s.reports.map(r => {
                      const active = sel.report && sel.report.id === r.id && sel.vertical.id === v.id && sel.sub.id === s.id;
                      const meta = STATUS_META[r.status];
                      const disabled = r.status === 'soon';
                      return (
                        <button key={r.id} disabled={disabled}
                          onClick={() => !disabled && onSelectReport(v.id, s.id, r.id)}
                          className={'tree-row' + (active ? ' tree-row-active' : '')}
                          style={{ ...treeRow(2, active, collapsed), opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
                          <Icon name="fileText" size={14} style={{ color: active ? 'var(--accent-text)' : 'var(--text-3)' }} />
                          <span style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                          {r.status !== 'coded' && <span className={'badge ' + meta.cls} style={{ marginLeft: 'auto', height: 16, fontSize: 9, padding: '0 6px' }}>{meta.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* user */}
      <div style={{ 
        borderTop: '1px solid var(--border)', 
        padding: 10, 
        display: 'flex', 
        alignItems: 'center', 
        gap: collapsed ? 0 : 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        flexShrink: 0 
      }}>
        <div 
          title={collapsed ? `${user.name} (${user.role})` : undefined}
          style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(150deg, var(--accent), var(--accent-press))', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, flex: 'none' }}
        >
          {user.initials}
        </div>
        {!collapsed && (
          <>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.role}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onSignOut} title="Sign out" style={{ height: 30, width: 30, padding: 0 }}>
              <Icon name="logout" size={15} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}