import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn } from '../api/authApi'
import {
  AuthShell, AuthTabs, GoogleBtn, AuthDivider, BtnPrimary, EyeToggle, Err,
  authCard, inputProps, labelStyle,
} from '../components/ui/AuthShell'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const ip = inputProps()

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (!email.includes('@')) { setError('Enter a valid email address.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div style={authCard}>
        <AuthTabs active="login" />
        <GoogleBtn onClick={() => setTimeout(() => navigate('/dashboard'), 1200)} />
        <AuthDivider />
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>EMAIL ADDRESS</label>
            <input type="email" placeholder="you@example.com" value={email}
              onChange={e => { setEmail(e.target.value); setError('') }} required {...ip} />
          </div>
          <div>
            <label style={labelStyle}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} placeholder="Your password" value={password}
                onChange={e => { setPassword(e.target.value); setError('') }} required
                {...ip} style={{ ...ip.style, paddingRight: 42 }} />
              <EyeToggle show={showPw} onToggle={() => setShowPw(s => !s)} />
            </div>
          </div>
          {error && <Err>{error}</Err>}
          <BtnPrimary type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</BtnPrimary>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
            Forgot password?{' '}
            <Link to="/forgot-password" style={{ color: '#059669', textDecoration: 'none', fontWeight: 600 }}>Reset it</Link>
          </div>
        </form>
      </div>
    </AuthShell>
  )
}
