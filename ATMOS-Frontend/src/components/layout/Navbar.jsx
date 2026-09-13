import { Moon, RefreshCw, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AtmosLogo } from '../../assets/AtmosLogo'
import { useTheme } from '../../context/ThemeContext'
import { fmtTime } from '../../utils/format'

function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '5px 10px 5px 5px', cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff',
        }}>SU</div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>Shafayat</div>
        </div>
        <span style={{
          color: 'var(--text-3)', fontSize: 10,
          display: 'inline-block',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }}>▾</span>
      </button>

      {open && (
        <div className="slide-in" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, minWidth: 200,
          boxShadow: '0 10px 40px rgba(0,0,0,0.14)', overflow: 'hidden', zIndex: 100,
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Shafayat Ullah</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>habiburrahman3089@gmail.com</div>
          </div>
          <button
            onClick={() => { setOpen(false); navigate('/profile') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 14px', background: 'none', border: 'none',
              color: 'var(--text-2)', fontSize: 13, cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            👤 Profile
          </button>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => { setOpen(false); navigate('/login') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', background: 'none', border: 'none',
                color: '#dc2626', fontSize: 13, cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              → Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Navbar({ isLoading, lastUpdated, onRefresh, station }) {
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <header style={{
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      height: 68, padding: '0 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0, zIndex: 50,
    }}>
      {/* Left: logo + wordmark */}
      <div
        onClick={() => navigate('/dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
      >
        <AtmosLogo size={80} />
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
            color: 'var(--text-1)', lineHeight: 1, letterSpacing: '0.05em',
          }}>ATMOS</div>
          <div style={{
            fontSize: 8.5, color: 'var(--text-3)', marginTop: 3,
            letterSpacing: '0.08em', fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
          }}>
            Air Quality Monitoring
          </div>
        </div>
      </div>

      {/* Center: live indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--font-mono)', fontSize: 12,
      }}>
        <div className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669' }} />
        <span style={{ color: '#059669', fontWeight: 600 }}>LIVE</span>
        <span style={{ color: 'var(--text-3)' }}>·</span>
        <span style={{ color: 'var(--text-2)' }}>{station?.id ?? 'UITS-01'}</span>
        <span style={{ color: 'var(--text-3)' }}>·</span>
        <span style={{ color: 'var(--text-2)' }}>{fmtTime(lastUpdated)}</span>
        <button
          onClick={onRefresh}
          style={{
            marginLeft: 8, display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '4px 10px',
            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-2)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={12} className={isLoading ? 'spin' : ''} />
          REFRESH
        </button>
      </div>

      {/* Right: theme toggle + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => setTheme(nextTheme)}
          title={`Theme: ${theme}`}
          style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 8px', cursor: 'pointer',
            color: 'var(--text-2)', display: 'flex', alignItems: 'center',
          }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <UserMenu />
      </div>
    </header>
  )
}
