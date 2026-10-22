// Maths for the CPAP Battery Runtime Calculator.

// Typical AVERAGE draw over a night. Real use depends on pressure, humidity
// and room temperature; the power-supply rating is the worst case.
export const CPAP_PRESETS = [
  { id: 'basic', label: 'CPAP only (humidifier off)', watts: 35 },
  { id: 'humid', label: 'CPAP + heated humidifier', watts: 60 },
  { id: 'tube', label: 'CPAP + humidifier + heated tube', watts: 90 },
];

export const EFFICIENCY = {
  ac: 0.85, // plugged into the power station's AC outlet (inverter losses)
  dc: 0.9,  // using the CPAP maker's DC/12 V adapter
};

/** o: { watts, hoursPerNight, batteryWh, mode: 'ac'|'dc', worstCaseW } */
export function cpapNights(o) {
  const w = Math.max(0, Number(o.watts) || 0);
  const h = Math.max(0, Number(o.hoursPerNight) || 0);
  const wh = Math.max(0, Number(o.batteryWh) || 0);
  const eff = EFFICIENCY[o.mode] ?? EFFICIENCY.ac;
  const perNight = w * h;                       // Wh the CPAP uses per night
  const fromBattery = perNight / eff;           // Wh pulled from the battery per night
  const nights = fromBattery > 0 ? (wh) / fromBattery : Infinity;
  const worst = Number(o.worstCaseW) > 0 ? wh / ((Number(o.worstCaseW) * h) / eff) : null;
  const neededFor = (n) => Math.ceil((fromBattery * n) / 50) * 50; // battery Wh for n nights
  return { perNight, fromBattery, nights, worstNights: worst, neededFor };
}
