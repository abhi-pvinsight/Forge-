import Icon from "../../../shared/components/Icon";
import { getDesignStageInfo } from "../../../data/projects";

const STATUS_STYLE = {
  completed: { label: 'Completed', color: '#15803d', bg: '#dcfce7' },
  approved: { label: 'Approved', color: '#15803d', bg: '#dcfce7' },
  in_review: { label: 'Under Review', color: '#0284c7', bg: '#e0f2fe' },
  under_review: { label: 'Under Review', color: '#0284c7', bg: '#e0f2fe' },
  changes_requested: { label: 'Changes Requested', color: '#e11d48', bg: '#ffe4e6' },
  generating: { label: 'Generating', color: '#d97706', bg: '#fef3c7' },
  draft: { label: 'Draft', color: '#64748b', bg: '#f1f5f9' },
};

export default function ReportRow({ report, onClick, action, onOpenVersionHistory, onOpenComments }) {
  const statusMeta = STATUS_STYLE[report.status] || STATUS_STYLE.draft;
  const clickable = typeof onClick === 'function';
  const values = report.values || {};
  const versionNum = report.version_number || 1;
  const stageInfo = getDesignStageInfo(values.designStage || values.stage || report.design_stage || '10');

  const projectName =
    values.plant_name ||
    values.projectName ||
    values.projectTitle ||
    values.project_name ||
    report.plant_name ||
    report.projectName ||
    report.project_name ||
    report.report_title ||
    'Engineering Project';

  return (
    <div
      className="card"
      onClick={clickable ? onClick : undefined}
      style={{
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        cursor: clickable ? 'pointer' : 'default',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        transition: 'all 0.18s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
        {/* Document Icon Box */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'rgba(16, 185, 129, 0.12)',
          color: '#10b981',
          display: 'grid',
          placeItems: 'center',
          flex: 'none'
        }}>
          <Icon name="fileText" size={20} />
        </div>

        {/* Project Name */}
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-1)',
          minWidth: 120,
          maxWidth: 240,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flexShrink: 0,
        }}>
          {projectName}
        </div>

        {/* Status & Stage Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Version Copy Pill */}
          <button
            type="button"
            title="Click to view full Version History & previous copies"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenVersionHistory) onOpenVersionHistory(report);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#0284c7',
              background: '#e0f2fe',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 99,
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: 13, color: '#0284c7' }}>•</span>
            <span>v{versionNum} (Current Copy)</span>
          </button>

          {/* Milestone Design Stage Badge */}
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: '#9333ea',
              background: '#f3e8ff',
              padding: '6px 14px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
            }}
          >
            {stageInfo.short}
          </span>

          {/* Status Badge */}
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: statusMeta.color,
              background: statusMeta.bg,
              padding: '6px 14px',
              borderRadius: 99,
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {statusMeta.label}
          </span>
        </div>
      </div>

      {action ? action : (clickable && <Icon name="chevronR" size={16} style={{ color: 'var(--text-4)' }} />)}
    </div>
  );
}

