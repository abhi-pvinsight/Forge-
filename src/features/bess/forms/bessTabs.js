export const BESS_TABS = [
  {
  id: 'client',
  name: 'Client Information',
  icon: 'briefcase',
  blurb: 'Identifies the client and the engagement on the report cover sheet.',
  fields: [{
    key: 'clientName',
    label: 'Client / Company name',
    type: 'text',
    // required: true,
    placeholder: 'e.g. Aurora Renewables LLC'
  }, {
    key: 'clientContact',
    label: 'Primary contact',
    type: 'text',
    placeholder: 'Full name'
  }, {
    key: 'clientEmail',
    label: 'Contact email',
    type: 'text',
    placeholder: 'name@company.com'
  }, {
    key: 'clientAddress',
    label: 'Client address',
    type: 'textarea',
    placeholder: 'Street, City, State, Country'
  }, {
    key: 'consultant',
    label: 'Consultant / EPC',
    type: 'text',
    placeholder: 'Preparing organization',
    // required: true
  }]
}, 

// {
//   id: 'project',
//   name: 'Project Information',
//   icon: 'map',
//   blurb: 'Drives the document number, revision and project descriptors.',
//   fields: [{
//     key: 'projectName',
//     label: 'Project name',
//     type: 'text',
//     required: true,
//     placeholder: 'e.g. Sandhills Solar Phase II'
//   }, {
//     key: 'projectCode',
//     label: 'Project code',
//     type: 'text',
//     required: true,
//     mono: true,
//     placeholder: 'SH2',
//     hint: 'Used in the generated document number.'
//   }, {
//     key: 'capacityAc',
//     label: 'AC capacity',
//     type: 'number',
//     unit: 'MW',
//     placeholder: '150'
//   }, {
//     key: 'capacityDc',
//     label: 'DC capacity',
//     type: 'number',
//     unit: 'MWp',
//     placeholder: '198'
//   }, {
//     key: 'location',
//     label: 'Site location',
//     type: 'text',
//     placeholder: 'City, State / Country',
//     required: true
//   }, {
//     key: 'latitude',
//     label: 'Latitude',
//     type: 'number',
//     unit: '°',
//     mono: true,
//     placeholder: '33.4484'
//   }, {
//     key: 'longitude',
//     label: 'Longitude',
//     type: 'number',
//     unit: '°',
//     mono: true,
//     placeholder: '-112.0740'
//   }, {
//     key: 'revision',
//     label: 'Revision',
//     type: 'select',
//     options: ['R0', 'R1', 'R2', 'R3'],
//     required: true,
//     mono: true
//   }

// ] }, 


 // PROJECT
{
  id: "project",
  name: "Project Information",
  icon: "map",
  fields: [
    { key: "projectName", label: "Project Name", type: "text" },
    { key: "projectSite", label: "Project Site", type: "text" },
    { key: "state", label: "State", type: "text" },
    { key: "county", label: "County", type: "text" },
    { key: "country", label: "Country", type: "text" },
    { key: "coordinates", label: "Coordinates", type: "text" },

    { key: "projectCapacityMW", label: "Power Capacity", type: "number", unit: "MW" },
    { key: "projectCapacityMWh", label: "Energy Capacity", type: "number", unit: "MWh" },
    { key: "projectDurationHours", label: "Duration", type: "number", unit: "Hours" },

    { key: "bessPowerRating", label: "BESS Power Rating", type: "number", unit: "MW" },
    { key: "bessEnergyRating", label: "BESS Energy Rating", type: "number", unit: "MWh" },

    { key: "powerFactor", label: "Power Factor", type: "text" },
    { key: "powerFactorLeadLag", label: "PF Lead/Lag", type: "text" }
  ]
},

// SITE
{
  id: "site",
  name: "Site Conditions",
  icon: "cloud",
  fields: [
    { key: "utilityName", label: "Utility Name", type: "text" },
    { key: "fenceArea", label: "Fence Area", type: "number", unit: "Acres" },
    { key: "cyclesPerDay", label: "Cycles Per Day", type: "number" },
    { key: "annualCycles", label: "Annual Cycles", type: "number" },

    { key: "maxTemp", label: "Max Ambient Temp", type: "number", unit: "°F" },
    { key: "minTemp", label: "Min Ambient Temp", type: "number", unit: "°F" },
    { key: "tempDesign", label: "Design Temp", type: "number", unit: "°F" },

    { key: "altitude", label: "Altitude", type: "number", unit: "ft" },
    { key: "windSpeed", label: "Wind Speed", type: "number", unit: "mph" },
    { key: "snowLoad", label: "Snow Load", type: "number", unit: "psf" },
    { key: "snowDepth", label: "Snow Depth", type: "number", unit: "inch" }
  ]
},

// ELECTRICAL
{
  id: "electrical",
  name: "Electrical System",
  icon: "zap",
  fields: [
    { key: "poiVoltage", label: "POI Voltage", type: "number", unit: "kV" },
    { key: "mvVoltage", label: "MV Voltage", type: "number", unit: "kV" },
    { key: "lvVoltage", label: "LV Voltage", type: "number", unit: "V" },
    { key: "dcVoltage", label: "DC Voltage", type: "number", unit: "V" },

    { key: "noOfVCB", label: "Number of VCB Feeders", type: "number" }
  ]
},

// BATTERY
{
  id: "battery",
  name: "Battery System",
  icon: "battery",
  fields: [
    { key: "batteryTechnology", label: "Technology", type: "text" },
    { key: "bessManufacturer", label: "Manufacturer", type: "text" },
    { key: "bessModel", label: "Model", type: "text" },

    { key: "batteryMinVoltage", label: "Min Voltage", type: "number", unit: "Vdc" },
    { key: "batteryMaxVoltage", label: "Max Voltage", type: "number", unit: "Vdc" },

    { key: "batteryRatedVoltage", label: "Rated Voltage", type: "number", unit: "V" },
    { key: "batteryRatedCurrent", label: "Rated Current", type: "number", unit: "A" },

    { key: "bessDimension", label: "Dimensions", type: "text" },
    { key: "bessEnergyPerEnclosure", label: "Energy / Enclosure", type: "number", unit: "kWh" },
    { key: "noOfEnclosures", label: "No. Of Enclosures", type: "number" },

    { key: "coolingMethod", label: "Cooling Method", type: "text" },
    { key: "ipRating", label: "IP Rating", type: "text" },

    { key: "bessDesignLife", label: "Design Life", type: "number", unit: "Years" },
    { key: "batteryCertification", label: "Certification", type: "textarea" },

    { key: "tempMin", label: "Internal Temp Min", type: "number", unit: "°C" },
    { key: "tempMax", label: "Internal Temp Max", type: "number", unit: "°C" }
  ]
},

// PCS
{
  id: "pcs",
  name: "PCS Information",
  icon: "cpu",
  fields: [
    { key: "pcsManufacturer", label: "PCS Manufacturer", type: "text" },
    { key: "pcsModel", label: "PCS Model", type: "text" },
    { key: "pcsRating", label: "PCS Rating", type: "number", unit: "kVA" },
    { key: "pcsDimension", label: "PCS Dimensions", type: "text" },

    { key: "pcsAcVoltage", label: "AC Voltage", type: "number", unit: "Vac" },
    { key: "pcsDcVoltageRange", label: "DC Voltage Range", type: "text" },

    { key: "pcsFrequency", label: "Frequency", type: "number", unit: "Hz" },
    { key: "pcsEfficiency", label: "Efficiency", type: "number", unit: "%" },
    { key: "pcsThd", label: "THD", type: "number", unit: "%" },

    { key: "pcsProtection", label: "Protection", type: "text" },
    { key: "pcsCooling", label: "Cooling", type: "text" },
    { key: "pcsOutputProtection", label: "Output Protection", type: "text" },
    { key: "pcsOvervoltageProtection", label: "Overvoltage Protection", type: "text" },
    { key: "pcsCommunication", label: "Communication", type: "text" },

    { key: "pcsAltitude", label: "Altitude Limit", type: "number", unit: "m" },

    { key: "noOfPCS", label: "No. Of PCS", type: "number" },
    { key: "totalPCSPowerRating", label: "Total PCS Rating", type: "number", unit: "MVA" },
    { key: "totalBessEnergyRating", label: "Total BESS Energy", type: "number", unit: "MWh" }
  ]
},

// TRANSFORMER
{
  id: "transformer",
  name: "Transformer",
  icon: "layers",
  fields: [
    { key: "mvtManufacturer", label: "Manufacturer", type: "text" },
    { key: "mvtRating", label: "Rating", type: "number", unit: "kVA" },
    { key: "transformerVoltageRating", label: "Voltage Rating", type: "text" },
    { key: "transformerImpedance", label: "Impedance", type: "number", unit: "%" },
    { key: "transformerWindingMaterial", label: "Winding Material", type: "text" },
    { key: "transformerCooling", label: "Cooling", type: "text" },
    { key: "maxMvtLoop", label: "Max Loop", type: "number" }
  ]
},

  {
  id: "uploads",
  name: "Datasheets & Uploads",
  icon: "paperclip",

  blurb:
    "Attach source datasheets used for BESS sizing and design validation.",

  uploads: [
    {
      key: "batteryDs",
      label: "Battery Datasheet",
      hint: "PDF · Manufacturer battery specification",
      // required: true,
    },
    {
      key: "pcsDs",
      label: "PCS Datasheet",
      hint: "PDF · PCS manufacturer specification",
      // required: true,
    },
    {
      key: "transformerDs",
      label: "Transformer Datasheet",
      hint: "PDF · MV transformer specification",
      // required: false,
    }
  ]
},

];