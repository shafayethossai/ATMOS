import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { signupSendOtp, signupVerifyOtp } from '../api/authApi'
import { AuthShell, BtnPrimary, Err, authCard } from '../components/ui/AuthShell'
import { OTPInput, ResendRow, startResendTimer } from '../components/ui/OTPInput'

export default function SignUpOTP() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { name, email, password } = location.state || {}

  const [otp, setOtp]         = useState('')
  const [timer, setTimer]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!email) { navigate('/signup', { replace: true }); return }
    startResendTimer(setTimer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResend() {
    setOtp(''); setError('')
    try {
      await signupSendOtp(name, email, password)
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
      await signupVerifyOtp(email, otp)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  if (!email) return null

  return (
    <AuthShell>
      <div style={authCard}>
        <button onClick={() => navigate('/signup')}
          style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 20 }}>
          ← Back
        </button>

        <div style={{ marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>
            ✉️
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>Verify your email</h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
            We sent a 6-digit code to{' '}
            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <OTPInput value={otp} onChange={v => { setOtp(v); setError('') }} idPrefix="signup-otp" />
          {error && <Err center>{error}</Err>}
          <BtnPrimary type="submit" disabled={loading || otp.length < 6}>
            {loading ? 'Creating account…' : 'Create account'}
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
