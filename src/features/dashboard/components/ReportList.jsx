import React from 'react';
import Icon from "../../../shared/components/Icon";
import { STATUS_META } from "../../../data/navigation";

// export default function ReportList() {
//   return <section>Report List</section>;
// }

function EmptySub() {
  return (
    <div className="card" style={{ padding: 22, color: "var(--text-3)", fontSize: 13 }}>
      No coded reports are available for this discipline yet.
    </div>
  );
}

export default function ReportList(_ref3) {
  var vertical = _ref3.vertical,
    sub = _ref3.sub,
    onSelectReport = _ref3.onSelectReport;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 920,
      margin: '0 auto',
      padding: '36px 40px 60px'
    },
    className: "fade-up"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--accent)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: sub.icon,
    size: 20
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "label-eyebrow"
  }, vertical.name), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 24,
      fontWeight: 600,
      letterSpacing: '-0.01em',
      margin: '2px 0 0'
    }
  }, sub.name, " Reports"))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: 'var(--text-2)',
      margin: '6px 0 26px',
      maxWidth: 600
    }
  }, sub.reports.length, " coded ", sub.reports.length === 1 ? 'template' : 'templates', " available. Select one to load its template and enter inputs."), sub.reports.length === 0 ? /*#__PURE__*/React.createElement(EmptySub, null) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 14
    }
  }, sub.reports.map(function (r) {
    var meta = STATUS_META[r.status];
    var disabled = r.status === 'soon';
    return /*#__PURE__*/React.createElement("button", {
      key: r.id,
      disabled: disabled,
      onClick: function onClick() {
        return !disabled && onSelectReport(vertical.id, sub.id, r.id);
      },
      className: "report-card",
      style: {
        textAlign: 'left',
        padding: 18,
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        background: 'var(--surface)',
        boxShadow: 'var(--sh-xs)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'border-color .14s, box-shadow .14s, transform .08s'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 38,
        height: 38,
        borderRadius: 9,
        background: r.status === 'coded' ? 'var(--accent-soft)' : 'var(--surface-2)',
        color: r.status === 'coded' ? 'var(--accent-text)' : 'var(--text-3)',
        display: 'grid',
        placeItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "fileText",
      size: 19
    })), /*#__PURE__*/React.createElement("span", {
      className: 'badge ' + meta.cls
    }, r.status === 'coded' && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 11
    }), meta.label)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: '-0.01em'
      }
    }, r.name), /*#__PURE__*/React.createElement("div", {
      className: "mono",
      style: {
        fontSize: 11.5,
        color: 'var(--text-3)',
        marginTop: 4
      }
    }, "PVI \xB7 ", vertical.name.slice(0, 4).toUpperCase(), " \xB7 ", r.code)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12.5,
        fontWeight: 500,
        color: disabled ? 'var(--text-4)' : 'var(--accent-text)'
      }
    }, disabled ? 'Coming soon' : 'Open template', " ", !disabled && /*#__PURE__*/React.createElement(Icon, {
      name: "arrowR",
      size: 14
    })));
  }))));
}
