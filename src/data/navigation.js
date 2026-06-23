// Navigation tree and helpers moved from legacy HTML build (forgeSign.html)
export const NAV = [{
  id: 'electrical',
  name: 'Electrical',
  icon: 'bolt',
  subs: [{
    id: 'pv',
    name: 'PV',
    icon: 'sun',
    reports: [{
      id: 'string-size',
      name: 'String Size Design Basis',
      code: 'STR',
      status: 'soon'
    }, {
      id: 'pv-design',
      name: 'PV Design Basis',
      code: 'PVD',
      status: 'coded'
    }, {
      id: 'energy-yield',
      name: 'Energy Yield Design Basis',
      code: 'EYD',
      status: 'soon'
    }, {
      id: 'gcr-opt',
      name: 'GCR Optimization Design Basis',
      code: 'GCR',
      status: 'soon'
    }, {
      id: 'cable-sizing',
      name: 'DC Cable Sizing Design Basis',
      code: 'DCC',
      status: 'beta'
    }, {
      id: 'lps',
      name: 'Lightning Protection Design Basis',
      code: 'LPS',
      status: 'soon'
    }]
  }, {
    id: 'bess',
    name: 'BESS',
    icon: 'battery',
    reports: [{
      id: 'bess-sizing',
      name: 'BESS Sizing Design Basis',
      code: 'BSZ',
      status: 'coded'
    }, {
      id: 'pcs-sizing',
      name: 'PCS Sizing Design Basis',
      code: 'PCS',
      status: 'soon'
    }]
  }, {
    id: 'hv',
    name: 'HV & Substation',
    icon: 'tower',
    reports: [{
      id: 'xfmr',
      name: 'Transformer Sizing Design Basis',
      code: 'XFR',
      status: 'soon'
    }, {
      id: 'sld',
      name: 'SLD Basis Report',
      code: 'SLD',
      status: 'soon'
    }]
  }, {
    id: 'tline',
    name: 'T-Line',
    icon: 'line',
    reports: [{
      id: 'sag-tension',
      name: 'Sag & Tension Design Basis',
      code: 'SAG',
      status: 'soon'
    }]
  }]
}, {
  id: 'civil',
  name: 'Civil',
  icon: 'building',
  subs: [{
    id: 'pv',
    name: 'PV',
    icon: 'sun',
    reports: [{
      id: 'grading',
      name: 'Grading & Drainage Design Basis',
      code: 'GRD',
      status: 'soon'
    }, {
      id: 'road',
      name: 'Access Road Design Basis',
      code: 'RAD',
      status: 'soon'
    }]
  }, {
    id: 'bess',
    name: 'BESS',
    icon: 'battery',
    reports: []
  }, {
    id: 'hv',
    name: 'HV & Substation',
    icon: 'tower',
    reports: []
  }, {
    id: 'tline',
    name: 'T-Line',
    icon: 'line',
    reports: []
  }]
}, {
  id: 'structure',
  name: 'Structure',
  icon: 'frame',
  subs: [{
    id: 'pv',
    name: 'PV',
    icon: 'sun',
    reports: [{
      id: 'pile',
      name: 'Pile Foundation Design Basis',
      code: 'PIL',
      status: 'soon'
    }, {
      id: 'tracker',
      name: 'Tracker Structure Design Basis',
      code: 'TRK',
      status: 'soon'
    }]
  }, {
    id: 'bess',
    name: 'BESS',
    icon: 'battery',
    reports: []
  }, {
    id: 'hv',
    name: 'HV & Substation',
    icon: 'tower',
    reports: []
  }, {
    id: 'tline',
    name: 'T-Line',
    icon: 'line',
    reports: []
  }]
}];

export const STATUS_META = {
  coded: {
    label: 'Coded',
    cls: 'badge-coded'
  },
  beta: {
    label: 'Beta',
    cls: 'badge-beta'
  },
  soon: {
    label: 'Soon',
    cls: 'badge-soon'
  }
};

export function findReport(verticalId, subId, reportId) {
  const v = NAV.find(x => x.id === verticalId);
  const s = v && v.subs.find(x => x.id === subId);
  const r = s && s.reports.find(x => x.id === reportId);
  return {
    vertical: v,
    sub: s,
    report: r
  };
}

// Backwards-compatible default export
export default {
  NAV,
  STATUS_META,
  findReport
};

 