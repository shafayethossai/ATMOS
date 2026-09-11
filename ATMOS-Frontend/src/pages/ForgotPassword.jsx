import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgotSendOtp } from '../api/authApi'
import { AuthShell, BtnPrimary, Err, LogoHeader, authCard, inputProps, labelStyle } from '../components/ui/AuthShell'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const ip = inputProps()

  async function handleSend(e) {
    e.preventDefault()
    if (!email.includes('@')) { setError('Enter a valid email address.'); return }
    setError(''); setLoading(true)
    try {
      await forgotSendOtp(email)
      navigate('/forgot-password/verify', { state: { email } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div style={authCard}>
        <LogoHeader />
        <div style={{ marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>
            🔑
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>Forgot password?</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
            Enter your email and we'll send a 6-digit reset code.
          </p>
        </div>

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>EMAIL ADDRESS</label>
            <input type="email" placeholder="Enter your email address" value={email}
              onChange={e => { setEmail(e.target.value); setError('') }} required {...ip} />
          </div>
          {error && <Err>{error}</Err>}
          <BtnPrimary type="submit" disabled={loading}>
            {loading ? 'Sending code…' : 'Send Reset Code →'}
          </BtnPrimary>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
          Remember it?{' '}
          <Link to="/login" style={{ color: '#059669', textDecoration: 'none' }}>Sign in</Link>
        </div>
      </div>
    </AuthShell>
  )
}
