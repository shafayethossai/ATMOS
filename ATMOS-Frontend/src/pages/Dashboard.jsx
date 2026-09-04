import { AQIChart } from '../components/ui/AQIChart'
import { ArcGauge } from '../components/ui/ArcGauge'
import { MetricCard } from '../components/ui/MetricCard'
import { SensorCard } from '../components/ui/SensorCard'
import { Sparkline } from '../components/ui/Sparkline'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Navbar } from '../components/layout/Navbar'
import { PageContainer } from '../components/layout/PageContainer'
import { useStation } from '../context/StationContext'
import { AQI_LEVELS, MODEL_INFO } from '../data/mockAQI'
import { useAQIData } from '../hooks/useAQIData'
import { getModelConfidence } from '../services/aqiCalc'

const LEVELS = ['Good', 'Moderate', 'Poor', 'Hazardous']

const CHART_DEFS = [
  {
    label: 'PM2.5 TREND', key: 'pm25', color: '#2563eb',
    unit: 'μg/m³', max: 80, limit: 35.4, limitLabel: '35.4',
    zones: [
      { l: 'Good', c: '#059669', r: '0–35' },
      { l: 'Mod.',  c: '#d97706', r: '35–55' },
      { l: 'Poor',  c: '#dc2626', r: '55+' },
    ],
  },
  {
    label: 'CO TREND', key: 'co', color: '#ea580c',
    unit: 'ppm', max: 10, limit: 4, limitLabel: '4.0',
    zones: [
      { l: 'Good', c: '#059669', r: '0–4' },
      { l: 'Mod.',  c: '#d97706', r: '4–7' },
      { l: 'Poor',  c: '#dc2626', r: '7+' },
    ],
  },
]

export default function Dashboard() {
  const { activeStation } = useStation()
  const { sensors, history, aqiValue, aqiLevel, primary, aboveSafe, isLoading, lastUpdated, refresh } = useAQIData()

  const cfg  = AQI_LEVELS[aqiLevel]
  const conf = getModelConfidence(aqiLevel)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>

      <Navbar isLoading={isLoading} lastUpdated={lastUpdated} onRefresh={refresh} station={activeStation} />

      <PageContainer>

        {/* ── Stats bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, flexShrink: 0 }}>
          <MetricCard label="STATION"     value={activeStation?.id ?? 'UITS-01'} sub={activeStation?.location ?? 'Dhaka-1212'} />
          <MetricCard label="AQI INDEX"   value={aqiValue}   sub={`${aqiLevel} · ${cfg.range}`} accent={cfg.color} />
          <MetricCard label="SENSORS"     value={`${sensors.filter(s => s.value > 0).length}`} sub={aboveSafe > 0 ? `${aboveSafe} above safe limit` : 'All within safe limits'} accent={aboveSafe > 0 ? '#dc2626' : undefined} />
          <MetricCard label="MODEL ACC."  value={MODEL_INFO.accuracy} sub="RF + LSTM ensemble" />
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

            {/* Sensor grid: 4 cols then 3 cols on last row via auto-fit */}
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
                <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 8 }}>Last 60 min · 3-min intervals</span>
                <div style={{ marginLeft: 'auto', marginRight: 48, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <StatusBadge label="Good (0–50)"   color="#059669" />
                  <StatusBadge label="Mod. (51–100)" color="#d97706" />
                  <StatusBadge label="Poor (101–200)" color="#dc2626" />
                  <span style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />
                  <StatusBadge label="Haz. (201+)"   color="#6b21a8" />
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
                      {c.zones.slice(0, 2).map(z => <StatusBadge key={z.l} label={`${z.l} (${z.r})`} color={z.c} />)}
                      <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
                      <StatusBadge label={`${c.zones[2].l} (${c.zones[2].r})`} color={c.zones[2].c} />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, overflowY: 'auto' }}>

            {/* ML Prediction card */}
            <div style={{
              background: 'var(--surface)', border: `1px solid ${cfg.color}28`,
              borderRadius: 14, overflow: 'hidden', flexShrink: 0,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ background: cfg.bg, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: cfg.color, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 2 }}>
                  RF + LSTM · MULTI-POLLUTANT
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: cfg.color, lineHeight: 1.1 }}>
                  {aqiLevel}
                </div>
                <div style={{ fontSize: 11, color: cfg.color, opacity: 0.85, marginTop: 4, lineHeight: 1.45 }}>{cfg.desc}</div>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>CONFIDENCE</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>{conf}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>PRIMARY</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: cfg.color }}>{primary?.name}</div>
                </div>
              </div>
              <div style={{ padding: '0 16px 12px', display: 'flex', gap: 3 }}>
                {LEVELS.map(l => (
                  <div key={l} style={{ flex: 1 }}>
                    <div style={{ height: 3, borderRadius: 2, background: l === aqiLevel ? AQI_LEVELS[l].color : 'var(--border)', transition: 'background 0.3s' }} />
                    <div style={{
                      fontSize: 8, fontFamily: 'var(--font-mono)',
                      color: l === aqiLevel ? AQI_LEVELS[l].color : 'var(--text-3)',
                      marginTop: 3, textAlign: 'center',
                    }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Indicators: arc gauges for top 3 sensors */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '14px 16px', flexShrink: 0,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.07em', marginBottom: 12 }}>
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
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                <div style={{ width: 2, height: 8, background: 'var(--text-3)', borderRadius: 1 }} />
                safe threshold marker
              </div>
            </div>

            {/* Classification Scale */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '14px 16px', flexShrink: 0,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.07em', marginBottom: 10 }}>
                CLASSIFICATION SCALE
              </div>
              {LEVELS.map(level => {
                const c = AQI_LEVELS[level]
                const isActive = level === aqiLevel
                return (
                  <div key={level} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8,
                    background: isActive ? c.bg : 'transparent', marginBottom: 3,
                    transition: 'background 0.3s',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? c.color : 'var(--text-1)' }}>{level}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>AQI {c.range}</div>
                    </div>
                    {isActive && (
                      <span style={{
                        fontSize: 9, fontFamily: 'var(--font-mono)',
                        background: c.color, color: '#fff',
                        padding: '2px 8px', borderRadius: 10,
                      }}>CURRENT</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Model Info */}
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '14px 16px', flexShrink: 0,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.07em', marginBottom: 10 }}>
                MODEL INFO
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { k: 'Dataset:',  v: MODEL_INFO.dataset },
                  { k: 'Models:',   v: MODEL_INFO.models },
                  { k: 'Accuracy:', v: MODEL_INFO.accuracy },
                  { k: 'Dept.:',    v: MODEL_INFO.dept },
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
