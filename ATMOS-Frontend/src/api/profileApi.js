const BASE = import.meta.env.VITE_API_URL ?? ''

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  }
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? data.message ?? `Request failed (${res.status})`)
  return data
}

export function getMe() {
  if (!BASE) return Promise.resolve({ id: '1', name: 'Dev User', email: 'dev@atmos.local', location: '', avatar_url: '' })
  return request('GET', '/api/user/me')
}

export function updateProfile(name, location) {
  if (!BASE) return Promise.resolve({ name, location })
  return request('PATCH', '/api/user/profile', { name, location })
}

export function changePassword(currentPassword, newPassword) {
  if (!BASE) return Promise.resolve({ message: 'Password changed' })
  return request('POST', '/api/user/change-password', { currentPassword, newPassword })
}

export async function uploadAvatar(file) {
  if (!BASE) return Promise.resolve({ avatar_url: URL.createObjectURL(file) })
  const form = new FormData()
  form.append('avatar', file)
  const res = await fetch(`${BASE}/api/user/avatar`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? data.message ?? `Request failed (${res.status})`)
  return data
}
