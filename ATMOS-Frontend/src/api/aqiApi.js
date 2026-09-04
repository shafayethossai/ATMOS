const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export async function fetchLatestReadings(stationId) {
  if (!BASE_URL) return null
  const res = await fetch(`${BASE_URL}/api/stations/${stationId}/latest`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function fetchHistory(stationId, hours = 1) {
  if (!BASE_URL) return null
  const res = await fetch(`${BASE_URL}/api/stations/${stationId}/history?hours=${hours}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function fetchPrediction(stationId) {
  if (!BASE_URL) return null
  const res = await fetch(`${BASE_URL}/api/predict/${stationId}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}
