/**
 * busbarDefaults.js
 */

export const ALUMINUM_TUBE_SPECS = [
  { label: '1.0" (Sch 40)', outerDiameterIn: 1.315, innerDiameterIn: 1.049, thicknessIn: 0.133, weightLbPerFt: 0.581 },
  { label: '1.0" (Sch 80)', outerDiameterIn: 1.315, innerDiameterIn: 0.957, thicknessIn: 0.179, weightLbPerFt: 0.751 },
  { label: '1.25" (Sch 40)', outerDiameterIn: 1.66, innerDiameterIn: 1.38, thicknessIn: 0.14, weightLbPerFt: 0.786 },
  { label: '1.25" (Sch 80)', outerDiameterIn: 1.66, innerDiameterIn: 1.278, thicknessIn: 0.191, weightLbPerFt: 1.037 },
  { label: '1.5" (Sch 40)', outerDiameterIn: 1.9, innerDiameterIn: 1.61, thicknessIn: 0.145, weightLbPerFt: 0.94 },
  { label: '1.5" (Sch 80)', outerDiameterIn: 1.9, innerDiameterIn: 1.5, thicknessIn: 0.2, weightLbPerFt: 1.256 },
  { label: '2.0" (Sch 40)', outerDiameterIn: 2.375, innerDiameterIn: 2.067, thicknessIn: 0.154, weightLbPerFt: 1.264 },
  { label: '2.0" (Sch 80)', outerDiameterIn: 2.375, innerDiameterIn: 1.939, thicknessIn: 0.218, weightLbPerFt: 1.737 },
  { label: '2.5" (Sch 40)', outerDiameterIn: 2.875, innerDiameterIn: 2.469, thicknessIn: 0.203, weightLbPerFt: 2.004 },
  { label: '2.5" (Sch 80)', outerDiameterIn: 2.875, innerDiameterIn: 2.323, thicknessIn: 0.276, weightLbPerFt: 2.65 },
  { label: '3.0" (Sch 40)', outerDiameterIn: 3.5, innerDiameterIn: 3.068, thicknessIn: 0.216, weightLbPerFt: 2.621 },
  { label: '3.0" (Sch 80)', outerDiameterIn: 3.5, innerDiameterIn: 2.9, thicknessIn: 0.3, weightLbPerFt: 3.547 },
  { label: '3.5" (Sch 40)', outerDiameterIn: 4.0, innerDiameterIn: 3.548, thicknessIn: 0.226, weightLbPerFt: 3.151 },
  { label: '3.5" (Sch 80)', outerDiameterIn: 4.0, innerDiameterIn: 3.364, thicknessIn: 0.318, weightLbPerFt: 4.326 },
  { label: '4.0" (Sch 40)', outerDiameterIn: 4.5, innerDiameterIn: 4.026, thicknessIn: 0.237, weightLbPerFt: 3.733 },
  { label: '4.0" (Sch 80)', outerDiameterIn: 4.5, innerDiameterIn: 3.826, thicknessIn: 0.337, weightLbPerFt: 5.183 },
  { label: '4.5" (Sch 40)', outerDiameterIn: 5.001, innerDiameterIn: 4.507, thicknessIn: 0.247, weightLbPerFt: 4.337 },
  { label: '4.5" (Sch 80)', outerDiameterIn: 5.0, innerDiameterIn: 4.29, thicknessIn: 0.355, weightLbPerFt: 6.092 },
  { label: '5.0" (Sch 40)', outerDiameterIn: 5.563, innerDiameterIn: 5.047, thicknessIn: 0.258, weightLbPerFt: 5.057 },
  { label: '5.0" (Sch 80)', outerDiameterIn: 5.563, innerDiameterIn: 4.813, thicknessIn: 0.375, weightLbPerFt: 7.188 },
  { label: '6.0" (Sch 40)', outerDiameterIn: 6.625, innerDiameterIn: 6.065, thicknessIn: 0.28, weightLbPerFt: 6.564 },
  { label: '6.0" (Sch 80)', outerDiameterIn: 6.625, innerDiameterIn: 5.761, thicknessIn: 0.432, weightLbPerFt: 9.884 },
  { label: '8.0" (Sch 40)', outerDiameterIn: 8.625, innerDiameterIn: 7.981, thicknessIn: 0.322, weightLbPerFt: 9.879 },
  { label: '8.0" (Sch 80)', outerDiameterIn: 8.625, innerDiameterIn: 7.625, thicknessIn: 0.5, weightLbPerFt: 15.009 },
];

export const ALUMINUM_TUBE_CATALOG_CONSTANTS = {
  conductivityPctIACS: 53,
  emissivity: 0.5,
  solarAbsorption: 0.5,
  yieldPointStressNPerM2: 165000000,
  modulusOfElasticityNPerM2: 68900000000,
  specificHeatCalPerGmDegC: 0.2096,
  resistivityOhmMm2PerM: 0.0286,
  tempCoefficientOfResistivity: 0.004,
};

export function calcTubeCrossSectionAreaIn2(outerDiameterIn, innerDiameterIn) {
  return (Math.PI * (Math.pow(outerDiameterIn, 2) - Math.pow(innerDiameterIn, 2))) / 4;
}

export const BUSBAR_DEFAULTS = {
  reportTitle: 'Aluminium Bus Bar Sizing & Ampacity Report',
  projectName: '345kV Substation Project',
  clientName: 'Signal Energy',
  projectCode: 'PVI-BUS',
  plant_name: '345kV Collector Substation',
  location: 'Plano, TX',
  documentNo: 'PVI-BUS-001',
  revision: 'A',
  preparedDate: new Date().toLocaleDateString("en-GB"),
  preparedBy: 'PVinsight Inc',
  submittedToCompany: 'Signal Energy',
  submittedToAddress: '2034 Hamilton Place BLVD. Suite 100\nChattanooga, TN 37421',

  revisions: [
    {
      revision: 'A',
      issueDate: new Date().toLocaleDateString("en-GB").replaceAll("/", "."),
      documentNumber: 'PVI-BUS-001',
      documentName: 'Aluminium Bus Bar Sizing & Ampacity Report',
      description: 'Preliminary Design'
    }
  ],

  systemVoltageKV: 345,
  highestSystemVoltageKV: 362,
  continuousCurrentRatingA: 2000,
  shortCircuitRatingKA: 63,
  systemFrequencyHz: 60,
  faultDurationSec: 0.25,

  ambientTempC: 35.6,
  conductorTempC: 90,
  latitude: 33.4484,
  longitude: -112.0740,
  latitudeDeg: 40,
  solarAltitudeDeg: 73,
  solarAzimuthDeg: 180,
  conductorAzimuthDeg: 0,
  solarIntensityWPerM2: 1037.1,
  altitudeFactorK: 1.0,

  conductorType: '6.0" (Sch 40)',
  conductorMaterial: 'Aluminum Alloy 6063 T6',
  outerDiameterIn: 6.625,
  thicknessIn: 0.28,
  crossSectionAreaIn2: 5.581354,
  conductivityPctIACS: 53,
  emissivity: 0.5,
  solarAbsorption: 0.5,

  skinEffectFactorOverride: undefined,

  finalTempC: 250,
  initialTempC: 90,
  shortCircuitMaterialConstantC: 0.1440,

  citationInputParameters: 'IEEE 605-2023 (Pg No: 263) Table I.3',
  citationConductorCatalog: 'ALCOA Bus Conductor Catalog ACASS0602',
  citationHeatBalanceEq: 'IEEE 605-2023 (Pg No: 40) Cl: 8.2.1 Eq: 1',
  citationDcResistance: 'IEEE 605-2023 (Pg No: 264)',
  citationConvectionLoss: 'IEEE 605-2023 (Pg No: 264)',
  citationRadiationLoss: 'IEEE 605-2023 (Pg No: 263)',
  citationSolarIncidenceAngle: 'IEEE 605-2023 (Pg No: 265)',
  citationSolarHeatGain: 'IEEE 605-2023 (Pg No: 265), Table B.9/B.10/B.11 (Pg 156-157)',
  citationContinuousCapacity: 'IEEE 605-2023 (Pg No: 42), Cl 8.2.6',
  citationSkinEffectChart: 'Indal Aluminium Busbar Manual chart; cross-ref. IEEE 605-2023 Table H.7 (Pg 195)',
  citationEffectiveResistance: 'IEEE 605-2023 (Pg No: 269, Table I.14)',
  citationShortCircuitWithstand: 'IEEE 605-2023 (Pg No: 270, Table I.15)',
};
