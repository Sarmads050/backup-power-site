// Maths for the Generator vs Power Station cost calculator.

// Default prices — update these when they change (and the "last checked" date on the page).
export const DEFAULTS = {
  gasPrice: 4.27,        // $/gallon, US regular, AAA national average on 2026-10-22
  electricityPrice: 0.18, // $/kWh, US residential average (EIA forecast for 2026: ~18.2¢)
  checked: 'October 22, 2026',
};

export const CHARGE_ROUND_TRIP = 0.85; // wall → battery → AC output

/** Rough fuel use of a ~3,500 W inverter generator at a given load (gallons per hour). */
export function estimateGallonsPerHour(loadW) {
  return Math.max(0.05, 0.07 + 0.000137 * Math.max(0, loadW));
}

/**
 * o: { hoursPerYear, loadW, years,
 *      genPrice, galPerHour, gasPrice, genMaintPerYear,
 *      psPrice, psWh, elecPrice, longestOutageH }
 */
export function compareCosts(o) {
  const n = (v) => Math.max(0, Number(v) || 0);
  const years = Math.max(1, Math.round(n(o.years)) || 1);
  const hours = n(o.hoursPerYear);
  const loadW = n(o.loadW);

  const genFuelPerYear = hours * n(o.galPerHour) * n(o.gasPrice);
  const genPerYear = genFuelPerYear + n(o.genMaintPerYear);
  const kWhPerYear = (hours * loadW) / 1000;
  const psPerYear = (kWhPerYear / CHARGE_ROUND_TRIP) * n(o.elecPrice);

  const rows = [];
  for (let y = 0; y <= years; y++) {
    rows.push({
      year: y,
      gen: n(o.genPrice) + genPerYear * y,
      ps: n(o.psPrice) + psPerYear * y,
    });
  }
  const genTotal = rows[years].gen;
  const psTotal = rows[years].ps;

  // Year the cheaper-to-run option catches up (if ever).
  let breakEvenYear = null;
  const diffPerYear = genPerYear - psPerYear;
  const upfrontGap = n(o.psPrice) - n(o.genPrice);
  if (upfrontGap > 0 && diffPerYear > 0) breakEvenYear = upfrontGap / diffPerYear;

  const psRuntimeH = loadW > 0 ? (n(o.psWh) * CHARGE_ROUND_TRIP) / loadW : Infinity;
  const longest = n(o.longestOutageH);

  return {
    years,
    rows,
    genTotal, psTotal,
    genPerYear, psPerYear, genFuelPerYear,
    gallonsPerYear: hours * n(o.galPerHour),
    kWhPerYear,
    genPerHour: hours > 0 ? genPerYear / hours : 0,
    psPerHour: hours > 0 ? psPerYear / hours : 0,
    breakEvenYear,
    cheaper: genTotal < psTotal ? 'generator' : psTotal < genTotal ? 'power station' : 'tie',
    difference: Math.abs(genTotal - psTotal),
    psRuntimeH,
    psCoversLongest: longest <= psRuntimeH,
    longest,
  };
}
