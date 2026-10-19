const BASE = import.meta.env.VITE_API_URL ?? ''

function authHeaders() {
  return { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
}

const MOCK_HOURLY = {
  status: 'ok',
  hours_available: 48,
  hours_required: 25,
  forecasts: [
    { horizon_hours: 1, aqi: 158, trend: 'worsening', change_from_current:  6 },
    { horizon_hours: 3, aqi: 172, trend: 'worsening', change_from_current: 13 },
    { horizon_hours: 6, aqi: 145, trend: 'improving', change_from_current: -7 },
  ],
}

const MOCK_DAILY = {
  basis: 'live_sensor_history',
  history_days_used: 15,
  forecast: Array.from({ length: 30 }, (_, i) => {
    const aqi = Math.max(60, Math.round(178 - i * 3.1 + Math.sin(i * 0.8) * 12))
    return {
      date:     new Date(Date.now() + (i + 1) * 86400000).toISOString().slice(0, 10),
      aqi,
      aqi_low:  aqi - 18,
      aqi_high: aqi + 18,
    }
  }),
}

export async function getHourlyForecast() {
  if (!BASE) return MOCK_HOURLY
  const res = await fetch(`${BASE}/api/forecast/hourly`, { headers: authHeaders() })
  return res.json().catch(() => ({ status: 'no_data', forecasts: [] }))
}

export async function getDailyForecast() {
  if (!BASE) return MOCK_DAILY
  const res = await fetch(`${BASE}/api/forecast/daily`, { headers: authHeaders() })
  return res.json().catch(() => ({ basis: 'no_data', forecast: [] }))
}
