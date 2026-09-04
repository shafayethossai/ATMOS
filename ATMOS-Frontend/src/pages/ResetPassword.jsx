import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { resetPassword } from '../api/authApi'
import {
  AuthShell, BtnPrimary, EyeToggle, PasswordStrength, Err,
  authCard, inputProps, labelStyle,
} from '../components/ui/AuthShell'

export default function ResetPassword() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { email, resetToken } = location.state || {}

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)
  const ip = inputProps()

  useEffect(() => {
    if (!email) navigate('/forgot-password', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleReset(e) {
    e.preventDefault(); setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await resetPassword(email, resetToken, password)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!email) return null

  return (
    <AuthShell accentColor="#2563eb">
      <div style={authCard}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px' }}>
              ✓
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>Password reset!</h1>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-2)' }}>
              Your password has been updated. Sign in with your new password.
            </p>
            <BtnPrimary onClick={() => navigate('/login')}>Back to Sign in</BtnPrimary>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>
                🔒
              </div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>Set new password</h1>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
                For <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{email}</span>
              </p>
            </div>

            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>NEW PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters"
                    value={password} onChange={e => { setPassword(e.target.value); setError('') }} required
                    {...ip} style={{ ...ip.style, paddingRight: 42 }} />
                  <EyeToggle show={showPw} onToggle={() => setShowPw(s => !s)} />
                </div>
                <PasswordStrength password={password} />
              </div>
              <div>
                <label style={labelStyle}>CONFIRM PASSWORD</label>
                <input type={showPw ? 'text' : 'password'} placeholder="Repeat password"
                  value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }} required
                  {...ip}
                  style={{
                    ...ip.style,
                    borderColor: confirm && confirm !== password ? '#ef4444' : 'var(--border)',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = confirm !== password ? '#ef4444' : '#059669')}
                  onBlur={e => (e.currentTarget.style.borderColor = confirm && confirm !== password ? '#ef4444' : 'var(--border)')}
                />
                {confirm && confirm !== password && (
                  <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    Passwords do not match
                  </div>
                )}
              </div>
              {error && <Err>{error}</Err>}
              <BtnPrimary type="submit" disabled={loading}>
                {loading ? 'Updating…' : 'Reset Password'}
              </BtnPrimary>
            </form>
          </>
        )}
      </div>
    </AuthShell>
  )
}
