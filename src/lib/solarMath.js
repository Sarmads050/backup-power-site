// Maths for the Solar Charging Time Calculator.
import { SOLAR_DERATE } from './powerMath.js';

export const CHARGE_EFFICIENCY = 0.9; // energy lost inside the charger/battery while charging

// Rough year-round averages of "peak sun hours" (hours of full-strength sun per day).
// Winter is lower, summer higher. Used only as a starting point the user can edit.
export const SUN_REGIONS = [
  { id: 'southwest', label: 'Southwest (AZ, NM, NV, southern CA)', hours: 6.5 },
  { id: 'west', label: 'Rest of California, Colorado, Utah', hours: 5.5 },
  { id: 'south', label: 'Texas, Florida, the Southeast', hours: 5 },
  { id: 'midwest', label: 'Midwest & Plains', hours: 4.5 },
  { id: 'northeast', label: 'Northeast & Great Lakes', hours: 4 },
  { id: 'northwest', label: 'Pacific Northwest', hours: 3.5 },
  { id: 'cloudy', label: 'Cloudy / winter day anywhere', hours: 2 },
];

/**
 * opts: { batteryWh, fromPct, toPct, panelW, sunHours, maxInputW }
 */
export function solarCharge(opts) {
  const batteryWh = num(opts.batteryWh);
  const fromPct = clamp(num(opts.fromPct), 0, 100);
  const toPct = clamp(num(opts.toPct), 0, 100);
  const panelW = num(opts.panelW);
  const sunHours = num(opts.sunHours);
  const maxInputW = num(opts.maxInputW) || Infinity;

  const energyToAdd = Math.max(0, (batteryWh * (toPct - fromPct)) / 100);
  const whFromPanels = energyToAdd / CHARGE_EFFICIENCY;

  const realPanelW = panelW * SOLAR_DERATE;            // what panels really deliver in good sun
  const effectiveW = Math.min(realPanelW, maxInputW);  // the power station can't take more than its limit
  const capped = realPanelW > maxInputW;

  const sunHoursNeeded = effectiveW > 0 ? whFromPanels / effectiveW : Infinity;
  const days = sunHours > 0 ? sunHoursNeeded / sunHours : Infinity;
  const whPerDay = effectiveW * sunHours * CHARGE_EFFICIENCY;

  // Panel size that would refill the battery in a single day of sun.
  const panelWForOneDay = sunHours > 0 ? roundUp(whFromPanels / (sunHours * SOLAR_DERATE), 50) : Infinity;
  const oneDayExceedsInput = isFinite(maxInputW) && panelWForOneDay * SOLAR_DERATE > maxInputW;

  return {
    energyToAdd: Math.round(energyToAdd),
    realPanelW: Math.round(realPanelW),
    effectiveW: Math.round(effectiveW),
    capped,
    sunHoursNeeded,
    days,
    whPerDay: Math.round(whPerDay),
    panelWForOneDay,
    oneDayExceedsInput,
  };
}

const num = (v) => Math.max(0, Number(v) || 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const roundUp = (v, step) => (v <= 0 ? 0 : Math.ceil(v / step) * step);
