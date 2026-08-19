export function buildVocTable(summary = [], allTimeMax) {
  const computedAllTimeMax = typeof allTimeMax === 'number'
    ? allTimeMax
    : summary.reduce(
      (max, row) => (row.maxVoltage > max ? row.maxVoltage : max),
      -Infinity
    );

  return `
    <table border="1" style="border-collapse: collapse; text-align: center; width: 100%;">
      <thead style="background-color: #ffffff; display: table-header-group;">
        <tr>
          <th style="width: 33.33%; text-align: center;">Year</th>
          <th style="width: 33.33%; text-align: center;">Max Voltage (V)</th>
          <th style="width: 33.33%; text-align: center;">Min Voltage (V)</th>
        </tr>
      </thead>
      <tbody>
      ${summary
      .map(row => {
        const isAllTimeMax = row.maxVoltage === computedAllTimeMax;
        const cellStyle = isAllTimeMax
          ? `background-color: #dcebf8; color: #0f3057; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact;`
          : '';
        const badge = isAllTimeMax ? ' <span style="font-size: 11px; color: #0f4f8f;">(All-Time Max)</span>' : '';

        return `
            <tr>
              <td style="${cellStyle} text-align: center;">${row.year}</td>
              <td style="${cellStyle} text-align: center;">${row.maxVoltage}${badge}</td>
              <td style="${cellStyle} text-align: center;">${row.minVoltage}</td>
            </tr>
          `;
      })
      .join("")}
      </tbody>
    </table>
  `;
}

export function buildIscTable(summary = []) {
  if (!Array.isArray(summary)) {
    throw new Error("buildIscTable expects an array of summary rows.");
  }

  const peakAvg = summary.length
    ? summary.reduce((max, row) => (row.avg > max ? row.avg : max), -Infinity) : null;

  return summary
    .map((row) => {
      const isPeak = peakAvg !== null && row.avg === peakAvg;
      const rowStyle = isPeak
        ? `style="background-color: #dcebf8; color: #0f3057; font-weight: bold; 
        -webkit-print-color-adjust: exact; print-color-adjust: exact;"`: '';
      const badge = isPeak ? ' <span style="font-size: 11px; color: #0f4f8f;">(Peak)</span>' : '';

      return `
        <tr ${rowStyle}>
          <td style="text-align: center;">${row.year}</td>
          <td style="text-align: center;">${row.h1}</td>
          <td style="text-align: center;">${row.h2}</td>
          <td style="text-align: center;">${row.h3}</td>
          <td style="text-align: center;">${row.avg}${badge}</td>
        </tr>
      `;
    })
    .join("");
}


export function buildPvsystTables(pvsystData) {

  if (!pvsystData) {
    return {
      irradiationTable: "",
      energyTable: ""
    };
  }

  const irradiationRows = [
    ["Global Horizontal Irradiation (GHI)", "kWh/m²", pvsystData.irradiation?.ghi],
    ["Global Incident in Collector Plane", "%", pvsystData.irradiation?.globalIncidentInCollectorPlane],
    ["Near Shading Loss", "%", pvsystData.irradiation?.nearShadingLoss],
    ["Soiling Loss Factor", "%", pvsystData.irradiation?.soilingLossFactor],
    ["IAM Factor on Global", "%", pvsystData.irradiation?.iamFactorOnGlobal],
    ["Ground Reflection on Front Side", "%", pvsystData.irradiation?.groundReflectionFrontSide],
    ["Bifacial GHI on Ground", "kWh/m²", pvsystData.irradiation?.bifacialGhiOnGround],
    ["Ground Reflection Loss", "%", pvsystData.irradiation?.groundReflectionLoss],
    ["View Factor for Rear Side", "%", pvsystData.irradiation?.viewFactorRearSide],
    ["Sky Diffuse on Rear Side", "%", pvsystData.irradiation?.skyDiffuseRearSide],
    ["Beam Effective on Rear Side", "%", pvsystData.irradiation?.beamEffectiveRearSide],
    ["Shading Loss on Rear Side", "%", pvsystData.irradiation?.shadingLossRearSide],
    ["Global Irradiance on Rear Side", "%", pvsystData.irradiation?.globalIrradianceRearSide]
  ].filter(([, , value]) => value !== null && value !== undefined);;

  const energyRows = [
    ["Array Nominal Energy (STC)", "MWh", pvsystData.energy?.arrayNominalEnergyAtSTC],
    ["PV Loss Due to Irradiance Level", "%", pvsystData.energy?.pvLossDueToIrradianceLevel],
    ["PV Loss Due to Temperature", "%", pvsystData.energy?.pvLossDueToTemperature],
    ["Shading Electrical Loss", "%", pvsystData.energy?.shadingElectricalLoss],
    ["Module Quality Loss", "%", pvsystData.energy?.moduleQualityLoss],
    ["LID - Light Induced Degradation", "%", pvsystData.energy?.lidLoss],
    ["Mismatch Loss - Module & String", "%", pvsystData.energy?.mismatchLossModuleString],
    ["Mismatch Loss - Back Irradiance", "%", pvsystData.energy?.mismatchLossBackIrradiance],
    ["Ohmic Wiring Loss", "%", pvsystData.energy?.ohmicWiringLoss],
    ["Array Virtual Energy at MPP", "MWh", pvsystData.energy?.arrayVirtualEnergyAtMPP],
    ["Inverter Efficiency Loss", "%", pvsystData.energy?.inverterEfficiencyLoss],
    ["Inverter Loss Over Nominal Power", "%", pvsystData.energy?.inverterLossOverNominalPower],
    ["Energy at Inverter Output", "MWh", pvsystData.energy?.energyAtInverterOutput],
    ["Auxiliary Loss", "%", pvsystData.energy?.auxiliaryLoss],
    ["AC Ohmic Loss", "%", pvsystData.energy?.acOhmicLoss],
    ["MV Transformer Loss", "%", pvsystData.energy?.mvTransformerLoss],
    ["MV Line Ohmic Loss", "%", pvsystData.energy?.mvLineOhmicLoss],
    ["HV Transformer Loss", "%", pvsystData.energy?.hvTransformerLoss],
    ["HV Line Ohmic Loss", "%", pvsystData.energy?.hvLineOhmicLoss],
    ["Active Energy Injected to Grid", "MWh", pvsystData.energy?.activeEnergyInjectedToGrid],
    ["Specific Yield", "kWh/kWp", pvsystData.energy?.specificYield],
    ["DC CUF", "%", pvsystData.energy?.dcCUF]
  ].filter(([, , value]) => value !== null && value !== undefined);;

  const buildTable = (title, rows) => {
    let html = `
      <table border="1" style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-family: 'Segoe UI',  sans-serif; font-size: 12pt;">
        <thead>
          <tr style="background-color: #002060; color: white;">
            <th style="border: 1px solid #000; padding: 8px; width: 50%; text-align: left; font-family: 'Segoe UI',  sans-serif; font-size: 12pt;">Parameter</th>
            <th style="border: 1px solid #000; padding: 8px; width: 15%; text-align: center; font-family: 'Segoe UI',  sans-serif; font-size: 12pt;">Unit</th>
            <th style="border: 1px solid #000; padding: 8px; width: 35%; text-align: center; font-family: 'Segoe UI',  sans-serif; font-size: 12pt;">Value</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach(([parameter, unit, value]) => {
      html += `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: left; font-family: 'Segoe UI',  sans-serif; font-size: 12pt;">${parameter}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: 'Segoe UI',  sans-serif; font-size: 12pt;">${unit}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: 'Segoe UI',  sans-serif; font-size: 12pt;">${value ?? "-"}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    return html;
  };

  return {
    irradiationTable: buildTable("PVsyst Irradiation Analysis", irradiationRows),
    energyTable: buildTable("PVsyst Energy Analysis", energyRows)
  };
}

export function calculateNMin(pcsMinPvInputVoltage, vmpMaxTemp) {
  const minVoltage = typeof pcsMinPvInputVoltage === 'string'
    ? parseFloat(pcsMinPvInputVoltage.replace(/[^\d.]/g, ''))
    : Number(pcsMinPvInputVoltage || 875);
  const vmp = Number(vmpMaxTemp);

  if (isNaN(minVoltage) || isNaN(vmp) || vmp === 0) {
    return { exact: "—", rounded: "—" };
  }
  const raw = minVoltage / vmp;
  return { exact: raw.toFixed(2), rounded: Math.ceil(raw) };
}

// building an Degradation Table 

export function buildMinVoltageDegradationTable(
  initialVoltage,
  degradationPercent,
  years = 30
) {
  const table = {};

  let currentVoltage = Number(initialVoltage);

  for (let year = 1; year <= years; year += 1) {
    const degradation =
      currentVoltage * (Number(degradationPercent) / 100);

    const voltageAfter = currentVoltage - degradation;

    table[`year${year}`] = year;
    table[`year${year}_min`] = Number(currentVoltage.toFixed(2));
    table[`year${year}_deg`] = Number(degradation.toFixed(2));
    table[`year${year}_after`] = Number(voltageAfter.toFixed(2));

    currentVoltage = voltageAfter;
  }

  return table;
}

export function buildSolarVocTemplateValues({
  solarCalcValues,
  tempMin,
  tempCellMax,
  values = {}
}) {
  const out = {
    tempMin: tempMin ?? values?.tempMin ?? values?.temp_min ?? solarCalcValues?.Tmin ?? -5.0,
    tempCellMax: tempCellMax ?? values?.tempCellMax ?? values?.temp_max ?? 75.0
  };

  const formatToTwoDecimals = (val) => {
    if (val === undefined || val === null || val === "") return "";
    const num = Number(val);
    return isNaN(num) ? val : num.toFixed(2);
  };

  const formatToInteger = (val) => {
    if (val === undefined || val === null || val === "") return "";
    const num = Number(val);
    return isNaN(num) ? val : String(Math.round(num));
  };

  const tcVocNum = Number(
    values?.temp_coeff_voc ??
    values?.tempCoeffVoc ??
    solarCalcValues?.TcVoc ??
    -0.27
  );

  const tMinNum = Number(out.tempMin);

  // Base modules in series N from form input 'modules_series'
  const ashraeStringSize = Number(
    values?.modules_series ??
    values?.string_size ??
    solarCalcValues?.selected_modules?.[0] ??
    28
  );

  // PV Syst calculation for N + 1 modules in series
  const pvsystStringSize = ashraeStringSize + 1;

  for (let i = 0; i < 6; i++) {
    // 1. Extract exact STC Voc directly from uploaded Excel datasheet (voc_1 .. voc_6)
    const rawVocStc = values?.[`voc_${i + 1}`] ?? solarCalcValues?.Voc_front?.[i];
    const vocStc = Number(rawVocStc);

    let maxVocCold;
    if (!isNaN(vocStc) && vocStc > 0 && !isNaN(tcVocNum) && !isNaN(tMinNum)) {
      // Formula: Voc_cold = Voc_stc * (1 + (temp_coeff / 100) * (T_min - 25))
      maxVocCold = vocStc * (1 + (tcVocNum / 100) * (tMinNum - 25));
    } else {
      maxVocCold = solarCalcValues?.Voc_Tmin?.[i];
    }

    const maxVocColdFormatted = formatToTwoDecimals(maxVocCold);
    const vocColdVal = Number(maxVocCold);

    // 2a. ASHRAE Mean Max String Voc = N * maxVocCold
    let ashraeMaxStringVoc;
    if (!isNaN(vocColdVal) && !isNaN(ashraeStringSize) && ashraeStringSize > 0) {
      ashraeMaxStringVoc = ashraeStringSize * vocColdVal;
    } else {
      ashraeMaxStringVoc = solarCalcValues?.max_voc_selected?.[i];
    }

    // 2b. PV Syst Max String Voc = (N + 1) * maxVocCold
    let pvsystMaxStringVoc;
    if (!isNaN(vocColdVal) && !isNaN(pvsystStringSize) && pvsystStringSize > 0) {
      pvsystMaxStringVoc = pvsystStringSize * vocColdVal;
    } else {
      pvsystMaxStringVoc = (ashraeStringSize + 1) * vocColdVal;
    }

    // Populate template fields for Table 6
    out[`stc_voc_${i + 1}`] = formatToTwoDecimals(vocStc);

    out[`ashrae_voc_${i + 1}`] = maxVocColdFormatted;
    out[`ashrae_series_${i + 1}`] = ashraeStringSize;
    out[`ashrae_string_${i + 1}`] = formatToInteger(ashraeMaxStringVoc);

    out[`pvsyst_voc_${i + 1}`] = maxVocColdFormatted;
    out[`pvsyst_series_${i + 1}`] = pvsystStringSize;
    out[`pvsyst_string_${i + 1}`] = formatToInteger(pvsystMaxStringVoc);
  }

  out.ashrae_modules_series = ashraeStringSize;
  out.pvsyst_modules_series = pvsystStringSize;
  out.string_size = ashraeStringSize;

  return out;
}

export function buildPvsystLossTemplateValues(pvsystData) {
  if (!pvsystData) {
    return {
      IAM_factor: "—",
      Soiling_loss_factor: "—",
      Module_quality_loss: "—",
      "LID – Light-induced_degradation": "—",
      "LID - Light-induced_degradation": "—",
      "LID_Light_induced_degradation": "—",
      Mismatch_loss_modules: "—",
      Mismatch_loss_String: "—",
      DC_Ohmic_wiring_loss: "—",
      Auxiliaries: "—",
      AC_ohmic_loss: "—",
      Medium_voltage_transformer_loss: "—"
    };
  }

  const formatPercent = (val) => {
    if (val === undefined || val === null || val === "") return "—";
    const valStr = String(val).trim();
    if (valStr.endsWith("%")) return valStr;
    return `${valStr}%`;
  };

  return {
    IAM_factor: formatPercent(pvsystData.irradiation?.iamFactorOnGlobal),
    Soiling_loss_factor: formatPercent(pvsystData.irradiation?.soilingLossFactor),
    Module_quality_loss: formatPercent(pvsystData.energy?.moduleQualityLoss),
    "LID – Light-induced_degradation": formatPercent(pvsystData.energy?.lidLoss),
    "LID - Light-induced_degradation": formatPercent(pvsystData.energy?.lidLoss),
    "LID_Light_induced_degradation": formatPercent(pvsystData.energy?.lidLoss),
    Mismatch_loss_modules: formatPercent(pvsystData.energy?.mismatchLossModuleString),
    Mismatch_loss_String: formatPercent(pvsystData.energy?.mismatchLossModuleString),
    DC_Ohmic_wiring_loss: formatPercent(pvsystData.energy?.ohmicWiringLoss),
    Auxiliaries: formatPercent(pvsystData.energy?.auxiliaryLoss),
    AC_ohmic_loss: formatPercent(pvsystData.energy?.acOhmicLoss),
    Medium_voltage_transformer_loss: formatPercent(pvsystData.energy?.mvTransformerLoss)
  };
}

