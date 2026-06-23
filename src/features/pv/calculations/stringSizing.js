import React from 'react';

// ---- live string-sizing calculation ------------------------
export default function computeStringSizing(v) {
  const num = (x) => { const n = parseFloat(x); return isNaN(n) ? null : n; };
  const Voc = num(v.moduleVoc), Vmp = num(v.moduleVmp);
  const tc = num(v.tempCoeffVoc);
  const Tmin = num(v.tempMin), Tcell = num(v.tempCellMax);
  const Vdc = num(v.invVdcMax), MpptMin = num(v.invMpptMin);
  const ok = [Voc, Vmp, tc, Tmin, Tcell, Vdc, MpptMin].every(x => x !== null);
  if (!ok) return { valid: false };

  const VocCold = Voc * (1 + (tc / 100) * (Tmin - 25));
  const VmpHot  = Vmp * (1 + (tc / 100) * (Tcell - 25));
  const maxMods = Math.floor(Vdc / VocCold);
  const minMods = Math.ceil(MpptMin / VmpHot);
  const recommended = Math.max(minMods, Math.min(maxMods, Math.round((maxMods + minMods) / 2) + 1));
  const stringVocCold = VocCold * maxMods;
  const stringVmpHot = VmpHot * recommended;
  return {
    valid: true,
    VocCold: VocCold.toFixed(2),
    VmpHot: VmpHot.toFixed(2),
    maxMods, minMods, recommended,
    stringVocCold: stringVocCold.toFixed(1),
    stringVmpHot: stringVmpHot.toFixed(1),
    headroom: (Vdc - stringVocCold).toFixed(1),
    feasible: minMods <= maxMods,
  };
}

// features/pv/calculations/minStringLength.js

export function calculateMinStringLength(
  PCS_Min_PV_Input_Voltage,
  Vmp_Max_Temp
) {
  const rawNMin =
    PCS_Min_PV_Input_Voltage / Vmp_Max_Temp;

  return {
    raw: rawNMin,
    calculatedValue: rawNMin.toFixed(2),
    roundedValue: Math.round(rawNMin),
  };
}
