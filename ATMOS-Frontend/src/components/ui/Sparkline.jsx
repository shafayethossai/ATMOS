export function Sparkline({ data, dataKey, color, fixedMax, limitVal, limitLabel }) {
  const values = data.map(d => Number(d[dataKey]))
  const w = 430; const h = 120
  const padL = 32; const padR = 52; const padT = 8; const padB = 20
  const chartW = w - padL - padR
  const chartH = h - padT - padB

  function toY(v) { return padT + chartH - (Math.min(v, fixedMax) / fixedMax) * chartH }
  function toX(i) { return padL + (i / (values.length - 1)) * chartW }

  const pts      = values.map((v, i) => `${toX(i)},${toY(v)}`)
  const fillPts  = [...pts, `${toX(values.length - 1)},${padT + chartH}`, `${padL},${padT + chartH}`].join(' ')
  const limitY   = toY(limitVal)
  const ticks    = [0, limitVal, fixedMax]
  const gradId   = `spg-${dataKey}`
  const clipId   = `clip-${dataKey}`

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x={padL} y={padT} width={chartW} height={chartH} />
        </clipPath>
      </defs>

      {/* Zone bands */}
      <rect x={padL} y={toY(fixedMax)} width={chartW} height={toY(limitVal) - toY(fixedMax)}
        fill="#fee2e2" opacity="0.35" clipPath={`url(#${clipId})`} />
      <rect x={padL} y={toY(limitVal)} width={chartW} height={padT + chartH - toY(limitVal)}
        fill="#d1fae5" opacity="0.35" clipPath={`url(#${clipId})`} />

      {/* Limit line */}
      <line x1={padL} y1={limitY} x2={padL + chartW} y2={limitY}
        stroke="#dc2626" strokeWidth="1" strokeDasharray="4 3" />
      <text x={padL + chartW + 4} y={limitY + 3} fill="#dc2626"
        fontSize="8" fontFamily="DM Mono, monospace">{limitLabel} lim</text>

      {/* Area + line */}
      <polygon points={fillPts} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color}
        strokeWidth="1.8" strokeLinejoin="round" clipPath={`url(#${clipId})`} />

      {/* Y-axis labels */}
      {ticks.map(t => (
        <text key={t} x={padL - 4} y={toY(t) + 4} textAnchor="end"
          fill="#94a3b8" fontSize="8" fontFamily="DM Mono, monospace">{t}</text>
      ))}

      {/* X-axis time labels */}
      {data.map((d, i) => i % 5 === 0 && (
        <text key={i} x={toX(i)} y={h - 4} textAnchor="middle"
          fill="#94a3b8" fontSize="8" fontFamily="DM Mono, monospace">{d.time}</text>
      ))}

      {/* Axes */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="var(--border)" strokeWidth="1" />
      <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="var(--border)" strokeWidth="1" />
    </svg>
  )
}
