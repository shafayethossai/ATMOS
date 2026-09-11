// textColor overrides the text/border color while keeping the dot color
// Use it when `color` is a vivid EPA hue that fails contrast on light backgrounds
export function StatusBadge({ label, color, textColor }) {
  const tc = textColor ?? color
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 500,
      color: tc,
      background: color + '14',
      border: `1px solid ${tc}38`,
      padding: '2px 8px', borderRadius: 20,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  )
}
