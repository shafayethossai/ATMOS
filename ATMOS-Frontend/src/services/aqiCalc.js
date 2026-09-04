import { SENSOR_DEFS } from '../data/mockAQI'

export function aqiFromPM25(pm25) {
  if (pm25 <= 12.0)  return Math.round((50 / 12.0) * pm25)
  if (pm25 <= 35.4)  return Math.round(50  + (49 / 23.4) * (pm25 - 12.1))
  if (pm25 <= 55.4)  return Math.round(100 + (49 / 19.9) * (pm25 - 35.5))
  if (pm25 <= 150.4) return Math.round(150 + (49 / 94.9) * (pm25 - 55.5))
  if (pm25 <= 250.4) return Math.round(200 + (99 / 99.9) * (pm25 - 150.5))
  return Math.round(300 + (99 / 149.9) * (pm25 - 250.5))
}

export function classifyAQI(aqiValue) {
  if (aqiValue <= 50)  return 'Good'
  if (aqiValue <= 100) return 'Moderate'
  if (aqiValue <= 200) return 'Poor'
  return 'Hazardous'
}

export function aqiZoneColor(aqi) {
  if (aqi <= 50)  return '#059669'
  if (aqi <= 100) return '#d97706'
  if (aqi <= 200) return '#dc2626'
  return '#6b21a8'
}

export function generateSensors() {
  return SENSOR_DEFS.map(def => ({
    ...def,
    value: def.name === 'CO₂'
      ? +(Math.random() * 400 + 400).toFixed(0)
      : def.name === 'CO'
      ? +(Math.random() * 6 + 0.1).toFixed(2)
      : +(Math.random() * (def.safe * 1.6) + def.safe * 0.15).toFixed(1),
  }))
}

export function getSensorBarColor(sensor) {
  const pct = sensor.value / sensor.max
  if (sensor.value <= sensor.safe) return sensor.color
  return pct > 0.85 ? '#dc2626' : '#ea580c'
}

export function getModelConfidence(level) {
  return { Good: 94, Moderate: 87, Poor: 91, Hazardous: 96 }[level] ?? 88
}

export function getPrimaryPollutant(sensors) {
  return [...sensors].sort((a, b) => b.value / b.safe - a.value / a.safe)[0]
}
