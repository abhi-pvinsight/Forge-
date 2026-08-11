export const BESS_TABS = [

  // ─── CLIENT INFORMATION ────────────────────────────────────────────────────
  {
    id: 'client',
    name: 'Client Information',
    icon: 'briefcase',
    blurb: 'Identifies the client and the engagement on the report cover sheet.',
    fields: [
      { key: 'clientName', label: 'Client / Company name', type: 'text', required: true, placeholder: 'e.g. Clenera LLC' },
      { key: 'clientEmail', label: 'Contact email', type: 'text', required: true, placeholder: 'name@company.com' },
      { key: 'clientAddress', label: 'Client address', type: 'textarea', required: true, placeholder: 'Street, City, State, Country' },
      { key: 'revision', label: 'Revision', type: 'text', required: true, placeholder: 'A' },
      { key: "clientLogo", label: "Client Logo", type: "file", required: true },
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
    blurb: 'Core project identifiers used throughout the report.',
    fields: [
      { key: 'projectName', label: 'Project Name', type: 'text', required: true },
      { key: 'projectSite', label: 'Project Site', type: 'text', required: true },
      { key: 'state', label: 'State', type: 'text', required: true },
      { key: 'county', label: 'County', type: 'text', required: true },
      { key: 'country', label: 'Country', type: 'text', required: true },
      { key: 'coordinates', label: 'Coordinates', type: 'text', required: true },
      { key: 'projectCapacityMW', label: 'Power Capacity', type: 'number', required: true, unit: 'MW' },
      { key: 'projectCapacityMWh', label: 'Energy Capacity', type: 'number', required: true, unit: 'MWh' },
      { key: 'projectDurationHours', label: 'Duration', type: 'number', required: true, unit: 'Hours' },
      { key: 'bessPowerRating', label: 'BESS Power Rating', type: 'number', required: true, unit: 'MW' },
      { key: 'bessEnergyRating', label: 'BESS Energy Rating', type: 'number', required: true, unit: 'MWh' },
      { key: 'powerFactor', label: 'Power Factor', type: 'text', required: true, placeholder: '0.95' },
      { key: 'powerFactorLeadLag', label: 'PF Lead / Lag', type: 'text', required: true, placeholder: 'Lead / Lag' },
      { key: 'annualCycles', label: 'Annual Cycles', type: 'number', required: true, placeholder: '365' },
      { key: 'totalPCSPowerRating', label: 'Total PCS Rating', type: 'number', required: true, unit: 'MVA' },
      { key: 'totalBessEnergyRating', label: 'Total BESS Energy', type: 'number', required: true, unit: 'MWh' },
    ]
  },

  // ─── SITE CONDITIONS ───────────────────────────────────────────────────────
  {
    id: 'site',
    name: 'Site Conditions',
    icon: 'cloud',
    blurb: 'Ambient and environmental conditions that govern equipment sizing.',
    fields: [
      { key: 'utilityName', label: 'Utility / Distribution Company', type: 'text', required: true },
      { key: 'fenceArea', label: 'Total Fence Area', type: 'number', required: true, unit: 'Acres' },
      { key: 'cyclesPerDay', label: 'Max Cycles Per Day', type: 'number', required: true },
      { key: 'maxTemp', label: 'Max Ambient Temp', type: 'number', required: true, unit: '°F' },
      { key: 'minTemp', label: 'Min Ambient Temp', type: 'number', required: true, unit: '°F' },
      { key: 'tempDesign', label: 'Design Temp', type: 'number', required: true, unit: '°F' },
      { key: 'altitude', label: 'Altitude', type: 'number', required: true, unit: 'ft' },
      { key: 'windSpeed', label: 'Design Wind Speed', type: 'number', required: true, unit: 'mph' },
      { key: 'riskCategory', label: 'Risk Category', type: 'select', options: ['CAT-I', 'CAT-II', 'IEC 60364-7-712', 'AS/NZS 5033'], required: true },
      { key: 'snowLoad', label: 'Snow Load', type: 'number', required: true, unit: 'psf' },
      { key: 'snowDepth', label: 'Snow Depth', type: 'number', required: true, unit: 'inch' },
      { key: 'roadWidth', label: 'Road Width', type: 'number', required: true, unit: 'ft' },
      { key: 'fenceClearance', label: 'Fence to Road Clearance', type: 'number', required: true, unit: 'ft' },
    ]
  },

  // ─── ELECTRICAL SYSTEM ─────────────────────────────────────────────────────
  {
    id: 'electrical',
    name: 'Electrical System',
    icon: 'zap',
    blurb: 'Voltage levels and interconnection parameters.',
    fields: [
      { key: 'poiVoltage', label: 'POI Voltage', type: 'number', required: true, unit: 'kV' },
      { key: 'mvVoltage', label: 'MV Collection Voltage', type: 'number', required: true, unit: 'kV' },
      { key: 'lvVoltage', label: 'LV Collection Voltage', type: 'number', required: true, unit: 'V' },
      { key: 'dcVoltage', label: 'DC Voltage', type: 'number', required: true, unit: 'V' },
      { key: 'noOfVCB', label: 'Number of VCB Feeders', type: 'number', required: true },
    ]
  },

  // ─── BATTERY SYSTEM ────────────────────────────────────────────────────────
  {
    id: 'battery',
    name: 'Battery System',
    icon: 'battery',
    blurb: 'BESS enclosure technical parameters from manufacturer datasheet.',
    fields: [
      { key: 'batteryTechnology', label: 'Technology', type: 'text', required: true, placeholder: 'Li-Ion LFP' },
      { key: 'bessManufacturer', label: 'Manufacturer', type: 'text', required: true },
      { key: 'bessModel', label: 'Model', type: 'text', required: true },
      { key: 'batteryMinVoltage', label: 'Min Voltage', type: 'number', required: true, unit: 'Vdc' },
      { key: 'batteryMaxVoltage', label: 'Max Voltage', type: 'number', required: true, unit: 'Vdc' },
      { key: 'batteryRatedVoltage', label: 'Rated Voltage', type: 'number', required: true, unit: 'V', placeholder: '1331.2' },
      { key: 'batteryRatedCurrent', label: 'Rated Current', type: 'number', required: true, unit: 'A', placeholder: '1205.6' },
      { key: 'bessDimension', label: 'Enclosure Dimensions', type: 'text', required: true },
      { key: 'bessEnergyPerEnclosure', label: 'Energy / Enclosure', type: 'number', required: true, unit: 'kWh' },
      { key: 'noOfEnclosures', label: 'No. of Enclosures', type: 'number', required: true },
      { key: 'coolingMethod', label: 'Cooling Method', type: 'text', required: true, placeholder: 'Liquid Cooling' },
      { key: 'ipRating', label: 'IP Rating', type: 'text', required: true },
      { key: 'bessDesignLife', label: 'Design Life', type: 'number', required: true, unit: 'Years', placeholder: '25' },
      { key: 'batteryCertification', label: 'Certification', type: 'textarea', required: true, placeholder: 'UL1973, UL9540A, NFPA855, UN38.3' },
      { key: 'tempMin', label: 'Internal Temp Min', type: 'number', required: true, unit: '°C' },
      { key: 'tempMax', label: 'Internal Temp Max', type: 'number', required: true, unit: '°C' },
      { key: 'batteryChargeRate', label: 'Charging Rate', type: 'text', required: true, placeholder: '0.4C' },
      { key: 'batteryDischargeRate', label: 'Discharging Rate', type: 'text', required: true, placeholder: '0.43C' },
      { key: 'batteryMaxPower', label: 'Max Power / Enclosure', type: 'number', required: true, unit: 'MW' },
    ]
  },

  // ─── PCS INFORMATION ───────────────────────────────────────────────────────
  {
    id: 'pcs',
    name: 'PCS Information',
    icon: 'cpu',
    blurb: 'Power Conversion System technical parameters from manufacturer datasheet.',
    fields: [
      { key: 'pcsManufacturer', label: 'PCS Manufacturer', type: 'text', required: true },
      { key: 'pcsModel', label: 'PCS Model', type: 'text', required: true },
      { key: 'pcsRating', label: 'PCS Rating', type: 'number', required: true, unit: 'kVA' },
      { key: 'pcsDimension', label: 'PCS Dimensions', type: 'text', required: true, placeholder: '3183 x 2110 x 1800 mm' },
      { key: 'pcsAcVoltage', label: 'AC Voltage', type: 'number', required: true, unit: 'Vac', placeholder: '600' },
      { key: 'pcsDcVoltageRange', label: 'DC Voltage Range', type: 'text', required: true, placeholder: '920 – 1500 Vdc' },
      { key: 'pcsFrequency', label: 'Frequency', type: 'number', required: true, unit: 'Hz', placeholder: '60' },
      { key: 'pcsEfficiency', label: 'Efficiency', type: 'number', required: true, unit: '%', placeholder: '99' },
      { key: 'pcsThd', label: 'THD', type: 'number', required: true, unit: '%', placeholder: '3' },
      { key: 'pcsProtection', label: 'Protection', type: 'text', required: true, placeholder: 'NEMA 3R / IP55' },
      { key: 'pcsCooling', label: 'Cooling', type: 'text', required: true, placeholder: 'Forced Air' },
      { key: 'pcsOutputProtection', label: 'Output Protection', type: 'text', required: true, placeholder: 'Fuse + Switch' },
      { key: 'pcsOvervoltageProtection', label: 'Overvoltage Prot.', type: 'text', required: true, placeholder: 'Surge Arrestor' },
      { key: 'pcsCommunication', label: 'Communication', type: 'text', required: true, placeholder: 'Ethernet / Modbus TCP' },
      { key: 'pcsAltitude', label: 'Altitude Limit', type: 'number', required: true, unit: 'm', placeholder: '4000' },
      { key: 'pcsCertification', label: 'Certification', type: 'text', required: false, placeholder: 'UL1741, IEEE 1547' },
      { key: 'noOfPCS', label: 'No. of PCS', type: 'number', required: true },
    ]
  },

  // ─── TRANSFORMER ───────────────────────────────────────────────────────────
  {
    id: 'transformer',
    name: 'Transformer',
    icon: 'layers',
    blurb: 'Medium voltage transformer technical parameters.',
    fields: [
      { key: 'mvtManufacturer', label: 'Manufacturer', type: 'text', required: true },
      { key: 'mvtRating', label: 'Rating', type: 'number', required: true, unit: 'kVA' },
      { key: 'transformerVoltageRating', label: 'Voltage Rating', type: 'text', required: true, placeholder: '34.5 / 0.69 kV' },
      { key: 'transformerWindingConfig', label: 'Winding Configuration', type: 'select', options: ['HV – Wye, LV – Delta (HOLD)', 'HV – Wye, LV – Delta', 'HV – Delta, LV – Wye', 'HV – Delta, LV – Delta', 'HV – Wye, LV – Wye', 'HV – Wye-Gnd, LV – Delta', 'HV – Wye-Gnd, LV – Wye'], required: true },
      { key: 'transformerVectorGroup', label: 'Vector Group', type: 'select', options: ['Yd11 (HOLD)', 'Yd11', 'Dyn11', 'Dyn1', 'Yd1', 'Ynd11', 'Yy0', 'Dd0'], required: true },
      { key: 'transformerImpedance', label: 'Impedance', type: 'number', required: true, unit: '%', placeholder: '5.75' },
      { key: 'transformerEfficiency', label: 'Efficiency at Full Load', type: 'number', required: true, unit: '%', placeholder: '99' },
      { key: 'transformerWindingMaterial', label: 'Winding Material', type: 'select', options: ['Aluminum', 'Copper'], required: true },
      { key: 'transformerCooling', label: 'Cooling', type: 'select', options: ['KNAN', 'ONAN', 'KNAF', 'ONAF'], required: true },
      { key: 'maxMvtLoop', label: 'Max Loop', type: 'number', required: true },
    ]
  },

  // ─── AUXILIARY POWER ───────────────────────────────────────────────────────
  {
    id: 'auxiliary',
    name: 'Auxiliary Power',
    icon: 'zap',
    blurb: 'Auxiliary power supply details for BESS enclosures, EMS, and FNE systems.',
    fields: [
      { key: 'auxVoltage', label: 'Aux Voltage (Enclosure)', type: 'number', required: true, unit: 'V' },
      { key: 'auxVoltage2', label: 'Aux Voltage (Board)', type: 'number', required: true, unit: 'V' },
      { key: 'auxVoltage3', label: 'Aux Voltage (FNE)', type: 'number', required: true, unit: 'V' },
      { key: 'auxPowerKVA', label: 'Auxiliary Power', type: 'number', required: true, unit: 'kVA' },
      { key: 'upsPowerKVA', label: 'UPS Power', type: 'number', required: true, unit: 'kVA' },
      { key: 'fneAuxPowerKVA', label: 'FNE Aux Power', type: 'number', required: true, unit: 'kVA' },
      { key: 'maxFneLoop', label: 'Max FNE Loop', type: 'number', required: true },
      { key: 'dcControlVoltage', label: 'DC Control Voltage', type: 'number', required: true, unit: 'V' },
    ]
  },

  // ─── CABLE CALCULATIONS ────────────────────────────────────────────────────
  {
    id: 'cables',
    name: 'Cable Calculations',
    icon: 'git-branch',
    blurb: 'DC and MV AC cable sizing parameters used in ampacity calculations.',
    groups: [
      {
        title: 'DC Cables (Cable Tray)',
        fields: [
          { key: 'dcCableSize', label: 'DC Cable Size', type: 'text', required: true },
          { key: 'noOfDcRuns', label: 'No. of DC Runs', type: 'number', required: true },
          { key: 'cableTrayWidth', label: 'Cable Tray Width', type: 'number', required: true, unit: 'ft' },
          { key: 'ampacityReportNo', label: 'DC & AC Ampacity Report No.', type: 'text', required: false },
        ]
      },
      {
        title: 'MV AC Cables (Direct Buried)',
        fields: [
          { key: 'mvCableBurialDepth', label: 'MV Burial Depth', type: 'number', required: true, unit: 'ft' },
          { key: 'mvCableMaxTemp', label: 'MV Cable Max Temp', type: 'number', required: true, unit: '°C' },
          { key: 'loadFactorPercent', label: 'Load Factor', type: 'number', required: true, unit: '%' },
          { key: 'dischargePeriodHours', label: 'Discharge Period', type: 'number', required: true, unit: 'hours' },
          { key: 'restPeriodHours', label: 'Rest Period', type: 'number', required: true, unit: 'hours' },
          { key: 'chargePeriodHours', label: 'Charging Period', type: 'number', required: true, unit: 'hours' },
          { key: 'mvCableSize1', label: 'MV Cable Size 1', type: 'text', required: true },
          { key: 'mvCableSize2', label: 'MV Cable Size 2', type: 'text', required: true },
        ]
      },
      {
        title: 'Auxiliary Cables',
        fields: [
          // { key: 'auxCableBurialDepth', label: 'Aux Cable Burial Depth', type: 'text', required: true, placeholder: '1\'-6"' },
          { key: 'auxCable1Header', label: 'Aux Transformer → Aux Panel Board', type: 'subtitle' },
          { key: 'auxCable1CoreNo', label: 'Cable Core No', type: 'select', options: ['6R x 4 x 1C', '4 x 1C', '4C', '2C', '1C', '3C'], required: true },
          { key: 'auxCable1Size', label: 'Cable Size', type: 'select', options: ['1000 KCMIL', '500 KCMIL', '#2 AWG', '#4 AWG', '#8 AWG', '#10 AWG', '#12 AWG'], required: true },
          { key: 'auxCable1Material', label: 'Cable Material', type: 'select', options: ['Cu cable', 'Al cable'], required: true },
          { key: 'auxCable2Header', label: 'Aux Panel Board → BESS Enclosure', type: 'subtitle' },
          { key: 'auxCable2CoreNo', label: 'Cable Core No', type: 'select', options: ['6R x 4 x 1C', '4 x 1C', '4C', '2C', '1C', '3C'], required: true },
          { key: 'auxCable2Size', label: 'Cable Size', type: 'select', options: ['1000 KCMIL', '500 KCMIL', '#2 AWG', '#4 AWG', '#8 AWG', '#10 AWG', '#12 AWG'], required: true },
          { key: 'auxCable2Material', label: 'Cable Material', type: 'select', options: ['Cu cable', 'Al cable'], required: true },
          { key: 'auxCable3Header', label: 'Aux Panel Board → PCS Skid', type: 'subtitle' },
          { key: 'auxCable3CoreNo', label: 'Cable Core No', type: 'select', options: ['6R x 4 x 1C', '4 x 1C', '4C', '2C', '1C', '3C'], required: true },
          { key: 'auxCable3Size', label: 'Cable Size', type: 'select', options: ['1000 KCMIL', '500 KCMIL', '#2 AWG', '#4 AWG', '#8 AWG', '#10 AWG', '#12 AWG'], required: true },
          { key: 'auxCable3Material', label: 'Cable Material', type: 'select', options: ['Cu cable', 'Al cable'], required: true },
          { key: 'auxCable4Header', label: 'Aux Panel Board → Light Poles', type: 'subtitle' },
          { key: 'auxCable4CoreNo', label: 'Cable Core No', type: 'select', options: ['6R x 4 x 1C', '4 x 1C', '4C', '2C', '1C', '3C'], required: true },
          { key: 'auxCable4Size', label: 'Cable Size', type: 'select', options: ['1000 KCMIL', '500 KCMIL', '#2 AWG', '#4 AWG', '#8 AWG', '#10 AWG', '#12 AWG'], required: true },
          { key: 'auxCable4Material', label: 'Cable Material', type: 'select', options: ['Cu cable', 'Al cable'], required: true },
          { key: 'auxCable5Header', label: 'Aux Panel Board → Mini Power Center', type: 'subtitle' },
          { key: 'auxCable5CoreNo', label: 'Cable Core No', type: 'select', options: ['6R x 4 x 1C', '4 x 1C', '4C', '2C', '1C', '3C'], required: true },
          { key: 'auxCable5Size', label: 'Cable Size', type: 'select', options: ['1000 KCMIL', '500 KCMIL', '#2 AWG', '#4 AWG', '#8 AWG', '#10 AWG', '#12 AWG'], required: true },
          { key: 'auxCable5Material', label: 'Cable Material', type: 'select', options: ['Cu cable', 'Al cable'], required: true },
          { key: 'auxCable6Header', label: 'Mini Power Center → Receptacle', type: 'subtitle' },
          { key: 'auxCable6CoreNo', label: 'Cable Core No', type: 'select', options: ['6R x 4 x 1C', '4 x 1C', '4C', '2C', '1C', '3C'], required: true },
          { key: 'auxCable6Size', label: 'Cable Size', type: 'select', options: ['1000 KCMIL', '500 KCMIL', '#2 AWG', '#4 AWG', '#8 AWG', '#10 AWG', '#12 AWG'], required: true },
          { key: 'auxCable6Material', label: 'Cable Material', type: 'select', options: ['Cu cable', 'Al cable'], required: true },
          { key: 'auxCable7Header', label: 'Mini Power Center → FNE', type: 'subtitle' },
          { key: 'auxCable7CoreNo', label: 'Cable Core No', type: 'select', options: ['6R x 4 x 1C', '4 x 1C', '4C', '2C', '1C', '3C'], required: true },
          { key: 'auxCable7Size', label: 'Cable Size', type: 'select', options: ['1000 KCMIL', '500 KCMIL', '#2 AWG', '#4 AWG', '#8 AWG', '#10 AWG', '#12 AWG'], required: true },
          { key: 'auxCable7Material', label: 'Cable Material', type: 'select', options: ['Cu cable', 'Al cable'], required: true },
          { key: 'auxCable8Header', label: 'Generator → Tap Box', type: 'subtitle' },
          { key: 'auxCable8CoreNo', label: 'Cable Core No', type: 'select', options: ['6R x 4 x 1C', '4 x 1C', '4C', '2C', '1C', '3C'], required: true },
          { key: 'auxCable8Size', label: 'Cable Size', type: 'select', options: ['1000 KCMIL', '500 KCMIL', '#2 AWG', '#4 AWG', '#8 AWG', '#10 AWG', '#12 AWG'], required: true },
          { key: 'auxCable8Material', label: 'Cable Material', type: 'select', options: ['Cu cable', 'Al cable'], required: true },
          { key: 'auxCable9Header', label: 'Tap Box → Aux Panel Boards', type: 'subtitle' },
          { key: 'auxCable9CoreNo', label: 'Cable Core No', type: 'select', options: ['6R x 4 x 1C', '4 x 1C', '4C', '2C', '1C', '3C'], required: true },
          { key: 'auxCable9Size', label: 'Cable Size', type: 'select', options: ['1000 KCMIL', '500 KCMIL', '#2 AWG', '#4 AWG', '#8 AWG', '#10 AWG', '#12 AWG'], required: true },
          { key: 'auxCable9Material', label: 'Cable Material', type: 'select', options: ['Cu cable', 'Al cable'], required: true },
        ]
      }
    ]
  },

  // ─── GEOTECHNICAL ──────────────────────────────────────────────────────────
  {
    id: 'geotech',
    name: 'Geotechnical',
    icon: 'map-pin',
    blurb: 'Geotechnical report data and soil thermal properties for cable calculations.',
    fields: [
      { key: 'geotechReportCompany', label: 'Geotech Report Company', type: 'text', required: true },
      { key: 'geotechReportNo', label: 'Geotech Report No.', type: 'text', required: true },
      { key: 'geotechReportDate', label: 'Geotech Report Date', type: 'text', required: true },
      { key: 'soilTempStation', label: 'Soil Temp Station', type: 'text', required: true },
      { key: 'soilTempLocation', label: 'Soil Temp Location', type: 'text', required: true },
      { key: 'soilTempMax', label: 'Soil Temp Max', type: 'number', required: true, unit: '°C' },
      { key: 'soilTempSelected', label: 'Soil Temp Selected', type: 'number', required: true, unit: '°C' },
      { key: 'soilThermalResistivityNative', label: 'Soil Thermal Resistivity', type: 'text', required: true },
      { key: 'soilMoistureContent', label: 'Soil Moisture Content', type: 'number', required: true, unit: '%' },
      { key: 'parcelNo', label: 'Parcel No.', type: 'text', required: true },
      { key: 'referenceDrawingNo', label: 'Reference Drawing No.', type: 'text', required: true },
    ]
  },

  // ─── APPLICABLE STANDARDS ──────────────────────────────────────────────────
  {
    id: 'standards',
    name: 'Applicable Standards',
    icon: 'book',
    blurb: 'Code editions referenced in the applicable design standards list.',
    fields: [
      { key: 'necEditionYear', label: 'NEC Edition Year', type: 'text', required: true, placeholder: '2023' },
      { key: 'ibcEditionYear', label: 'IBC Edition Year', type: 'text', required: true, placeholder: '2024' },
      { key: 'nfpa855EditionYear', label: 'NFPA 855 Edition Year', type: 'text', required: true, placeholder: '2026' },
    ]
  },

  // ─── WEATHER DATA (ASHRAE) ─────────────────────────────────────────────────
  // {
  //   id: 'ashrae',
  //   name: 'Weather Data (ASHRAE)',
  //   icon: 'cloud-rain',
  //   blurb: 'Key weather parameters obtained from the ASHRAE database.',
  //   fields: [
  //     { key: 'ashraeMaxDryBulb', label: 'Max Dry Bulb Temp', type: 'number', required: false, unit: '°F' },
  //     { key: 'ashraeMinDryBulb', label: 'Min Dry Bulb Temp', type: 'number', required: false, unit: '°F' },
  //     { key: 'ashraeWindSpeed', label: 'Design Wind Speed', type: 'number', required: false, unit: 'mph' },
  //     { key: 'ashraeSnowLoad', label: 'Ground Snow Load', type: 'number', required: false, unit: 'psf' },
  //     { key: 'ashraeElevation', label: 'Elevation', type: 'number', required: false, unit: 'ft' },
  //   ]
  // },



  // ─── COMMUNICATION AND CONTROL ─────────────────────────────────────────────
  {
    id: 'communication',
    name: 'Communication and Control',
    icon: 'radio',
    blurb: 'EMS and FACP communication architecture parameters.',
    groups: [
      {
        title: 'FO and CAT6 Communication',
        fields: [
          { key: 'fneLoopCount', label: 'Max FNEs Looped per MV Circuit', type: 'number', required: true },
          { key: 'totalFneCount', label: 'Total FNEs on Site', type: 'number', required: true },
          { key: 'commBlockDiagramNo', label: 'Communication Block Diagram No.', type: 'text', required: false },
          { key: 'cableScheduleNo', label: 'FO / CAT-6A Cable Schedule No.', type: 'text', required: false },
        ]
      },
      {
        title: 'E-Stop Control',
        fields: [
          { key: 'estopCableSpec', label: 'E-Stop Cable Specification', type: 'text', required: true, placeholder: '2C, 16 AWG' },
          { key: 'estopEnclosuresPerJb', label: 'Max Enclosures per JB', type: 'number', required: true },
          { key: 'estopJbToEmsCableSpec', label: 'JB to EMS Cable Spec', type: 'text', required: true, placeholder: '12-core, 16 AWG' },
        ]
      },
      {
        title: 'FACP Communication',
        fields: [
          { key: 'facpRingStartEnclosure', label: 'FACP Ring Start Enclosure ID', type: 'text', required: false },
          { key: 'facpRingEndEnclosure', label: 'FACP Ring End Enclosure ID', type: 'text', required: false },
        ]
      }
    ]
  },

  // ─── GROUNDING & EGC ────────────────────────────────────────────────────────
  {
    id: 'grounding',
    name: 'Grounding & EGC',
    icon: 'anchor',
    blurb: 'Grounding system design basis and Equipment Grounding Conductor (EGC) sizing table.',
    groups: [
      {
        title: 'Grounding Design Basis',
        fields: [
          { key: 'groundingLayoutDrawingNo', label: 'Grounding Layout Drawing No.', type: 'text', required: false },
          { key: 'groundingAnalysisReportNo', label: 'Grounding Analysis Report No.', type: 'text', required: false },
        ]
      },
      {
        title: 'Equipment Grounding Conductor (EGC) Table',
        fields: [
          { key: 'egc1Header', label: 'Row 1 (Aux Transformer → Aux Panel)', type: 'subtitle' },
          { key: 'egc1Ocpd', label: 'Over Projectio Device Rating', type: 'select', options: ['2000A', '900A', '300A', '80A', '20A'], required: true },
          { key: 'egc1PowerCable', label: 'Power Cable', type: 'select', options: ['1000 KCMIL', '350KCMIL', '500 KCMIL', '#2 AWG', '#12 AWG'], required: true },
          { key: 'egc1Egc', label: 'EGC', type: 'select', options: ['1C, 250KCMIL, Cu Cable per run', '1C, 350KCMIL, Cu cable', '1C, #4 AWG, Cu cable', '1C, #8 AWG, Cu cable', '1C, #8AWG, Cu cable', '1C, #12 AWG, Cu cable'], required: true },
          { key: 'egc2Header', label: 'Row 2 (BESS Enclosure → PCS Skid)', type: 'subtitle' },
          { key: 'egc2Ocpd', label: 'Over Protectio Device Rating', type: 'select', options: ['2000A', '900A', '300A', '80A', '20A'], required: true },
          { key: 'egc2PowerCable', label: 'Power Cable', type: 'select', options: ['1000 KCMIL', '350KCMIL', '500 KCMIL', '#2 AWG', '#12 AWG'], required: true },
          { key: 'egc2Egc', label: 'EGC', type: 'select', options: ['1C, 250KCMIL, Cu Cable per run', '1C, 350KCMIL, Cu cable', '1C, #4 AWG, Cu cable', '1C, #8 AWG, Cu cable', '1C, #8AWG, Cu cable', '1C, #12 AWG, Cu cable'], required: true },
          { key: 'egc3Header', label: 'Row 3 (Generator → Tap Box)', type: 'subtitle' },
          { key: 'egc3Ocpd', label: 'Over Protectio Device Rating', type: 'select', options: ['2000A', '900A', '300A', '80A', '20A'], required: true },
          { key: 'egc3PowerCable', label: 'Power Cable', type: 'select', options: ['1000 KCMIL', '350KCMIL', '500 KCMIL', '#2 AWG', '#12 AWG'], required: true },
          { key: 'egc3Egc', label: 'EGC', type: 'select', options: ['1C, 250KCMIL, Cu Cable per run', '1C, 350KCMIL, Cu cable', '1C, #4 AWG, Cu cable', '1C, #8 AWG, Cu cable', '1C, #8AWG, Cu cable', '1C, #12 AWG, Cu cable'], required: true },
          { key: 'egc4Header', label: 'Row 4 (Aux Panel → BESS Enclosure)', type: 'subtitle' },
          { key: 'egc4Ocpd', label: 'Over Protectio Device Rating', type: 'select', options: ['2000A', '900A', '300A', '80A', '20A'], required: true },
          { key: 'egc4PowerCable', label: 'Power Cable', type: 'select', options: ['1000 KCMIL', '350KCMIL', '500 KCMIL', '#2 AWG', '#12 AWG'], required: true },
          { key: 'egc4Egc', label: 'EGC', type: 'select', options: ['1C, 250KCMIL, Cu Cable per run', '1C, 350KCMIL, Cu cable', '1C, #4 AWG, Cu cable', '1C, #8 AWG, Cu cable', '1C, #8AWG, Cu cable', '1C, #12 AWG, Cu cable'], required: true },
          { key: 'egc5Header', label: 'Row 5 (Aux Panel → Mini Power Center)', type: 'subtitle' },
          { key: 'egc5Ocpd', label: 'Over Protectio Device Rating', type: 'select', options: ['2000A', '900A', '300A', '80A', '20A'], required: true },
          { key: 'egc5PowerCable', label: 'Power Cable', type: 'select', options: ['1000 KCMIL', '350KCMIL', '500 KCMIL', '#2 AWG', '#12 AWG'], required: true },
          { key: 'egc5Egc', label: 'EGC', type: 'select', options: ['1C, 250KCMIL, Cu Cable per run', '1C, 350KCMIL, Cu cable', '1C, #4 AWG, Cu cable', '1C, #8 AWG, Cu cable', '1C, #8AWG, Cu cable', '1C, #12 AWG, Cu cable'], required: true },
          { key: 'egc6Header', label: 'Row 6 (Tap Box → Aux Panel)', type: 'subtitle' },
          { key: 'egc6Ocpd', label: 'Over Protectio Device Rating', type: 'select', options: ['2000A', '900A', '300A', '80A', '20A'], required: true },
          { key: 'egc6PowerCable', label: 'Power Cable', type: 'select', options: ['1000 KCMIL', '350KCMIL', '500 KCMIL', '#2 AWG', '#12 AWG'], required: true },
          { key: 'egc6Egc', label: 'EGC', type: 'select', options: ['1C, 250KCMIL, Cu Cable per run', '1C, 350KCMIL, Cu cable', '1C, #4 AWG, Cu cable', '1C, #8 AWG, Cu cable', '1C, #8AWG, Cu cable', '1C, #12 AWG, Cu cable'], required: true },
          { key: 'egc7Header', label: 'Row 7 (Aux Panel → PCS Skid)', type: 'subtitle' },
          { key: 'egc7Ocpd', label: 'Over Protectio Device Rating', type: 'select', options: ['2000A', '900A', '300A', '80A', '20A'], required: true },
          { key: 'egc7PowerCable', label: 'Power Cable', type: 'select', options: ['1000 KCMIL', '350KCMIL', '500 KCMIL', '#2 AWG', '#12 AWG'], required: true },
          { key: 'egc7Egc', label: 'EGC', type: 'select', options: ['1C, 250KCMIL, Cu Cable per run', '1C, 350KCMIL, Cu cable', '1C, #4 AWG, Cu cable', '1C, #8 AWG, Cu cable', '1C, #8AWG, Cu cable', '1C, #12 AWG, Cu cable'], required: true },
          { key: 'egc8Header', label: 'Row 8 (Aux Panel → Light Poles)', type: 'subtitle' },
          { key: 'egc8Ocpd', label: 'Over Protectio Device Rating', type: 'select', options: ['2000A', '900A', '300A', '80A', '20A'], required: true },
          { key: 'egc8PowerCable', label: 'Power Cable', type: 'select', options: ['1000 KCMIL', '350KCMIL', '500 KCMIL', '#2 AWG', '#12 AWG'], required: true },
          { key: 'egc8Egc', label: 'EGC', type: 'select', options: ['1C, 250KCMIL, Cu Cable per run', '1C, 350KCMIL, Cu cable', '1C, #4 AWG, Cu cable', '1C, #8 AWG, Cu cable', '1C, #8AWG, Cu cable', '1C, #12 AWG, Cu cable'], required: true },
          { key: 'egc9Header', label: 'Row 9 (Mini Power Center → Receptacle)', type: 'subtitle' },
          { key: 'egc9Ocpd', label: 'Over Protectio Device Rating', type: 'select', options: ['2000A', '900A', '300A', '80A', '20A'], required: true },
          { key: 'egc9PowerCable', label: 'Power Cable', type: 'select', options: ['1000 KCMIL', '350KCMIL', '500 KCMIL', '#2 AWG', '#12 AWG'], required: true },
          { key: 'egc9Egc', label: 'EGC', type: 'select', options: ['1C, 250KCMIL, Cu Cable per run', '1C, 350KCMIL, Cu cable', '1C, #4 AWG, Cu cable', '1C, #8 AWG, Cu cable', '1C, #8AWG, Cu cable', '1C, #12 AWG, Cu cable'], required: true },
          { key: 'egc10Header', label: 'Row 10 (Mini Power Center → FNE)', type: 'subtitle' },
          { key: 'egc10Ocpd', label: 'Over Protectio Device Rating', type: 'select', options: ['2000A', '900A', '300A', '80A', '20A'], required: true },
          { key: 'egc10PowerCable', label: 'Power Cable', type: 'select', options: ['1000 KCMIL', '350KCMIL', '500 KCMIL', '#2 AWG', '#12 AWG'], required: true },
          { key: 'egc10Egc', label: 'EGC', type: 'select', options: ['1C, 250KCMIL, Cu Cable per run', '1C, 350KCMIL, Cu cable', '1C, #4 AWG, Cu cable', '1C, #8 AWG, Cu cable', '1C, #8AWG, Cu cable', '1C, #12 AWG, Cu cable'], required: true },
        ]
      }
    ]
  },

  // ─── BESS LAYOUT DESIGN ─────────────────────────────────────────────────────
  {
    id: 'layout',
    name: 'BESS Layout Design',
    icon: 'layout',
    blurb: 'Clearance requirements for the BESS site plan.',
    fields: [
      { key: 'bessClearance', label: 'Min Clearance Between Enclosures', type: 'number', required: true, unit: 'ft' },
      { key: 'bessPcsClearance', label: 'Min Clearance Enclosure to PCS', type: 'number', required: true, unit: 'ft' },
    ]
  },

  // ─── DATASHEETS & UPLOADS ──────────────────────────────────────────────────
  {
    id: 'uploads',
    name: 'Datasheets & Uploads',
    icon: 'paperclip',
    blurb: 'Attach source datasheets used for BESS sizing and design validation.',
    uploads: [
      { key: 'batteryDs', label: 'Battery Datasheet', hint: 'PDF · Manufacturer battery specification', required: false },
      { key: 'pcsDs', label: 'PCS Datasheet', hint: 'PDF · PCS manufacturer specification', required: false },
      { key: 'transformerDs', label: 'Transformer Datasheet', hint: 'PDF · MV transformer specification', required: false },
    ]
  },

];
