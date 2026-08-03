// Navigation tree and helpers
export const NAV = [
  {
    id: 'electrical',
    name: 'Electrical',
    icon: 'bolt',
    blurb: '6 PV reports • BESS • HV',
    subs: [
      {
        id: 'pv',
        name: 'PV',
        icon: 'sun',
        desc: 'Solar yield • String layouts • Modules',
        reports: [
          { id: 'pv-design', name: 'PV Design Basis Report', code: 'PVD', status: 'coded', reportTitle: 'PV Design Basis Report' },
          { id: 'string-size', name: 'String Size Design Basis', code: 'STR', status: 'soon', reportTitle: 'String Size Design Basis Report' },
          { id: 'energy-yield', name: 'Energy Yield Design Basis', code: 'EYD', status: 'soon', reportTitle: 'Energy Yield Design Basis Report' },
          { id: 'gcr-opt', name: 'GCR Optimization Design Basis', code: 'GCR', status: 'soon', reportTitle: 'GCR Optimization Design Basis Report' },
          { id: 'cable-sizing', name: 'DC Cable Sizing Design Basis', code: 'DCC', status: 'soon', reportTitle: 'DC Cable Sizing Design Basis Report' },
          { id: 'lps', name: 'Lightning Protection Design Basis', code: 'LPS', status: 'soon', reportTitle: 'Lightning Protection Design Basis Report' }
        ]
      },
      {
        id: 'bess',
        name: 'BESS',
        icon: 'battery',
        desc: 'Energy storage • Inverters • Container layout',
        reports: [
          { id: 'bess-sizing', name: 'BESS Design Basis Report', code: 'BSZ', status: 'coded', reportTitle: 'BESS Sizing Design Basis Report' },
          { id: 'bess-ampacity', name: 'BESS Cable Ampacity', code: 'AMP', status: 'soon', reportTitle: 'BESS Cable Ampacity Report' },
          { id: 'bess-grounding', name: 'BESS Grounding Design Basis', code: 'GRN', status: 'soon', reportTitle: 'BESS Grounding Design Basis Report' },
          { id: 'pcs-sizing', name: 'PCS Sizing Design Basis', code: 'PCS', status: 'soon', reportTitle: 'PCS Sizing Design Basis Report' }
        ]
      },
      {
        id: 'hv',
        name: 'HV & Substation',
        icon: 'tower',
        desc: 'Transformers • Switchgear • High voltage',
        reports: [
          { id: 'hv-dbr', name: 'HV Design Basis Report', code: 'HVD', status: 'coded', reportTitle: 'HV Design Basis Report' },
          { id: 'xfmr', name: 'Transformer Sizing Design Basis', code: 'XFR', status: 'soon', reportTitle: 'Transformer Sizing Design Basis Report' },
          { id: 'sld', name: 'SLD Basis Report', code: 'SLD', status: 'soon', reportTitle: 'SLD Basis Report' }
        ]
      },
      {
        id: 'tline',
        name: 'TL Lines',
        icon: 'line',
        desc: 'Transmission • Route planning • Tower design',
        reports: [
          { id: 'sag-tension', name: 'Sag & Tension Design Basis', code: 'SAG', status: 'soon', reportTitle: 'Sag & Tension Design Basis Report' }
        ]
      }
    ]
  },
  {
    id: 'civil',
    name: 'Civil',
    icon: 'building',
    blurb: 'Grading • Access roads',
    subs: [
      {
        id: 'pv',
        name: 'PV',
        icon: 'sun',
        desc: 'Grading & Access Roads',
        reports: [
          { id: 'grading', name: 'Grading & Drainage Design Basis', code: 'GRD', status: 'soon', reportTitle: 'Grading & Drainage Design Basis Report' },
          { id: 'road', name: 'Access Road Design Basis', code: 'RAD', status: 'soon', reportTitle: 'Access Road Design Basis Report' }
        ]
      },
      { id: 'bess', name: 'BESS', icon: 'battery', desc: 'Civil foundation & pad design', reports: [] },
      { id: 'hv', name: 'HV & Substation', icon: 'tower', desc: 'Substation civil works', reports: [] },
      { id: 'tline', name: 'TL Lines', icon: 'line', desc: 'Line access & foundations', reports: [] }
    ]
  },
  {
    id: 'structure',
    name: 'Structure',
    icon: 'frame',
    blurb: 'Piles • Tracker structures',
    subs: [
      {
        id: 'pv',
        name: 'PV',
        icon: 'sun',
        desc: 'Piles & Tracker structure design',
        reports: [
          { id: 'pile', name: 'Pile Foundation Design Basis', code: 'PIL', status: 'soon', reportTitle: 'Pile Foundation Design Basis Report' },
          { id: 'tracker', name: 'Tracker Structure Design Basis', code: 'TRK', status: 'soon', reportTitle: 'Tracker Structure Design Basis Report' }
        ]
      },
      { id: 'bess', name: 'BESS', icon: 'battery', desc: 'BESS enclosure foundation structure', reports: [] },
      { id: 'hv', name: 'HV & Substation', icon: 'tower', desc: 'Steel structures & gantries', reports: [] },
      { id: 'tline', name: 'TL Lines', icon: 'line', desc: 'Tower structure & pole design', reports: [] }
    ]
  }
];

export const STATUS_META = {
  coded: { label: 'Coded', cls: 'badge-coded' },
  beta: { label: 'Beta', cls: 'badge-beta' },
  soon: { label: 'Soon', cls: 'badge-soon' }
};

export function findReport(verticalId, subId, reportId) {
  const v = NAV.find(x => x.id === verticalId);
  const s = v && v.subs.find(x => x.id === subId);
  const r = s && s.reports.find(x => x.id === reportId);
  return { vertical: v, sub: s, report: r };
}

// Helper to flatten navigation tree into a list of report nodes
export function flattenNavTree(tree) {
  const flat = [];
  const walk = (node) => {
    if (node.reports) {
      node.reports.forEach((r) => {
        flat.push({ ...r, parentId: node.id });
      });
    }
    if (node.subs) {
      node.subs.forEach(walk);
    }
  };
  tree.forEach(walk);
  return flat;
}

// Retrieve a report node by its unique id
export function getReportNodeById(id) {
  const flat = flattenNavTree(NAV);
  return flat.find((node) => node.id === id);
}

// Backwards-compatible default export
export default {
  NAV,
  STATUS_META,
  findReport,
  flattenNavTree,
  getReportNodeById,
};
