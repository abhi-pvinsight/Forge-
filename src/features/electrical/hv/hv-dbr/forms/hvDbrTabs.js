export const SUBSTATION_DBR_TABS = [

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

  // ─── REVISION HISTORY ───────────────────────────────────────────────────────
  {
    id: 'revisionHistory',
    name: 'Revision History',
    icon: 'clock',
    blurb: 'Revision table shown on the cover page / document control page.',
    fields: [
      { key: 'revisions', label: 'Revisions', type: 'revision-table', required: false }
    ]
  },

  // ─── PROJECT / SITE DETAILS ─────────────────────────────────────────────────
  {
    id: 'siteDetails',
    name: 'Site Details',
    icon: 'map',
    blurb: 'Project identification, site conditions, and electrical design basis parameters (Table 1).',
    groups: [
      {
        title: 'Project Identification',
        fields: [
          { key: 'projectName', label: 'Project Name', type: 'text', required: true, placeholder: 'Kitt Solar' },
          { key: 'state', label: 'State', type: 'text', required: true },
          { key: 'county', label: 'County', type: 'text', required: true },
          { key: 'coordinates', label: 'Geographical Coordinates', type: 'text', required: true },
        ]
      },
      {
        title: 'Voltage & Capacity',
        fields: [
          { key: 'poiVoltage', label: 'POI Voltage', type: 'number', required: true, unit: 'kV', placeholder: '69' },
          { key: 'mvVoltage', label: 'MV Collection Voltage', type: 'number', required: true, unit: 'kV', placeholder: '34.5' },
          { key: 'fenceArea', label: 'Fenced Substation Area', type: 'number', required: true, unit: 'Acres' },
          { key: 'acCapacityMW', label: 'AC Capacity @ POI', type: 'number', required: true, unit: 'MWac' },
        ]
      },
      {
        title: 'Site Environmental Conditions',
        fields: [
          { key: 'meanExtremeHighTemp', label: 'Mean Extreme High Temperature', type: 'number', required: true, unit: '°C' },
          { key: 'avgAnnualTemp', label: 'Average Annual Temperature', type: 'number', required: true, unit: '°C' },
          { key: 'extremeHighTemp', label: 'Extreme High Temperature', type: 'number', required: true, unit: '°C' },
          { key: 'extremeLowTemp', label: 'Extreme Low Temperature', type: 'number', required: true, unit: '°C' },
          { key: 'altitude', label: 'Altitude', type: 'number', required: true, unit: 'Feet' },
          { key: 'designWindSpeed', label: 'Design Wind Speed', type: 'number', required: true, unit: 'mph' },
          { key: 'riskCategory', label: 'Risk Category', type: 'text', required: true, placeholder: 'CAT-III' },
          { key: 'designSnowLoad', label: 'Design Ground Snow Load (ASCE Report)', type: 'number', required: true, unit: 'psf' },
        ]
      },
      {
        title: 'Electrical Design Basis',
        fields: [
          { key: 'voltageClass', label: 'Voltage Class', type: 'text', required: true, placeholder: '69/34.5 kV' },
          { key: 'bilRating', label: 'BIL', type: 'text', required: true, placeholder: '350/200 kV' },
          { key: 'continuousCurrentRating', label: 'Continuous Current Rating', type: 'text', required: true, placeholder: '3000/3000 A' },
          { key: 'faultLevel69kV', label: 'Short Circuit Rating @ 69 kV', type: 'number', required: true, unit: 'kA', placeholder: '40' },
          { key: 'faultLevel34_5kV', label: 'Short Circuit Rating @ 34.5 kV', type: 'number', required: true, unit: 'kA', placeholder: '31.5' },
          { key: 'systemFrequency', label: 'System Frequency', type: 'number', required: true, unit: 'Hz', placeholder: '60' },
          { key: 'skinEffectCoefficient', label: 'Skin Effect Coefficient', type: 'number', required: true, placeholder: '1' },
          { key: 'emissivityCoefficient', label: 'Emissivity Coefficient of Conductor Surface', type: 'number', required: true, placeholder: '0.5' },
          { key: 'conductorConductivityPercent', label: 'Conductivity of Aluminum Alloy 6063 T6', type: 'number', required: true, unit: '% IACS', placeholder: '53' },
          { key: 'groundFlashDensity', label: 'Ground Flash Density', type: 'number', required: true, placeholder: '4' },
          { key: 'conductorIrregularityFactor', label: 'Conductor Irregularity Factor', type: 'number', required: true, placeholder: '0.85' },
          { key: 'empiricalConstantEo', label: 'Empirical Constant (E0)', type: 'text', required: true, unit: 'kV/cm', placeholder: '21.1' },
          { key: 'windConductorAngle', label: 'Final Wind to Conductor Angle', type: 'number', required: true, unit: 'deg', placeholder: '90' },
          { key: 'altitudeCorrectionFactor', label: 'Altitude Correction Factor', type: 'number', required: true, placeholder: '1' },
        ]
      }
    ]
  },

  // ─── PROJECT ELECTRICAL SCHEME ──────────────────────────────────────────────
  {
    id: 'electricalScheme',
    name: 'Project Electrical Scheme',
    icon: 'zap',
    blurb: 'Bus arrangement and backup power scheme for the substation.',
    fields: [
      { key: 'busbarScheme', label: 'Bus Bar Scheme', type: 'text', required: true, placeholder: 'Single Busbar Scheme' },
      { key: 'numOfHvBreakers', label: 'No. of HV (69kV) Circuit Breakers', type: 'number', required: true, placeholder: '1' },
      { key: 'numOfMvBreakers', label: 'No. of MV (34.5kV) Circuit Breakers', type: 'number', required: true, placeholder: '5' },
      { key: 'backupPowerSource', label: 'Backup Power Source', type: 'text', required: true, placeholder: 'Backup generator or local utility via ATS' },
    ]
  },

  // ─── CLEARANCES ─────────────────────────────────────────────────────────────
  {
    id: 'clearances',
    name: 'Clearances',
    icon: 'ruler',
    blurb: 'Electrical clearance requirements for the HV and MV voltage levels (Tables 2 & 3).',
    groups: [
      {
        title: '69 kV Clearances (350 kV BIL)',
        fields: [
          { key: 'hvPhaseToPhase', label: 'Phase to Phase Distance', type: 'text', required: true, placeholder: "MIN 5'-0\"" },
          { key: 'hvMetalToMetal', label: 'Metal to Metal', type: 'text', required: true, placeholder: "MIN. 2'-7\"" },
          { key: 'hvPhaseToGround', label: 'Phase to Ground', type: 'text', required: true, placeholder: "MIN. 2'-5\"" },
          { key: 'hvVerticalClearance', label: 'Vertical Clearance to Live Part', type: 'text', required: true, placeholder: "11'-0\"" },
          { key: 'hvHorizontalClearance', label: 'Horizontal Clearance to Live Part', type: 'text', required: true, placeholder: "4'-11\"" },
          { key: 'hvFenceClearance', label: 'Horizontal Clearance from Fence to Live Part', type: 'text', required: true, placeholder: "11'-7\"" },
        ]
      },
      {
        title: '34.5 kV Clearances (200 kV BIL)',
        fields: [
          { key: 'mvPhaseToPhase', label: 'Phase to Phase Distance', type: 'text', required: true, placeholder: "MIN. 3'-0\"" },
          { key: 'mvMetalToMetal', label: 'Metal to Metal', type: 'text', required: true, placeholder: "MIN. 1'-6\"" },
          { key: 'mvPhaseToGround', label: 'Phase to Ground', type: 'text', required: true, placeholder: "MIN. 1'-3\"" },
          { key: 'mvVerticalClearance', label: 'Vertical Clearance to Live Part', type: 'text', required: true, placeholder: "10'-0\"" },
          { key: 'mvHorizontalClearance', label: 'Horizontal Clearance to Live Part', type: 'text', required: true, placeholder: "4'-0\"" },
          { key: 'mvFenceClearance', label: 'Horizontal Clearance from Fence to Live Part', type: 'text', required: true, placeholder: "10'-7\"" },
        ]
      }
    ]
  },

  // ─── FAULT LEVELS ───────────────────────────────────────────────────────────
  {
    id: 'faultLevels',
    name: 'Fault Levels',
    icon: 'alert-triangle',
    blurb: 'Fault levels considered for design calculations (Table 4).',
    fields: [
      { key: 'faultLevel69kVRemarks', label: '69 kV Fault Level Remarks', type: 'text', required: true, placeholder: 'Utility Fault Level Assumed' },
      { key: 'faultLevel34_5kVRemarks', label: '34.5 kV Fault Level Remarks', type: 'textarea', required: true, placeholder: '34.5 kV fault level calculated per MPT size and plant AC capacity' },
      { key: 'mptSizeForFaultCalc', label: 'MPT Size Used for Fault Calc', type: 'text', required: false, placeholder: '120 MVA' },
    ]
  },

  // ─── MAJOR EQUIPMENT (BOM) ──────────────────────────────────────────────────
  {
    id: 'majorEquipment',
    name: 'Major Equipment',
    icon: 'box',
    blurb: 'Bill of material for major long-lead apparatus (Table 5). Row count and content vary by project.',
    fields: [
      { key: 'majorApparatusTable', label: 'Major Apparatus Table (Description / Manufacturer)', type: 'table', required: true },
      { key: 'bomNote', label: 'BOM Scope Note', type: 'text', required: false, placeholder: 'Bill of Material listed is for long lead items only and applicable only for the scope listed.' },
    ]
  },

  // ─── CONDUCTORS, BUS & INSULATORS ───────────────────────────────────────────
  {
    id: 'conductorsAndBus',
    name: 'Conductors, Bus & Insulators',
    icon: 'git-branch',
    blurb: 'Selected flexible conductors, pipe bus, damping cables, and post insulators (Tables 6–9).',
    groups: [
      {
        title: 'Flexible Conductors (Table 6)',
        fields: [
          { key: 'hvJumperConductor', label: 'All 69 kV Jumpers', type: 'text', required: true, placeholder: '(2) 1590 KCMIL AAC COREOPSIS' },
          { key: 'mainBusJumperConductor', label: 'T1 Main Bus Jumpers', type: 'text', required: true, placeholder: '(3) 1590 KCMIL AAC COREOPSIS' },
          { key: 'mvMainBusJumperConductor', label: '34.5 kV Main Bus Jumpers', type: 'text', required: true, placeholder: '(3) 1590 KCMIL AAC COREOPSIS' },
          { key: 'feederBreakerJumperConductor', label: '34.5 kV Feeder Breaker Jumpers', type: 'text', required: true, placeholder: '(2) 795 KCMIL AAC LILAC' },
          { key: 'feederJumperConductor', label: '34.5 kV Feeder Jumpers', type: 'text', required: true, placeholder: '(1) 795 KCMIL AAC LILAC' },
          { key: 'sstVtJumperConductor', label: '34.5 kV SST & VT Jumpers', type: 'text', required: true, placeholder: '(1) 4/0 AAC OXLIP' },
          { key: 'dampingConductor5in', label: 'Damping Conductors for 5" Pipe Bus', type: 'text', required: true, placeholder: '(1) 795 KCMIL AAC ARBUTUS' },
          { key: 'dampingConductor2_5in', label: 'Damping Conductors for 2.5" Pipe Bus', type: 'text', required: true, placeholder: '(1) 266.8 KCMIL AAC LAUREL' },
        ]
      },
      {
        title: 'Pipe Bus (Table 7)',
        fields: [
          { key: 'hvBusPipeSize', label: 'All 69 kV Bus', type: 'text', required: true, placeholder: '5" SCH 40, 6063-T6' },
          { key: 'mvMainBusPipeSize', label: '34.5 kV Main Bus', type: 'text', required: true, placeholder: '5" SCH 40, 6063-T6' },
          { key: 'mvFeederBusPipeSize', label: '34.5 kV Feeder Bus', type: 'text', required: true, placeholder: '2.5" SCH 40, 6063-T6' },
        ]
      },
      {
        title: 'Damping Cables (Table 8)',
        fields: [
          { key: 'dampingCable5inTube', label: 'For 5" Al 6063 Tube', type: 'text', required: true, placeholder: '(1) 795 KCMIL AAC ARBUTUS' },
          { key: 'dampingCable2_5inTube', label: 'For 2.5" Al Tube', type: 'text', required: true, placeholder: '(1) 266.8 KCMIL AAC LAUREL' },
        ]
      },
      {
        title: 'Station Post Insulators (Table 9)',
        fields: [
          { key: 'hvPostInsulator', label: '69 kV Post Insulator Selected', type: 'text', required: true, placeholder: 'TR-216' },
          { key: 'mvPostInsulator', label: '34.5 kV Post Insulator Selected', type: 'text', required: true, placeholder: 'TR-210' },
          { key: 'insulatorContaminationLevel', label: 'Contamination Level', type: 'text', required: false, placeholder: 'Light' },
          { key: 'insulatorMaxCantileverPercent', label: 'Max Cantilever Loading', type: 'text', required: false, placeholder: '95%' },
        ]
      }
    ]
  },

  // ─── SUBSTATION DESIGN DETAILS ──────────────────────────────────────────────
  {
    id: 'substationDesign',
    name: 'Substation Design Details',
    icon: 'layout',
    blurb: 'Control enclosure, bus fittings, grounding, conduit, illumination, and lightning protection.',
    groups: [
      {
        title: 'Control Enclosure & Bus Fittings',
        fields: [
          { key: 'controlEnclosureSize', label: 'Control Enclosure Size', type: 'text', required: false, placeholder: "40' x 14'" },
          { key: 'busExpansionJointSpanLimit', label: 'Expansion Joint Required Beyond Span', type: 'text', required: false, placeholder: '40 feet' },
        ]
      },
      {
        title: 'Grounding',
        fields: [
          { key: 'groundGridConductor', label: 'Ground Grid Conductor', type: 'text', required: true, placeholder: 'Bare #4/0 soft drawn copper' },
          { key: 'groundRodSpec', label: 'Ground Rod Specification', type: 'text', required: true, placeholder: '3/4" diameter, 8 feet length, Copper Clad Steel' },
          { key: 'groundGridResistanceLimit', label: 'Ground Grid Resistance Limit', type: 'text', required: true, placeholder: '< 1 Ohm' },
          { key: 'groundingSoftware', label: 'Grounding Analysis Software', type: 'text', required: true, placeholder: 'WinIGS' },
          { key: 'groundingStandard', label: 'Grounding Standard', type: 'text', required: true, placeholder: 'IEEE Std. 80-2013' },
          { key: 'groundingSafetyMarginPercent', label: 'Safety Margin (Step/Touch vs. IEEE 80)', type: 'number', required: true, unit: '%', placeholder: '20' },
          { key: 'surfaceLayerDepth', label: 'Surface Layer Resistivity Depth', type: 'text', required: true, placeholder: '4-6 inches' },
          { key: 'surfaceRockResistivity', label: 'Surface Rock Resistivity', type: 'text', required: true, placeholder: '3000 ohm-meter' },
          { key: 'groundGridExtension', label: 'Ground Grid Extension Beyond Substation Limits', type: 'text', required: true, placeholder: '3 feet' },
        ]
      },
      {
        title: 'Illumination Design (Table 10)',
        fields: [
          { key: 'illuminationSoftware', label: 'Illumination Design Software', type: 'text', required: true, placeholder: 'Visual 2020 Professional' },
          { key: 'illumGeneralExteriorFc', label: 'General Exterior Horizontal/Vertical', type: 'number', required: true, unit: 'FC', placeholder: '2' },
          { key: 'illumRemoteAreasFc', label: 'Remote Areas', type: 'number', required: true, unit: 'FC', placeholder: '0.5' },
          { key: 'illumControlBuildingDoorsFc', label: 'Control Building Doors Inside Yard', type: 'number', required: true, unit: 'FC', placeholder: '5' },
        ]
      },
      {
        title: 'Lightning Protection',
        fields: [
          { key: 'lightningStandard', label: 'Lightning Protection Standard', type: 'text', required: true, placeholder: 'IEEE 998' },
          { key: 'rollingSphereStationRadius', label: 'Rolling Sphere Radius – Station (69kV/34.5kV side)', type: 'number', required: true, unit: 'ft', placeholder: '100' },
          { key: 'rollingSphereControlRadius', label: 'Rolling Sphere Radius – Control Enclosure', type: 'number', required: true, unit: 'ft', placeholder: '125' },
        ]
      }
    ]
  },

  // ─── PROTECTION & CONTROL ───────────────────────────────────────────────────
  {
    id: 'protectionControl',
    name: 'Protection & Control',
    icon: 'shield',
    blurb: 'AC/DC station service systems and protection relay scheme details.',
    groups: [
      {
        title: 'AC & DC System',
        fields: [
          { key: 'sstRatingKva', label: 'Station Service Transformer Rating', type: 'number', required: true, unit: 'kVA', placeholder: '100' },
          { key: 'sstPhaseConfig', label: 'SST Configuration', type: 'text', required: true, placeholder: 'Single Phase' },
          { key: 'atsDistributionVoltage', label: 'ATS Distribution Panel Voltage', type: 'text', required: true, placeholder: '120/240VAC Single-Phase' },
          { key: 'fuseSizingPercent', label: 'Station Transformer Fuse Sizing', type: 'number', required: true, unit: '% of load current', placeholder: '300' },
          { key: 'dcSystemVoltage', label: 'DC System Voltage', type: 'number', required: true, unit: 'V', placeholder: '125' },
          { key: 'batteryRechargeHours', label: 'Battery Recharge Time', type: 'number', required: true, unit: 'hours', placeholder: '12' },
          { key: 'batteryLoadCycleHours', label: 'Battery Load Cycle Duration', type: 'number', required: true, unit: 'hours', placeholder: '8' },
        ]
      },
      {
        title: 'Protection Scheme Overview',
        fields: [
          { key: 'numOutgoingHvLines', label: 'No. of Outgoing HV Lines to POI', type: 'number', required: true, placeholder: '1' },
          { key: 'hvBreakerTag', label: 'HV Breaker Tag', type: 'text', required: true, placeholder: '52-T1' },
          { key: 'numMvFeederBreakers', label: 'No. of MV Feeder Breakers', type: 'number', required: true, placeholder: '5' },
          { key: 'numIncomingFeeders', label: 'No. of Incoming Feeders from Collection System', type: 'number', required: true, placeholder: '9' },
        ]
      },
      {
        title: 'Line & Breaker Protection Relays',
        fields: [
          { key: 'linePrimaryRelayModel', label: 'Line Primary Protection Relay (87L-M)', type: 'text', required: true, placeholder: 'SEL-311L' },
          { key: 'linePrimaryRelayPartNo', label: 'Line Primary Relay Part No.', type: 'text', required: false },
          { key: 'lineBackupRelayModel', label: 'Line Backup Protection Relay (87L-B)', type: 'text', required: true, placeholder: 'SEL-411L' },
          { key: 'hvBreakerRelayModel', label: '69kV Breaker Protection Relay', type: 'text', required: true, placeholder: 'SEL-351S' },
          { key: 'hvBreakerRelayPartNo', label: '69kV Breaker Relay Part No.', type: 'text', required: false },
          { key: 'hvBreakerTagFull', label: '69kV Breaker Tag (Full)', type: 'text', required: false, placeholder: '52-T12' },
        ]
      },
      {
        title: 'Transformer, Bus & Feeder Protection Relays',
        fields: [
          { key: 'transformerMainRelayModel', label: 'Transformer Main Protection Relay', type: 'text', required: true, placeholder: 'SEL-487E' },
          { key: 'transformerMainRelayPartNo', label: 'Transformer Main Relay Part No.', type: 'text', required: false },
          { key: 'transformerBackupRelayModel', label: 'Transformer Backup Protection Relay', type: 'text', required: true, placeholder: 'SEL-787' },
          { key: 'transformerBackupRelayPartNo', label: 'Transformer Backup Relay Part No.', type: 'text', required: false },
          { key: 'busRelayModel', label: 'MV Bus Differential Relay', type: 'text', required: true, placeholder: 'SEL-587Z' },
          { key: 'busRelayPartNo', label: 'MV Bus Relay Part No.', type: 'text', required: false },
          { key: 'feederRelayModel', label: 'Feeder Protection Relay', type: 'text', required: true, placeholder: 'SEL-351S' },
          { key: 'feederRelayPartNo', label: 'Feeder Relay Part No.', type: 'text', required: false },
        ]
      },
      {
        title: 'Metering & Panels',
        fields: [
          { key: 'meterModel1', label: 'Revenue Meter Model 1', type: 'text', required: true, placeholder: 'SEL-735' },
          { key: 'meterModel1PartNo', label: 'Meter Model 1 Part No.', type: 'text', required: false },
          { key: 'meterModel2', label: 'Revenue Meter Model 2 (CAISO)', type: 'text', required: false, placeholder: 'ION 8650' },
          { key: 'terminalBlockModel', label: 'Terminal Block Model', type: 'text', required: true, placeholder: 'GE type EB25B12 600V 30A' },
          { key: 'ctShortingBlockModel', label: 'CT Shorting Block Model', type: 'text', required: true, placeholder: 'GE type EB27B04S' },
          { key: 'panelListText', label: 'Relay/Control Panel List', type: 'textarea', required: true, placeholder: 'Panel 1: Communications & SCADA; Panel 2: 69kV Line Protection; ...' },
        ]
      },
      {
        title: 'SCADA',
        fields: [
          { key: 'scadaMasterController', label: 'Solar/BESS Master Controller', type: 'text', required: true, placeholder: 'Master PPC' },
          { key: 'scadaSubstationController', label: 'Substation Controller', type: 'text', required: true, placeholder: 'SEL RTAC' },
          { key: 'relayEventDataDestination', label: 'Relay Event Data Destination', type: 'text', required: false, placeholder: 'Dallas' },
        ]
      }
    ]
  },

  // ─── ELECTRICAL CALCULATIONS ────────────────────────────────────────────────
  {
    id: 'electricalCalculations',
    name: 'Electrical Calculations',
    icon: 'calculator',
    blurb: 'AC/DC load calculation assumptions, battery design parameters, and conductor/bus sizing results.',
    groups: [
      {
        title: 'AC Load Calculation Assumptions',
        fields: [
          { key: 'necEditionForAcLoad', label: 'NEC Edition Referenced', type: 'text', required: true, placeholder: '2020' },
          { key: 'lightsOnPercent', label: 'Lights Assumed On', type: 'number', required: true, unit: '%', placeholder: '10' },
          { key: 'heatersOnPercent', label: 'Heaters Assumed Energized', type: 'number', required: true, unit: '%', placeholder: '90' },
          { key: 'atsRatingA', label: 'ATS Rating', type: 'text', required: true, placeholder: '600A' },
        ]
      },
      {
        title: 'DC Load / Battery Design Parameters (Table 11)',
        fields: [
          { key: 'batteryNominalVoltage', label: 'Nominal Battery Voltage', type: 'number', required: true, unit: 'V', placeholder: '125' },
          { key: 'batteryMaxSystemVoltage', label: 'Maximum System Voltage', type: 'number', required: true, unit: 'V', placeholder: '140' },
          { key: 'batteryMinSystemVoltage', label: 'Minimum System Voltage', type: 'number', required: true, unit: 'V', placeholder: '105' },
          { key: 'batteryNumCells', label: 'Number of Cells', type: 'number', required: true, placeholder: '60' },
          { key: 'batteryMinCellVoltage', label: 'Minimum Cell Voltage', type: 'number', required: true, unit: 'V', placeholder: '1.75' },
          { key: 'batteryLowestElectrolyteTemp', label: 'Lowest Electrolyte Temperature', type: 'number', required: true, unit: '°F', placeholder: '50' },
          { key: 'batteryTempCorrectionFactor', label: 'Temperature Correction Factor', type: 'number', required: true, placeholder: '1.19' },
          { key: 'batteryDesignMargin', label: 'Design Margin', type: 'number', required: true, placeholder: '1.1' },
          { key: 'batteryAgingFactor', label: 'Aging Factor', type: 'number', required: true, placeholder: '1.25' },
          { key: 'chargerRechargeTimeHr', label: 'Charger Recharge Time', type: 'number', required: true, unit: 'hr', placeholder: '12' },
          { key: 'chargerEfficiency', label: 'Charger Efficiency', type: 'number', required: true, placeholder: '1.25' },
          { key: 'chargerAltitudeCorrectionFactor', label: 'Charger Altitude Correction Factor', type: 'number', required: true, placeholder: '1' },
          { key: 'chargerTempCorrectionFactor', label: 'Charger Temperature Correction Factor', type: 'number', required: true, placeholder: '1.19' },
          { key: 'chargerEqualizeVoltage', label: 'Equalize Voltage', type: 'number', required: true, unit: 'V/cell', placeholder: '2.33' },
          { key: 'chargerFloatVoltage', label: 'Float Voltage', type: 'number', required: true, unit: 'V/cell', placeholder: '2.25' },
        ]
      },
      {
        title: 'Aluminum Tube Sizing (Table 12)',
        fields: [
          { key: 'hvBusRequiredContinuousA', label: '69kV Bus – Required Continuous Current', type: 'number', required: true, unit: 'A' },
          { key: 'hvBusSelectedContinuousA', label: '69kV Bus – Selected Tube Continuous Current', type: 'number', required: true, unit: 'A' },
          { key: 'hvBusRequiredScA', label: '69kV Bus – Required Short Circuit Rating', type: 'number', required: true, unit: 'kA' },
          { key: 'hvBusSelectedScA', label: '69kV Bus – Selected Tube Short Circuit Rating', type: 'number', required: true, unit: 'kA' },
          { key: 'mvBusRequiredContinuousA', label: '34.5kV Busbar – Required Continuous Current', type: 'number', required: true, unit: 'A' },
          { key: 'mvBusSelectedContinuousA', label: '34.5kV Busbar – Selected Tube Continuous Current', type: 'number', required: true, unit: 'A' },
          { key: 'mvBusRequiredScA', label: '34.5kV Busbar – Required Short Circuit Rating', type: 'number', required: true, unit: 'kA' },
          { key: 'mvBusSelectedScA', label: '34.5kV Busbar – Selected Tube Short Circuit Rating', type: 'number', required: true, unit: 'kA' },
          { key: 'mvEquipBusRequiredContinuousA', label: '34.5kV Equipment Bus – Required Continuous Current', type: 'number', required: true, unit: 'A' },
          { key: 'mvEquipBusSelectedContinuousA', label: '34.5kV Equipment Bus – Selected Tube Continuous Current', type: 'number', required: true, unit: 'A' },
          { key: 'mvEquipBusRequiredScA', label: '34.5kV Equipment Bus – Required Short Circuit Rating', type: 'number', required: true, unit: 'kA' },
          { key: 'mvEquipBusSelectedScA', label: '34.5kV Equipment Bus – Selected Tube Short Circuit Rating', type: 'number', required: true, unit: 'kA' },
          { key: 'maxBusDeflectionIn', label: 'Max Bus Deflection', type: 'number', required: false, unit: 'in', placeholder: '1' },
        ]
      },
      {
        title: 'Flexible Conductor Ampacity (Table 13)',
        fields: [
          { key: 'hvJumperRequiredA', label: '69kV Jumpers – Required Current', type: 'number', required: true, unit: 'A' },
          { key: 'hvJumper125PctFlaA', label: '69kV Jumpers – 125% of FLA', type: 'number', required: true, unit: 'A' },
          { key: 'hvJumperSelectedA', label: '69kV Jumpers – Selected Conductor Rating', type: 'number', required: true, unit: 'A' },
          { key: 'hvJumperMvaBase', label: '69kV Jumpers – MVA Base', type: 'number', required: false, unit: 'MVA', placeholder: '120' },
          { key: 'mvMainBusJumperRequiredA', label: '34.5kV Main Bus Jumpers – Required Current', type: 'number', required: true, unit: 'A' },
          { key: 'mvMainBusJumper125PctFlaA', label: '34.5kV Main Bus Jumpers – 125% of FLA', type: 'number', required: true, unit: 'A' },
          { key: 'mvMainBusJumperSelectedA', label: '34.5kV Main Bus Jumpers – Selected Conductor Rating', type: 'number', required: true, unit: 'A' },
          { key: 'mvFeederJumperRequiredA', label: '34.5kV Feeder Jumpers – Required Current', type: 'number', required: true, unit: 'A' },
          { key: 'mvFeederJumper125PctFlaA', label: '34.5kV Feeder Jumpers – 125% of FLA', type: 'number', required: true, unit: 'A' },
          { key: 'mvFeederJumperSelectedA', label: '34.5kV Feeder Jumpers – Selected Conductor Rating', type: 'number', required: true, unit: 'A' },
          { key: 'mvFeederJumperMvaBase', label: '34.5kV Feeder Jumpers – MVA Base', type: 'number', required: false, unit: 'MVA', placeholder: '30' },
        ]
      }
    ]
  },

  // ─── DOCUMENTATION & STUDIES ────────────────────────────────────────────────
  {
    id: 'documentationAndStudies',
    name: 'Documentation & Studies',
    icon: 'clipboard',
    blurb: 'MDL reference and the list of studies to be performed for the project.',
    fields: [
      { key: 'mdlListName', label: 'MDL List Reference', type: 'text', required: false, placeholder: 'Kitt Solar MDL list' },
      { key: 'studiesList', label: 'Studies List', type: 'textarea', required: true, placeholder: 'Short Circuit Analysis; Reactive Power Study; Insulation Coordination Study; Grounding Study Report; Protection Coordination and Relay Settings Study; Ampacity Study; Substation Illumination Study; Substation Lightning Protection' },
    ]
  },

  // ─── DATASHEETS & DRAWINGS ──────────────────────────────────────────────────
  {
    id: 'uploads',
    name: 'Datasheets & Drawings',
    icon: 'paperclip',
    blurb: 'Attach the single line diagram, trip matrix, and equipment datasheets referenced in this report.',
    uploads: [
      { key: 'sldDrawing', label: 'Single Line Diagram', hint: 'PDF/DWG · Substation SLD', required: false },
      { key: 'relayListTripMatrix', label: 'Relay List & Trip Matrix', hint: 'PDF/XLS · e.g. HD-03.5 Relay List & Trip Matrix', required: false },
      { key: 'transformerDatasheet', label: 'Main Power Transformer Datasheet', hint: 'PDF · MPT manufacturer datasheet', required: false },
      { key: 'breakerDatasheets', label: 'Circuit Breaker Datasheets', hint: 'PDF · HV/MV breaker datasheets', required: false },
    ]
  },

];

export const HV_DBR_TABS = SUBSTATION_DBR_TABS;
