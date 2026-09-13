const BASE_URL = import.meta.env.VITE_API_URL ?? ''

// Returns latest sensor readings + pre-calculated AQI from Go backend.
// Response: { stationId, timestamp, pm25, pm10, co, no2, co2,
//             pm25_after, pm10_after, aqi, aqi_level,
//             critical_pollutant, sub_indices }
export async function fetchLatestReadings(stationId) {
  if (!BASE_URL) return null
  const res = await fetch(`${BASE_URL}/api/stations/${stationId}/latest`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

// Returns time-series for AQI trend + sparklines.
// Response: { stationId, points: [{ time, aqi, pm25, co }] }
export async function fetchHistory(stationId, hours = 1) {
  if (!BASE_URL) return null
  const res = await fetch(`${BASE_URL}/api/stations/${stationId}/history?hours=${hours}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}
