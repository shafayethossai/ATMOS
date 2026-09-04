import { AQI_ZONES } from '../../data/mockAQI'
import { aqiZoneColor } from '../../services/aqiCalc'

const AQI_MAX = 250

export function AQIChart({ data }) {
  const w = 640; const h = 160
  const padL = 36; const padR = 62; const padT = 8; const padB = 22
  const chartW = w - padL - padR
  const chartH = h - padT - padB

  function toY(v) { return padT + chartH - (Math.min(v, AQI_MAX) / AQI_MAX) * chartH }
  function toX(i) { return padL + (i / (data.length - 1)) * chartW }

  const pts  = data.map((d, i) => ({ x: toX(i), y: toY(d.aqi), v: d.aqi }))
  const line = pts.map(p => `${p.x},${p.y}`).join(' ')
  const fill = [...pts.map(p => `${p.x},${p.y}`), `${toX(data.length - 1)},${padT + chartH}`, `${padL},${padT + chartH}`].join(' ')
  const last = pts[pts.length - 1]

  const yTicks    = [0, 50, 100, 200, AQI_MAX]
  const boundLines = [
    { v: 50,  label: '50 Mod.',  color: '#d97706' },
    { v: 100, label: '100 Poor', color: '#dc2626' },
    { v: 200, label: '200 Haz.', color: '#6b21a8' },
  ]

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <clipPath id="aqiClip">
          <rect x={padL} y={padT} width={chartW} height={chartH} />
        </clipPath>
      </defs>

      {/* Zone bands */}
      {AQI_ZONES.map(zone => {
        const y1 = toY(Math.min(zone.max, AQI_MAX))
        const y2 = toY(zone.min)
        return (
          <rect key={zone.label} x={padL} y={y1} width={chartW} height={y2 - y1}
            fill={zone.color} opacity="0.07" clipPath="url(#aqiClip)" />
        )
      })}

      {/* Boundary dashed lines */}
      {boundLines.map(t => (
        <g key={t.v}>
          <line x1={padL} y1={toY(t.v)} x2={padL + chartW} y2={toY(t.v)}
            stroke={t.color} strokeWidth="0.8" strokeDasharray="5 4" opacity="0.6" />
          <text x={padL + chartW + 4} y={toY(t.v) + 3} fill={t.color}
            fontSize="7.5" fontFamily="DM Mono, monospace" opacity="0.85">{t.label}</text>
        </g>
      ))}

      {/* Area + line */}
      <polygon points={fill} fill="#2563eb" opacity="0.07" clipPath="url(#aqiClip)" />
      <polyline points={line} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" clipPath="url(#aqiClip)" />

      {/* Colored dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={aqiZoneColor(p.v)} clipPath="url(#aqiClip)" />
      ))}

      {/* Latest point emphasis */}
      <circle cx={last.x} cy={last.y} r="9"  fill={aqiZoneColor(last.v)} opacity="0.2" />
      <circle cx={last.x} cy={last.y} r="5"  fill={aqiZoneColor(last.v)} />

      {/* Y-axis labels */}
      {yTicks.map(t => (
        <text key={t} x={padL - 4} y={toY(t) + 4} textAnchor="end"
          fill="#94a3b8" fontSize="8" fontFamily="DM Mono, monospace">{t}</text>
      ))}

      {/* X-axis time labels */}
      {data.map((d, i) => i % 4 === 0 && (
        <text key={i} x={toX(i)} y={h - 4} textAnchor="middle"
          fill="#94a3b8" fontSize="8" fontFamily="DM Mono, monospace">{d.time}</text>
      ))}

      {/* Axes */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="var(--border)" strokeWidth="1" />
      <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="var(--border)" strokeWidth="1" />
    </svg>
  )
}
