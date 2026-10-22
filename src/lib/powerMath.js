// All the maths behind the Power Station Size Calculator, kept in one small
// file so it can be tested and reused by future calculators.

export const INVERTER_EFFICIENCY = 0.85; // energy lost turning battery DC into wall AC
export const SAFETY_BUFFER = 1.2;        // 20% headroom for cold weather, battery ageing, guesses
export const OUTPUT_HEADROOM = 1.25;     // don't run an inverter flat-out
export const SOLAR_DERATE = 0.75;        // panels rarely make their full rated watts

/**
 * rows: [{ running, surge, duty, hours, qty }]
 * opts: { days, solarWatts, sunHours }
 */
export function sizePowerStation(rows, opts = {}) {
  const days = Math.max(0.25, Number(opts.days) || 1);
  const active = rows.filter((r) => r.qty > 0 && r.running > 0);

  const runningW = sum(active.map((r) => r.running * r.qty));
  // Peak = everything running + the single biggest motor start on top.
  const biggestStartBoost = Math.max(0, ...active.map((r) => Math.max(0, r.surge - r.running)));
  const peakW = runningW + biggestStartBoost;

  const dailyWh = sum(active.map((r) => r.running * r.qty * clamp(r.hours, 0, 24) * clamp(r.duty ?? 1, 0, 1)));

  const solarWhPerDay = Math.max(0, (Number(opts.solarWatts) || 0) * (Number(opts.sunHours) || 0) * SOLAR_DERATE);
  // Solar refills the battery during the outage, so it lowers what the battery must hold.
  const netDailyWh = Math.max(0, dailyWh - solarWhPerDay);
  // Day one still has to come from the battery (the sun may not be up yet).
  const energyFromBattery = dailyWh + netDailyWh * Math.max(0, days - 1);
  const capacityWh = roundUp((energyFromBattery / INVERTER_EFFICIENCY) * SAFETY_BUFFER, 100);
  const outputW = roundUp(runningW * OUTPUT_HEADROOM, 100);

  return {
    runningW: Math.round(runningW),
    peakW: Math.round(peakW),
    dailyWh: Math.round(dailyWh),
    solarWhPerDay: Math.round(solarWhPerDay),
    solarCoverage: dailyWh > 0 ? Math.min(1, solarWhPerDay / dailyWh) : 0,
    capacityWh,
    outputW,
    surgeW: roundUp(peakW, 100),
    sizeClass: sizeClass(capacityWh),
    days,
  };
}

/** How long a battery of `capacityWh` lasts for this daily load. */
export function runtimeHours(capacityWh, dailyWh) {
  if (!dailyWh) return Infinity;
  const avgW = dailyWh / 24;
  return (capacityWh * INVERTER_EFFICIENCY) / avgW;
}

export function sizeClass(wh) {
  if (wh <= 0) return null;
  if (wh <= 700) return { id: 'small', label: 'Small power station', range: '300–700 Wh', fit: 'Phones, lights, Wi-Fi, a CPAP for a night or two. Light enough to carry with one hand.' };
  if (wh <= 1600) return { id: 'mid', label: 'Mid-size power station', range: '1,000–1,600 Wh', fit: 'Keeps a fridge, lights and internet going through a typical overnight outage.' };
  if (wh <= 3800) return { id: 'large', label: 'Large power station', range: '2,000–3,800 Wh', fit: 'Multi-day outages with a fridge, freezer, fans or a sump pump. Usually on wheels.' };
  return { id: 'home', label: 'Expandable home battery system', range: '4,000 Wh and up', fit: 'Whole-room or multi-day home backup. Look for models that accept extra battery packs, and pair with solar.' };
}

export function formatHours(h) {
  if (!isFinite(h)) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)} hours`;
  return `${(h / 24).toFixed(1)} days`;
}

const sum = (a) => a.reduce((x, y) => x + y, 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));
const roundUp = (v, step) => (v <= 0 ? 0 : Math.ceil(v / step) * step);
