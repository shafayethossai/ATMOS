export function PageContainer({ children }) {
  return (
    <div style={{
      flex: 1, overflow: 'hidden', minHeight: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        maxWidth: 1680, margin: '0 auto', width: '100%', height: '100%',
        padding: '20px 28px',
        display: 'flex', flexDirection: 'column', gap: 16,
        overflow: 'hidden', boxSizing: 'border-box',
      }}>
        {children}
      </div>
    </div>
  )
}
