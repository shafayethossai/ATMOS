export const STATIONS = [
  { id: 'UITS-01', name: 'UITS Campus', location: 'Dhaka-1212', lat: 23.8103, lng: 90.4125, active: true },
  { id: 'DMP-02',  name: 'Dhanmondi',   location: 'Dhaka-1209', lat: 23.7461, lng: 90.3742, active: true },
  { id: 'GUL-03',  name: 'Gulshan',     location: 'Dhaka-1212', lat: 23.7925, lng: 90.4078, active: false },
  { id: 'MOT-04',  name: 'Motijheel',   location: 'Dhaka-1000', lat: 23.7337, lng: 90.4181, active: true },
]

// Before purification: 5 sensors from IoT hardware.
// CO₂ is a ventilation/indoor metric — displayed but excluded from EPA AQI calculation.
export const SENSOR_DEFS = [
  { name: 'PM2.5', unit: 'μg/m³', max: 200,  safe: 35.4, color: '#2563eb', description: 'Particle pollution (PM₂.₅)' },
  { name: 'PM10',  unit: 'μg/m³', max: 300,  safe: 54,   color: '#7c3aed', description: 'Coarse particulate matter' },
  { name: 'CO',    unit: 'ppm',   max: 15,   safe: 4.4,  color: '#ea580c', description: 'Carbon monoxide' },
  { name: 'NO₂',  unit: 'ppb',   max: 200,  safe: 53,   color: '#db2777', description: 'Nitrogen dioxide' },
  { name: 'CO₂',  unit: 'ppm',   max: 2000, safe: 1000, color: '#0891b2', description: 'Carbon dioxide', indoor: true },
]

// After purification: only PM2.5 and PM10 are re-measured post-filter.
export const SENSOR_DEFS_AFTER = [
  { name: 'PM2.5', unit: 'μg/m³', max: 200, safe: 35.4, color: '#2563eb', description: 'PM₂.₅ after purification' },
  { name: 'PM10',  unit: 'μg/m³', max: 300, safe: 54,   color: '#7c3aed', description: 'PM₁₀ after purification' },
]

// Official US EPA 6-tier AQI standard (Table 1 & Table 2)
// color     — raw EPA indicator hex (dots, bars, chart bands, badge bg)
// textVar   — CSS variable: dark version in light mode, vivid in dark mode
// bg        — very-low-opacity tint for card backgrounds
// badgeText — text on top of color-filled badge chip
export const AQI_LEVELS = {
  'Good': {
    color: '#00E400', textVar: 'var(--aqi-c-good)', bg: 'rgba(0,228,0,0.08)', badgeText: '#003300',
    range: '0–50', short: 'Good',
    advisory: 'Air quality is satisfactory and air pollution poses little or no risk.',
  },
  'Moderate': {
    color: '#FFFF00', textVar: 'var(--aqi-c-moderate)', bg: 'rgba(255,255,0,0.08)', badgeText: '#3a3a00',
    range: '51–100', short: 'Mod.',
    advisory: 'Air quality is acceptable. Some pollutants may be a moderate concern for unusually sensitive people.',
  },
  'Sensitive Groups': {
    color: '#FF7E00', textVar: 'var(--aqi-c-usg)', bg: 'rgba(255,126,0,0.08)', badgeText: '#fff',
    range: '101–150', short: 'USG',
    advisory: 'Members of sensitive groups may experience health effects. The general public is unlikely to be affected.',
  },
  'Unhealthy': {
    color: '#FF0000', textVar: 'var(--aqi-c-unhealthy)', bg: 'rgba(255,0,0,0.08)', badgeText: '#fff',
    range: '151–200', short: 'Unhlthy',
    advisory: 'Everyone may begin to experience health effects. Members of sensitive groups may experience more serious effects. Reduce prolonged outdoor exertion.',
  },
  'Very Unhealthy': {
    color: '#8F3F97', textVar: 'var(--aqi-c-very)', bg: 'rgba(143,63,151,0.08)', badgeText: '#fff',
    range: '201–300', short: 'V.Unhlthy',
    advisory: 'Health alert: Everyone may experience more serious health effects. Avoid prolonged or heavy outdoor exertion.',
  },
  'Hazardous': {
    color: '#7E0023', textVar: 'var(--aqi-c-hazardous)', bg: 'rgba(126,0,35,0.08)', badgeText: '#fff',
    range: '301–500', short: 'Hazard.',
    advisory: 'Health warning of emergency conditions. The entire population is likely to be affected. Avoid all outdoor exertion.',
  },
}

export const AQI_LEVELS_ORDERED = [
  'Good', 'Moderate', 'Sensitive Groups', 'Unhealthy', 'Very Unhealthy', 'Hazardous',
]

// 6 EPA color zones for charts
export const AQI_ZONES = [
  { label: 'Good',             min: 0,   max: 50,  color: '#00E400' },
  { label: 'Moderate',         min: 50,  max: 100, color: '#FFFF00' },
  { label: 'Sensitive Groups', min: 100, max: 150, color: '#FF7E00' },
  { label: 'Unhealthy',        min: 150, max: 200, color: '#FF0000' },
  { label: 'Very Unhealthy',   min: 200, max: 300, color: '#8F3F97' },
  { label: 'Hazardous',        min: 300, max: 500, color: '#7E0023' },
]

export const SYSTEM_INFO = {
  station:  'UITS-01 · University Campus',
  location: 'Dhaka-1212, Bangladesh',
  method:   'EPA Piecewise Interpolation',
  dept:     'CSE · UITS, Dhaka',
}

// Inline PM2.5 sub-index for pre-loaded history (no circular dependency needed)
function _pm25SubIdx(cp) {
  const bps = [
    { cLo: 0.0,   cHi: 12.0,  iLo: 0,   iHi: 50  },
    { cLo: 12.1,  cHi: 35.4,  iLo: 51,  iHi: 100 },
    { cLo: 35.5,  cHi: 55.4,  iLo: 101, iHi: 150 },
    { cLo: 55.5,  cHi: 150.4, iLo: 151, iHi: 200 },
    { cLo: 150.5, cHi: 250.4, iLo: 201, iHi: 300 },
    { cLo: 250.5, cHi: 500.4, iLo: 301, iHi: 500 },
  ]
  const bp = bps.find(b => cp >= b.cLo && cp <= b.cHi)
  if (!bp) return cp > 500.4 ? 500 : 0
  return Math.round(((bp.iHi - bp.iLo) / (bp.cHi - bp.cLo)) * (cp - bp.cLo) + bp.iLo)
}

export const HISTORY_PRELOAD = (() => {
  const base = Date.now() - 19 * 3 * 60000
  const points = []
  let pm25 = 28
  let co = 1.8
  for (let i = 0; i < 20; i++) {
    pm25 = Math.max(5, Math.min(130, pm25 + (Math.random() - 0.45) * 10))
    co   = Math.max(0.1, Math.min(9, co + (Math.random() - 0.48) * 0.6))
    const t = new Date(base + i * 3 * 60000)
    points.push({
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      aqi:  _pm25SubIdx(+pm25.toFixed(1)),
      pm25: +pm25.toFixed(1),
      co:   +co.toFixed(2),
    })
  }
  return points
})()
