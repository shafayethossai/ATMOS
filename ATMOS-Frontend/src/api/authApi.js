const BASE = import.meta.env.VITE_API_URL ?? ''

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message ?? `Request failed (${res.status})`)
  return data
}

// ── Sign Up ──────────────────────────────────────────────────────────────────

/**
 * Step 1: validate signup data on server and send a 6-digit OTP to the email.
 * Backend should NOT create the account yet — only queue the OTP.
 * Body: { name, email, password }
 * Response: { message }
 */
export function signupSendOtp(name, email, password) {
  if (!BASE) return mockDelay({ message: 'OTP sent' })
  return post('/api/auth/signup/send-otp', { name, email, password })
}

/**
 * Step 2: verify OTP and create the account.
 * Body: { email, otp }
 * Response: { token, user: { id, name, email } }
 */
export function signupVerifyOtp(email, otp) {
  if (!BASE) return mockVerify(otp)
  return post('/api/auth/signup/verify-otp', { email, otp })
}

// ── Forgot Password ──────────────────────────────────────────────────────────

/**
 * Step 1: send a password-reset OTP to the email address.
 * Body: { email }
 * Response: { message }
 */
export function forgotSendOtp(email) {
  if (!BASE) return mockDelay({ message: 'OTP sent' })
  return post('/api/auth/forgot-password/send-otp', { email })
}

/**
 * Step 2: verify reset OTP (does NOT change the password yet).
 * Body: { email, otp }
 * Response: { resetToken }  — short-lived token for the reset step
 */
export function forgotVerifyOtp(email, otp) {
  if (!BASE) return mockVerify(otp, { resetToken: 'mock-reset-token' })
  return post('/api/auth/forgot-password/verify-otp', { email, otp })
}

/**
 * Step 3: set the new password using the verified reset token.
 * Body: { email, resetToken, newPassword }
 * Response: { message }
 */
export function resetPassword(email, resetToken, newPassword) {
  if (!BASE) return mockDelay({ message: 'Password reset' })
  return post('/api/auth/reset-password', { email, resetToken, newPassword })
}

// ── Sign In ──────────────────────────────────────────────────────────────────

/**
 * Body: { email, password }
 * Response: { token, user }
 */
export function signIn(email, password) {
  if (!BASE) return mockDelay({ token: 'mock-jwt', user: { email } })
  return post('/api/auth/login', { email, password })
}

// ── Dev mocks (only used when VITE_API_URL is not set) ──────────────────────

function mockDelay(value, ms = 900) {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

function mockVerify(otp, extra = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // In dev mode any 6-digit code is accepted
      if (otp.length === 6) resolve({ message: 'Verified', ...extra })
      else reject(new Error('Invalid OTP — enter 6 digits'))
    }, 900)
  })
}
