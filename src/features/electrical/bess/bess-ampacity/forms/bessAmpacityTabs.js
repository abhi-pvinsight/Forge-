export const CABLE_AMPACITY_TABS = [

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
    blurb: 'Core project identifiers referenced throughout the report.',
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
    ]
  },

  // ─── SOIL THERMAL RESISTIVITY ──────────────────────────────────────────────
  {
    id: 'soilResistivity',
    name: 'Soil Thermal Resistivity',
    icon: 'layers',
    blurb: 'Geotechnical report reference and soil thermal resistivity values used in cable sizing.',
    groups: [
      {
        title: 'Geotechnical Report Reference',
        fields: [
          { key: 'geotechReportCompany', label: 'Geotech Report Company', type: 'text', required: true },
          { key: 'geotechReportNo', label: 'Geotech Report No.', type: 'text', required: true },
          { key: 'geotechReportDate', label: 'Geotech Report Date', type: 'text', required: true },
          { key: 'soilThermalResistivityNative', label: 'Selected Native Soil Thermal Resistivity', type: 'number', required: true, unit: '°C-cm/W' },
          { key: 'soilMoistureContent', label: 'Moisture Content at Selected Value', type: 'number', required: true, unit: '%' },
          { key: 'soilThermalResistivitySelectiveFill', label: 'Selective Fill Thermal Resistivity', type: 'number', required: false, unit: '°C-cm/W' },
          { key: 'selectiveFillDepth', label: 'Selective Fill Depth', type: 'number', required: false, unit: 'ft' },
        ]
      },
      {
        title: 'Thermal Resistivity Dry-Out Test Results (by Moisture Content)',
        fields: [
          { key: 'dryoutMoisture1Pct', label: 'Moisture 1% – Resistivity', type: 'number', required: false, unit: '°C-cm/W' },
          { key: 'dryoutMoisture2Pct', label: 'Moisture 2% – Resistivity', type: 'number', required: false, unit: '°C-cm/W' },
          { key: 'dryoutMoisture3Pct', label: 'Moisture 3% – Resistivity', type: 'number', required: false, unit: '°C-cm/W' },
          { key: 'dryoutMoisture4Pct', label: 'Moisture 4% – Resistivity', type: 'number', required: false, unit: '°C-cm/W' },
          { key: 'dryoutMoisture5Pct', label: 'Moisture 5% – Resistivity', type: 'number', required: false, unit: '°C-cm/W' },
          { key: 'dryoutTestBoreholeId', label: 'Test Borehole ID', type: 'text', required: false, placeholder: 'B-02' },
        ]
      }
    ]
  },

  // ─── AMBIENT TEMPERATURE ───────────────────────────────────────────────────
  {
    id: 'ambientTemp',
    name: 'Ambient Temperature',
    icon: 'thermometer',
    blurb: 'ASHRAE ambient temperature reference and adopted design values.',
    fields: [
      { key: 'weatherStationName', label: 'Nearest Weather Station', type: 'text', required: true, placeholder: 'Eagle Point, Texas' },
      { key: 'weatherStationWmo', label: 'WMO Station ID', type: 'text', required: false },
      { key: 'ashraeMinTemp', label: 'ASHRAE Recorded Min Temp', type: 'number', required: true, unit: '°C' },
      { key: 'ashraeMaxTemp', label: 'ASHRAE Recorded Max Temp', type: 'number', required: true, unit: '°C' },
      { key: 'designMinTemp', label: 'Adopted Design Min Temp', type: 'number', required: true, unit: '°C' },
      { key: 'designMaxTemp', label: 'Adopted Design Max Temp', type: 'number', required: true, unit: '°C' },
    ],
    uploads: [
      { key: 'ambientTempChart', label: 'Ambient Temperature Data Chart', hint: 'Image/Chart · ASHRAE ambient temperature plot', required: false },
    ]
  },

  // ─── SOIL TEMPERATURE ──────────────────────────────────────────────────────
  {
    id: 'soilTemp',
    name: 'Soil Temperature',
    icon: 'cloud-rain',
    blurb: 'Ground soil temperature data used for cable ampacity derating.',
    fields: [
      { key: 'soilTempSource', label: 'Soil Temperature Data Source', type: 'text', required: true, placeholder: 'USDA NRCS' },
      { key: 'soilTempStation', label: 'Closest Recording Station', type: 'text', required: true, placeholder: 'Beaumont, Texas' },
      { key: 'soilTempStationId', label: 'Station ID', type: 'text', required: false },
      { key: 'soilTempDepth', label: 'Recording Depth', type: 'text', required: false, placeholder: '40-inch' },
      { key: 'soilTempRecordYears', label: 'Years of Record', type: 'number', required: false },
      { key: 'soilTempMax', label: 'Highest Recorded Daily Avg Soil Temp', type: 'text', required: true, placeholder: '83°F (28.33°C)' },
      { key: 'soilTempSelected', label: 'Selected Design Soil Temperature', type: 'number', required: true, unit: '°C' },
    ],
    uploads: [
      { key: 'soilTempChart', label: 'Ground Soil Temperature Chart', hint: 'Image/Chart · Soil temperature plot', required: false },
    ]
  },

  // ─── DC CABLES ──────────────────────────────────────────────────────────────
  {
    id: 'dcCables',
    name: 'DC Cables',
    icon: 'git-branch',
    blurb: 'DC cable tray fill calculation and ampacity de-rating for BESS enclosure to PCS skid.',
    fields: [
      { key: 'dcCableTrayWidth', label: 'Cable Tray Width', type: 'number', required: true, unit: 'in', placeholder: '24' },
      { key: 'dcTrayFillAreaLimit', label: 'Allowable Tray Fill Area (NEC 392.22(B)(1))', type: 'number', required: true, unit: 'sq. in', placeholder: '26' },
      { key: 'dcCableSize', label: 'Selected DC Cable Size', type: 'text', required: true, placeholder: '600 KCMIL, AL' },
      { key: 'dcCableOuterDiameter', label: 'Cable Outer Diameter', type: 'number', required: true, unit: 'in', placeholder: '1.08' },
      { key: 'dcNoOfPositiveRuns', label: 'No. of Positive Cable Runs', type: 'number', required: true, placeholder: '6' },
      { key: 'dcNoOfNegativeRuns', label: 'No. of Negative Cable Runs', type: 'number', required: true, placeholder: '6' },
      { key: 'dcTotalFillArea', label: 'Total Cable Fill Area (Calculated)', type: 'number', required: true, unit: 'sq. in' },
      { key: 'dcAmpacityReference', label: 'Ampacity Reference', type: 'text', required: true, placeholder: 'NEC 310.17' },
      { key: 'dcAmpacityAt30C', label: 'Cable Ampacity at 30°C Ambient', type: 'number', required: true, unit: 'A' },
      { key: 'dcAmbientTemp', label: 'Design Ambient Temperature', type: 'number', required: true, unit: '°C' },
      { key: 'dcTempCorrectionRef', label: 'Ambient Temp Correction Factor Reference', type: 'text', required: true, placeholder: 'NEC 310.15(B)(1)' },
      { key: 'dcCorrectionFactorK1', label: 'Correction Factor K1 (Ambient)', type: 'number', required: true },
      { key: 'dcGroupingRef', label: 'Grouping Correction Reference', type: 'text', required: false },
      { key: 'dcCorrectionFactorK2', label: 'Correction Factor K2 (Grouping)', type: 'number', required: true },
      { key: 'dcDeRatedAmpacity', label: 'Current Carrying Capacity After Derating', type: 'number', required: true, unit: 'A' },
      { key: 'dcRequiredAmpacity', label: 'Required Current Carrying Capacity', type: 'number', required: true, unit: 'A' },
    ]
  },

  // ─── MV AC CABLES ───────────────────────────────────────────────────────────
  {
    id: 'mvCables',
    name: 'MV AC Cables',
    icon: 'zap',
    blurb: 'Medium voltage cable sizing basis, loop configuration, and CYMCAP results summary.',
    uploads: [
      { key: 'loadProfileChart', label: 'Load Profile Chart', hint: 'Image/Chart · Daily BESS load profile', required: false },
    ],
    groups: [
      {
        title: 'Loop & Current Basis',
        fields: [
          { key: 'noOfPcsSkidsBOL', label: 'No. of PCS Skids at BOL', type: 'number', required: true },
          { key: 'pcsSkidRatingKva', label: 'PCS Skid Rating', type: 'number', required: true, unit: 'kVA' },
          { key: 'pcsSkidCurrentAtMv', label: 'PCS Skid Current at MV Voltage', type: 'number', required: true, unit: 'A' },
          { key: 'maxPcsPerLoop', label: 'Max PCS Skids per Loop', type: 'number', required: true },
          { key: 'maxLoopCurrent', label: 'Max Current per Loop', type: 'number', required: true, unit: 'A' },
          { key: 'mvCableSize1', label: 'MV Cable Size Option 1', type: 'text', required: true, placeholder: '500 KCMIL Aluminum' },
          { key: 'mvCableSize2', label: 'MV Cable Size Option 2', type: 'text', required: true, placeholder: '1000 KCMIL Aluminum' },
        ]
      },
      {
        title: 'Installation Basis',
        fields: [
          { key: 'mvCableBurialDepth', label: 'MV Cable Burial Depth', type: 'number', required: true, unit: 'ft' },
          { key: 'mvCableMaxTemp', label: 'MV Cable Max Conductor Temp', type: 'number', required: true, unit: '°C' },
          { key: 'mvConduitSize', label: 'MV Conduit Size', type: 'text', required: true, placeholder: '8-inch' },
          { key: 'mvWarningTapeDepth', label: 'Warning Tape Depth Below Grade', type: 'text', required: false, placeholder: "1'" },
        ]
      },
      {
        title: 'Load Profile',
        fields: [
          { key: 'dischargePeriodHours', label: 'Discharge Period', type: 'number', required: true, unit: 'hours' },
          { key: 'restPeriodHours', label: 'Rest Period', type: 'number', required: true, unit: 'hours' },
          { key: 'chargePeriodHours', label: 'Charging Period', type: 'number', required: true, unit: 'hours' },
          { key: 'dischargeRateC', label: 'Discharge Rate', type: 'text', required: false, placeholder: '0.4C' },
          { key: 'chargeRateC', label: 'Charge Rate', type: 'text', required: false, placeholder: '0.3C' },
        ]
      },
      {
        title: 'CYMCAP Results Summary Tables',
        fields: [
          { key: 'mvDirectBuriedSummaryTable', label: 'Direct Buried Circuit Temperature Summary', type: 'table', required: true },
          { key: 'mvConduitSummaryTable', label: 'Buried-in-Conduit Circuit Temperature Summary', type: 'table', required: true },
          { key: 'mvParallelCircuitSummaryTable', label: 'Parallel Circuit Temperature Summary (2/3/4/7/8 circuits)', type: 'table', required: true },
        ]
      }
    ]
  },

  // ─── AUXILIARY CABLES ───────────────────────────────────────────────────────
  {
    id: 'auxCables',
    name: 'Auxiliary Cables',
    icon: 'cpu',
    blurb: 'Auxiliary power distribution cable sizing from transformer through to end loads.',
    groups: [
      {
        title: 'Auxiliary Transformer → Auxiliary Panel Board',
        fields: [
          { key: 'auxTransformerRatingKva', label: 'Auxiliary Transformer Rating', type: 'number', required: true, unit: 'kVA', placeholder: '1200' },
          { key: 'auxTransformerVoltage', label: 'Auxiliary Transformer LV Voltage', type: 'number', required: true, unit: 'V', placeholder: '480' },
          { key: 'auxTransformerToBoardCableSize', label: 'Cable Size', type: 'text', required: true, placeholder: '1C, 1000 KCMIL, Al' },
          { key: 'auxTransformerToBoardRuns', label: 'Runs per Phase & Neutral', type: 'number', required: true, placeholder: '6' },
          { key: 'auxTransformerOutputCurrent', label: 'Calculated Output Current', type: 'number', required: true, unit: 'A' },
        ]
      },
      {
        title: 'Auxiliary Panel Board → BESS Enclosure',
        fields: [
          { key: 'bessAuxCableSize', label: 'Cable Size', type: 'text', required: true, placeholder: '#2 AWG' },
          { key: 'bessAuxAmpacityRef', label: 'Ampacity Reference', type: 'text', required: false, placeholder: 'NEC 310.16' },
          { key: 'bessAuxAmpacityAt30C', label: 'Ampacity at 30°C Ambient', type: 'number', required: true, unit: 'A' },
          { key: 'bessAuxCorrectionFactorK1', label: 'Correction Factor K1 (Ambient)', type: 'number', required: true },
          { key: 'bessAuxCorrectionFactorK2', label: 'Correction Factor K2 (Grouping)', type: 'number', required: true },
          { key: 'bessAuxDeRatedAmpacity', label: 'De-Rated Ampacity', type: 'number', required: true, unit: 'A' },
          { key: 'bessAuxRequiredCurrent', label: 'Required Current', type: 'number', required: true, unit: 'A' },
        ]
      },
      {
        title: 'Auxiliary Panel Board → PCS Skid',
        fields: [
          { key: 'pcsAuxCableSize', label: 'Cable Size', type: 'text', required: true, placeholder: '#12 AWG' },
          { key: 'pcsAuxAmpacityAt30C', label: 'Ampacity at 30°C Ambient', type: 'number', required: true, unit: 'A' },
          { key: 'pcsAuxCorrectionFactorK1', label: 'Correction Factor K1 (Ambient)', type: 'number', required: true },
          { key: 'pcsAuxCorrectionFactorK2', label: 'Correction Factor K2 (Grouping)', type: 'number', required: true },
          { key: 'pcsAuxDeRatedAmpacity', label: 'De-Rated Ampacity', type: 'number', required: true, unit: 'A' },
          { key: 'pcsAuxRequiredCurrent', label: 'Required Current', type: 'number', required: true, unit: 'A' },
        ]
      },
      {
        title: 'Precast Trench Loading',
        fields: [
          { key: 'maxCablesInTrench', label: 'Max Cables in Precast Trench', type: 'number', required: false },
          { key: 'trenchBessCableCount', label: 'No. of 4C #2 AWG Cables', type: 'number', required: false },
          { key: 'trenchPcsCableCount', label: 'No. of 2C #12 AWG Cables', type: 'number', required: false },
          { key: 'totalConductorsInTrench', label: 'Total Conductors in Trench', type: 'number', required: false },
        ]
      },
      {
        title: 'Auxiliary Panel Board → Light Poles',
        fields: [
          { key: 'lightPoleFixtureCount', label: 'Fixtures per Pole', type: 'number', required: false, placeholder: '2' },
          { key: 'lightPoleFixtureWattage', label: 'Wattage per Fixture', type: 'number', required: false, unit: 'W', placeholder: '147' },
          { key: 'lightPoleVoltage', label: 'Light Pole Voltage', type: 'number', required: true, unit: 'V', placeholder: '277' },
          { key: 'lightPoleCableSize', label: 'Cable Size', type: 'text', required: true, placeholder: '2C, #12 AWG, Cu' },
          { key: 'lightPoleCurrent', label: 'Calculated Current per Pole', type: 'number', required: true, unit: 'A' },
          { key: 'polesPerDaisyChain', label: 'Poles per Daisy-Chain', type: 'number', required: true, placeholder: '2' },
          { key: 'totalLightingPoles', label: 'Total Lighting Poles', type: 'number', required: true, placeholder: '13' },
        ]
      },
      {
        title: 'Auxiliary Panel Board → Mini Power Center',
        fields: [
          { key: 'mpcRatingKva', label: 'Mini Power Center Transformer Rating', type: 'number', required: true, unit: 'kVA', placeholder: '15' },
          { key: 'mpcVoltage', label: 'Mini Power Center Voltage', type: 'number', required: true, unit: 'V', placeholder: '480' },
          { key: 'mpcCableSize', label: 'Cable Size', type: 'text', required: true, placeholder: '2C, #2 AWG, Cu' },
          { key: 'mpcCurrent', label: 'Calculated Current', type: 'number', required: true, unit: 'A' },
        ]
      },
      {
        title: 'Mini Power Center → Receptacle',
        fields: [
          { key: 'receptacleRatingKva', label: 'Receptacle Load', type: 'number', required: true, unit: 'kVA', placeholder: '2.4' },
          { key: 'receptaclePf', label: 'Power Factor', type: 'number', required: false, placeholder: '0.85' },
          { key: 'receptacleVoltage', label: 'Receptacle Voltage', type: 'number', required: true, unit: 'V', placeholder: '120' },
          { key: 'receptacleCableSize', label: 'Cable Size', type: 'text', required: true, placeholder: '2C, #12 AWG, Cu' },
          { key: 'receptacleCurrent', label: 'Calculated Current', type: 'number', required: true, unit: 'A' },
        ]
      },
      {
        title: 'Mini Power Center → Field Network Enclosure',
        fields: [
          { key: 'fneRatingKva', label: 'FNE Load', type: 'number', required: true, unit: 'kVA', placeholder: '0.141' },
          { key: 'fneVoltage', label: 'FNE Voltage', type: 'number', required: true, unit: 'V', placeholder: '120' },
          { key: 'fneCableSize', label: 'Cable Size', type: 'text', required: true, placeholder: '2C, #12 AWG, Cu' },
          { key: 'fneCurrent', label: 'Calculated Current', type: 'number', required: true, unit: 'A' },
        ]
      },
      {
        title: 'Generator → Tap Box',
        fields: [
          { key: 'generatorRatingKw', label: 'Generator Rating', type: 'number', required: true, unit: 'kW', placeholder: '150' },
          { key: 'generatorPf', label: 'Power Factor', type: 'number', required: false, placeholder: '0.85' },
          { key: 'generatorVoltage', label: 'Generator Voltage', type: 'number', required: true, unit: 'V', placeholder: '480' },
          { key: 'generatorCableSize', label: 'Cable Size', type: 'text', required: true, placeholder: '4 x 1C, 500 KCMIL, Al' },
          { key: 'generatorCurrent', label: 'Calculated Current', type: 'number', required: true, unit: 'A' },
        ]
      },
      {
        title: 'Tap Box → Auxiliary Panel Board',
        fields: [
          { key: 'tapBoxMaxLoadKva', label: 'Max Aux Panel Board Load', type: 'number', required: true, unit: 'kVA' },
          { key: 'tapBoxVoltage', label: 'Tap Box Voltage', type: 'number', required: true, unit: 'V', placeholder: '480' },
          { key: 'tapBoxCableSize', label: 'Cable Size', type: 'text', required: true, placeholder: '4C, #1 AWG, Cu' },
          { key: 'tapBoxCurrent', label: 'Calculated Current', type: 'number', required: true, unit: 'A' },
        ]
      },
      {
        title: 'Auxiliary Cables Summary Table',
        fields: [
          { key: 'auxCable1Size', label: 'Row 1 (Aux Xfmr → Aux Panel) – Size', type: 'text', required: true },
          { key: 'auxCable1Temp', label: 'Row 1 – Max Temp @ Full Load (°C)', type: 'number', required: true },
          { key: 'auxCable2Size', label: 'Row 2 (Aux Panel → Light Poles) – Size', type: 'text', required: true },
          { key: 'auxCable2Temp', label: 'Row 2 – Max Temp @ Full Load (°C)', type: 'number', required: true },
          { key: 'auxCable2Remarks', label: 'Row 2 – Remarks', type: 'text', required: false, placeholder: 'Max. of 2 poles in daisy chain' },
          { key: 'auxCable3Size', label: 'Row 3 (Aux Panel → Mini Power Center) – Size', type: 'text', required: true },
          { key: 'auxCable3Temp', label: 'Row 3 – Max Temp @ Full Load (°C)', type: 'number', required: true },
          { key: 'auxCable4Size', label: 'Row 4 (Mini Power Center → Receptacle) – Size', type: 'text', required: true },
          { key: 'auxCable4Temp', label: 'Row 4 – Max Temp @ Full Load (°C)', type: 'number', required: true },
          { key: 'auxCable5Size', label: 'Row 5 (Mini Power Center → FNE) – Size', type: 'text', required: true },
          { key: 'auxCable5Temp', label: 'Row 5 – Max Temp @ Full Load (°C)', type: 'number', required: true },
          { key: 'auxCable6Size', label: 'Row 6 (Generator → Tap Box) – Size', type: 'text', required: true },
          { key: 'auxCable6Temp', label: 'Row 6 – Max Temp @ Full Load (°C)', type: 'number', required: true },
          { key: 'auxCable7Size', label: 'Row 7 (Tap Box → Aux Panel Boards) – Size', type: 'text', required: true },
          { key: 'auxCable7Temp', label: 'Row 7 – Max Temp @ Full Load (°C)', type: 'number', required: true },
        ]
      }
    ]
  },

  // ─── DATASHEETS & UPLOADS ──────────────────────────────────────────────────
  {
    id: 'uploads',
    name: 'Datasheets & Uploads',
    icon: 'paperclip',
    blurb: 'Attach CYMCAP reports and the geotechnical report referenced in the appendices.',
    uploads: [
      { key: 'mvCymcapReport', label: 'Appendix A: MV AC Cables – CYMCAP Report', hint: 'PDF · CYMCAP analysis for MV cables', required: false },
      { key: 'auxCymcapReport', label: 'Appendix B: LV Auxiliary Cables – CYMCAP Report', hint: 'PDF · CYMCAP analysis for auxiliary cables', required: false },
      { key: 'geotechReport', label: 'Appendix C: Geotechnical Report', hint: 'PDF · Full geotechnical evaluation report', required: false },
    ]
  },

];
