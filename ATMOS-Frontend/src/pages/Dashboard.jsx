import { AQIChart } from '../components/ui/AQIChart'
import { ArcGauge } from '../components/ui/ArcGauge'
import { MetricCard } from '../components/ui/MetricCard'
import { SensorCard } from '../components/ui/SensorCard'
import { Sparkline } from '../components/ui/Sparkline'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Navbar } from '../components/layout/Navbar'
import { PageContainer } from '../components/layout/PageContainer'
import { useStation } from '../context/StationContext'
import { AQI_LEVELS, AQI_LEVELS_ORDERED, SYSTEM_INFO } from '../data/mockAQI'
import { useAQIData } from '../hooks/useAQIData'

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
  const {
    sensors, history, aqiValue, aqiLevel, criticalPollutant,
    subIndices, aboveSafe, isLoading, lastUpdated, refresh,
  } = useAQIData()

  const cfg = AQI_LEVELS[aqiLevel]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>

      <Navbar isLoading={isLoading} lastUpdated={lastUpdated} onRefresh={refresh} station={activeStation} />

      <PageContainer>

        {/* ── Stats bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, flexShrink: 0 }}>
          <MetricCard label="STATION"      value={activeStation?.id ?? 'UITS-01'} sub={activeStation?.location ?? 'University Campus'} />
          <MetricCard label="AQI INDEX"    value={aqiValue} sub={`${aqiLevel} · ${cfg.range}`} accent={cfg.textVar} />
          <MetricCard label="SENSORS"      value={sensors.filter(s => !s.indoor && s.value > 0).length}
            sub={aboveSafe > 0 ? `${aboveSafe} above safe limit` : 'All within safe limits'}
            accent={aboveSafe > 0 ? 'var(--sensor-alert)' : undefined} />
          <MetricCard label="DATA POINTS"  value="20" sub="Last 60 min · 3 min intervals" />
        </div>

        {/* ── Body: left main + right sidebar ── */}
        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 360px',
          columnGap: 20, rowGap: 16,
          overflow: 'hidden', minHeight: 0,
        }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, overflow: 'hidden' }}>

            {/* Sensor grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, flexShrink: 0 }}>
              {sensors.map(s => <SensorCard key={s.name} sensor={s} />)}
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

          {/* ── Right sidebar ── */}
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
                  Overall AQI = max of all sub-indices · CO₂ excluded (indoor metric)
                </div>
              </div>
            )}

            {/* ── Key Indicators: arc gauges ── */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '12px 16px', flexShrink: 0,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.07em', marginBottom: 10 }}>
                KEY INDICATORS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                {sensors.slice(0, 3).map(s => (
                  <div key={s.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', fontWeight: 600, marginBottom: 2 }}>{s.name}</div>
                    <ArcGauge value={s.value} max={s.max} safe={s.safe} color={s.color} size={86} showValue />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                <div style={{ width: 2, height: 8, background: 'var(--text-3)', borderRadius: 1 }} />
                safe threshold marker
              </div>
            </div>

            {/* ── Classification Scale ── */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '12px 16px', flexShrink: 0,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.07em', marginBottom: 8 }}>
                EPA CLASSIFICATION SCALE
              </div>
              {AQI_LEVELS_ORDERED.map(level => {
                const c = AQI_LEVELS[level]
                const isActive = level === aqiLevel
                return (
                  <div key={level} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 10px', borderRadius: 8,
                    background: isActive ? c.bg : 'transparent',
                    border: isActive ? `1px solid ${c.color}40` : '1px solid transparent',
                    marginBottom: 3, transition: 'background 0.3s',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? c.textVar : 'var(--text-1)' }}>{level}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>AQI {c.range}</div>
                    </div>
                    {isActive && (
                      <span style={{
                        fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700,
                        background: c.color, color: c.badgeText,
                        padding: '2px 8px', borderRadius: 10, letterSpacing: '0.04em',
                      }}>CURRENT</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── System Info ── */}
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '12px 16px', flexShrink: 0,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.07em', marginBottom: 8 }}>
                SYSTEM INFO
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  { k: 'Station:',  v: SYSTEM_INFO.station  },
                  { k: 'Location:', v: SYSTEM_INFO.location  },
                  { k: 'Dept.:',    v: SYSTEM_INFO.dept      },
                  { k: 'Method:',   v: SYSTEM_INFO.method    },
                ].map(r => (
                  <div key={r.k} style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                    <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', minWidth: 64, flexShrink: 0 }}>{r.k}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>{/* end right sidebar */}

        </div>{/* end body grid */}

      </PageContainer>
    </div>
  )
}
