   // ---- String Size Design Basis — form schema ----------------
    // Tabs / steps. Each field: key, label, type, unit, required, hint, placeholder, options
    var STRING_SIZE_TABS = [{
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
        required: true
      }]
    }, {
      id: 'project',
      name: 'Project Information',
      icon: 'map',
      blurb: 'Drives the document number, revision and project descriptors.',
      fields: [{
        key: 'projectName',
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
      }, {
        key: 'capacityAc',
        label: 'AC capacity',
        type: 'number',
        unit: 'MW',
        placeholder: '150'
      }, {
        key: 'capacityDc',
        label: 'DC capacity',
        type: 'number',
        unit: 'MWp',
        placeholder: '198'
      }, {
        key: 'location',
        label: 'Site location',
        type: 'text',
        placeholder: 'City, State / Country',
        required: true
      }, {
        key: 'latitude',
        label: 'Latitude',
        type: 'number',
        unit: '°',
        mono: true,
        placeholder: '33.4484'
      }, {
        key: 'longitude',
        label: 'Longitude',
        type: 'number',
        unit: '°',
        mono: true,
        placeholder: '-112.0740'
      }, {
        key: 'revision',
        label: 'Revision',
        type: 'select',
        options: ['R0', 'R1', 'R2', 'R3'],
        required: true,
        mono: true
      }]
    }, {
      id: 'uploads',
      name: 'Datasheets & Uploads',
      icon: 'paperclip',
      blurb: 'Attach source datasheets. These feed the technical inputs and are referenced in the report appendix.',
      uploads: [{
        key: 'moduleDs',
        label: 'Module datasheet',
        hint: 'PDF · manufacturer spec sheet',
        required: true
      }, {
        key: 'inverterDs',
        label: 'Inverter datasheet',
        hint: 'PDF · manufacturer spec sheet',
        required: true
      }, {
        key: 'weatherData',
        label: 'Site weather / temperature data',
        hint: 'CSV, XLSX · TMY or measured',
        required: false
      }]
    }, {
      id: 'technical',
      name: 'Technical Inputs',
      icon: 'sliders',
      blurb: 'Module, inverter and site temperature data. Drives the string-sizing calculation.',
      groups: [{
        title: 'PV Module',
        fields: [{
          key: 'moduleMake',
          label: 'Module make / model',
          type: 'text',
          placeholder: 'e.g. LR7-72HGD 580M',
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
          placeholder: '14.02'
        }, {
          key: 'moduleImp',
          label: 'Imp (STC)',
          type: 'number',
          unit: 'A',
          mono: true,
          placeholder: '13.37'
        }, {
          key: 'modulePmax',
          label: 'Pmax (STC)',
          type: 'number',
          unit: 'Wp',
          mono: true,
          placeholder: '580'
        }, {
          key: 'tempCoeffVoc',
          label: 'Temp. coeff. of Voc',
          type: 'number',
          unit: '%/°C',
          mono: true,
          required: true,
          placeholder: '-0.250',
          hint: 'Negative value, from datasheet (βVoc).'
        }]
      }, {
        title: 'Inverter',
        fields: [{
          key: 'inverterMake',
          label: 'Inverter make / model',
          type: 'text',
          placeholder: 'e.g. SG250HX',
          required: true
        }, {
          key: 'invVdcMax',
          label: 'Max. DC input voltage',
          type: 'number',
          unit: 'V',
          mono: true,
          required: true,
          placeholder: '1500'
        }, {
          key: 'invMpptMin',
          label: 'MPPT min. voltage',
          type: 'number',
          unit: 'V',
          mono: true,
          required: true,
          placeholder: '500'
        }, {
          key: 'invMpptMax',
          label: 'MPPT max. voltage',
          type: 'number',
          unit: 'V',
          mono: true,
          placeholder: '1500'
        }, {
          key: 'invImaxMppt',
          label: 'Max. input current / MPPT',
          type: 'number',
          unit: 'A',
          mono: true,
          placeholder: '40'
        }, {
          key: 'invMpptCount',
          label: 'Number of MPPTs',
          type: 'number',
          mono: true,
          placeholder: '12'
        }]
      }, {
        title: 'Site Conditions',
        fields: [{
          key: 'tempMin',
          label: 'Min. ambient temperature',
          type: 'number',
          unit: '°C',
          mono: true,
          required: true,
          placeholder: '-5',
          hint: 'Record low — drives max string length (cold Voc).'
        }, {
          key: 'tempCellMax',
          label: 'Max. cell temperature',
          type: 'number',
          unit: '°C',
          mono: true,
          required: true,
          placeholder: '70',
          hint: 'Drives min string length (hot Vmp).'
        }, {
          key: 'designStd',
          label: 'Design standard',
          type: 'select',
          options: ['IEC 62548', 'NEC 2023', 'IEC 60364-7-712', 'AS/NZS 5033'],
          mono: true
        }]
      }]
    }];

    // realistic default values so the prototype feels live
    var STRING_SIZE_DEFAULTS = {
      clientName: 'Aurora Renewables LLC',
      clientContact: 'Dana Whitfield',
      clientEmail: 'd.whitfield@aurorarenew.com',
      clientAddress: '4400 Desert Sky Blvd, Suite 200\nPhoenix, AZ 85048, USA',
      consultant: 'PVinsight Inc.',
      projectName: 'Sandhills Solar — Phase II',
      projectCode: 'SH2',
      capacityAc: '150',
      capacityDc: '198',
      location: 'Maricopa County, AZ, USA',
      latitude: '33.4484',
      longitude: '-112.0740',
      revision: 'R0',
      moduleMake: 'LONGi LR7-72HGD 580M',
      moduleVoc: '52.00',
      moduleVmp: '43.40',
      moduleIsc: '14.02',
      moduleImp: '13.37',
      modulePmax: '580',
      tempCoeffVoc: '-0.250',
      inverterMake: 'Sungrow SG250HX',
      invVdcMax: '1500',
      invMpptMin: '500',
      invMpptMax: '1500',
      invImaxMppt: '40',
      invMpptCount: '12',
      tempMin: '-5',
      tempCellMax: '70',
      designStd: 'IEC 62548'
    };
