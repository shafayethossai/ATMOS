# ATMOS — Project Context for Claude

> Read this file before starting any task. It gives you a full picture of the project so you do not need to scan the codebase from scratch each time.

---

## Project

**ATMOS** is an IoT + ML air quality monitoring and prediction dashboard built as a CSE Capstone 2026 project for UITS Dhaka. It collects sensor data from hardware devices, runs an ML model for AQI prediction, stores everything in PostgreSQL, and displays it in a React dashboard.

---

## Architecture Overview

```
ESP32 (sensors: PM2.5, PM10, CO, NO₂, CO₂, PM2.5-after, PM10-after)
        ↓ HTTP POST /api/sensor-data
Backend API  (Go · REST · Render)
        ↓ EPA piecewise formula → AQI calculated in Go
PostgreSQL   (Neon)  — stores raw readings + AQI in one table
        ↓
React Dashboard (Vite · Vercel)
```

**No ML model.** AQI is calculated in Go using the EPA piecewise interpolation formula: `Ip = ((IHi-ILo)/(BPHi-BPLo)) × (Cp-BPLo) + ILo`. Final AQI = MAX of PM2.5, PM10, CO, NO₂ sub-indices.

| Layer | Technology | Host |
|---|---|---|
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 (JSX) | Vercel |
| Backend | Go + REST API | Render |
| Database | PostgreSQL | Neon |
| IoT Device | ESP32 → HTTP POST to Go backend | — |

---

## Frontend — Complete File Map

```
src/
├── App.jsx                        — Root: ThemeProvider + StationProvider + BrowserRouter + all routes
├── main.jsx                       — Entry point
├── index.css                      — Tailwind 4 + CSS custom property tokens (theme system)
│
├── pages/
│   ├── Login.jsx                  — /login          Sign-in form only
│   ├── SignUp.jsx                 — /signup         Sign-up form (name, email, password, confirm)
│   ├── SignUpOTP.jsx              — /signup/verify  OTP verify → account created → /dashboard
│   ├── ForgotPassword.jsx         — /forgot-password  Email entry → sends reset OTP
│   ├── ForgotOTP.jsx              — /forgot-password/verify  OTP verify → /reset-password
│   ├── ResetPassword.jsx          — /reset-password  New password form + success screen → /login
│   ├── Dashboard.jsx              — /dashboard      Main AQI dashboard
│   └── Profile.jsx                — /profile        Avatar upload, account details, password change
│
├── api/
│   ├── authApi.js                 — All 6 auth API functions (with mock fallback when VITE_API_URL is unset)
│   └── aqiApi.js                  — 3 AQI sensor API stubs (return null in dev; will call real hardware API)
│
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx             — Dashboard top navigation bar + theme toggle + station selector
│   │   └── PageContainer.jsx      — Standard page wrapper with padding
│   └── ui/
│       ├── AuthShell.jsx          — Shared auth page shell + exports: AuthTabs, GoogleBtn, AuthDivider,
│       │                            Err, BtnPrimary, EyeToggle, PasswordStrength, authCard, inputProps, labelStyle
│       ├── OTPInput.jsx           — 6-digit OTP input (auto-advance, backspace, paste) + ResendRow + startResendTimer
│       ├── AQIChart.jsx           — Inline SVG AQI trend line chart (no library)
│       ├── Sparkline.jsx          — Inline SVG sparkline for PM2.5 and CO
│       ├── ArcGauge.jsx           — Inline SVG arc/semicircle gauge
│       ├── MetricCard.jsx         — Top stat tile (large number + label + trend)
│       ├── SensorCard.jsx         — Individual sensor reading card with color bar
│       └── StatusBadge.jsx        — AQI level colored badge
│
├── context/
│   ├── ThemeContext.jsx           — theme: 'system'|'light'|'dark', persisted to localStorage,
│   │                                sets data-theme on document.documentElement
│   └── StationContext.jsx         — activeStation (from STATIONS array), setActiveStation, stations list
│
├── data/
│   └── mockAQI.js                 — STATIONS (4), SENSOR_DEFS (7 pollutants + colors), AQI_LEVELS,
│                                    AQI_ZONES, MODEL_INFO, HISTORY_PRELOAD (20 data points)
│
├── hooks/
│   └── useAQIData.js              — Polls generateSensors() every 8 seconds in dev mode.
│                                    Returns: { sensors, history, aqiValue, aqiLevel, primary,
│                                    aboveSafe, isLoading, lastUpdated, refresh }
│
├── services/
│   └── aqiCalc.js                 — aqiFromPM25(), classifyAQI(), aqiZoneColor(), generateSensors(),
│                                    getSensorBarColor(), getModelConfidence(), getPrimaryPollutant()
│
├── assets/
│   └── AtmosLogo.jsx              — SVG logo component
│
└── utils/
    └── format.js                  — Shared formatting helpers
```

---

## Routing

All routes defined in `src/App.jsx`:

| Route | Page | Notes |
|---|---|---|
| `/` | → `/login` | redirect |
| `/login` | `Login.jsx` | |
| `/signup` | `SignUp.jsx` | |
| `/signup/verify` | `SignUpOTP.jsx` | requires `location.state.email` — redirects to /signup if missing |
| `/forgot-password` | `ForgotPassword.jsx` | |
| `/forgot-password/verify` | `ForgotOTP.jsx` | requires `location.state.email` — redirects if missing |
| `/reset-password` | `ResetPassword.jsx` | requires `location.state.email + resetToken` — redirects if missing |
| `/dashboard` | `Dashboard.jsx` | |
| `/profile` | `Profile.jsx` | |
| `*` | → `/login` | catch-all |

---

## Key Patterns & Conventions

### 1. API mock/real switch
```js
// All API files check VITE_API_URL
const BASE = import.meta.env.VITE_API_URL ?? ''
if (!BASE) return mockData   // dev mode — no backend needed
return fetch(`${BASE}/api/...`) // production
```
Set `VITE_API_URL=https://your-backend.com` in `.env` to switch to real API.

### 2. State passing between auth pages
Pages pass data to the next step via React Router navigation state:
```js
navigate('/signup/verify', { state: { name, email, password } })
// receiving page:
const { email } = useLocation().state || {}
if (!email) navigate('/signup', { replace: true }) // guard
```

### 3. Theme system (CSS custom properties)
```css
/* Tokens defined in index.css */
--bg, --surface, --surface-2
--text-1, --text-2, --text-3
--border, --border-strong
--font-sans, --font-mono, --font-display
```
Dark mode: `:root:not([data-theme="light"])` + `:root[data-theme="dark"]`

### 4. Charts are all inline SVG
No chart library (no Recharts, no Chart.js). All charts hand-coded in:
`AQIChart.jsx`, `Sparkline.jsx`, `ArcGauge.jsx`

### 5. Shared auth components (import from AuthShell)
```js
import {
  AuthShell, AuthTabs, GoogleBtn, AuthDivider,
  BtnPrimary, EyeToggle, PasswordStrength, Err,
  authCard, inputProps, labelStyle
} from '../components/ui/AuthShell'
```
Do NOT redefine these in individual pages.

### 6. Dashboard data hook
```js
const { sensors, history, aqiValue, aqiLevel } = useAQIData()
```
In dev mode: auto-generates random sensor values every 8 seconds.
When hardware is ready: update `useAQIData.js` to call `fetchLatestReadings()` and `fetchHistory()` from `aqiApi.js`.

---

## Auth API Endpoints (Backend must implement)

All in `src/api/authApi.js`. All POST, `Content-Type: application/json`. Error shape: `{ "message": "..." }`.

| Function | Endpoint | Request body | Response |
|---|---|---|---|
| `signupSendOtp` | `POST /api/auth/signup/send-otp` | `{ name, email, password }` | `{ message }` |
| `signupVerifyOtp` | `POST /api/auth/signup/verify-otp` | `{ email, otp }` | `{ token, user }` |
| `signIn` | `POST /api/auth/login` | `{ email, password }` | `{ token, user }` |
| `forgotSendOtp` | `POST /api/auth/forgot-password/send-otp` | `{ email }` | `{ message }` |
| `forgotVerifyOtp` | `POST /api/auth/forgot-password/verify-otp` | `{ email, otp }` | `{ resetToken }` |
| `resetPassword` | `POST /api/auth/reset-password` | `{ email, resetToken, newPassword }` | `{ message }` |

## AQI Sensor API Endpoints (stubs — backend + hardware not ready yet)

All in `src/api/aqiApi.js`. Return `null` in dev mode.

| Function | Endpoint | Response shape |
|---|---|---|
| `fetchLatestReadings(stationId)` | `GET /api/stations/:id/latest` | `{ stationId, timestamp, pm25, pm10, co, no2, co2, pm25_after, pm10_after, aqi, aqi_level, critical_pollutant, sub_indices }` |
| `fetchHistory(stationId, hours)` | `GET /api/stations/:id/history?hours=N` | `{ stationId, points: [{ time, aqi, pm25, co }] }` |

> `fetchPrediction` removed — AQI is now calculated in Go backend, not by an ML model.

---

## Database Tables (PostgreSQL on Neon)

5 tables total. No ML predictions table.

| Table | Purpose |
|---|---|
| `users` | Registered accounts (id, name, email, password_hash, location, avatar_url) |
| `otp_tokens` | Signup + reset OTPs (email, code, type: 'signup'/'reset', expires_at, used) |
| `reset_tokens` | Password reset authorization token (user_id, token, expires_at, used) |
| `stations` | Monitoring station metadata (id, name, location, lat, lng, active) |
| `sensor_readings` | Raw readings + AQI calculated by Go (station_id, device_id, recorded_at, pm25, pm10, co, no2, co2, pm25_after, pm10_after, aqi, aqi_level, critical_pollutant, aqi_pm25, aqi_pm10, aqi_co, aqi_no2) |

Seed stations: `UITS-01` (Dhaka-1212), `DMP-02` (Dhaka-1209), `GUL-03`, `MOT-04`

---

## Sensors — what the IoT hardware actually sends

**Before purification (5 sensors):**

| Sensor | Unit | Color | AQI? |
|---|---|---|---|
| PM2.5 | μg/m³ | `#2563eb` | ✅ |
| PM10 | μg/m³ | `#7c3aed` | ✅ |
| CO | ppm | `#ea580c` | ✅ |
| NO₂ | ppb | `#db2777` | ✅ |
| CO₂ | ppm | `#0891b2` | ❌ ventilation metric only |

**After purification (2 sensors, post-filter):**

| Sensor | Unit |
|---|---|
| PM2.5-after | μg/m³ |
| PM10-after | μg/m³ |

SO₂ and O₃ are NOT measured by this hardware.

---

## Development Commands

```bash
# Frontend
cd /media/shafayet/Shafayet\ Hossain2/ATMOS
npm install
npm run dev        # runs on http://localhost:5174
npm run build      # production build to dist/

# Backend (Go)
go run main.go
```

---

## Environment Variables

```bash
# .env (frontend)
VITE_API_URL=https://your-backend.com   # leave empty for dev mock mode
```

---

## Important Rules

1. **Do not change the existing architecture** unless the user explicitly asks.
2. **Reuse existing components/functions.** Check `AuthShell.jsx` before creating any new auth UI. Check `aqiCalc.js` before writing any AQI math.
3. **Before creating a new file**, check if an existing file already handles the functionality.
4. **Keep frontend and backend responsibilities separate.** Frontend only talks to backend via `src/api/`. Never put business logic in pages directly.
5. **Do not modify environment variables** unless required by the task.
6. **Do not expose secrets** (API keys, DB credentials, JWT secrets).
7. **All charts must remain inline SVG.** Do not add Recharts, Chart.js, or any other chart library unless the user explicitly asks.
8. **Auth shared components live in `AuthShell.jsx`.** Do not duplicate `BtnPrimary`, `inputProps`, `Err`, etc. in individual pages.
9. **When wiring the real backend**, the only file to change for AQI data is `src/hooks/useAQIData.js` — components do not need to change.

---

## What Still Needs to be Done (backend)

- [ ] Implement all 6 auth endpoints in Go
- [ ] Set up PostgreSQL schema (5 tables — see `BACKEND_API.md` for exact SQL)
- [ ] Wire OTP email sending (Go `net/smtp` or SendGrid)
- [ ] Implement `POST /api/sensor-data` (ESP32 ingest + AQI calculation)
- [ ] Implement `GET /api/stations/:id/latest` and `GET /api/stations/:id/history`
- [ ] Implement mock sensor data generator goroutine (until ESP32 is ready)
- [ ] Store JWT token in frontend after login (`localStorage.setItem('token', data.token)`)
- [ ] Add `Authorization: Bearer <token>` header to AQI API calls in `aqiApi.js`
- [ ] Add route protection in `App.jsx` (redirect to `/login` if no token)
- [ ] Profile page password change endpoint (`POST /api/user/change-password`)

---

## Reference Files

- `BACKEND_API.md` — Full API spec: request/response shapes, user flow diagrams, DB schema SQL, table relationships, recommended backend stack.

---

## Current Work

> Update this section as the project changes.

**Current task:**
- Building Go backend

**Recent changes:**
- Frontend fully complete (all 8 pages, auth flows, dashboard, profile)
- ML removed: AQI now calculated in Go with EPA formula — no aqi_predictions table
- BACKEND_API.md updated: 5 tables, ESP32 ingest endpoint, Go AQI function reference
- Sensors finalised: PM2.5, PM10, CO, NO₂, CO₂ (before) + PM2.5-after, PM10-after (after purification)
- SO₂ and O₃ removed (hardware doesn't measure them)
- fetchPrediction removed from aqiApi.js

**Known problems:**
- JWT token not stored after login yet (waiting for real backend)
- No route protection yet (dashboard accessible without login)
- AQI API endpoints are stubs returning null (hardware not connected yet)
