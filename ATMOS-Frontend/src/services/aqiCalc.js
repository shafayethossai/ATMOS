import { SENSOR_DEFS, SENSOR_DEFS_AFTER } from '../data/mockAQI'

// EPA breakpoint tables — only for pollutants the IoT hardware measures that affect AQI.
// CO₂ is NOT in AQI (ventilation metric). SO₂ and O₃ are not measured by this hardware.
const BREAKPOINTS = {
  pm25: [
    { cLo: 0.0,   cHi: 12.0,  iLo: 0,   iHi: 50  },
    { cLo: 12.1,  cHi: 35.4,  iLo: 51,  iHi: 100 },
    { cLo: 35.5,  cHi: 55.4,  iLo: 101, iHi: 150 },
    { cLo: 55.5,  cHi: 150.4, iLo: 151, iHi: 200 },
    { cLo: 150.5, cHi: 250.4, iLo: 201, iHi: 300 },
    { cLo: 250.5, cHi: 500.4, iLo: 301, iHi: 500 },
  ],
  pm10: [
    { cLo: 0,   cHi: 54,  iLo: 0,   iHi: 50  },
    { cLo: 55,  cHi: 154, iLo: 51,  iHi: 100 },
    { cLo: 155, cHi: 254, iLo: 101, iHi: 150 },
    { cLo: 255, cHi: 354, iLo: 151, iHi: 200 },
    { cLo: 355, cHi: 424, iLo: 201, iHi: 300 },
    { cLo: 425, cHi: 604, iLo: 301, iHi: 500 },
  ],
  co: [
    { cLo: 0.0,  cHi: 4.4,  iLo: 0,   iHi: 50  },
    { cLo: 4.5,  cHi: 9.4,  iLo: 51,  iHi: 100 },
    { cLo: 9.5,  cHi: 12.4, iLo: 101, iHi: 150 },
    { cLo: 12.5, cHi: 15.4, iLo: 151, iHi: 200 },
    { cLo: 15.5, cHi: 30.4, iLo: 201, iHi: 300 },
    { cLo: 30.5, cHi: 50.4, iLo: 301, iHi: 500 },
  ],
  no2: [
    { cLo: 0,    cHi: 53,   iLo: 0,   iHi: 50  },
    { cLo: 54,   cHi: 100,  iLo: 51,  iHi: 100 },
    { cLo: 101,  cHi: 360,  iLo: 101, iHi: 150 },
    { cLo: 361,  cHi: 649,  iLo: 151, iHi: 200 },
    { cLo: 650,  cHi: 1249, iLo: 201, iHi: 300 },
    { cLo: 1250, cHi: 2049, iLo: 301, iHi: 500 },
  ],
  // O₃ 8-hour average in ppb (truncate to integer before interpolation)
  o3: [
    { cLo: 0,   cHi: 54,  iLo: 0,   iHi: 50  },
    { cLo: 55,  cHi: 70,  iLo: 51,  iHi: 100 },
    { cLo: 71,  cHi: 85,  iLo: 101, iHi: 150 },
    { cLo: 86,  cHi: 105, iLo: 151, iHi: 200 },
    { cLo: 106, cHi: 200, iLo: 201, iHi: 300 },
    { cLo: 405, cHi: 604, iLo: 301, iHi: 500 },
  ],
}

// EPA requires truncation (not rounding) before interpolation
function trunc(val, decimals) {
  const f = Math.pow(10, decimals)
  return Math.floor(val * f) / f
}

function interpolate(cp, bps) {
  const bp = bps.find(b => cp >= b.cLo && cp <= b.cHi)
  if (!bp) return cp > (bps[bps.length - 1]?.cHi ?? 0) ? 500 : 0
  return Math.round(((bp.iHi - bp.iLo) / (bp.cHi - bp.cLo)) * (cp - bp.cLo) + bp.iLo)
}

// AQI sub-indices for the 5 pollutants measured by this hardware that have EPA AQI standards.
// CO₂ is intentionally excluded — it is a ventilation metric, not an EPA AQI pollutant.
export function computeSubIndices(sensors) {
  const get = name => sensors.find(s => s.name === name)?.value ?? 0
  return {
    'PM2.5': interpolate(trunc(get('PM2.5'), 1), BREAKPOINTS.pm25),
    'PM10':  interpolate(trunc(get('PM10'), 0),  BREAKPOINTS.pm10),
    'CO':    interpolate(trunc(get('CO'), 1),    BREAKPOINTS.co),
    'O₃':   interpolate(trunc(get('O₃'), 0),    BREAKPOINTS.o3),
    'NO₂':  interpolate(trunc(get('NO₂'), 0),   BREAKPOINTS.no2),
  }
}

// Overall AQI is the MAX of all criteria pollutant sub-indices
export function computeAQI(sensors) {
  const subIndices = computeSubIndices(sensors)
  const [criticalPollutant, aqiValue] = Object.entries(subIndices)
    .reduce((best, cur) => cur[1] > best[1] ? cur : best, ['', 0])
  return { aqiValue, aqiLevel: classifyAQI(aqiValue), criticalPollutant, subIndices }
}

export function classifyAQI(v) {
  if (v <= 50)  return 'Good'
  if (v <= 100) return 'Moderate'
  if (v <= 150) return 'Sensitive Groups'
  if (v <= 200) return 'Unhealthy'
  if (v <= 300) return 'Very Unhealthy'
  return 'Hazardous'
}

export function aqiZoneColor(v) {
  if (v <= 50)  return '#00E400'
  if (v <= 100) return '#C8C800'
  if (v <= 150) return '#FF7E00'
  if (v <= 200) return '#FF0000'
  if (v <= 300) return '#8F3F97'
  return '#7E0023'
}

export function generateSensors() {
  return SENSOR_DEFS.map(def => ({
    ...def,
    value: def.name === 'CO₂'
      ? +(Math.random() * 500 + 350).toFixed(0)
      : def.name === 'CO'
      ? +(Math.random() * 8 + 0.1).toFixed(2)
      : def.name === 'O₃'
      ? +(Math.random() * 90 + 10).toFixed(0)
      : +(Math.random() * (def.safe * 1.8) + def.safe * 0.1).toFixed(1),
  }))
}

export function getSensorBarColor(sensor) {
  if (sensor.indoor) return sensor.color
  if (sensor.value <= sensor.safe) return sensor.color
  return (sensor.value / sensor.max) > 0.75 ? '#FF0000' : '#FF7E00'
}

// Simulate after-purification readings for PM2.5 and PM10.
// Purification reduces particulate matter by 40–70%.
// Replace this with real hardware data when the post-filter sensor is ready.
export function generateAfterPurification(beforeSensors) {
  const reduction = 0.40 + Math.random() * 0.30  // 40–70% reduction
  return SENSOR_DEFS_AFTER.map(def => {
    const before = beforeSensors.find(s => s.name === def.name)?.value ?? 0
    return { ...def, value: +(before * (1 - reduction)).toFixed(1) }
  })
}
