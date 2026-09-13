import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import bgImage from '../../assets/login-background.jpeg'
import { AtmosLogo } from '../../assets/AtmosLogo'

const GOOGLE_SVG = (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
)

export function LogoHeader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24 }}>
      <AtmosLogo size={120} />
      <div style={{ fontSize: 10, color: '#666', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
        AIR QUALITY MONITORING SYSTEM
      </div>
    </div>
  )
}

export function AuthTabs({ active }) {
  const tabs = [
    { key: 'login',  label: 'Sign in', to: '/login' },
    { key: 'signup', label: 'Sign up', to: '/signup' },
  ]
  return (
    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.06)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
      {tabs.map(tab => (
        <Link key={tab.key} to={tab.to} style={{
          flex: 1, padding: '8px', borderRadius: 7,
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
          textAlign: 'center', textDecoration: 'none',
          transition: 'all 0.2s',
          background: active === tab.key ? '#fff' : 'transparent',
          color:      active === tab.key ? '#111' : '#777',
          boxShadow:  active === tab.key ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
        }}>
          {tab.label}
        </Link>
      ))}
    </div>
  )
}

export function GoogleBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '11px', borderRadius: 8,
      border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.7)',
      color: '#111', fontSize: 14, fontWeight: 500,
      fontFamily: 'var(--font-sans)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      marginBottom: 20, transition: 'background 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.9)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.7)')}
    >
      {GOOGLE_SVG} Continue with Google
    </button>
  )
}

export function AuthDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.12)' }} />
      <span style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-mono)' }}>OR</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.12)' }} />
    </div>
  )
}

export function Err({ children, center }) {
  return (
    <p style={{ margin: 0, fontSize: 12, color: '#ef4444', textAlign: center ? 'center' : 'left' }}>
      {children}
    </p>
  )
}

export function AuthShell({ children }) {
  useEffect(() => {
    const root = document.documentElement
    const prev = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    return () => {
      if (prev !== null) root.setAttribute('data-theme', prev)
      else root.removeAttribute('data-theme')
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'var(--font-sans)',
      position: 'relative',
    }}>
      {/* Dark overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {children}
        <p style={{
          textAlign: 'center', fontSize: 11,
          color: 'rgba(255,255,255,0.55)',
          marginTop: 20, fontFamily: 'var(--font-mono)',
        }}>
          ATMOS · UITS Dhaka · CSE Capstone 2026
        </p>
      </div>
    </div>
  )
}

export const authCard = {
  background: 'rgba(255,255,255,0.84)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.65)',
  borderRadius: 20,
  padding: '36px 32px',
  boxShadow: '0 8px 40px rgba(0,0,0,0.28)',
}

export function inputProps(accentColor = '#059669') {
  return {
    style: {
      width: '100%',
      background: 'rgba(255,255,255,0.65)',
      border: '1px solid rgba(0,0,0,0.15)',
      borderRadius: 8,
      padding: '11px 14px',
      color: '#111',
      fontSize: 14,
      fontFamily: 'var(--font-sans)',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s',
    },
    onFocus: e => (e.currentTarget.style.borderColor = accentColor),
    onBlur:  e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'),
  }
}

export const labelStyle = {
  fontSize: 11, color: '#555', display: 'block',
  marginBottom: 6, fontFamily: 'var(--font-mono)',
  letterSpacing: '0.06em', fontWeight: 500,
}

export function BtnPrimary({ children, color = '#059669', style: extra = {}, ...rest }) {
  return (
    <button
      style={{
        width: '100%', padding: '12px', borderRadius: 8,
        border: 'none', background: color, color: '#fff',
        fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
        cursor: 'pointer', transition: 'opacity 0.2s', ...extra,
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.87')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      {...rest}
    >
      {children}
    </button>
  )
}

export function EyeToggle({ show, onToggle }) {
  return (
    <button
      type="button" onClick={onToggle}
      style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#888', fontSize: 13, padding: 0, lineHeight: 1,
      }}
    >
      {show ? '👀' : '👁'}
    </button>
  )
}

export function PasswordStrength({ password }) {
  if (!password) return null
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(password)).length
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['rgba(0,0,0,0.1)', '#ef4444', '#eab308', '#22c55e', '#059669']
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= score ? colors[score] : 'rgba(0,0,0,0.1)', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: colors[score], fontFamily: 'var(--font-mono)' }}>{labels[score]}</div>
    </div>
  )
}
