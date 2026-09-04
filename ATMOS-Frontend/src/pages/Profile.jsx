import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AtmosLogo } from '../assets/AtmosLogo'
import { EyeToggle, PasswordStrength } from '../components/ui/AuthShell'
import { useTheme } from '../context/ThemeContext'
import { Moon, Sun } from 'lucide-react'

const labelStyle = {
  fontSize: 11, color: 'var(--text-3)', display: 'block',
  marginBottom: 6, fontFamily: 'var(--font-mono)',
  letterSpacing: '0.06em', fontWeight: 600,
}

const cardStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 16, padding: '28px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
}

function ProfileInput({ label, ...props }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={{
        width: '100%', padding: '10px 14px',
        border: '1px solid var(--border)', borderRadius: 10,
        fontSize: 14, fontFamily: 'var(--font-sans)',
        color: 'var(--text-1)', background: 'var(--surface-2)',
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s',
      }}
        onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        {...props}
      />
    </div>
  )
}

export default function Profile() {
  const navigate          = useNavigate()
  const { theme, setTheme } = useTheme()
  const fileRef           = useRef(null)

  const [name, setName]           = useState('Shafayat Ullah')
  const [location, setLocation]   = useState('Dhaka, Bangladesh')
  const [photo, setPhoto]         = useState(null)
  const [saved, setSaved]         = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCur, setShowCur]     = useState(false)
  const [showNew, setShowNew]     = useState(false)
  const [showCf, setShowCf]       = useState(false)
  const [pwError, setPwError]     = useState('')
  const [pwSaved, setPwSaved]     = useState(false)

  function handlePhoto(e) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPhoto(ev.target.result)
    reader.readAsDataURL(file)
  }

  function saveProfile() {
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  function savePassword() {
    setPwError('')
    if (!currentPw)          { setPwError('Enter your current password.'); return }
    if (newPw.length < 8)    { setPwError('New password must be at least 8 characters.'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return }
    setPwSaved(true); setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setTimeout(() => setPwSaved(false), 2500)
  }

  const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* Navbar */}
      <header style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        height: 68, padding: '0 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AtmosLogo size={40} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>ATMOS</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Air Quality Monitor</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setTheme(nextTheme)} style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 8px', cursor: 'pointer', color: 'var(--text-2)',
            display: 'flex', alignItems: 'center',
          }}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button onClick={() => navigate('/dashboard')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 14px', fontSize: 13,
            fontFamily: 'var(--font-mono)', color: 'var(--text-2)', cursor: 'pointer',
          }}>
            ← Dashboard
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header with avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
            <div
              onClick={() => fileRef.current?.click()}
              title="Click to upload photo"
              style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', overflow: 'hidden' }}
            >
              {photo
                ? <img src={photo} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff' }}>SU</div>
              }
              <div
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              >
                <span style={{ fontSize: 18 }}>📷</span>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>My Profile</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>habiburrahman3089@gmail.com</div>
            </div>
          </div>

          {/* Account details */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.07em', marginBottom: 20 }}>ACCOUNT DETAILS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ProfileInput label="FULL NAME" value={name} onChange={e => setName(e.target.value)} />
              <ProfileInput label="EMAIL ADDRESS" value="habiburrahman3089@gmail.com" readOnly
                style={{ color: 'var(--text-3)', cursor: 'not-allowed' }}
                onFocus={undefined} onBlur={undefined}
              />
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>LOCATION</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>📍</span>
                  <input
                    value={location} onChange={e => setLocation(e.target.value)}
                    placeholder="City, Country"
                    style={{
                      width: '100%', padding: '10px 14px 10px 34px',
                      border: '1px solid var(--border)', borderRadius: 10,
                      fontSize: 14, fontFamily: 'var(--font-sans)',
                      color: 'var(--text-1)', background: 'var(--surface-2)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                </div>
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={saveProfile} style={{
                background: '#2563eb', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 24px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Save Changes</button>
              {saved && <span style={{ fontSize: 12, color: '#059669', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✓ Saved</span>}
            </div>
          </div>

          {/* Password change */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.07em', marginBottom: 20 }}>RESET PASSWORD</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>CURRENT PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input type={showCur ? 'text' : 'password'} value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password"
                    style={{ width: '100%', padding: '10px 42px 10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text-1)', background: 'var(--surface-2)', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                  <EyeToggle show={showCur} onToggle={() => setShowCur(s => !s)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>NEW PASSWORD</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showNew ? 'text' : 'password'} value={newPw}
                      onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters"
                      style={{ width: '100%', padding: '10px 42px 10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text-1)', background: 'var(--surface-2)', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    />
                    <EyeToggle show={showNew} onToggle={() => setShowNew(s => !s)} />
                  </div>
                  <PasswordStrength password={newPw} />
                </div>
                <div>
                  <label style={labelStyle}>CONFIRM PASSWORD</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showCf ? 'text' : 'password'} value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password"
                      style={{ width: '100%', padding: '10px 42px 10px 14px', border: `1px solid ${confirmPw && confirmPw !== newPw ? '#dc2626' : 'var(--border)'}`, borderRadius: 10, fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text-1)', background: 'var(--surface-2)', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')}
                      onBlur={e => (e.currentTarget.style.borderColor = confirmPw && confirmPw !== newPw ? '#dc2626' : 'var(--border)')}
                    />
                    <EyeToggle show={showCf} onToggle={() => setShowCf(s => !s)} />
                  </div>
                  {confirmPw && confirmPw !== newPw && (
                    <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, fontFamily: 'var(--font-mono)' }}>Passwords do not match</div>
                  )}
                </div>
              </div>

              {pwError && (
                <div style={{ fontSize: 12, color: '#dc2626', fontFamily: 'var(--font-mono)', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>
                  {pwError}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={savePassword} style={{
                  background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
                  borderRadius: 10, padding: '10px 24px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>Update Password</button>
                {pwSaved && <span style={{ fontSize: 12, color: '#059669', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✓ Password updated</span>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
