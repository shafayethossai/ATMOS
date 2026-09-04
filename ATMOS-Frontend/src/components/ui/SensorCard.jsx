import { getSensorBarColor } from '../../services/aqiCalc'
import { pct } from '../../utils/format'

export function SensorCard({ sensor }) {
  const barPct   = pct(sensor.value, sensor.max)
  const safePct  = pct(sensor.safe, sensor.max)
  const barColor = getSensorBarColor(sensor)
  const isOver   = sensor.value > sensor.safe

  return (
    <div
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '12px 10px 12px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
        boxShadow: 'var(--shadow-card)', transition: 'box-shadow 0.2s, border-color 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-hover)'
        e.currentTarget.style.borderColor = 'var(--border-strong)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)' }}>
            {sensor.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{sensor.description}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 18, fontWeight: 700,
            fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
            color: isOver ? barColor : 'var(--text-1)', lineHeight: 1,
          }}>
            {sensor.value}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{sensor.unit}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0,
          height: '100%', width: `${barPct}%`,
          background: barColor, borderRadius: 2,
          transition: 'width 0.6s ease',
        }} />
        <div style={{
          position: 'absolute', left: `${safePct}%`, top: -3,
          width: 2, height: 9, background: 'var(--text-3)', borderRadius: 1,
        }} />
      </div>

      {/* Footer labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)',
      }}>
        <span>0</span>
        <span style={{ color: isOver ? barColor : 'var(--text-3)', fontWeight: isOver ? 600 : 400 }}>
          {isOver ? '▲ ABOVE SAFE' : 'WITHIN SAFE'}
        </span>
        <span>{sensor.max}</span>
      </div>
    </div>
  )
}
