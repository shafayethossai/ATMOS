import { useEffect, useState } from 'react'
import { getMe } from '../api/profileApi'
import { AQIChart } from '../components/ui/AQIChart'
import { MetricCard } from '../components/ui/MetricCard'
import { SensorCard } from '../components/ui/SensorCard'
import { Sparkline } from '../components/ui/Sparkline'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Navbar } from '../components/layout/Navbar'
import { PageContainer } from '../components/layout/PageContainer'
import { useStation } from '../context/StationContext'
import { AQI_LEVELS, AQI_LEVELS_ORDERED } from '../data/mockAQI'
import { useAQIData } from '../hooks/useAQIData'
import { getHourlyForecast, getDailyForecast } from '../api/forecastApi'

function aqiLevelName(v) {
  if (v <= 50)  return 'Good'
  if (v <= 100) return 'Moderate'
  if (v <= 150) return 'Sensitive Groups'
  if (v <= 200) return 'Unhealthy'
  if (v <= 300) return 'Very Unhealthy'
  return 'Hazardous'
}

const DO_ADVICE = {
  'Good': [
    { bg: 'rgba(34,197,94,.12)',  icon: '🪟', title: 'Open windows freely',      sub: 'Outdoor air quality is excellent today' },
    { bg: 'rgba(34,197,94,.12)',  icon: '🏃', title: 'Exercise outdoors freely', sub: 'No restrictions for any group' },
    { bg: 'rgba(59,130,246,.12)', icon: '💨', title: 'Purifier on LOW or OFF',   sub: 'Indoor air is naturally clean right now' },
  ],
  'Moderate': [
    { bg: 'rgba(251,191,36,.12)', icon: '🪟', title: 'Windows OK with caution',  sub: 'Sensitive people may want them closed' },
    { bg: 'rgba(59,130,246,.12)', icon: '💨', title: 'Purifier on LOW',           sub: 'Light filtering is enough at this level' },
    { bg: 'rgba(34,197,94,.12)',  icon: '🏃', title: 'Outdoor exercise is fine',  sub: 'Unusually sensitive people: take it easy' },
  ],
  'Sensitive Groups': [
    { bg: 'rgba(251,191,36,.12)', icon: '🪟', title: 'Limit window opening',      sub: 'Keep closed during peak hours (10am–4pm)' },
    { bg: 'rgba(59,130,246,.12)', icon: '💨', title: 'Run purifier on MEDIUM',    sub: 'Continuous filtering recommended' },
    { bg: 'rgba(251,191,36,.12)', icon: '🏃', title: 'Reduce outdoor exertion',   sub: 'Short walks OK — avoid running or cycling' },
    { bg: 'rgba(251,191,36,.12)', icon: '😷', title: 'Mask if you are sensitive', sub: 'Asthma, elderly, children: wear a mask' },
  ],
  'Unhealthy': [
    { bg: 'rgba(239,68,68,.12)',  icon: '🪟', title: 'Keep windows closed',       sub: 'Outdoor air is worse than indoor right now' },
    { bg: 'rgba(59,130,246,.12)', icon: '💨', title: 'Run purifier on HIGH',       sub: 'Full speed for 2+ hours — all day if possible' },
    { bg: 'rgba(251,191,36,.12)', icon: '😷', title: 'Wear N95 if going out',      sub: 'Surgical mask not enough at this level' },
    { bg: 'rgba(239,68,68,.12)',  icon: '🏃', title: 'Skip outdoor exercise',      sub: 'Wait for AQI to drop below 150' },
  ],
  'Very Unhealthy': [
    { bg: 'rgba(239,68,68,.12)',  icon: '🪟', title: 'All windows closed',         sub: 'Seal gaps if possible — air is dangerous' },
    { bg: 'rgba(59,130,246,.12)', icon: '💨', title: 'Purifier on MAX all day',    sub: 'Replace filter if it has been 3+ months' },
    { bg: 'rgba(239,68,68,.12)',  icon: '😷', title: 'N95 mandatory outdoors',     sub: 'Even brief exposure is harmful here' },
    { bg: 'rgba(239,68,68,.12)',  icon: '🏠', title: 'Stay indoors',               sub: 'Avoid all non-essential outdoor activity' },
  ],
  'Hazardous': [
    { bg: 'rgba(239,68,68,.12)',  icon: '⚠️', title: 'Emergency — stay inside',    sub: 'Avoid all outdoor exposure — health alert' },
    { bg: 'rgba(59,130,246,.12)', icon: '💨', title: 'Purifier on MAX non-stop',   sub: 'Critical — maximize filtration continuously' },
    { bg: 'rgba(239,68,68,.12)',  icon: '😷', title: 'N95 + goggles if outside',   sub: 'Eyes are also affected at hazardous levels' },
    { bg: 'rgba(239,68,68,.12)',  icon: '📞', title: 'Check on vulnerable people', sub: 'Elderly, children, sick — check they are safe' },
  ],
}

function fmtDate(s) {
  try { return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  catch { return s.slice(5) }
}

function DailyForecastChart({ forecast }) {
  const n = forecast.length
  if (n < 2) return null

  const W = 320, H = 120
  const PAD = { left: 28, right: 6, top: 8, bottom: 22 }
  const CW = W - PAD.left - PAD.right
  const CH = H - PAD.top - PAD.bottom
  const Y_MIN = 50, Y_MAX = 250
  const chartBottom = PAD.top + CH

  const xOf = i => PAD.left + (i / (n - 1)) * CW
  const yOf = v => PAD.top + (1 - (Math.min(Math.max(v, Y_MIN), Y_MAX) - Y_MIN) / (Y_MAX - Y_MIN)) * CH

  const hiPts  = forecast.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.aqi_high ?? d.aqi + 15).toFixed(1)}`).join(' ')
  const loPts  = [...forecast].reverse().map((d, i) => `${xOf(n - 1 - i).toFixed(1)},${yOf(d.aqi_low ?? d.aqi - 15).toFixed(1)}`).join(' ')
  const linePath = forecast.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)} ${yOf(d.aqi).toFixed(1)}`).join(' ')

  const zones  = [
    { min: 50,  max: 100, color: '#00E400' },
    { min: 100, max: 150, color: '#FF7E00' },
    { min: 150, max: 200, color: '#FF0000' },
    { min: 200, max: 250, color: '#8F3F97' },
  ]
  const xTicks = [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor(3 * n / 4), n - 1]
  const yTicks = [100, 150, 200]

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', marginBottom: 10 }}>
        {zones.map(z => (
          <rect key={z.min}
            x={PAD.left} y={yOf(Math.min(z.max, Y_MAX)).toFixed(1)}
            width={CW} height={(yOf(Math.max(z.min, Y_MIN)) - yOf(Math.min(z.max, Y_MAX))).toFixed(1)}
            fill={z.color} opacity={0.055}
          />
        ))}
        <polygon points={`${hiPts} ${loPts}`} fill="rgba(96,165,250,.15)" />
        <polyline points={hiPts} fill="none" style={{ stroke: 'rgba(96,165,250,.3)', strokeWidth: 0.8, strokeDasharray: '3,3' }} />
        <polyline points={loPts} fill="none" style={{ stroke: 'rgba(96,165,250,.3)', strokeWidth: 0.8, strokeDasharray: '3,3' }} />
        <path d={linePath} fill="none" stroke="#FF7E00" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={xOf(0).toFixed(1)} cy={yOf(forecast[0].aqi).toFixed(1)} r={3} fill="#FF7E00" />
        <line x1={PAD.left} y1={chartBottom} x2={PAD.left + CW} y2={chartBottom} style={{ stroke: 'var(--border)', strokeWidth: 0.8 }} />
        {xTicks.map(i => (
          <g key={i}>
            <line x1={xOf(i).toFixed(1)} y1={chartBottom} x2={xOf(i).toFixed(1)} y2={chartBottom + 3} style={{ stroke: 'var(--border)', strokeWidth: 0.8 }} />
            <text x={xOf(i).toFixed(1)} y={H - 4} textAnchor="middle" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, fill: 'var(--text-3)' }}>
              {fmtDate(forecast[i].date)}
            </text>
          </g>
        ))}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left} y1={yOf(v).toFixed(1)} x2={PAD.left + CW} y2={yOf(v).toFixed(1)} style={{ stroke: 'var(--border)', strokeWidth: 0.5, strokeDasharray: '2,4' }} />
            <text x={PAD.left - 4} y={(yOf(v) + 3).toFixed(1)} textAnchor="end" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, fill: 'var(--text-3)' }}>
              {v}
            </text>
          </g>
        ))}
      </svg>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {forecast.slice(0, 7).map((d, i) => {
            const lvl   = aqiLevelName(d.aqi)
            const lc    = AQI_LEVELS[lvl]
            const short = lvl === 'Sensitive Groups' ? 'USG' : lvl === 'Very Unhealthy' ? 'V.Unhealthy' : lvl
            return (
              <tr key={i}>
                <td style={{ padding: '4px 0', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', width: 54, borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  {fmtDate(d.date)}
                </td>
                <td style={{ padding: '4px 0', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: lc.textVar, width: 38, borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  {d.aqi}
                </td>
                <td style={{ padding: '4px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 600, padding: '2px 7px', borderRadius: 8, background: `${lc.color}20`, color: lc.textVar }}>
                    {short}
                  </span>
                </td>
                <td style={{ padding: '4px 0', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textAlign: 'right', borderTop: i > 0 ? '1px solid var(--border)' : 'none', fontVariantNumeric: 'tabular-nums' }}>
                  {d.aqi_low}–{d.aqi_high}
                </td>
              </tr>
            )
          })}
          <tr>
            <td colSpan={4} style={{ textAlign: 'center', padding: '6px 0', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: '.05em' }}>
              + {forecast.length - 7} MORE DAYS
            </td>
          </tr>
        </tbody>
      </table>
    </>
  )
}

// PM2.5 and CO sparkline definitions
// c = dot/bg color (EPA vivid), tc = readable text color via CSS var
const CHART_DEFS = [
  {
    label: 'PM2.5 TREND', key: 'pm25', color: '#2563eb',
    unit: 'μg/m³', max: 160, limit: 35.4, limitLabel: '35.4',
    zones: [
      { l: 'Good',     c: '#00E400', tc: 'var(--aqi-c-good)',      r: '0–12'    },
      { l: 'Mod.',     c: '#FFFF00', tc: 'var(--aqi-c-moderate)',  r: '12–35'   },
      { l: 'USG',      c: '#FF7E00', tc: 'var(--aqi-c-usg)',       r: '35–55'   },
      { l: 'Unhlthy',  c: '#FF0000', tc: 'var(--aqi-c-unhealthy)', r: '55+'     },
    ],
  },
  {
    label: 'CO TREND', key: 'co', color: '#ea580c',
    unit: 'ppm', max: 15, limit: 4.4, limitLabel: '4.4',
    zones: [
      { l: 'Good',     c: '#00E400', tc: 'var(--aqi-c-good)',      r: '0–4.4'   },
      { l: 'Mod.',     c: '#FFFF00', tc: 'var(--aqi-c-moderate)',  r: '4.4–9.4' },
      { l: 'USG',      c: '#FF7E00', tc: 'var(--aqi-c-usg)',       r: '9.4–12'  },
      { l: 'Unhlthy',  c: '#FF0000', tc: 'var(--aqi-c-unhealthy)', r: '12+'     },
    ],
  },
]

// AQI chart legend: color = dot/bg, textColor = readable text in both modes
const AQI_LEGEND = [
  { label: 'Good (0–50)',         color: '#00E400', textColor: 'var(--aqi-c-good)'      },
  { label: 'Mod. (51–100)',       color: '#FFFF00', textColor: 'var(--aqi-c-moderate)'  },
  { label: 'USG (101–150)',       color: '#FF7E00', textColor: 'var(--aqi-c-usg)'       },
  { label: 'Unhlthy (151–200)',   color: '#FF0000', textColor: 'var(--aqi-c-unhealthy)' },
  { label: 'V.Unhlthy (201–300)', color: '#8F3F97', textColor: 'var(--aqi-c-very)'      },
  { label: 'Haz. (301+)',         color: '#7E0023', textColor: 'var(--aqi-c-hazardous)' },
]

export default function Dashboard() {
  const { activeStation } = useStation()

  // pick up JWT from URL after Google OAuth redirect, then load user info
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('token', token)
      window.history.replaceState({}, '', '/dashboard')
    }
    // fetch user if not already in localStorage (e.g. after Google OAuth)
    if (!localStorage.getItem('user')) {
      getMe().then(u => {
        localStorage.setItem('user', JSON.stringify({ id: u.id, name: u.name, email: u.email }))
      }).catch(() => {})
    }
  }, [])

  const {
    sensors, sensorsAfter, history, aqiValue, aqiLevel, criticalPollutant,
    subIndices, aboveSafe, isLoading, lastUpdated, refresh,
  } = useAQIData()

  const cfg = AQI_LEVELS[aqiLevel]

  const [hourly, setHourly] = useState(null)
  const [daily,  setDaily]  = useState(null)
  useEffect(() => {
    getHourlyForecast().then(setHourly).catch(() => {})
    getDailyForecast().then(setDaily).catch(() => {})
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>

      <Navbar isLoading={isLoading} lastUpdated={lastUpdated} onRefresh={refresh} station={activeStation} />

      <PageContainer>

        {/* ── Main grid: left area (stats + charts) + right sidebar ── */}
        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 360px',
          columnGap: 20,
          overflow: 'hidden', minHeight: 0,
        }}>

          {/* ── Left column: stats bar + charts stacked ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, overflow: 'hidden' }}>

            {/* ── Stats bar (3 cards, 4th slot intentionally empty) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, flexShrink: 0 }}>
              <MetricCard label="AQI INDEX"    value={aqiValue} sub={`${aqiLevel} · ${cfg.range}`} accent={cfg.textVar} />
              <MetricCard label="SENSORS"      value={sensors.length}
                sub={aboveSafe > 0 ? `${aboveSafe} above safe limit` : 'All within safe limits'}
                accent={aboveSafe > 0 ? 'var(--sensor-alert)' : undefined} />
              <MetricCard label="DATA POINTS"  value="20" sub="Last 60 min · 3 min intervals" />
            </div>

            {/* ── Before Purification ── */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.06em' }}>
                  BEFORE PURIFICATION
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>5 sensors · IoT raw readings</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 10 }}>
                {sensors.filter(s => !s.indoor).map(s => <SensorCard key={s.name} sensor={s} />)}
              </div>
            </div>

            {/* ── After Purification ── */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#22c55e', letterSpacing: '0.06em' }}>
                  AFTER PURIFICATION
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>PM₂.₅ &amp; PM₁₀ post-filter · CO₂ indoor</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr', gap: 10 }}>
                {sensorsAfter.map(sAfter => {
                  const sBefore   = sensors.find(s => s.name === sAfter.name)
                  const reduction = sBefore && sBefore.value > 0
                    ? Math.round((1 - sAfter.value / sBefore.value) * 100)
                    : 0
                  const beforePct = sBefore ? Math.min(sBefore.value / sAfter.max * 100, 100) : 0
                  const afterPct  = Math.min(sAfter.value / sAfter.max * 100, 100)
                  const safePct   = Math.min(sAfter.safe / sAfter.max * 100, 100)
                  const isGood    = sAfter.value <= sAfter.safe
                  return (
                    <div key={sAfter.name} style={{
                      background: 'var(--surface)',
                      border: `1px solid ${isGood ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
                      borderRadius: 14, padding: '10px 12px',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      boxShadow: 'var(--shadow-card)',
                    }}>
                      {/* Header: sensor name + unit */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.04em' }}>
                          {sAfter.name}
                        </span>
                        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{sAfter.unit}</span>
                      </div>

                      {/* Main row: before → after values + reduction % */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Before value */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', letterSpacing: '0.06em' }}>BEFORE</span>
                          <span style={{
                            fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                            color: sBefore?.value > sBefore?.safe ? 'var(--sensor-alert)' : 'var(--text-2)',
                          }}>{sBefore?.value ?? '—'}</span>
                        </div>

                        {/* Arrow */}
                        <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>→</span>

                        {/* After value */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: '#22c55e', letterSpacing: '0.06em' }}>AFTER</span>
                          <span style={{
                            fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                            color: isGood ? '#22c55e' : 'var(--sensor-alert)',
                          }}>{sAfter.value}</span>
                        </div>

                        {/* Reduction % hero */}
                        <div style={{
                          marginLeft: 'auto',
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          background: 'rgba(34,197,94,0.10)', borderRadius: 10,
                          padding: '3px 10px', border: '1px solid rgba(34,197,94,0.25)',
                        }}>
                          <span style={{
                            fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                            color: '#22c55e',
                          }}>↓{reduction}%</span>
                          <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: '#22c55e', opacity: 0.8, marginTop: 2, letterSpacing: '0.04em' }}>
                            {isGood ? 'PURIFIED' : 'REDUCED'}
                          </span>
                        </div>
                      </div>

                      {/* Comparison bar */}
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, position: 'relative' }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0, height: '100%',
                          width: `${beforePct}%`,
                          background: sBefore?.value > sBefore?.safe ? 'rgba(255,126,0,0.30)' : `${sAfter.color}30`,
                          borderRadius: 2,
                        }} />
                        <div style={{
                          position: 'absolute', left: 0, top: 0, height: '100%',
                          width: `${afterPct}%`,
                          background: '#22c55e', borderRadius: 2,
                          transition: 'width 0.6s ease',
                        }} />
                        <div style={{
                          position: 'absolute', left: `${safePct}%`, top: -3,
                          width: 2, height: 10, background: 'var(--text-3)', borderRadius: 1,
                        }} />
                      </div>

                      {/* Bar labels */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                        <span>0</span>
                        <span>safe: {sAfter.safe}</span>
                        <span>max: {sAfter.max}</span>
                      </div>
                    </div>
                  )
                })}
                {(() => {
                  const co2 = sensors.find(s => s.indoor)
                  if (!co2) return null
                  const co2Pct  = Math.min(co2.value / co2.max * 100, 100)
                  const safePct = Math.min(co2.safe  / co2.max * 100, 100)
                  const isOver  = co2.value > co2.safe
                  return (
                    <div key="co2-indoor" style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 14, padding: '10px 12px',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      boxShadow: 'var(--shadow-card)',
                    }}>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.04em' }}>CO₂</span>
                          <span style={{
                            fontSize: 7, fontFamily: 'var(--font-mono)', fontWeight: 600,
                            color: co2.color, background: `${co2.color}18`,
                            padding: '1px 5px', borderRadius: 4, letterSpacing: '0.04em',
                          }}>INDOOR</span>
                        </div>
                        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{co2.unit}</span>
                      </div>

                      {/* Main row: current value + status badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', letterSpacing: '0.06em' }}>CURRENT</span>
                          <span style={{
                            fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                            color: isOver ? 'var(--sensor-alert)' : 'var(--text-2)',
                          }}>{co2.value}</span>
                        </div>
                        <div style={{
                          marginLeft: 'auto',
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          background: `${co2.color}15`, borderRadius: 10,
                          padding: '3px 10px', border: `1px solid ${co2.color}35`,
                        }}>
                          <span style={{
                            fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)',
                            lineHeight: 1, color: isOver ? 'var(--sensor-alert)' : co2.color,
                          }}>{isOver ? '▲' : '✓'}</span>
                          <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: isOver ? 'var(--sensor-alert)' : co2.color, opacity: 0.85, marginTop: 2, letterSpacing: '0.04em' }}>
                            {isOver ? 'HIGH CO₂' : 'NORMAL'}
                          </span>
                        </div>
                      </div>

                      {/* Bar */}
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, position: 'relative' }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0, height: '100%',
                          width: `${co2Pct}%`,
                          background: isOver ? 'var(--sensor-alert)' : co2.color,
                          borderRadius: 2, transition: 'width 0.6s ease',
                        }} />
                        <div style={{
                          position: 'absolute', left: `${safePct}%`, top: -3,
                          width: 2, height: 10, background: 'var(--text-3)', borderRadius: 1,
                        }} />
                      </div>

                      {/* Labels */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                        <span>0</span>
                        <span>safe: {co2.safe}</span>
                        <span>max: {co2.max}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* AQI trend */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '12px 16px 8px 16px',
              display: 'flex', flexDirection: 'column',
              flex: 2, minHeight: 0, overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, flexShrink: 0, flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.05em' }}>AQI TREND</span>
                <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 6 }}>Last 60 min · EPA 6-tier scale</span>
                <div style={{ marginLeft: 'auto', marginRight: 48, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {AQI_LEGEND.slice(0, 4).map(l => <StatusBadge key={l.label} label={l.label} color={l.color} textColor={l.textColor} />)}
                  <span style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />
                  {AQI_LEGEND.slice(4).map(l => <StatusBadge key={l.label} label={l.label} color={l.color} textColor={l.textColor} />)}
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <AQIChart data={history} />
              </div>
            </div>

            {/* PM2.5 + CO sparklines */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: '1.4', minHeight: 0 }}>
              {CHART_DEFS.map(c => (
                <div key={c.label} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '12px 16px 8px 16px',
                  display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
                  boxShadow: 'var(--shadow-card)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, flexShrink: 0, gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.05em', flexShrink: 0 }}>
                      {c.label}
                    </span>
                    <div style={{ marginLeft: 'auto', marginRight: 48, display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                      {c.zones.slice(0, 2).map(z => <StatusBadge key={z.l} label={`${z.l} (${z.r})`} color={z.c} textColor={z.tc} />)}
                      <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
                      {c.zones.slice(2).map(z => <StatusBadge key={z.l} label={`${z.l} (${z.r})`} color={z.c} textColor={z.tc} />)}
                    </div>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <Sparkline data={history} dataKey={c.key} color={c.color} fixedMax={c.max} limitVal={c.limit} limitLabel={c.limitLabel} />
                  </div>
                </div>
              ))}
            </div>

          </div>{/* end left column */}

          {/* ── Right sidebar — starts at same level as stats bar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0, overflowY: 'auto' }}>

            {/* ── Overall AQI Status card ── */}
            <div style={{
              background: 'var(--surface)',
              border: `1.5px solid ${cfg.color}45`,
              borderRadius: 14, overflow: 'hidden', flexShrink: 0,
              boxShadow: 'var(--shadow-card)',
            }}>
              {/* Colored header strip */}
              <div style={{ background: cfg.color, padding: '7px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: cfg.badgeText, letterSpacing: '0.09em' }}>
                  AIR QUALITY INDEX · REAL-TIME
                </span>
                <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: cfg.badgeText, opacity: 0.75 }}>
                  EPA 6-TIER
                </span>
              </div>

              {/* AQI value + category */}
              <div style={{ padding: '14px 16px 10px', background: cfg.bg }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', marginBottom: 1, letterSpacing: '0.06em' }}>
                      OVERALL AQI
                    </div>
                    <div style={{
                      fontSize: 54, fontWeight: 700, fontFamily: 'var(--font-mono)',
                      color: cfg.textVar, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-2px',
                    }}>
                      {aqiValue}
                    </div>
                  </div>
                  <div style={{ paddingBottom: 8 }}>
                    <span style={{
                      display: 'inline-block',
                      fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                      background: cfg.color, color: cfg.badgeText,
                      padding: '4px 12px', borderRadius: 20, letterSpacing: '0.04em',
                    }}>
                      {aqiLevel}
                    </span>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                      AQI {cfg.range}
                    </div>
                  </div>
                </div>

                {/* Critical pollutant */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', background: `${cfg.color}12`, borderRadius: 8,
                  border: `1px solid ${cfg.color}30`, marginBottom: 8,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                    Critical Pollutant:&nbsp;
                    <span style={{ color: cfg.textVar, fontWeight: 700 }}>{criticalPollutant}</span>
                    {subIndices && (
                      <span style={{ color: 'var(--text-3)' }}>&nbsp;({subIndices[criticalPollutant]} sub-index)</span>
                    )}
                  </span>
                </div>

                {/* Health advisory */}
                <div style={{
                  fontSize: 10, color: 'var(--text-2)', lineHeight: 1.55,
                  padding: '8px 10px', background: 'var(--surface)', borderRadius: 8,
                  border: '1px solid var(--border)',
                }}>
                  {cfg.advisory}
                </div>
              </div>

              {/* 6-segment level indicator */}
              <div style={{ padding: '10px 16px 12px', display: 'flex', gap: 3 }}>
                {AQI_LEVELS_ORDERED.map(l => {
                  const lc = AQI_LEVELS[l]
                  const isActive = l === aqiLevel
                  return (
                    <div key={l} style={{ flex: 1 }}>
                      <div style={{
                        height: 4, borderRadius: 2,
                        background: isActive ? lc.color : 'var(--border)',
                        transition: 'background 0.4s',
                      }} />
                      <div style={{
                        fontSize: 7, fontFamily: 'var(--font-mono)', lineHeight: 1.2, marginTop: 3,
                        textAlign: 'center',
                        color: isActive ? lc.textVar : 'var(--text-3)',
                        fontWeight: isActive ? 700 : 400,
                      }}>{lc.short}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Sub-Index Breakdown ── */}
            {subIndices && (
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '12px 16px', flexShrink: 0,
                boxShadow: 'var(--shadow-card)',
              }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.07em', marginBottom: 10 }}>
                  POLLUTANT SUB-INDICES
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {Object.entries(subIndices).map(([name, val]) => {
                    const pct = Math.min(val / 300, 1) * 100
                    const isCritical = name === criticalPollutant
                    // bar fill uses vivid EPA colors (visual element), text uses CSS vars
                    const barFill = isCritical ? cfg.color : (val <= 50 ? '#00E400' : val <= 100 ? '#FFFF00' : val <= 150 ? '#FF7E00' : '#FF0000')
                    const barTextVar = isCritical ? cfg.textVar : (val <= 50 ? 'var(--aqi-c-good)' : val <= 100 ? 'var(--aqi-c-moderate)' : val <= 150 ? 'var(--aqi-c-usg)' : 'var(--aqi-c-unhealthy)')
                    return (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: isCritical ? 700 : 500,
                          color: isCritical ? cfg.textVar : 'var(--text-2)',
                          minWidth: 36, flexShrink: 0,
                        }}>{name}</span>
                        <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%',
                            background: barFill, borderRadius: 3,
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                        <span style={{
                          fontSize: 10, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                          color: barTextVar,
                          fontWeight: isCritical ? 700 : 500,
                          minWidth: 26, textAlign: 'right',
                        }}>{val}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 8, lineHeight: 1.4 }}>
                  Overall AQI = MAX(PM₂.₅, PM₁₀, CO, O₃, NO₂) · CO₂ excluded (ventilation metric)
                </div>
              </div>
            )}

            {/* ── Hourly Forecast ── */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '12px 14px', flexShrink: 0,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.07em', marginBottom: 10 }}>
                HOURLY FORECAST
              </div>
              {!hourly || hourly.status === 'no_data' ? (
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '10px 0' }}>
                  No forecast cached yet
                </div>
              ) : hourly.status === 'warming_up' ? (
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '10px 0' }}>
                  Collecting data — {hourly.hours_available}/{hourly.hours_required} hours ready
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {(hourly.forecasts || []).map(f => {
                    const lvl       = aqiLevelName(f.aqi)
                    const lc        = AQI_LEVELS[lvl]
                    const arrow     = f.trend === 'worsening' ? '↑' : f.trend === 'improving' ? '↓' : '→'
                    const trendClr  = f.trend === 'worsening' ? '#ef4444' : f.trend === 'improving' ? '#22c55e' : 'var(--text-3)'
                    const changeStr = f.change_from_current > 0 ? `+${f.change_from_current}` : `${f.change_from_current}`
                    return (
                      <div key={f.horizon_hours} style={{
                        background: 'var(--surface-2)', border: `1px solid ${lc.color}35`,
                        borderRadius: 10, padding: '8px 6px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      }}>
                        <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-3)', letterSpacing: '.06em' }}>
                          +{f.horizon_hours}H
                        </span>
                        <span style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', color: lc.textVar }}>
                          {f.aqi}
                        </span>
                        <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', fontWeight: 600, color: lc.textVar, textAlign: 'center', lineHeight: 1.3 }}>
                          {lvl === 'Sensitive Groups' ? 'Sensitive\nGroups' : lvl}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: trendClr }}>
                          <span style={{ fontSize: 13 }}>{arrow}</span>
                          <span>{changeStr}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── What Should I Do ── */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '12px 14px', flexShrink: 0,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.07em', marginBottom: 10 }}>
                WHAT SHOULD I DO?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {(DO_ADVICE[aqiLevel] ?? DO_ADVICE['Unhealthy']).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, background: item.bg, marginTop: 1,
                    }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3 }}>{item.title}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 30-Day Forecast ── */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '12px 14px', flexShrink: 0,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.07em', marginBottom: 8 }}>
                30-DAY FORECAST
              </div>
              {daily && (
                <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 8,
                    background: daily.basis === 'live_sensor_history' ? 'rgba(34,197,94,.12)' : 'rgba(251,191,36,.12)',
                    color:      daily.basis === 'live_sensor_history' ? '#16a34a' : '#92400e',
                    border:     daily.basis === 'live_sensor_history' ? '1px solid rgba(34,197,94,.25)' : '1px solid rgba(251,191,36,.25)',
                  }}>
                    {daily.basis === 'live_sensor_history' ? '● Live sensor data' : daily.basis === 'seasonal_only' ? '◐ Seasonal patterns' : '○ No data'}
                  </span>
                  {daily.history_days_used > 0 && (
                    <span style={{ color: 'var(--text-3)' }}>{daily.history_days_used} days used</span>
                  )}
                </div>
              )}
              {!daily || !daily.forecast || daily.forecast.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '12px 0' }}>
                  No forecast available yet
                </div>
              ) : (
                <DailyForecastChart forecast={daily.forecast} />
              )}
            </div>

          </div>{/* end right sidebar */}

        </div>{/* end main grid */}

      </PageContainer>
    </div>
  )
}
