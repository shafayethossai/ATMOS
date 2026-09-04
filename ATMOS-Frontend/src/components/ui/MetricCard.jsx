export function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '12px 16px',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{
        fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)',
        fontWeight: 500, letterSpacing: '0.06em', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 700, color: accent ?? 'var(--text-1)',
        lineHeight: 1, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}
