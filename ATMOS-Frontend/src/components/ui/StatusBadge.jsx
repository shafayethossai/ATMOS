export function StatusBadge({ label, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 500,
      color: color,
      background: color + '14',
      border: `1px solid ${color}28`,
      padding: '2px 8px', borderRadius: 20,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  )
}
