import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signupSendOtp } from '../api/authApi'
import {
  AuthShell, AuthTabs, GoogleBtn, AuthDivider, BtnPrimary, EyeToggle, Err,
  authCard, inputProps, labelStyle,
} from '../components/ui/AuthShell'

export default function SignUp() {
  const navigate = useNavigate()
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [showCf, setShowCf]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const ip = inputProps()

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (!name.trim())          { setError('Enter your full name.'); return }
    if (!email.includes('@'))  { setError('Enter a valid email address.'); return }
    if (password.length < 6)   { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm)  { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await signupSendOtp(name, email, password)
      navigate('/signup/verify', { state: { name, email, password } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div style={authCard}>
        <AuthTabs active="signup" />
        <GoogleBtn onClick={() => setTimeout(() => navigate('/dashboard'), 1200)} />
        <AuthDivider />
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>FULL NAME</label>
            <input type="text" placeholder="Shafayat Ullah" value={name}
              onChange={e => { setName(e.target.value); setError('') }} required {...ip} />
          </div>
          <div>
            <label style={labelStyle}>EMAIL ADDRESS</label>
            <input type="email" placeholder="you@example.com" value={email}
              onChange={e => { setEmail(e.target.value); setError('') }} required {...ip} />
          </div>
          <div>
            <label style={labelStyle}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} placeholder="Min. 6 characters" value={password}
                onChange={e => { setPassword(e.target.value); setError('') }} required
                {...ip} style={{ ...ip.style, paddingRight: 42 }} />
              <EyeToggle show={showPw} onToggle={() => setShowPw(s => !s)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>CONFIRM PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input type={showCf ? 'text' : 'password'} placeholder="Repeat password" value={confirm}
                onChange={e => { setConfirm(e.target.value); setError('') }} required
                {...ip} style={{ ...ip.style, paddingRight: 42 }} />
              <EyeToggle show={showCf} onToggle={() => setShowCf(s => !s)} />
            </div>
          </div>
          {error && <Err>{error}</Err>}
          <BtnPrimary type="submit" disabled={loading}>
            {loading ? 'Sending verification code…' : 'Continue →'}
          </BtnPrimary>
        </form>
      </div>
    </AuthShell>
  )
}
