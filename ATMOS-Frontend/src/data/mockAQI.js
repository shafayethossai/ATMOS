export const STATIONS = [
  { id: 'UITS-01', name: 'UITS Campus', location: 'Dhaka-1212', lat: 23.8103, lng: 90.4125, active: true },
  { id: 'DMP-02',  name: 'Dhanmondi',   location: 'Dhaka-1209', lat: 23.7461, lng: 90.3742, active: true },
  { id: 'GUL-03',  name: 'Gulshan',     location: 'Dhaka-1212', lat: 23.7925, lng: 90.4078, active: false },
  { id: 'MOT-04',  name: 'Motijheel',   location: 'Dhaka-1000', lat: 23.7337, lng: 90.4181, active: true },
]

export const SENSOR_DEFS = [
  { name: 'PM2.5', unit: 'μg/m³', max: 200,  safe: 35.4, color: '#2563eb', bgColor: '#dbeafe', description: 'Fine particulate matter' },
  { name: 'PM10',  unit: 'μg/m³', max: 300,  safe: 70,   color: '#7c3aed', bgColor: '#ede9fe', description: 'Coarse particulate matter' },
  { name: 'CO',    unit: 'ppm',   max: 15,   safe: 4,    color: '#ea580c', bgColor: '#ffedd5', description: 'Carbon monoxide' },
  { name: 'NO₂',  unit: 'ppb',   max: 200,  safe: 53,   color: '#db2777', bgColor: '#fce7f3', description: 'Nitrogen dioxide' },
  { name: 'SO₂',  unit: 'ppb',   max: 150,  safe: 35,   color: '#d97706', bgColor: '#fef3c7', description: 'Sulfur dioxide' },
  { name: 'CO₂',  unit: 'ppm',   max: 2000, safe: 1000, color: '#0891b2', bgColor: '#cffafe', description: 'Carbon dioxide' },
  { name: 'O₃',   unit: 'ppb',   max: 200,  safe: 70,   color: '#059669', bgColor: '#d1fae5', description: 'Ozone' },
]

export const AQI_LEVELS = {
  Good:      { color: '#059669', bg: '#d1fae5', range: '0–50',   desc: 'Air quality is satisfactory. Little or no risk.' },
  Moderate:  { color: '#d97706', bg: '#fef3c7', range: '51–100', desc: 'Acceptable. Slight concern for very sensitive individuals.' },
  Poor:      { color: '#dc2626', bg: '#fee2e2', range: '101–200',desc: 'General public begins to feel effects. Sensitive groups at higher risk.' },
  Hazardous: { color: '#6b21a8', bg: '#f3e8ff', range: '201+',   desc: 'Emergency conditions. Everyone is affected.' },
}

export const AQI_ZONES = [
  { label: 'Good',      min: 0,   max: 50,  color: '#059669' },
  { label: 'Moderate',  min: 50,  max: 100, color: '#d97706' },
  { label: 'Poor',      min: 100, max: 200, color: '#dc2626' },
  { label: 'Hazardous', min: 200, max: 250, color: '#6b21a8' },
]

export const MODEL_INFO = {
  dataset:  'UCI AQI + IoT Sensor Network',
  models:   'Random Forest, XGBoost, LSTM, GRU',
  accuracy: '90.4%',
  dept:     'CSE · UITS, Dhaka-1212',
  updated:  '2026-09-04',
}

export const HISTORY_PRELOAD = (() => {
  const base = Date.now() - 19 * 3 * 60000
  const points = []
  let pm25 = 28
  let co = 1.8
  for (let i = 0; i < 20; i++) {
    pm25 = Math.max(5, Math.min(85, pm25 + (Math.random() - 0.45) * 8))
    co   = Math.max(0.1, Math.min(9,  co   + (Math.random() - 0.48) * 0.6))
    const t = new Date(base + i * 3 * 60000)
    points.push({
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      aqi:  Math.round(pm25 <= 12 ? (50 / 12) * pm25 : pm25 <= 35.4 ? 50 + (49 / 23.4) * (pm25 - 12.1) : 100 + (49 / 19.9) * (pm25 - 35.5)),
      pm25: +pm25.toFixed(1),
      co:   +co.toFixed(2),
    })
  }
  return points
})()
