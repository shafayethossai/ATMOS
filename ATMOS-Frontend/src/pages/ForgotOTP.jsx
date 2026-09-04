import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { forgotSendOtp, forgotVerifyOtp } from '../api/authApi'
import { AuthShell, BtnPrimary, Err, authCard } from '../components/ui/AuthShell'
import { OTPInput, ResendRow, startResendTimer } from '../components/ui/OTPInput'

export default function ForgotOTP() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { email } = location.state || {}

  const [otp, setOtp]         = useState('')
  const [timer, setTimer]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!email) { navigate('/forgot-password', { replace: true }); return }
    startResendTimer(setTimer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResend() {
    setOtp(''); setError('')
    try {
      await forgotSendOtp(email)
      startResendTimer(setTimer)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleVerify(e) {
    e.preventDefault()
    if (otp.length < 6) { setError('Enter all 6 digits.'); return }
    setError(''); setLoading(true)
    try {
      const data = await forgotVerifyOtp(email, otp)
      navigate('/reset-password', { state: { email, resetToken: data.resetToken ?? '' } })
    } catch (err) {
      setError(err.message)
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  if (!email) return null

  return (
    <AuthShell accentColor="#2563eb">
      <div style={authCard}>
        <button onClick={() => navigate('/forgot-password')}
          style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 20 }}>
          ← Back
        </button>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>Check your inbox</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
            6-digit code sent to{' '}
            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <OTPInput value={otp} onChange={v => { setOtp(v); setError('') }} idPrefix="fp-otp" />
          {error && <Err center>{error}</Err>}
          <BtnPrimary type="submit" disabled={loading || otp.length < 6}>
            {loading ? 'Verifying…' : 'Verify Code →'}
          </BtnPrimary>
        </form>

        <div style={{ marginTop: 16 }}>
          <ResendRow timer={timer} onResend={handleResend} />
        </div>

        {!import.meta.env.VITE_API_URL && (
          <div style={{ marginTop: 16, padding: '8px 12px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8, fontSize: 11, fontFamily: 'var(--font-mono)', color: '#2563eb' }}>
            DEV MODE — any 6-digit code is accepted
          </div>
        )}
      </div>
    </AuthShell>
  )
}
