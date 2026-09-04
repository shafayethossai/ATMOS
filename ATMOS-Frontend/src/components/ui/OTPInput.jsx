/** 6-digit OTP input: auto-advance, backspace-delete, paste-aware. */
export function OTPInput({ value, onChange, idPrefix = 'otp' }) {
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  function focus(i) { document.getElementById(`${idPrefix}-${i}`)?.focus() }

  function handleKey(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      focus(i - 1)
      onChange(value.slice(0, i - 1) + value.slice(i))
    }
  }

  function handleChange(i, e) {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = [...digits]; arr[i] = char
    onChange(arr.join(''))
    if (char && i < 5) focus(i + 1)
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(text); e.preventDefault()
    focus(Math.min(text.length, 5))
  }

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          id={`${idPrefix}-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            width: 48, height: 56, textAlign: 'center',
            background: 'var(--surface-2)',
            border: `1px solid ${d ? '#059669' : 'var(--border)'}`,
            borderRadius: 10, color: 'var(--text-1)',
            fontSize: 22, fontWeight: 700,
            fontFamily: 'var(--font-mono)', outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#059669')}
          onBlur={e => (e.currentTarget.style.borderColor = e.currentTarget.value ? '#059669' : 'var(--border)')}
        />
      ))}
    </div>
  )
}

/** Resend timer + button row */
export function ResendRow({ timer, onResend }) {
  return (
    <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
      {timer > 0 ? (
        <>Resend in{' '}<span style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{timer}s</span></>
      ) : (
        <button
          onClick={onResend}
          style={{ background: 'none', border: 'none', color: '#059669', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
        >
          Resend code
        </button>
      )}
    </div>
  )
}

/** Start a 30-second resend countdown. Returns a cleanup fn. */
export function startResendTimer(setTimer) {
  setTimer(30)
  const id = setInterval(() => setTimer(t => { if (t <= 1) { clearInterval(id); return 0 } return t - 1 }), 1000)
  return () => clearInterval(id)
}
