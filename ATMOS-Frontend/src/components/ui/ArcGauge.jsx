export function ArcGauge({ value, max, safe, color, size = 100, showValue = false }) {
  const pct     = Math.min(value / max, 1)
  const safePct = safe / max
  const r = 44; const cx = 60; const cy = 60

  function polar(deg, rad) {
    const a = ((deg - 90) * Math.PI) / 180
    return { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) }
  }
  function arc(from, to, rad) {
    const s = polar(from, rad)
    const e = polar(to, rad)
    return `M ${s.x} ${s.y} A ${rad} ${rad} 0 ${to - from > 180 ? 1 : 0} 1 ${e.x} ${e.y}`
  }

  const startA  = -210
  const sweep   = 240
  const isOver  = pct > safePct
  const fillColor = isOver ? (pct > 1.2 * safePct ? '#FF0000' : '#FF7E00') : color
  const textColor = isOver ? (pct > 1.2 * safePct ? 'var(--sensor-alert)' : 'var(--sensor-warn)') : 'var(--text-1)'

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <path d={arc(startA, startA + sweep, r)} fill="none" stroke="var(--border)" strokeWidth="9" strokeLinecap="round" />
      {pct > 0 && (
        <path d={arc(startA, startA + sweep * pct, r)} fill="none" stroke={fillColor} strokeWidth="9" strokeLinecap="round" />
      )}
      <path d={arc(startA + sweep * safePct - 2, startA + sweep * safePct + 2, r)} fill="none" stroke="var(--text-3)" strokeWidth="3" strokeLinecap="round" />
      {showValue && (
        <text x={cx} y={cy + 6} textAnchor="middle" dominantBaseline="middle"
          style={{ fill: textColor }} fontSize="13" fontWeight="600" fontFamily="DM Mono, monospace">
          {value}
        </text>
      )}
    </svg>
  )
}
