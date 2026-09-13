# ATMOS — Backend API & Database Design Reference

This document covers every API endpoint the frontend calls, what it sends, what it expects back, where in the code it is used, and the full database schema the backend needs to support all of it.

> **Architecture update (Sep 2026):** ML prediction removed. AQI is now calculated in the Go backend using the EPA piecewise interpolation formula. The ESP32 sends raw sensor readings via HTTP POST; Go calculates AQI on receive and stores it alongside the readings. No `aqi_predictions` table. No ML microservice.

---

## 1. Environment Setup

All API calls read the base URL from one environment variable.  
Create a `.env` file in the frontend project root:

```
VITE_API_URL=https://your-backend.com
```

- **When set** → every function makes a real HTTP request to your server.  
- **When missing** → functions return mock data so the UI works during development without a backend.

---

## 2. System Architecture

```
┌─────────────────────┐
│  SENSORS (ESP32)    │
│  PM2.5, PM10,       │
│  CO, NO₂, CO₂      │
│  PM2.5-after,       │
│  PM10-after         │
└──────────┬──────────┘
           │ Wi-Fi · HTTP POST
           ▼
┌─────────────────────┐
│  GO BACKEND         │
│  REST API           │
│  Validation         │
│  AQI Calculation    │  ← EPA piecewise formula
│  Authentication     │
└──────────┬──────────┘
           │ SQL
           ▼
┌─────────────────────┐
│  POSTGRESQL (Neon)  │
│  sensor_readings    │
│  (stores raw data   │
│   + calculated AQI) │
└──────────┬──────────┘
           │ REST API
           ▼
┌─────────────────────┐
│  REACT + VITE       │
│  (Vercel)           │
└─────────────────────┘
```

### AQI Calculation (done in Go, not ESP32, not ML)

```
PM2.5 → PM2.5 sub-index ─┐
PM10  → PM10  sub-index  ├→ MAX → Final AQI
CO    → CO    sub-index  ┤
NO₂   → NO₂  sub-index  ┘
CO₂   → display only (ventilation metric, NOT included in AQI)
```

EPA formula:  
`Ip = ((IHi - ILo) / (BPHi - BPLo)) × (Cp - BPLo) + ILo`  
Final AQI = MAX of all sub-indices

---

## 3. User Journeys — What the User Sees & What Happens

---

### Journey 1 — Sign Up (new user creating an account)

```
/login  →  /signup  →  /signup/verify  →  /dashboard
```

**Step 1 — User opens the app**
- App loads at `/login`.
- The page shows two tabs: **Sign in** (active) and **Sign up**.

**Step 2 — User clicks the "Sign up" tab**
- Browser navigates to `/signup`.
- User sees a form: Full Name, Email, Password, Confirm Password.

**Step 3 — User fills the form and clicks "Continue →"**
- Frontend validates fields (name not empty, email has @, password ≥ 6 chars, passwords match).
- If valid → calls **`POST /api/auth/signup/send-otp`** with `{ name, email, password }`.
- Backend: checks email is not already registered, generates a 6-digit OTP, emails it to the user. **Account is NOT created yet.**
- Frontend navigates to `/signup/verify`, passing `{ name, email, password }` as navigation state.

**Step 4 — User is on the OTP verify page**
- Page shows: "We sent a 6-digit code to user@example.com"
- User sees 6 input boxes. They type (or paste) the code from their email.
- A 30-second countdown runs. After it hits zero, a **"Resend code"** button appears — clicking it calls `POST /api/auth/signup/send-otp` again.

**Step 5 — User enters the code and clicks "Create account"**
- Frontend calls **`POST /api/auth/signup/verify-otp`** with `{ email, otp }`.
- Backend: verifies the OTP is correct and not expired, **creates the user in the database**, returns a JWT token.
- Frontend receives the token, navigates to `/dashboard`.

---

### Journey 2 — Sign In (existing user)

```
/login  →  /dashboard
```

- User enters Email and Password, clicks "Sign in".
- Calls **`POST /api/auth/login`** with `{ email, password }`.
- Backend: finds user by email, compares password against bcrypt hash, returns JWT token + user object.
- Frontend navigates to `/dashboard`.

If credentials are wrong → backend returns `{ "message": "Incorrect password" }` → frontend shows it in red.

---

### Journey 3 — Forgot Password (user locked out)

```
/login  →  /forgot-password  →  /forgot-password/verify  →  /reset-password  →  /login
```

- User enters email → `POST /api/auth/forgot-password/send-otp`
- User enters OTP → `POST /api/auth/forgot-password/verify-otp` → returns `resetToken`
- User enters new password → `POST /api/auth/reset-password` with `{ email, resetToken, newPassword }`
- On success → shows success screen → user goes back to `/login`

---

### Journey 4 — Change Password from Profile

```
/profile  →  (password changed in place, stays on /profile)
```

- User is already logged in; no OTP needed — proves identity with current password.
- Calls `POST /api/user/change-password` with `{ currentPassword, newPassword }` + `Authorization: Bearer <token>`.

---

### Summary — Which API each page calls

| Page | Route | API called |
|---|---|---|
| `SignUp.jsx` | `/signup` | `POST /api/auth/signup/send-otp` |
| `SignUpOTP.jsx` | `/signup/verify` | `POST /api/auth/signup/verify-otp` |
| `Login.jsx` | `/login` | `POST /api/auth/login` |
| `ForgotPassword.jsx` | `/forgot-password` | `POST /api/auth/forgot-password/send-otp` |
| `ForgotOTP.jsx` | `/forgot-password/verify` | `POST /api/auth/forgot-password/verify-otp` |
| `ResetPassword.jsx` | `/reset-password` | `POST /api/auth/reset-password` |
| `Dashboard.jsx` | `/dashboard` | `GET /api/stations/:id/latest` · `GET /api/stations/:id/history` |
| `Profile.jsx` | `/profile` | `POST /api/user/change-password` |

---

## 4. Auth API — `src/api/authApi.js`

All requests are `POST` with `Content-Type: application/json`.  
All error responses must have the shape `{ "message": "Human-readable error" }`.

---

### 4.1 Sign Up — Send OTP

```
POST /api/auth/signup/send-otp
```

**Request body:**
```json
{
  "name": "Shafayat Ullah",
  "email": "user@example.com",
  "password": "mypassword123"
}
```

**Success `200`:**
```json
{ "message": "Verification code sent to user@example.com" }
```

**Errors:**
```json
{ "message": "Email already registered" }        // 409
{ "message": "Invalid email format" }             // 400
{ "message": "Password too short (min 6 chars)" } // 400
```

---

### 4.2 Sign Up — Verify OTP & Create Account

```
POST /api/auth/signup/verify-otp
```

**Request body:**
```json
{ "email": "user@example.com", "otp": "482910" }
```

**Success `201`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "uuid-here", "name": "Shafayat Ullah", "email": "user@example.com" }
}
```

**Errors:**
```json
{ "message": "Invalid or expired code" }          // 400
{ "message": "Code already used" }                // 400
{ "message": "No pending signup for this email" } // 400
```

---

### 4.3 Sign In

```
POST /api/auth/login
```

**Request body:**
```json
{ "email": "user@example.com", "password": "mypassword123" }
```

**Success `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "uuid-here", "name": "Shafayat Ullah", "email": "user@example.com" }
}
```

**Errors:**
```json
{ "message": "No account found with this email" } // 404
{ "message": "Incorrect password" }               // 401
{ "message": "Account not verified" }             // 403
```

---

### 4.4 Forgot Password — Send OTP

```
POST /api/auth/forgot-password/send-otp
```

**Request body:** `{ "email": "user@example.com" }`  
**Success `200`:** `{ "message": "Reset code sent to user@example.com" }`  
**Errors:** `{ "message": "No account found with this email" }` // 404

---

### 4.5 Forgot Password — Verify OTP

```
POST /api/auth/forgot-password/verify-otp
```

**Request body:** `{ "email": "user@example.com", "otp": "371045" }`  
**Success `200`:** `{ "resetToken": "a1b2c3d4e5f6-short-lived-signed-token" }`  
**Errors:** `{ "message": "Invalid or expired code" }` // 400

---

### 4.6 Reset Password

```
POST /api/auth/reset-password
```

**Request body:**
```json
{
  "email": "user@example.com",
  "resetToken": "a1b2c3d4e5f6-short-lived-signed-token",
  "newPassword": "newSecurePassword456"
}
```

**Success `200`:** `{ "message": "Password updated successfully" }`  
**Errors:** `{ "message": "Reset token is invalid or expired" }` // 400

---

## 5. IoT Ingest API (ESP32 → Go Backend)

This endpoint is called by the ESP32 device, **not by the React frontend**.  
Go receives the raw readings, calculates AQI using the EPA formula, then stores everything in `sensor_readings`.

---

### 5.1 Receive Sensor Data from ESP32

```
POST /api/sensor-data
```

**Headers:** `Content-Type: application/json`  
*(No auth header required for device posting — use a shared device API key in production)*

**Request body (ESP32 sends this JSON over Wi-Fi):**
```json
{
  "device_id":  "ESP32_001",
  "station_id": "UITS-01",
  "pm25":       42.5,
  "pm10":       75.2,
  "co":         2.1,
  "no2":        31.0,
  "co2":        780.0,
  "pm25_after": 18.3,
  "pm10_after": 32.1
}
```

| Field | Description |
|---|---|
| `pm25_after` | PM2.5 reading from the post-filter sensor |
| `pm10_after` | PM10 reading from the post-filter sensor |
| `co2` | Stored and displayed but NOT used in AQI calculation |

**What Go does after receiving:**
1. Validate all fields (non-negative, within plausible range)
2. Calculate sub-indices for PM2.5, PM10, CO, NO₂ using EPA breakpoints
3. Final AQI = MAX of the four sub-indices
4. Determine `aqi_level` (Good / Moderate / Sensitive Groups / Unhealthy / Very Unhealthy / Hazardous)
5. Determine `critical_pollutant` (the pollutant with the highest sub-index)
6. INSERT one row into `sensor_readings`

**Success `201`:**
```json
{
  "message": "Reading stored",
  "aqi": 119,
  "aqi_level": "Unhealthy for Sensitive Groups",
  "critical_pollutant": "PM2.5"
}
```

**Errors:**
```json
{ "message": "Invalid station_id" }   // 400
{ "message": "Invalid sensor value" } // 400
```

---

### ESP32 Code Sketch (reference)

```c
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* serverUrl = "https://your-backend.com/api/sensor-data";

void loop() {
  // Read actual sensor values here
  float pm25 = readPM25();
  float pm10 = readPM10();
  float co   = readCO();
  float no2  = readNO2();
  float co2  = readCO2();
  float pm25_after = readPM25After();
  float pm10_after = readPM10After();

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["device_id"]  = "ESP32_001";
    doc["station_id"] = "UITS-01";
    doc["pm25"]       = pm25;
    doc["pm10"]       = pm10;
    doc["co"]         = co;
    doc["no2"]        = no2;
    doc["co2"]        = co2;
    doc["pm25_after"] = pm25_after;
    doc["pm10_after"] = pm10_after;

    String body;
    serializeJson(doc, body);
    http.POST(body);
    http.end();
  }

  delay(10000); // send every 10 seconds
}
```

---

## 6. Dashboard API — `src/api/aqiApi.js`

These endpoints are **stubbed** in dev mode (return `null`, dashboard uses local mock data).  
When hardware is ready, update `src/hooks/useAQIData.js` to call these.

All `GET` requests. Header: `Authorization: Bearer <token>`

---

### 6.1 Latest Sensor Readings

```
GET /api/stations/:stationId/latest
```

Returns the most recent row from `sensor_readings` for the given station, including the pre-calculated AQI.

**Example:** `GET /api/stations/UITS-01/latest`

**Success `200`:**
```json
{
  "stationId":          "UITS-01",
  "timestamp":          "2026-09-14T08:30:00Z",
  "pm25":               42.3,
  "pm10":               78.1,
  "co":                 2.14,
  "no2":                61.0,
  "co2":                612.0,
  "pm25_after":         18.5,
  "pm10_after":         33.2,
  "aqi":                119,
  "aqi_level":          "Unhealthy for Sensitive Groups",
  "critical_pollutant": "PM2.5",
  "sub_indices": {
    "PM2.5": 119,
    "PM10":  69,
    "CO":    24,
    "NO2":   47
  }
}
```

**Used in:** `src/api/aqiApi.js` → `fetchLatestReadings(stationId)`  
Will replace `generateSensors()` + `generateAfterPurification()` in `src/hooks/useAQIData.js`

---

### 6.2 Historical Readings

```
GET /api/stations/:stationId/history?hours=1
```

Returns a time-series for the AQI trend chart, PM2.5 sparkline, and CO sparkline.  
`hours=1` = last 60 minutes (default).

**Example:** `GET /api/stations/UITS-01/history?hours=1`

**Success `200`:**
```json
{
  "stationId": "UITS-01",
  "points": [
    { "time": "08:15 PM", "aqi": 78,  "pm25": 22.1, "co": 1.8 },
    { "time": "08:18 PM", "aqi": 82,  "pm25": 24.3, "co": 1.9 },
    { "time": "08:21 PM", "aqi": 91,  "pm25": 28.0, "co": 2.1 }
  ]
}
```

**Used in:** `src/api/aqiApi.js` → `fetchHistory(stationId, hours)`  
Will replace `HISTORY_PRELOAD` in `src/data/mockAQI.js`

---

## 7. Database Schema

You need **5 tables**. The `aqi_predictions` table has been removed — AQI is now stored directly in `sensor_readings`.

---

### Table 1 — `users`

```sql
CREATE TABLE users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  location      VARCHAR(100),
  avatar_url    TEXT,
  created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);
```

| Column | Why |
|---|---|
| `id` | UUID primary key — safer than auto-increment for public APIs |
| `email` | UNIQUE — one account per email |
| `password_hash` | Store bcrypt hash, never plaintext |
| `updated_at` | Update this on every profile save |

---

### Table 2 — `otp_tokens`

```sql
CREATE TABLE otp_tokens (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(255) NOT NULL,
  code       CHAR(6)      NOT NULL,
  type       VARCHAR(20)  NOT NULL CHECK (type IN ('signup', 'reset')),
  expires_at TIMESTAMP    NOT NULL,
  used       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_email_type ON otp_tokens (email, type);
```

**Backend verify logic:**  
1. Find row: `email = $email AND type = $type AND used = false AND expires_at > NOW()`  
2. Compare `code = $otp`  
3. Match → set `used = true`, proceed  
4. No match → return 400

---

### Table 3 — `reset_tokens`

```sql
CREATE TABLE reset_tokens (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT      NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used       BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

`expires_at = NOW() + 15 minutes`. Mark `used = true` after password is changed.

---

### Table 4 — `stations`

```sql
CREATE TABLE stations (
  id         VARCHAR(20)  PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  location   VARCHAR(100) NOT NULL,
  lat        DECIMAL(9,6) NOT NULL,
  lng        DECIMAL(9,6) NOT NULL,
  active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

**Seed data:**
```sql
INSERT INTO stations VALUES
  ('UITS-01', 'UITS Campus', 'Dhaka-1212', 23.8103, 90.4125, true),
  ('DMP-02',  'Dhanmondi',   'Dhaka-1209', 23.7461, 90.3742, true),
  ('GUL-03',  'Gulshan',     'Dhaka-1212', 23.7925, 90.4078, false),
  ('MOT-04',  'Motijheel',   'Dhaka-1000', 23.7337, 90.4181, true);
```

---

### Table 5 — `sensor_readings`

Stores raw sensor values **and** the AQI calculated by Go on receive. This is the only data table — no separate predictions table.

```sql
CREATE TABLE sensor_readings (
  id                 BIGSERIAL    PRIMARY KEY,
  station_id         VARCHAR(20)  NOT NULL REFERENCES stations(id),
  device_id          VARCHAR(50)  NOT NULL,
  recorded_at        TIMESTAMP    NOT NULL DEFAULT NOW(),

  -- Raw sensor readings (before purification)
  pm25               DECIMAL(7,2),   -- μg/m³
  pm10               DECIMAL(7,2),   -- μg/m³
  co                 DECIMAL(6,3),   -- ppm
  no2                DECIMAL(7,2),   -- ppb
  co2                DECIMAL(8,2),   -- ppm  (ventilation metric, not in AQI)

  -- After purification (post-filter sensor)
  pm25_after         DECIMAL(7,2),   -- μg/m³
  pm10_after         DECIMAL(7,2),   -- μg/m³

  -- AQI calculated by Go backend (EPA formula)
  aqi                SMALLINT     NOT NULL,
  aqi_level          VARCHAR(30)  NOT NULL,
  critical_pollutant VARCHAR(10)  NOT NULL,

  -- Sub-indices stored for dashboard display
  aqi_pm25           SMALLINT,
  aqi_pm10           SMALLINT,
  aqi_co             SMALLINT,
  aqi_no2            SMALLINT
);

CREATE INDEX idx_readings_station_time
  ON sensor_readings (station_id, recorded_at DESC);
```

| Column | Why |
|---|---|
| `BIGSERIAL` | Integer, not UUID — this table grows fast (every 10s per device). Faster for range queries |
| `device_id` | Which ESP32 sent the data |
| `recorded_at` | When the ESP32 captured the reading |
| `co2` | Stored and displayed; excluded from AQI (ventilation metric) |
| `pm25_after` / `pm10_after` | Post-filter readings from the purifier sensor |
| `aqi` | Pre-calculated by Go on insert — no recalculation needed at query time |
| `aqi_level` | e.g. "Good", "Moderate", "Unhealthy for Sensitive Groups" |
| `critical_pollutant` | The pollutant that determined the final AQI |
| `aqi_pm25` … `aqi_no2` | Sub-indices for the dashboard breakdown panel |

**How `/api/stations/:id/latest` works:**
```sql
SELECT * FROM sensor_readings
WHERE station_id = $1
ORDER BY recorded_at DESC
LIMIT 1;
```

**How `/api/stations/:id/history?hours=1` works:**
```sql
SELECT recorded_at, aqi, pm25, co
FROM sensor_readings
WHERE station_id = $1
  AND recorded_at >= NOW() - INTERVAL '1 hour'
ORDER BY recorded_at ASC;
```

---

## 8. Table Relationships

```
users
  ├── otp_tokens   (email → email)  — signup & reset OTPs
  └── reset_tokens (id → user_id)   — password reset authorization

stations
  └── sensor_readings (id → station_id) — raw readings + calculated AQI
```

---

## 9. Complete Route → API → Database Map

| User action | Page | API function | Endpoint | DB tables touched |
|---|---|---|---|---|
| Sign up (submit form) | `SignUp.jsx` | `signupSendOtp` | `POST /api/auth/signup/send-otp` | `otp_tokens` INSERT |
| Sign up (enter OTP) | `SignUpOTP.jsx` | `signupVerifyOtp` | `POST /api/auth/signup/verify-otp` | `otp_tokens` UPDATE, `users` INSERT |
| Sign in | `Login.jsx` | `signIn` | `POST /api/auth/login` | `users` SELECT |
| Forgot password (email) | `ForgotPassword.jsx` | `forgotSendOtp` | `POST /api/auth/forgot-password/send-otp` | `otp_tokens` INSERT |
| Forgot password (OTP) | `ForgotOTP.jsx` | `forgotVerifyOtp` | `POST /api/auth/forgot-password/verify-otp` | `otp_tokens` UPDATE, `reset_tokens` INSERT |
| Forgot password (new pw) | `ResetPassword.jsx` | `resetPassword` | `POST /api/auth/reset-password` | `reset_tokens` UPDATE, `users` UPDATE |
| ESP32 sends readings | *(device, not frontend)* | — | `POST /api/sensor-data` | `sensor_readings` INSERT |
| Dashboard loads | `Dashboard.jsx` | `fetchLatestReadings` *(stub)* | `GET /api/stations/:id/latest` | `sensor_readings` SELECT 1 |
| Dashboard chart | `Dashboard.jsx` | `fetchHistory` *(stub)* | `GET /api/stations/:id/history` | `sensor_readings` SELECT N |
| Change password | `Profile.jsx` | — | `POST /api/user/change-password` | `users` UPDATE |

---

## 10. Go AQI Calculation Function (reference)

```go
type Breakpoint struct {
    CLo, CHi float64
    ILo, IHi float64
}

var PM25Breakpoints = []Breakpoint{
    {0.0, 12.0, 0, 50}, {12.1, 35.4, 51, 100},
    {35.5, 55.4, 101, 150}, {55.5, 150.4, 151, 200},
    {150.5, 250.4, 201, 300}, {250.5, 500.4, 301, 500},
}
var PM10Breakpoints = []Breakpoint{
    {0, 54, 0, 50}, {55, 154, 51, 100},
    {155, 254, 101, 150}, {255, 354, 151, 200},
    {355, 424, 201, 300}, {425, 604, 301, 500},
}
var COBreakpoints = []Breakpoint{
    {0.0, 4.4, 0, 50}, {4.5, 9.4, 51, 100},
    {9.5, 12.4, 101, 150}, {12.5, 15.4, 151, 200},
    {15.5, 30.4, 201, 300}, {30.5, 50.4, 301, 500},
}
var NO2Breakpoints = []Breakpoint{
    {0, 53, 0, 50}, {54, 100, 51, 100},
    {101, 360, 101, 150}, {361, 649, 151, 200},
    {650, 1249, 201, 300}, {1250, 2049, 301, 500},
}

func interpolate(cp float64, bps []Breakpoint) int {
    for _, bp := range bps {
        if cp >= bp.CLo && cp <= bp.CHi {
            ip := (bp.IHi-bp.ILo)/(bp.CHi-bp.CLo)*(cp-bp.CLo) + bp.ILo
            return int(math.Round(ip))
        }
    }
    if cp > bps[len(bps)-1].CHi {
        return 500
    }
    return 0
}

func truncate(val float64, decimals int) float64 {
    factor := math.Pow(10, float64(decimals))
    return math.Floor(val*factor) / factor
}

func CalculateAQI(pm25, pm10, co, no2 float64) (aqi int, level string, critical string, subIndices map[string]int) {
    sub := map[string]int{
        "PM2.5": interpolate(truncate(pm25, 1), PM25Breakpoints),
        "PM10":  interpolate(truncate(pm10, 0), PM10Breakpoints),
        "CO":    interpolate(truncate(co, 1),   COBreakpoints),
        "NO2":   interpolate(truncate(no2, 0),  NO2Breakpoints),
    }
    aqi, critical = 0, ""
    for name, val := range sub {
        if val > aqi {
            aqi, critical = val, name
        }
    }
    level = ClassifyAQI(aqi)
    return aqi, level, critical, sub
}

func ClassifyAQI(v int) string {
    switch {
    case v <= 50:  return "Good"
    case v <= 100: return "Moderate"
    case v <= 150: return "Unhealthy for Sensitive Groups"
    case v <= 200: return "Unhealthy"
    case v <= 300: return "Very Unhealthy"
    default:       return "Hazardous"
    }
}
```

---

## 11. When Hardware is Ready — What to Change in Frontend

Only **one file** needs editing to switch from mock to real data:

**`src/hooks/useAQIData.js`** — replace `generateSensors()`, `generateAfterPurification()`, and `HISTORY_PRELOAD` with calls to:

```js
import { fetchLatestReadings, fetchHistory } from '../api/aqiApi'
```

The response from `/api/stations/:id/latest` maps directly to the dashboard:
- `pm25`, `pm10`, `co`, `no2`, `co2` → `sensors` array (BEFORE purification)
- `pm25_after`, `pm10_after` → `sensorsAfter` array (AFTER purification)
- `aqi`, `aqi_level`, `critical_pollutant`, `sub_indices` → AQI display

Components (`SensorCard`, `AQIChart`, `Sparkline`, etc.) do not need any changes.

---

## 12. Recommended Backend Stack

| Concern | Choice |
|---|---|
| Language | **Go** (already decided) |
| HTTP router | `net/http` (stdlib) or `chi` / `gorilla/mux` |
| Database driver | `pgx` (PostgreSQL) |
| Password hashing | `golang.org/x/crypto/bcrypt` (cost 12) |
| JWT signing | `golang-jwt/jwt` — HS256, 7-day expiry |
| OTP generation | `crypto/rand` — 6-digit integer |
| Email sending | SMTP via `net/smtp`, or SendGrid API |
| Deployment | Render (free tier supports Go) |
| Database host | Neon (PostgreSQL, free tier) |

**No ML microservice needed.** AQI is calculated in Go using the EPA formula above.

---

## 13. Mock Data Strategy (until ESP32 is ready)

Since the IoT hardware is not ready yet, use a Go endpoint that generates mock sensor data on a schedule and inserts it into the database, simulating real ESP32 posts.

```go
// Mock data generator — run as a goroutine during development
func MockSensorIngest(db *sql.DB) {
    ticker := time.NewTicker(10 * time.Second)
    for range ticker.C {
        data := SensorData{
            DeviceID:  "MOCK-001",
            StationID: "UITS-01",
            PM25:      20 + rand.Float64()*60,
            PM10:      40 + rand.Float64()*100,
            CO:        0.5 + rand.Float64()*5,
            NO2:       20 + rand.Float64()*80,
            CO2:       400 + rand.Float64()*600,
        }
        // 40–70% reduction for after-purification
        reduction := 0.40 + rand.Float64()*0.30
        data.PM25After = data.PM25 * (1 - reduction)
        data.PM10After = data.PM10 * (1 - reduction)

        aqi, level, critical, sub := CalculateAQI(data.PM25, data.PM10, data.CO, data.NO2)
        InsertReading(db, data, aqi, level, critical, sub)
    }
}
```

This means the React frontend calls real API endpoints backed by real PostgreSQL — it just happens to be generated data until the physical ESP32 is connected.
