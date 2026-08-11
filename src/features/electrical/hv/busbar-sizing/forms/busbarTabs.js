import { ALUMINUM_TUBE_SPECS } from './busbarDefaults';

export const BUSBAR_TABS = [
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
    blurb: 'Revision log table displayed on the document control page of the report.',
    fields: [
      { key: 'revisions', label: 'Revisions', type: 'revision-table', required: false }
    ]
  },

  // ─── PROJECT INFORMATION ───────────────────────────────────────────────────
  {
    id: 'project',
    name: 'Project Information',
    icon: 'map',
    blurb: 'Core project identifiers, plant name, and location referenced on cover page and headers.',
    fields: [
      { key: 'projectName', label: 'Project Name', type: 'text', required: true, placeholder: '345kV Collector Substation Project' },
      { key: 'projectCode', label: 'Project Code', type: 'text', required: false, placeholder: 'PVI-BUS' },
      { key: 'plant_name', label: 'Substation / Plant Title', type: 'text', required: false, placeholder: '345kV Collector Substation' },
      { key: 'location', label: 'Site Location / City, State', type: 'text', required: false, placeholder: 'Plano, TX' },
    ]
  },

  // ─── SYSTEM PARAMETERS ──────────────────────────────────────────────────────
  {
    id: 'systemParameters',
    name: 'System Parameters',
    icon: 'zap',
    blurb: 'System voltage, current, and fault ratings that the selected conductor must meet.',
    fields: [
      { key: 'systemVoltageKV', label: 'System Voltage', type: 'number', required: true, unit: 'kV', placeholder: '345' },
      { key: 'highestSystemVoltageKV', label: 'Highest System Voltage', type: 'number', required: true, unit: 'kV', placeholder: '362' },
      { key: 'continuousCurrentRatingA', label: 'Continuous Current Rating (required)', type: 'number', required: true, unit: 'A', placeholder: '2000' },
      { key: 'shortCircuitRatingKA', label: 'Short Circuit Rating (required)', type: 'number', required: true, unit: 'kA', placeholder: '63' },
      { key: 'systemFrequencyHz', label: 'System Frequency', type: 'number', required: true, unit: 'Hz', placeholder: '60' },
      { key: 'faultDurationSec', label: 'Duration of Short Circuit Current', type: 'number', required: true, unit: 's', placeholder: '0.25' },
    ]
  },
  {
    id: 'thermalEnvironmental',
    name: 'Thermal & Environmental',
    icon: 'thermometer',
    blurb: 'Auto-fetch ambient temperatures and solar position parameters via ASHRAE/Weather API using site coordinates, or enter parameters manually.',
    hasApiFetch: true,
    apiEndpoint: '/ashrae',
    apiAction: 'fetchThermalEnvironmental',
    groups: [
      {
        title: 'Site Location / Coordinates (API Auto-Fetch)',
        fields: [
          { key: 'latitude', label: 'Latitude', type: 'number', required: false, unit: '°N', placeholder: '33.4484' },
          { key: 'longitude', label: 'Longitude', type: 'number', required: false, unit: '°W', placeholder: '-112.0740' },
        ]
      },
      {
        title: 'Temperatures',
        fields: [
          { key: 'ambientTempC', label: 'Ambient Temperature (Ta)', type: 'number', required: true, unit: '°C', placeholder: '35.6' },
          { key: 'conductorTempC', label: 'Conductor Operating Temperature (Tc)', type: 'number', required: true, unit: '°C', placeholder: '90' },
        ]
      },
      {
        title: 'Solar Position & Irradiance (for Solar Heat Gain)',
        fields: [
          { key: 'latitudeDeg', label: 'Degrees North Latitude', type: 'number', required: true, unit: '°', placeholder: '40' },
          { key: 'solarAltitudeDeg', label: 'Altitude of Sun at Noon (Hc)', type: 'number', required: true, unit: '°', placeholder: '73' },
          { key: 'solarAzimuthDeg', label: 'Azimuth of Sun at Noon (Zc)', type: 'number', required: true, unit: '°', placeholder: '180' },
          { key: 'conductorAzimuthDeg', label: 'Azimuth of Conductor Line (Z1) — 0=N-S, 90=E-W', type: 'number', required: true, unit: '°', placeholder: '0' },
          { key: 'solarIntensityWPerM2', label: 'Intensity of Solar Radiation (Qs)', type: 'number', required: true, unit: 'W/m²', placeholder: '1037.1' },
          { key: 'altitudeFactorK', label: 'Heat Multiplying Factor (K) — 1.0 for altitude <1500m', type: 'number', required: true, placeholder: '1.0' },
        ]
      }
    ]
  },
  {
    id: 'conductorSpec',
    name: 'Conductor Specification',
    icon: 'git-branch',
    blurb: 'Select a standard tube size from the ALCOA catalog, or enter custom dimensions.',
    fields: [
      { key: 'conductorType', label: 'Tube Type / Size', type: 'select', required: true, placeholder: '6.0" (Sch 40)', options: ALUMINUM_TUBE_SPECS.map((t) => t.label) },
      { key: 'conductorMaterial', label: 'Conductor Material', type: 'text', required: true, placeholder: 'Aluminum Alloy 6063 T6' },
      { key: 'outerDiameterIn', label: 'Outer Diameter (D)', type: 'number', required: true, unit: 'in', placeholder: '6.625' },
      { key: 'thicknessIn', label: 'Wall Thickness (t)', type: 'number', required: true, unit: 'in', placeholder: '0.28' },
      { key: 'crossSectionAreaIn2', label: 'Cross-Sectional Area (Ac)', type: 'number', required: true, unit: 'in²', placeholder: '5.581354' },
      { key: 'conductivityPctIACS', label: 'Conductivity, % IACS (C\')', type: 'number', required: true, unit: '%', placeholder: '53' },
      { key: 'emissivity', label: 'Emissivity Coefficient (ε)', type: 'number', required: true, placeholder: '0.5' },
      { key: 'solarAbsorption', label: 'Solar Absorption Coefficient (ε\')', type: 'number', required: true, placeholder: '0.5' },
    ]
  },
  {
    id: 'skinEffect',
    name: 'Skin Effect Coefficient',
    icon: 'activity',
    blurb: 'F is read from the Indal Aluminium Busbar Manual chart (cross-referenced to IEEE 605-2023 Table H.7), not computed by formula. Enter manual override if needed.',
    fields: [
      { key: 'skinEffectFactorOverride', label: 'Skin Effect Coefficient (F) — manual chart reading', type: 'number', required: false, placeholder: 'Leave blank to use built-in lookup' },
    ]
  },
  {
    id: 'shortCircuitParams',
    name: 'Short-Circuit Withstand',
    icon: 'alert-triangle',
    blurb: 'Thermal withstand parameters for the fault-current duration.',
    fields: [
      { key: 'finalTempC', label: 'Maximum Conductor Temperature During Fault (Tf)', type: 'number', required: true, unit: '°C', placeholder: '250' },
      { key: 'initialTempC', label: 'Initial Conductor Temperature (Ti)', type: 'number', required: true, unit: '°C', placeholder: '90' },
      { key: 'shortCircuitMaterialConstantC', label: 'Material Constant (C) — 0.1440 for in², 0.0002232 for mm²', type: 'number', required: true, placeholder: '0.1440' },
    ]
  },
];
