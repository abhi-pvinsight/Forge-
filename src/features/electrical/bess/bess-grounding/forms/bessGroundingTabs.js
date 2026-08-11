export const GROUNDING_ANALYSIS_TABS = [

  // ─── CLIENT INFORMATION ────────────────────────────────────────────────────
  {
    id: 'client',
    name: 'Client Information',
    icon: 'briefcase',
    blurb: 'Identifies the client and the engagement on the report cover sheet.',
    fields: [
      { key: 'clientName', label: 'Client / Company name', type: 'text', required: true, placeholder: 'e.g. Aurora Renewables LLC' },
      { key: 'clientEmail', label: 'Contact email', type: 'text', required: true, placeholder: 'name@company.com' },
      { key: 'clientLogo', label: 'Client Logo', type: 'file', required: false, hint: 'Upload company logo image (.png, .jpg, .svg, .webp)' },
      { key: 'clientAddress', label: 'Client address', type: 'textarea', required: true, placeholder: 'Street, City, State, Country' },
    ]
  },
  {
    id: 'revisionHistory',
    name: 'Revision History',
    icon: 'clock',
    blurb: 'Revision table shown on the cover page / document control page.',
    fields: [
      { key: 'revisions', label: 'Revisions', type: 'revision-table', required: false }
    ]
  },

  // ─── PROJECT INFORMATION ───────────────────────────────────────────────────
  {
    id: 'project',
    name: 'Project Information',
    icon: 'map',
    blurb: 'Core project identifiers and plant description referenced throughout the report.',
    fields: [
      { key: 'clientName', label: 'Client / Company name', type: 'text', required: true, placeholder: 'e.g. Alpha Omega Power LLC' },
      { key: 'projectName', label: 'Project Name', type: 'text', required: true },
      { key: 'county', label: 'County / City', type: 'text', required: true },
      { key: 'state', label: 'State', type: 'text', required: true },
      { key: 'country', label: 'Country', type: 'text', required: true },
      { key: 'projectCapacityMW', label: 'Power Capacity', type: 'number', required: true, unit: 'MW' },
      { key: 'projectCapacityMWh', label: 'Energy Capacity', type: 'number', required: true, unit: 'MWh' },
      { key: 'projectDurationHours', label: 'Duration', type: 'number', required: true, unit: 'Hours' },
      { key: 'powerFactor', label: 'Power Factor', type: 'text', required: true, placeholder: '0.95' },
      { key: 'powerFactorLeadLag', label: 'PF Lead / Lag', type: 'text', required: true, placeholder: 'Lead / Lag' },
      { key: 'dcVoltage', label: 'DC System Voltage', type: 'number', required: true, unit: 'V' },
      { key: 'mvVoltage', label: 'MV Collection Voltage', type: 'number', required: true, unit: 'kV' },
      { key: 'poiVoltage', label: 'POI Voltage', type: 'number', required: true, unit: 'kV' },
      { key: 'bessManufacturer', label: 'BESS Enclosure Manufacturer', type: 'text', required: true },
      { key: 'ipRating', label: 'Enclosure IP Rating', type: 'text', required: true },
      { key: 'batteryMinVoltage', label: 'Battery Min Voltage', type: 'number', required: true, unit: 'Vdc' },
      { key: 'batteryMaxVoltage', label: 'Battery Max Voltage', type: 'number', required: true, unit: 'Vdc' },
      { key: 'pcsManufacturer', label: 'PCS Manufacturer', type: 'text', required: true },
      { key: 'pcsModel', label: 'PCS Model', type: 'text', required: true },
      { key: 'pcsRating', label: 'PCS Rating', type: 'number', required: true, unit: 'kVA' },
      { key: 'mvtRating', label: 'MVT Rating', type: 'number', required: true, unit: 'kVA' },
      { key: 'maxMvtLoop', label: 'Max MVT Looping', type: 'number', required: true },
      { key: 'noOfVCB', label: 'No. of VCB Feeders', type: 'number', required: true },
    ]
  },

  // ─── STUDY BASIS: INPUTS & ASSUMPTIONS ─────────────────────────────────────
  {
    id: 'studyBasis',
    name: 'Study Basis',
    icon: 'book',
    blurb: 'Interconnection, transformer, and cable assumptions used to build the grounding model.',
    groups: [
      {
        title: 'Interconnection & OHTL',
        fields: [
          { key: 'poiSubstationName', label: 'POI / Utility Substation Name', type: 'text', required: true, placeholder: 'TNMP Heights Substation' },
          { key: 'poiSubstationVoltage', label: 'POI Substation Voltage', type: 'number', required: true, unit: 'kV' },
          { key: 'ohtlConductorType', label: 'Gen-Tie OHTL Conductor', type: 'text', required: true, placeholder: 'ACSR Lark 397.5 KCMil' },
          { key: 'ohtlLengthMiles', label: 'Gen-Tie OHTL Length', type: 'number', required: true, unit: 'miles' },
        ]
      },
      {
        title: 'Main Power Transformer (MPT)',
        fields: [
          { key: 'mptRatingMva', label: 'MPT Rating (OA/FA/FA)', type: 'text', required: true, placeholder: '138/184/230 MVA' },
          { key: 'mptVoltageRatio', label: 'MPT Voltage Ratio', type: 'text', required: true, placeholder: '138/34.5 kV' },
          { key: 'mptPsPercentZ', label: 'PS Winding %Z (at 138 MVA)', type: 'number', required: true },
          { key: 'mptPsXR', label: 'PS Winding X/R', type: 'number', required: true },
          { key: 'mptPtPercentZ', label: 'PT Winding %Z (at 138 MVA)', type: 'number', required: true },
          { key: 'mptPtXR', label: 'PT Winding X/R', type: 'number', required: true },
          { key: 'mptStPercentZ', label: 'ST Winding %Z (at 138 MVA)', type: 'number', required: true },
          { key: 'mptStXR', label: 'ST Winding X/R', type: 'number', required: true },
          { key: 'neutralGroundingReactorOhm', label: 'Neutral Grounding Reactor Rating', type: 'number', required: true, unit: 'ohm' },
        ]
      },
      {
        title: 'MV Transformer (MVT)',
        fields: [
          { key: 'mvtVoltageRatio', label: 'MVT Voltage Ratio', type: 'text', required: true, placeholder: '34.5/0.69 kV' },
          { key: 'mvtRatingMva', label: 'MVT Rating', type: 'number', required: true, unit: 'MVA', placeholder: '5.3' },
          { key: 'mvtImpedancePercent', label: 'MVT Impedance', type: 'number', required: true, unit: '%', placeholder: '8' },
        ]
      },
      {
        title: 'MV Cables',
        fields: [
          { key: 'mvCableInsulationSpec', label: 'MV Cable Insulation Spec', type: 'text', required: true, placeholder: '35kV TR-XLPE 105°C 100% insulation level' },
          { key: 'mvCableSize1', label: 'MV Cable Size Option 1', type: 'text', required: true, placeholder: '500 KCMil Al conductor, 1/2 Cu concentric neutral' },
          { key: 'mvCableSize2', label: 'MV Cable Size Option 2', type: 'text', required: true, placeholder: '1000 KCMil Al conductor, 1/3 Cu concentric neutral' },
          { key: 'mvTrenchGroundConductor', label: 'Bare Copper Conductor Along MV Trench', type: 'text', required: true, placeholder: '3/0 AWG' },
        ]
      },
      {
        title: 'Grounding Conductors',
        fields: [
          { key: 'groundingMatConductor', label: 'Grounding Mat Conductor', type: 'text', required: true, placeholder: '4/0 AWG' },
          { key: 'groundConductorBess', label: 'BESS Enclosure Ground Conductor', type: 'text', required: true, placeholder: '500 KCMil Bare Stranded Cu' },
          { key: 'groundConductorPcs', label: 'PCS Skid Ground Conductor', type: 'text', required: true, placeholder: '600 KCMil Bare Stranded Cu' },
          { key: 'groundConductorAuxXfmr', label: 'Auxiliary Transformer & Panel Board Ground Conductor', type: 'text', required: true, placeholder: '4/0 AWG Bare Stranded Cu' },
          { key: 'groundConductorGenerator', label: 'Generator Ground Conductor', type: 'text', required: true, placeholder: '#3 AWG Bare Stranded Cu' },
          { key: 'groundConductorMisc', label: 'Misc. Equipment Ground Conductor', type: 'text', required: true, placeholder: '#6 AWG Bare Stranded Cu' },
        ]
      }
    ]
  },

  // ─── WINIGS MODEL INPUTS ────────────────────────────────────────────────────
  {
    id: 'winigsInputs',
    name: 'WinIGS Model Inputs',
    icon: 'cpu',
    blurb: 'Software version and modeling basis for the electrical network and soil resistivity data.',
    fields: [
      { key: 'winigsSoftwareVendor', label: 'Software Vendor', type: 'text', required: true, placeholder: 'Advanced Grounding Concepts' },
      { key: 'winigsSoftwareVersion', label: 'WinIGS Software Version', type: 'text', required: true, placeholder: '8.3.6' },
      { key: 'inverterLvVoltage', label: 'Inverter Output Voltage (LV Side)', type: 'number', required: true, unit: 'kV', placeholder: '0.69' },
      { key: 'stepUpTransformerConfig', label: 'Step-Up Transformer Configuration', type: 'text', required: true, placeholder: 'Delta on MV side, Wye on LV side' },
      { key: 'mptWindingConfig', label: 'MPT Winding Configuration', type: 'text', required: true, placeholder: '3-winding Wye-Wye-Delta' },
      { key: 'mptBaseMva', label: 'MPT Modeling Base', type: 'number', required: true, unit: 'MVA', placeholder: '138' },
      { key: 'soilResistivityVendor', label: 'Soil Resistivity Testing Company', type: 'text', required: true, placeholder: 'ADVITECH Engineering Group' },
      { key: 'soilResistivityReportDate', label: 'Soil Resistivity Report Date', type: 'text', required: true },
      { key: 'soilTestMethod', label: 'Soil Test Method / Standard', type: 'text', required: true, placeholder: 'Wenner 4-Electrode Method per IEEE Std 81 and ASTM G57' },
      { key: 'soilProbeSpacingMin', label: 'Probe Spacing – Minimum', type: 'text', required: true, placeholder: '0.5 ft' },
      { key: 'soilProbeSpacingMax', label: 'Probe Spacing – Maximum', type: 'text', required: true, placeholder: '150 ft' },
      { key: 'soilTestLocationCount', label: 'No. of Transecting Measurement Locations', type: 'number', required: true, placeholder: '2' },
    ],
    uploads: [
      { key: 'figInverterSource', label: 'Figure 1: Inverter Equivalent Source', hint: 'Image · WinIGS inverter/PCS circuit model', required: false },
      { key: 'figMvTransformer', label: 'Figure 2: MV Transformer (MVT) Model', hint: 'Image · WinIGS MVT model', required: false },
      { key: 'figMainPowerTransformer', label: 'Figure 3: Main Power Transformer (MPT) Model', hint: 'Image · WinIGS MPT model', required: false },
      { key: 'figGenTieOhtl', label: 'Figure 4: 138kV Gen-Tie OHTL Model', hint: 'Image · WinIGS OHTL model', required: false },
      { key: 'figPoiSource', label: 'Figure 5: POI Equivalent Source', hint: 'Image · WinIGS POI source model', required: false },
    ]
  },

  // ─── GROUNDING SYSTEM ───────────────────────────────────────────────────────
  {
    id: 'groundingSystem',
    name: 'Grounding System',
    icon: 'anchor',
    blurb: 'Battery/PCS grounding connection details and earth conductor sizing basis.',
    fields: [
      { key: 'concentricNeutralBondingDepth', label: 'Concentric Neutral Bonding Depth', type: 'text', required: true, placeholder: '30 inches' },
      { key: 'groundRodSpec', label: 'Ground Rod Specification', type: 'text', required: true, placeholder: '3/4" x 10\' copper-clad steel' },
      { key: 'earthConductorRefEquation', label: 'Earth Conductor Sizing Reference', type: 'text', required: false, placeholder: 'IEEE 80, Eq. 37' },
    ],
    uploads: [
      { key: 'figGroundingLayout', label: 'Figure 6: Grounding Layout', hint: 'Image · Grounding layout drawing', required: false },
    ]
  },

  // ─── ANALYSIS ───────────────────────────────────────────────────────────────
  {
    id: 'analysis',
    name: 'Analysis',
    icon: 'activity',
    blurb: 'System network model, geometric ground model, and soil model used in the study.',
    fields: [
      { key: 'groundReferenceNodeLocation', label: 'Ground Reference Node Location', type: 'text', required: false, placeholder: 'Each PCS Skid connecting to the substation' },
      { key: 'substationGroundingScopeNote', label: 'Substation Grounding Scope Note', type: 'textarea', required: false },
    ],
    uploads: [
      { key: 'figNetworkModel', label: 'Figure 7: Electrical System Network Model', hint: 'Image · Overall network model', required: false },
      { key: 'figMvtSkidModel', label: 'Figure 8: Typical MVT Skid Network Model', hint: 'Image · MVT skid network model', required: false },
      { key: 'figGeometricGroundModel', label: 'Figure 9: Geometric Ground Model', hint: 'Image · Geometric grounding model', required: false },
      { key: 'figSoilModelFit', label: 'Figure 10: Soil Model Dynamic Fit Report', hint: 'Image · Soil resistivity model fit', required: false },
      { key: 'figSoilModelParams', label: 'Figure 11: 2-Layer Soil Model & Parameters', hint: 'Image · Resulting soil model parameters', required: false },
    ]
  },

  // ─── RESULTS AND CONCLUSION ─────────────────────────────────────────────────
  {
    id: 'results',
    name: 'Results and Conclusion',
    icon: 'check-circle',
    blurb: 'Safety criteria, GPR results, and step/touch voltage contour findings.',
    fields: [
      { key: 'safetyBodyWeightKg', label: 'Safety Criteria Body Weight', type: 'number', required: true, unit: 'kg', placeholder: '50' },
      { key: 'safetyShockDurationSec', label: 'Touch/Shock Duration', type: 'number', required: true, unit: 'sec', placeholder: '0.5' },
      { key: 'conclusionText', label: 'Results Conclusion Summary', type: 'textarea', required: true },
    ],
    uploads: [
      { key: 'figGpr', label: 'Figure 12: Ground Potential Rise (GPR)', hint: 'Image · GPR calculation results', required: false },
      { key: 'figSafetyCriteria', label: 'Figure 13: Safety Criteria', hint: 'Image · IEEE 80 safety criteria chart', required: false },
      { key: 'figTouchVoltage2D', label: 'Figure 14: Touch Voltage Contours – 2D', hint: 'Image · Touch voltage 2D plot', required: false },
      { key: 'figTouchVoltage3D', label: 'Figure 15: Touch Voltage Contours – 3D', hint: 'Image · Touch voltage 3D plot', required: false },
      { key: 'figStepVoltage2D', label: 'Figure 16: Step Voltage Contours – 2D', hint: 'Image · Step voltage 2D plot', required: false },
      { key: 'figStepVoltage3D', label: 'Figure 17: Step Voltage Contours – 3D', hint: 'Image · Step voltage 3D plot', required: false },
    ]
  },

  // ─── APPENDICES & UPLOADS ───────────────────────────────────────────────────
  {
    id: 'uploads',
    name: 'Appendices & Uploads',
    icon: 'paperclip',
    blurb: 'Attach the supporting drawings and datasheets referenced in the appendices.',
    uploads: [
      { key: 'appendixAGroundingPlan', label: 'Appendix A: BESS Grounding Plan', hint: 'PDF/DWG · Grounding plan drawing', required: false },
      { key: 'appendixBSubstationOneLine', label: 'Appendix B: Substation One Line Diagram', hint: 'PDF/DWG · Substation SLD', required: false },
      { key: 'appendixCAcOneLine', label: 'Appendix C: AC One Line Diagram', hint: 'PDF/DWG · AC SLD', required: false },
      { key: 'appendixDMvCableDatasheet', label: 'Appendix D: MV AC Power Cable', hint: 'PDF · MV cable datasheet', required: false },
      { key: 'appendixEResistivityData', label: 'Appendix E: Field Electrical Resistivity Data', hint: 'PDF · Soil resistivity field data', required: false },
      { key: 'appendixFMvtDatasheet', label: 'Appendix F: MV Transformer Datasheet', hint: 'PDF · MVT manufacturer datasheet', required: false },
    ]
  },

];
