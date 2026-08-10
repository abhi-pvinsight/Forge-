/**
 * skinEffectGraphSvg.js
 * Generates an SVG chart for Skin-Effect Factor (F) vs Chart Parameter (X)
 * as per IEEE 605-2023 / Alcoa Bus Conductor Manual.
 */

export function generateSkinEffectSvg({
  X = 73.04,
  F = 1.05,
  tOverD = 0.0423,
  conductorType = '6.0" (Sch 40)',
  RdcMicroOhmFt = 3.43,
  frequencyHz = 60
} = {}) {
  const width = 680;
  const height = 400;
  const margin = { top: 60, right: 40, bottom: 65, left: 65 };

  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  // Domain & Range limits
  const xMin = 0;
  const xMax = Math.max(120, Math.ceil(X * 1.15 / 10) * 10);
  const yMin = 1.00;
  const yMax = Math.max(1.35, Math.ceil(F * 1.1 * 20) / 20);

  // Coordinate mappers
  const mapX = (val) => margin.left + ((val - xMin) / (xMax - xMin)) * chartW;
  const mapY = (val) => margin.top + chartH - ((val - yMin) / (yMax - yMin)) * chartH;

  // Generate grid ticks
  const xTicks = [];
  const xStep = xMax <= 100 ? 10 : 20;
  for (let x = 0; x <= xMax; x += xStep) {
    xTicks.push(x);
  }

  const yTicks = [];
  const yStep = 0.05;
  for (let y = yMin; y <= yMax + 0.001; y += yStep) {
    yTicks.push(Number(y.toFixed(2)));
  }

  const generateCurvePath = (ratio) => {
    const pts = [];
    for (let xVal = 0; xVal <= xMax; xVal += 2) {
      const xNorm = xVal / 80;
      const k = 1 + (0.5 - ratio) * 0.4;
      const fVal = 1 + (xNorm * xNorm * 0.12 * k);
      const px = mapX(xVal);
      const py = mapY(fVal);
      if (py >= margin.top && py <= margin.top + chartH) {
        pts.push(`${pts.length === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`);
      }
    }
    return pts.join(' ');
  };

  const curveSolid = generateCurvePath(0.5);
  const curveMedium = generateCurvePath(0.05);
  const curveThin = generateCurvePath(0.02);

  // Operating point coordinates
  const cx = mapX(X);
  const cy = mapY(F);

  const safeConductor = String(conductorType).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="auto" style="font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
  <defs>
    <linearGradient id="opGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#dc2626" stop-opacity="0.1" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Title & Subtitle -->
  <text x="${width / 2}" y="25" text-anchor="middle" font-size="14" font-weight="700" fill="#1e293b">IEEE 605 / ALCOA Bus Conductor Skin-Effect Chart</text>
  <text x="${width / 2}" y="43" text-anchor="middle" font-size="11" fill="#64748b">Conductor: ${safeConductor} | f = ${frequencyHz} Hz | R_dc = ${RdcMicroOhmFt.toFixed(2)} µΩ/ft | t/d = ${tOverD.toFixed(4)}</text>

  <!-- Chart Background Area -->
  <rect x="${margin.left}" y="${margin.top}" width="${chartW}" height="${chartH}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />

  <!-- Grid Lines X -->
  ${xTicks.map(xVal => {
    const px = mapX(xVal);
    return `<line x1="${px}" y1="${margin.top}" x2="${px}" y2="${margin.top + chartH}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="${xVal === 0 ? 'none' : '3,3'}" />
    <text x="${px}" y="${margin.top + chartH + 18}" text-anchor="middle" font-size="10" fill="#64748b">${xVal}</text>`;
  }).join('\n')}

  <!-- Grid Lines Y -->
  ${yTicks.map(yVal => {
    const py = mapY(yVal);
    return `<line x1="${margin.left}" y1="${py}" x2="${margin.left + chartW}" y2="${py}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="${yVal === 1.00 ? 'none' : '3,3'}" />
    <text x="${margin.left - 8}" y="${py + 4}" text-anchor="end" font-size="10" fill="#64748b">${yVal.toFixed(2)}</text>`;
  }).join('\n')}

  <!-- Theoretical Curves -->
  <path d="${curveSolid}" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4" />
  <path d="${curveMedium}" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4" />
  <path d="${curveThin}" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,4" />

  <!-- Curve Labels -->
  <text x="${mapX(xMax * 0.85)}" y="${mapY(1.30)}" font-size="9" fill="#94a3b8" font-style="italic">t/d = 0.5 (Solid)</text>
  <text x="${mapX(xMax * 0.85)}" y="${mapY(1.18)}" font-size="9" fill="#64748b" font-style="italic">t/d = 0.05 (Tube)</text>

  <!-- Crosshairs for Operating Point -->
  <line x1="${cx}" y1="${margin.top}" x2="${cx}" y2="${margin.top + chartH}" stroke="#ef4444" stroke-width="1.2" stroke-dasharray="2,2" />
  <line x1="${margin.left}" y1="${cy}" x2="${margin.left + chartW}" y2="${cy}" stroke="#ef4444" stroke-width="1.2" stroke-dasharray="2,2" />

  <!-- Operating Point Dot -->
  <circle cx="${cx}" cy="${cy}" r="12" fill="url(#opGlow)" />
  <circle cx="${cx}" cy="${cy}" r="5" fill="#dc2626" stroke="#ffffff" stroke-width="2" filter="url(#shadow)" />

  <!-- Callout Label -->
  <g transform="translate(${Math.min(cx + 12, width - margin.right - 180)}, ${Math.max(cy - 45, margin.top + 10)})">
    <rect x="0" y="0" width="170" height="36" rx="4" fill="#1e293b" opacity="0.9" filter="url(#shadow)" />
    <text x="10" y="15" font-size="10" font-weight="700" fill="#f8fafc">Operating Point</text>
    <text x="10" y="29" font-size="10" fill="#38bdf8">X = ${X.toFixed(2)}  |  F = ${F.toFixed(4)}</text>
  </g>

  <!-- Axis Labels -->
  <text x="${margin.left + chartW / 2}" y="${height - 18}" text-anchor="middle" font-size="11" font-weight="600" fill="#334155">Chart Parameter X = (8 × π × f) / (R_dc × 10⁶)</text>
  <text x="18" y="${margin.top + chartH / 2}" text-anchor="middle" font-size="11" font-weight="600" fill="#334155" transform="rotate(-90, 18, ${margin.top + chartH / 2})">Skin-Effect Factor F (R_ac / R_dc)</text>
</svg>`;
}
