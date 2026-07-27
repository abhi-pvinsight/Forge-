export const stringSizingTabs = [
  { id: 'input', label: 'Input' },
  { id: 'output', label: 'Output' },
];



export const STRING_SIZE_TABS = [
  {
    id: 'client',
    name: 'Client Information',
    icon: 'briefcase',
    blurb: 'Identifies the client and the engagement on the report cover sheet.',
    fields: [{
      key: 'clientName',
      label: 'Client / Company name',
      type: 'text',
      required: true,
      placeholder: 'e.g. Aurora Renewables LLC'
    }, {
      key: 'clientContact',
      label: 'Primary contact',
      type: 'text',
      required: true,
      placeholder: 'Full name'
    }, {
      key: 'clientEmail',
      label: 'Contact email',
      type: 'text',
      required: true,
      placeholder: 'name@company.com'
    },
    {
      key: 'clientLogo',
      label: 'Client Logo',
      type: 'file',
      required: false,
      hint: 'Upload company logo image (.png, .jpg, .svg, .webp)'
    },
    {
      key: 'clientAddress',
      label: 'Client address',
      type: 'textarea',
      required: true,
      placeholder: 'Street, City, State, Country'
    }, {
      key: 'consultant',
      label: 'Consultant / EPC',
      type: 'text',
      placeholder: 'Preparing organization',
      required: true
    }]
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
  {
    id: 'project',
    name: 'Project Information',
    icon: 'map',
    blurb: 'Drives the document number, revision and project descriptors.',
    fields: [{
      key: 'plant_name',
      label: 'Project name',
      type: 'text',
      required: true,
      placeholder: 'e.g. Sandhills Solar Phase II'
    }, {
      key: 'projectCode',
      label: 'Project code',
      type: 'text',
      required: true,
      mono: true,
      placeholder: 'SH2',
      hint: 'Used in the generated document number.'
    },
    {
      key: 'county',
      label: 'Project County',
      type: 'text',
      required: true,
      mono: true,
      placeholder: 'Maricopa',
    },

    {
      key: 'state',
      label: 'Project State',
      type: 'text',
      required: true,
      mono: true,
      placeholder: 'AZ',
    },

    {
      key: 'ac_capacity',
      label: 'AC capacity',
      type: 'number',
      unit: 'MW',
      required: true,
      placeholder: '150'
    }, {
      key: 'dc_capacity',
      label: 'DC capacity',
      type: 'number',
      required: true,
      unit: 'MW (POI)',
      placeholder: '198'
    },
    {
      key: 'delivery_company',
      label: 'Distribution Company',
      type: 'text',
      required: true,
      mono: true,
      placeholder: 'TATA POWER',
    }, {
      key: 'poi_voltage',
      label: 'POI Voltage',
      type: 'number',
      required: true,
      unit: 'kV',
      placeholder: '198'
    }, {
      key: 'latitude',
      label: 'Latitude',
      type: 'number',
      unit: '°',
      mono: true,
      required: true,
      placeholder: '33.4484'
    }, {
      key: 'longitude',
      label: 'Longitude',
      type: 'number',
      unit: '°',
      mono: true,
      required: true,
      placeholder: '-112.0740'
    }, {
      key: 'Total Area of the Plant',
      label: 'Total Area of the Plant',
      type: 'number',
      unit: 'Acres',
      mono: true,
      required: true,
      placeholder: '1000'
    },
    {
      key: 'revision',
      label: 'Revision',
      type: 'select',
      options: ['R0', 'R1', 'R2', 'R3'],
      required: true,
      mono: true
    }]
  },

  {
    id: 'uploads',
    name: 'Datasheets & Uploads',
    icon: 'paperclip',
    blurb: 'Attach source datasheets. These feed the technical inputs and are referenced in the report appendix.',
    uploads: [
      {
        key: "pvsystReport",
        label: "PVsyst Loss Diagram Report",
        accept: ".pdf",
        required: false
      }, {
        key: "moduleExcel",
        label: "Module Datasheet Excel",
        required: true,
        hint: "Upload extracted module datasheet workbook"
      }, {
        key: "Results_of_26-year_voltage",
        label: "Results of 26-year historical SAM simulation voltage chart",
        hint: "Image file (PNG, JPG) · simulation chart",
        required: false
      }, {
        key: "Results_of_26-year_current",
        label: "Results of 26-year historical SAM simulation current chart",
        hint: "Image file (PNG, JPG) · simulation chart",
        required: false
      }

    ]
  },


  {
    id: 'technical',
    name: 'Technical Inputs',
    icon: 'sliders',
    blurb: 'Module, inverter and site temperature data. Drives the string-sizing calculation.',
    groups: [

      {
        title: 'Voltage Inputs  ',
        fields: [{
          key: 'mv_voltage',
          label: 'MV Collection Voltage',
          type: 'number',
          unit: 'kV',
          placeholder: '120',
          required: true
        }, {
          key: 'lv_voltage',
          label: 'LV Collection Voltage',
          type: 'number',
          unit: 'kV',
          placeholder: '660',
          required: true,
        }, {
          key: 'dc_ac_ratio_poi',
          label: ' DC/AC Ratio at POI',
          type: 'number',
          mono: true,
          required: true,
          placeholder: 'Greater than 1'
        }, {
          key: 'dc_ac_ratio_inv',
          label: ' DC/AC Ratio at INV',
          type: 'number',
          mono: true,
          required: true,
          placeholder: 'Greater than 1'
        }, {
          key: 'pv_area',
          label: 'PV Area',
          type: 'number',
          unit: 'Acres',
          mono: true,
          required: true,
          placeholder: '1000'
        }, {
          key: 'Pitch',
          label: 'Pitch',
          type: 'number',
          unit: 'm',
          required: true,
          placeholder: '6.0'
        }, {
          key: 'gcr',
          label: 'Ground Coverage Ratio (GCR)',
          type: 'text',
          unit: '%',
          required: true,
          placeholder: '33.2'
        }
          // }, {
          //   key: 'temp_min',
          //   label: 'Temprature Min',
          //   type: 'number',
          //   unit: 'Deg C',
          //   mono: true,
          //  require:true,
          //   placeholder: '-5'
          // }, {
          //   key: 'temp_max',
          //   label: 'Temprature Max',
          //   type: 'number',
          //   unit: 'Deg C',
          //   mono: true,
          //  require:true,
          //   placeholder: '32'
          // }
        ]
      },
      {
        title: 'PV Module',
        fields: [
          {
            key: 'module_make',
            label: 'Module Manufacture',
            type: 'text',
            placeholder: 'e.g. Adani',
            required: true
          }, {
            key: 'module_model',
            label: 'Module make / model',
            type: 'text',
            placeholder: 'e.g. LR7-72HGD 580M',
            required: true
          }, {
            key: 'module_wp1',
            label: 'Module Wp1',
            type: 'select',
            options: ['550 Wp', '560 Wp', '570 Wp', '580 Wp', '590 Wp', '600 Wp', '615 Wp', '620 Wp', '680 Wp'],
            required: true
          }, {
            key: 'module_wp2',
            label: 'Module Wp2',
            type: 'select',
            options: ['None', '550 Wp', '560 Wp', '570 Wp', '580 Wp', '590 Wp', '600 Wp', '615 Wp', '620 Wp', '680 Wp'],
            required: true
          }, {
            key: 'module_type',
            label: 'Module Technology',
            type: 'text',
            placeholder: 'Bifacial TOPCon Half-cut cell',
            required: true
          }, {
            key: 'moduleVoc',
            label: 'Voc (STC)',
            type: 'number',
            unit: 'V',
            mono: true,
            required: true,
            placeholder: '52.00'
          }, {
            key: 'moduleVmp',
            label: 'Vmp (STC)',
            type: 'number',
            unit: 'V',
            mono: true,
            required: true,
            placeholder: '43.40'
          }, {
            key: 'moduleIsc',
            label: 'Isc (STC)',
            type: 'number',
            unit: 'A',
            mono: true,
            required: true,
            placeholder: '14.02'
          }, {
            key: 'moduleImp',
            label: 'Imp (STC)',
            type: 'number',
            unit: 'A',
            mono: true,
            required: true,
            placeholder: '13.37'
          }, {
            key: 'modulePmax',
            label: 'Pmax (STC)',
            type: 'number',
            unit: 'Wp',
            mono: true,
            required: true,
            placeholder: '580'
          }, {
            key: 'string_size',
            label: 'String Size',
            type: 'number',
            unit: 'No.',
            mono: true,
            required: true,
            placeholder: '28'
          }, {
            key: 'tempCoeffVoc',
            label: 'Temp. coeff. of Voc',
            type: 'number',
            unit: '%/°C',
            mono: true,
            required: true,
            placeholder: '-0.250',
            hint: 'Negative value, from datasheet (βVoc).'
          },
          { key: "module_qty_615", label: "Total number of PV Modules 615Wp ", type: "number", required: true, },
          { key: "module_qty_620", label: "Total number of PV 620W Module Quantity", type: "number", required: true, },
          { key: "module_dimensions", label: "Module Dimensions", type: "text", required: true, },

          {
            key: 'modules_series',
            label: 'Number of Modules in Series',
            type: 'number',
            placeholder: '2',
            required: true,
          },
          {
            key: 'moduleDegradation',
            label: 'Module Degradation',
            type: 'number',
            unit: '%',
            placeholder: '0.5',
            required: true,
          }
        ]
      },
      {
        title: 'Inverter',
        fields: [{
          key: 'Centra_inverter_make',
          label: 'Central Inverter Manufacturer',
          type: 'text',
          placeholder: 'e.g. SunGrow',
          required: true,
        },
        {
          key: 'Centarl_inverter_model',
          label: 'Central Inverter make / model',
          type: 'text',
          placeholder: 'e.g. SG250HX',
          required: true
        }, {
          key: 'Centarl_inverter_rating',
          label: 'Central Inverter Ratinge',
          type: 'number',
          unit: 'V',
          mono: true,
          required: true,
          placeholder: '1500'
        }, {
          key: 'inverter_count',
          label: ' Total number of Central Inverters ',
          type: 'number',
          unit: 'V',
          mono: true,
          required: true,
          placeholder: '500'
        }, {
          key: 'ac_capacity_inv',
          label: 'AC Capacity',
          type: 'number',
          unit: 'MW',
          mono: true,
          required: true,
          placeholder: '150'
        },
          //  {
          //   key: 'invMpptMax',
          //   label: 'MPPT max. voltage',
          //   type: 'number',
          //   unit: 'V',
          //   mono: true,
          //   placeholder: '1500'
          // }, {
          //   key: 'invImaxMppt',
          //   label: 'Max. input current / MPPT',
          //   type: 'number',
          //   unit: 'A',
          //   mono: true,
          //   placeholder: '40'
          // }, {
          //   key: 'invMpptCount',
          //   label: 'Number of MPPTs',
          //   type: 'number',
          //   mono: true,
          //   placeholder: '12'
          // }
        ]
      },
      {
        title: 'Transforme & ',
        fields: [
          {
            key: 'mv_transformer',
            label: 'MV Transformer Capacity',
            type: 'text',
            placeholder: 'e.g. Adani',
            required: true
          }, {
            key: 'pcs_dimensions',
            label: 'PCS dimension (W x H x D) ',
            type: 'text',
            placeholder: 'e.g.  6058 x 2896 x 2438',
            unit: 'mm',
            required: true
          }, {
            key: 'max_lbd_per_pcs',
            label: 'Max LBDs per PCS',
            type: 'number',
            placeholder: '12',
            required: true
          }, {
            key: 'pcs_loop_count',
            label: 'Max PCS Looped Together',
            type: 'number',
            placeholder: '7',
            required: true
          }, {
            key: 'feeder_capacity',
            label: 'Feeder Capacity',
            type: 'text',
            unit: 'MW',
            placeholder: '12.5',
            required: true
          }, {
            key: 'total_feeders',
            label: 'Total Feeder Circuits',
            type: 'number',
            placeholder: '12',
            required: true
          }, {
            key: 'annual_energy',
            label: 'Annual electricity supplied to Grid for 1st year @P50',
            type: 'text',
            placeholder: 'e.g. 125000',
            unit: 'MWh',
            required: true
          },
          {
            key: 'specific_yield',
            label: 'Specific production for 1st year @P50',
            type: 'text',
            placeholder: 'e.g. 1650',
            unit: 'kWh/kWp',
            required: true
          },
          {
            key: 'performance_ratio',
            label: 'Performance Ratio for 1st year @P50',
            type: 'text',
            unit: '%',
            required: true
          },
          {
            key: 'dc_cuf',
            label: 'DC CUF Ratio for 1st year @P50',
            type: 'text',
            unit: '%',
            required: true
          },
          {
            key: 'ac_cuf',
            label: 'AC CUF Ratio for 1st year @P50',
            type: 'text',
            unit: '%',
            required: true
          }
        ]
      },
      {
        title: 'Site Conditions',
        fields: [
          //   {
          //   key: 'tempMin',
          //   label: 'Min. ambient temperature',
          //   type: 'number',
          //   unit: '°C',
          //   mono: true,
          //   required: true,
          //   placeholder: '-5',
          //   hint: 'Record low — drives max string length (cold Voc).'
          // }, {
          //   key: 'tempCellMax',
          //   label: 'Max. cell temperature',
          //   type: 'number',
          //   unit: '°C',
          //   mono: true,
          //   required: true,
          //   placeholder: '70',
          //   hint: 'Drives min string length (hot Vmp).'
          // },
          {
            key: 'designStd',
            label: 'Design standard',
            type: 'select',
            options: ['IEC 62548', 'NEC 2023', 'IEC 60364-7-712', 'AS/NZS 5033'],
            mono: true,
            required: true
          }, {
            key: "ghi",
            required: true,
            label: "Annual Global Solar Irradiance (GHI) ",
            type: "number",

          }, {
            key: "dsi",
            label: " Annual Diffuse Solar Irradiance (DSI)",
            type: "number",
            required: true,

          }, {
            key: "altitude",
            label: "Altitude",
            type: "number",
            unit: "ft",
            required: true,

          }, {
            key: "wind_speed",
            label: "Wind Speed",
            type: "number",
            unit: "mph",
            required: true,

          }, {
            key: "snow_load",
            label: "Snow Load",
            type: "number",
            unit: "psf",
            required: true,

          }, {
            key: "risk_category",
            label: "Risk Category",
            type: 'select',
            options: ['CAT-I', 'CAT-II', 'IEC 60364-7-712', 'AS/NZS 5033'],
            required: true
          }, {
            key: "met_source",
            label: 'Meteorological Data source',
            type: 'select',
            options: ['IMD (India)', 'NOAA (USA)', 'NASA Earth Data', 'OPEN_METEO', 'SolarGIS'
            ],
            required: true
          }, {
            key: "data_format",
            label: " Meteorological Data format",
            type: 'select',
            options: ['TMY (Typical Meteorological Year)',
              'Hourly Data',
              'SolarGIS'],
            required: true
          }

        ]
      }]
  },

  {
    id: "albedo",
    name: "Albedo Inputs",
    icon: "sun",
    blurb: "Monthly Ground Albedo values obtained from weather database for site bifacial gain calculations.",
    groups: [
      {
        title: "Weather & Monthly Albedo Inputs",
        fields: [
          { key: "weather_database", label: "Weather Database", type: "text", defaultValue: "SOLCAST(DNV)", placeholder: "SOLCAST(DNV)", required: true },
          { key: "albedo_jan", label: "January Albedo", type: "number", step: "0.01", defaultValue: "0.20", placeholder: "0.20", required: true, size: "half" },
          { key: "albedo_feb", label: "February Albedo", type: "number", step: "0.01", defaultValue: "0.20", placeholder: "0.20", required: true, size: "half" },
          { key: "albedo_mar", label: "March Albedo", type: "number", step: "0.01", defaultValue: "0.20", placeholder: "0.20", required: true, size: "half" },
          { key: "albedo_apr", label: "April Albedo", type: "number", step: "0.01", defaultValue: "0.20", placeholder: "0.20", required: true, size: "half" },
          { key: "albedo_may", label: "May Albedo", type: "number", step: "0.01", defaultValue: "0.20", placeholder: "0.20", required: true, size: "half" },
          { key: "albedo_jun", label: "June Albedo", type: "number", step: "0.01", defaultValue: "0.20", placeholder: "0.20", required: true, size: "half" },
          { key: "albedo_jul", label: "July Albedo", type: "number", step: "0.01", defaultValue: "0.20", placeholder: "0.20", required: true, size: "half" },
          { key: "albedo_aug", label: "August Albedo", type: "number", step: "0.01", defaultValue: "0.20", placeholder: "0.20", required: true, size: "half" },
          { key: "albedo_sep", label: "September Albedo", type: "number", step: "0.01", defaultValue: "0.20", placeholder: "0.20", required: true, size: "half" },
          { key: "albedo_oct", label: "October Albedo", type: "number", step: "0.01", defaultValue: "0.20", placeholder: "0.20", required: true, size: "half" },
          { key: "albedo_nov", label: "November Albedo", type: "number", step: "0.01", defaultValue: "0.20", placeholder: "0.20", required: true, size: "half" },
          { key: "albedo_dec", label: "December Albedo", type: "number", step: "0.01", defaultValue: "0.20", placeholder: "0.20", required: true, size: "half" },
          { key: "albedo_avg", label: "Average Albedo", type: "number", step: "0.01", defaultValue: "0.20", placeholder: "0.20", required: true, size: "half" }
        ]
      }
    ]
  },

  {
    id: "tracker",
    name: "Tracker System",
    icon: "moter",
    blurb: "Information about the tracker system used in the PV installation.",
    groups: [
      {
        title: 'Voltage Inputs  ',
        fields: [{ key: "tracker_make", label: "Tracker Make", type: "text", required: true },
        { key: "tracker_model", label: "Tracker Model", type: "text", required: true },
        { key: "tracking_range", label: "Tracking Range", type: "text", required: true },]
      },
      {
        title: 'Tracker 1 info',
        fields: [
          { key: "tracker_type_1", label: "Tracker Type 1", type: "Select", required: true, span: 2, options: ["4 String", "3 String", "2 String", "1 String", "4P", "3P", "2P", "1P"] },
          { key: "tracker_module_1", label: "Modules per Tracker 1", type: "number", required: true, size: 'half' },
          { key: "tracker_quantity_1", label: "Tracker Quantity 1", type: "text", required: true, size: 'half' }
        ]
      },
      {
        title: 'Tracker 2 info',
        fields: [
          { key: "tracker_type_2", label: "Tracker Type 2", type: "Select", required: true, span: 2, options: ["3 String", "4 String", "2 String", "1 String", "3P", "4P", "2P", "1P"] },
          { key: "tracker_module_2", label: "Modules per Tracker 2", type: "number", required: true, size: 'half' },
          { key: "tracker_quantity_2", label: "Tracker Quantity 2", type: "text", required: true, size: 'half' }
        ]
      },
      {
        title: 'Tracker 3 info',
        fields: [
          { key: "tracker_type_3", label: "Tracker Type 3", type: "Select", required: true, span: 2, options: ["2 String", "4 String", "3 String", "1 String", "2P", "4P", "3P", "1P"] },
          { key: "tracker_module_3", label: "Modules per Tracker 3", type: "number", required: true, size: 'half' },
          { key: "tracker_quantity_3", label: "Tracker Quantity 3", type: "text", required: true, size: 'half' }
        ]
      },

    ]
  },

  {
    id: "dcCable",
    name: "DC Cable",
    icon: "git-branch",
    title: "DC Cable",
    blurb: "Details about the DC cables used in the system.",
    fields: [
      { key: "DC_Cable_Sizes", label: "Cable Sizes", type: "text", required: true },
      { key: "DC_Cable_Rated_Voltage", label: "Rated Voltage", type: "text", required: true },
      { key: "DC_Cable_Conductor_Material", label: "Conductor Material", type: "text", required: true },
      { key: "DC_Cable_Conductor_Type", label: "Conductor Type", type: "text", required: true },
      { key: "DC_Cable_Insulation_Type", label: "Insulation Type", type: "text", required: true },
      { key: "DC_Cable_UV_Sunlight_Resistant", label: "UV/Sunlight Resistant", type: "text", required: true },
      { key: "DC_Cable_Temperature_Rating", label: "Temperature Rating", type: "text", required: true },
      { key: "DC_Cable_UL_Certification", label: "UL Certification", type: "text", required: true },
      { key: "DC_Cable_RoHS_Compliant", label: "RoHS Compliant", type: "text", required: true },
      { key: "DC_Cable_NEC_Compliant", label: "NEC Compliant", type: "text", required: true }
    ]
  },

  {
    id: "pvConnector",
    name: "PV Connectors",
    icon: "plug",
    title: "PV Connectors",
    blurb: "Details about the PV connectors used in the system.",
    fields: [
      { key: "PV_Connector_Make", label: "Make", type: "text", required: true },
      { key: "PV_Connector_Model", label: "Model", type: "text", required: true },
      { key: "PV_Connector_System_Voltage", label: "System Voltage", type: "text", required: true },
      { key: "PV_Connector_Connection_Type", label: "Connection Type", type: "text", required: true },
      { key: "PV_Connector_Contact_Material", label: "Contact Material", type: "text", required: true },
      { key: "PV_Connector_Life_Expectancy", label: "Life Expectancy", type: "text", required: true },
      { key: "PV_Connector_Protection", label: "Protection", type: "text", required: true },
      { key: "PV_Connector_Ambient_Temperature", label: "Ambient Temperature", type: "text", required: true },
      { key: "PV_Connector_UL_Certification", label: "UL Certification", type: "text", required: true }
    ]
  },

  {
    id: "trunkCable",
    name: "Trunk Cable",
    icon: "link",
    blurb: "Details about the trunk cables used in the system.",
    title: "Trunk Cable",
    fields: [
      { key: "Trunk_Cable_Make", label: "Make", type: "text", required: true },
      { key: "Trunk_Cable_Max_System_Voltage", label: "Max System Voltage", type: "text", required: true },
      { key: "Trunk_Cable_Maximum_OCPD_per_String", label: "Maximum OCPD/String", type: "text", required: true },
      { key: "Trunk_Cable_Selected_Trunk_System_Size", label: "Selected Trunk Size", type: "text", required: true },
      { key: "Trunk_Cable_Max_No_of_Input_Circuits", label: "Max Input Circuits", type: "number", required: true },
      { key: "Trunk_Cable_Ambient_Temperature", label: "Ambient Temperature", type: "text", required: true }
    ]
  },

  {
    id: "lbd",
    name: "Load Break Disconnect",
    icon: "toggle-right",
    title: "Load Break Disconnect",
    blurb: "Details about the load break disconnect used in the system.",

    fields: [
      { key: "LBD_Manufacturer", label: "Manufacturer", type: "text", required: true },
      { key: "LBD_Max_System_Voltage", label: "Max System Voltage", type: "text", required: true },
      { key: "LBD_Amperage_Rating", label: "Amperage Rating", type: "text", required: true },
      { key: "LBD_Short_Circuit_Current_Rating", label: "Short Circuit Current Rating", type: "text", required: true },
      { key: "LBD_Input_Wire_Size", label: "Input Wire Size", type: "text", required: true },
      { key: "LBD_Output_Wire_Size", label: "Output Wire Size", type: "text", required: true },
      { key: "LBD_Max_Ambient_Temp_Rating", label: "Max Ambient Temperature", type: "text", required: true },
      { key: "LBD_Certification_Standards", label: "Certification Standards", type: "textarea", required: true },
      { key: "LBD_Enclosure_Fiberglass", label: "Enclosure Fiberglass", type: "text", required: true }
    ]
  },

  {
    id: "pcs",
    name: "PCS Technical Specifications",
    icon: "cpu",
    title: "PCS Technical Specifications",
    blurb: "Details about the PCS technical specifications used in the system.",

    fields: [
      {
        key: "PCS_Model_Name", label: "PCS Model Name", type: "text", required: true
      },

      {
        key: "PCS_Max_DC_Input_Voltage", label: "Max. DC Input Voltage", type: "text", required: true
      },

      {
        key: "PCS_Min_PV_Input_Voltage",
        label: "Min. PV Input Voltage ",
        type: "text", required: true
      },

      {
        key: "Start_Up_Input_Voltage",
        label: " Min Start-up Input Voltage",
        type: "text", required: true
      },

      {
        key: "PCS_MPP_Tracker_Min_Voltage_Range",
        label: "MPP Tracker (MPPT) Min Voltage Range",
        type: "text", required: true
      },

      {
        key: "PCS_MPP_Tracker_Max_Voltage_Range",
        label: "MPP Tracker (MPPT) Max Voltage Range",
        type: "text", required: true
      },

      {
        key: "PCS_Full_Power_MPP_Voltage_Range_40C",
        label: "Full Power MPP Voltage Range @40°C",
        type: "text",
        required: true
      },

      {
        key: "PCS_Available_DC_Fuse_Sizes",
        label: "Available DC Fuse Sizes",
        type: "text",
        required: true
      },

      {
        key: "PCS_No_of_Independent_MPPT",
        label: "No. of Independent MPPT",
        type: "number",
        required: true
      },

      {
        key: "PCS_Max_PV_Input_Current",
        label: "Max. PV Input Current",
        type: "text",
        required: true
      },

      {
        key: "PCS_Max_PV_Short_Circuit_Current",
        label: "Max. PV Short Circuit Current",
        type: "text",
        required: true
      },

      {
        key: "PCS_Number_of_DC_Inputs",
        label: "Number of DC Inputs",
        type: "number",
        required: true
      },

      {
        key: "PCS_DC_Surge_Protection",
        label: "DC Surge Protection",
        type: "text",
        required: true
      },

      {
        key: "PCS_Max_AC_Output_Power",
        label: "Max. AC Output Power",
        type: "text",
        required: true
      },

      {
        key: "PCS_Rated_Output_Frequency_Range",
        label: "Rated Output Frequency / Range",
        type: "text",
        required: true
      },

      {
        key: "PCS_THD",
        label: "THD",
        type: "text",
        required: true
      },

      {
        key: "PCS_Power_Factor",
        label: "Power Factor at Nominal Power / Adjustable Power Factor",
        type: "text",
        required: true
      },

      {
        key: "PCS_Transformer_Rated_Power",
        label: "Transformer Rated Power / Max. Power",
        type: "text",
        required: true
      },

      {
        key: "PCS_Transformer_LV_MV_Voltage",
        label: "Transformer LV/MV Voltage",
        type: "text",
        required: true
      },

      {
        key: "PCS_Transformer_Vector",
        label: "Transformer Vector",
        type: "text",
        required: true
      },

      {
        key: "PCS_Transformer_Cooling_Method",
        label: "Transformer Cooling Method",
        type: "text",
        required: true
      },

      {
        key: "PCS_DC_Input_Protection",
        label: "DC Input Protection",
        type: "text",
        required: true
      },

      {
        key: "PCS_Inverter_Output_Protection",
        label: "Inverter Output Protection",
        type: "text",
        required: true
      },

      {
        key: "PCS_AC_MV_Output_Protection",
        label: "AC MV Output Protection",
        type: "text",
        required: true
      },

      {
        key: "PCS_AC_Surge_Protection",
        label: "AC Surge Protection",
        type: "text",
        required: true
      },

      {
        key: "PCS_Inverter_Max_Efficiency",
        label: "Inverter Max. Efficiency",
        type: "text",
        required: true
      },

      {
        key: "PCS_Inverter_CEC_Efficiency",
        label: "Inverter CEC Efficiency",
        type: "text", required: true
      },

      {
        key: "PCS_Dimensions",
        label: "Dimensions (W×H×D)",
        type: "text",
        required: true
      },

      {
        key: "PCS_Degree_of_Protection",
        label: "Degree of Protection",
        type: "text",
        required: true
      },

      {
        key: "PCS_Auxiliary_Power_Supply",
        label: "Auxiliary Power Supply",
        type: "text",
        required: true
      },

      {
        key: "PCS_Max_Operating_Altitude",
        label: "Max. Operating Altitude",
        type: "text",
        required: true
      },

      {
        key: "PCS_Communication_Standard",
        label: "Communication Standard",
        type: "text",
        required: true
      },

      {
        key: "PCS_Cooling_method",
        label: "Cooling Method",
        type: "text",
        required: true
      }
    ]
  },

  {
    id: "mvCable",
    name: "MV AC Cable",
    icon: "activity",
    blurb: "Details about the MV AC cables used in the system.",
    title: "MV AC Cable",
    fields: [
      { key: "MVAC_Cable_Size", label: "Cable Size", type: "text", required: true },
      { key: "MVAC_Rated_Voltage", label: "Rated Voltage", type: "text", required: true },
      { key: "MVAC_Conductor_Material", label: "Conductor Material", type: "text", required: true },
      { key: "MVAC_Conductor_Type", label: "Conductor Type", type: "text", required: true },
      { key: "MVAC_Insulation_Type", label: "Insulation Type", type: "text", required: true },
      { key: "MVAC_Insulation_Level", label: "Insulation Level", type: "text", required: true },
      { key: "MVAC_Concentric_Neutral", label: "Concentric Neutral", type: "text", required: true },
      { key: "MVAC_Operating_Temperature", label: "Operating Temperature", type: "text", required: true },
      { key: "MVAC_UL_Certification", label: "UL Certification", type: "text", required: true },
      { key: "MVAC_Installation_Type", label: "Installation Type", type: "text", required: true },
      { key: "MVAC_NEC_Compliant", label: "NEC Compliant", type: "text", required: true }
    ]
  },


];
