export function buildVocTable(summary = [], allTimeMax) {
  const computedAllTimeMax = typeof allTimeMax === 'number'
    ? allTimeMax
    : summary.reduce(
        (max, row) => (row.maxVoltage > max ? row.maxVoltage : max),
        -Infinity
      );

  return `
    <table border="1" style="border-collapse: collapse; text-align: center; width: 100%;">
      <thead style="background-color: #ffffff;">
        <tr>
          <th>Year</th>
          <th>Max Voltage (V)</th>
          <th>Min Voltage (V)</th>
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
              <td style="${cellStyle}">${row.year}</td>
              <td style="${cellStyle}">${row.maxVoltage}${badge}</td>
              <td style="${cellStyle}">${row.minVoltage}</td>
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
    ? summary.reduce( (max, row) => (row.avg > max ? row.avg : max), -Infinity ) : null;

  return `
    <tr>
      <th>Year</th>
      <th>Hr-1 (A)</th>
      <th>Hr-2 (A)</th>
      <th>Hr-3 (A)</th>
      <th>Avg of 3-Hr (A)</th>
    </tr>

    ${summary
      .map((row) => {
        const isPeak = peakAvg !== null && row.avg === peakAvg;
        const rowStyle = isPeak
          ? `style="background-color: #dcebf8; color: #0f3057; font-weight: bold; 
          -webkit-print-color-adjust: exact; print-color-adjust: exact;"`: '';
        const badge = isPeak ? ' <span style="font-size: 11px; color: #0f4f8f;">(Peak)</span>' : '';

        return `
          <tr ${rowStyle}>
            <td>${row.year}</td>
            <td>${row.h1}</td>
            <td>${row.h2}</td>
            <td>${row.h3}</td>
            <td>${row.avg}${badge}</td>
          </tr>
        `;
      })
      .join("")}
  `;
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
  ];

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
  ];

  const buildTable = (title, rows) => {
    let html = `
      <h3>${title}</h3>

      <table class="compact-table" border="1">
        <tr>
          <th style="width:60%">Parameter</th>
          <th style="width:15%">Unit</th>
          <th style="width:25%">Value</th>
        </tr>
    `;

    rows.forEach(([parameter, unit, value]) => {
      html += `
        <tr>
          <td>${parameter}</td>
          <td>${unit}</td>
          <td>${value ?? "-"}</td>
        </tr>
      `;
    });

    html += `
      </table>
    `;

    return html;
  };

  return { irradiationTable: buildTable( "PVsyst Irradiation Analysis", irradiationRows ),

    energyTable: buildTable( "PVsyst Energy Analysis", energyRows ) };}

export function calculateNMin( pcsMinPvInputVoltage,vmpMaxTemp) {
  const raw = pcsMinPvInputVoltage / vmpMaxTemp;
return {exact: raw.toFixed(2), rounded: Math.round(raw),};}

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
    tempCellMax
}) {
    const out = {
        tempMin,
        tempCellMax
    };

    for (let i = 0; i < 6; i++) {
        out[`ashrae_voc_${i+1}`] =
            solarCalcValues?.Voc_Tmin?.[i] ?? "";

        out[`ashrae_string_${i+1}`] =
            solarCalcValues?.max_voc_selected?.[i] ?? "";

        out[`pvsyst_voc_${i+1}`] =
            solarCalcValues?.Voc_Tmin?.[i] ?? "";

        out[`pvsyst_string_${i+1}`] =
            solarCalcValues?.max_voc_selected?.[i] ?? "";
    }

    out.ashrae_modules_series =
        solarCalcValues?.selected_modules?.[0] ?? "";

    out.pvsyst_modules_series =
        solarCalcValues?.selected_modules?.[0] ?? "";

    return out;
}
