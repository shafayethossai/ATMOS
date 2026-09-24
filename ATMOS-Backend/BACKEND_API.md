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
│  CO, O₃, NO₂, CO₂  │
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
PM10  → PM10  sub-index  │
CO    → CO    sub-index  ├→ MAX → Final AQI
O₃    → O₃   sub-index  │
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
  "o3":         48.0,
  "no2":        31.0,
  "co2":        780.0,
  "pm25_after": 18.3,
  "pm10_after": 32.1
}
```

| Field | Description |
|---|---|
| `o3` | Ozone reading (ppb, 8-hour average) — included in AQI |
| `pm25_after` | PM2.5 reading from the post-filter sensor |
| `pm10_after` | PM10 reading from the post-filter sensor |
| `co2` | Stored and displayed but NOT used in AQI calculation |

**What Go does after receiving:**
1. Validate all fields (non-negative, within plausible range)
2. Calculate sub-indices for PM2.5, PM10, CO, O₃, NO₂ using EPA breakpoints
3. Final AQI = MAX of the five sub-indices
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
  "o3":                 48.0,
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
    "O3":    44,
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
  o3                 DECIMAL(7,2),   -- ppb  (8-hour average)
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
  aqi_o3             SMALLINT,
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
| `aqi_pm25` … `aqi_no2` | Sub-indices for the dashboard breakdown panel (5 pollutants including O₃) |

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
// O₃ 8-hour average in ppb
var O3Breakpoints = []Breakpoint{
    {0, 54, 0, 50}, {55, 70, 51, 100},
    {71, 85, 101, 150}, {86, 105, 151, 200},
    {106, 200, 201, 300}, {405, 604, 301, 500},
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

func CalculateAQI(pm25, pm10, co, o3, no2 float64) (aqi int, level string, critical string, subIndices map[string]int) {
    sub := map[string]int{
        "PM2.5": interpolate(truncate(pm25, 1), PM25Breakpoints),
        "PM10":  interpolate(truncate(pm10, 0), PM10Breakpoints),
        "CO":    interpolate(truncate(co, 1),   COBreakpoints),
        "O3":    interpolate(truncate(o3, 0),   O3Breakpoints),
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
- `pm25`, `pm10`, `co`, `o3`, `no2`, `co2` → `sensors` array (BEFORE purification)
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
            O3:        10 + rand.Float64()*90,   // 10–100 ppb typical urban
            NO2:       20 + rand.Float64()*80,
            CO2:       400 + rand.Float64()*600,
        }
        // 40–70% reduction for after-purification
        reduction := 0.40 + rand.Float64()*0.30
        data.PM25After = data.PM25 * (1 - reduction)
        data.PM10After = data.PM10 * (1 - reduction)

        aqi, level, critical, sub := CalculateAQI(data.PM25, data.PM10, data.CO, data.O3, data.NO2)
        InsertReading(db, data, aqi, level, critical, sub)
    }
}
```

This means the React frontend calls real API endpoints backed by real PostgreSQL — it just happens to be generated data until the physical ESP32 is connected.

---

## 14. Backend File Structure

```
ATMOS-Backend/
├── main.go                        — Entry point: loads config, connects DB, starts router
├── go.mod                         — Go module definition
├── go.sum                         — Dependency checksums (auto-generated)
├── .env                           — Secrets (DB URL, JWT secret, SMTP) — never commit
├── .env.example                   — Safe template to commit
├── .gitignore
│
├── config/
│   └── config.go                  — Reads .env, exposes Config struct used everywhere
│
├── db/
│   ├── db.go                      — Opens pgx pool, exposes DB variable
│   └── migrations/
│       └── 001_init.sql           — All CREATE TABLE + seed INSERT statements
│
├── middleware/
│   ├── auth.go                    — JWT verification — attaches userID to context
│   ├── cors.go                    — CORS headers (allows Vercel frontend origin)
│   └── logger.go                  — Logs method + path + status + duration
│
├── models/
│   ├── user.go                    — User struct (id, name, email, password_hash, …)
│   ├── otp.go                     — OTPToken struct
│   ├── reset.go                   — ResetToken struct
│   ├── station.go                 — Station struct
│   └── sensor.go                  — SensorReading struct (all columns including o3)
│
├── handlers/
│   ├── auth.go                    — 6 auth endpoints (signup/login/forgot/reset)
│   ├── user.go                    — GET /api/user/me · POST /api/user/change-password
│   ├── sensor.go                  — POST /api/sensor-data (ESP32 ingest — stub for now)
│   └── station.go                 — GET /api/stations/:id/latest · /history
│
├── services/
│   ├── aqi.go                     — CalculateAQI(), ClassifyAQI() — EPA formula
│   ├── email.go                   — SendOTPEmail() via SMTP or SendGrid
│   └── mock.go                    — MockSensorIngest() goroutine (dev only)
│
└── utils/
    ├── jwt.go                     — GenerateToken(), ValidateToken()
    └── otp.go                     — GenerateOTP() using crypto/rand
```

---

## 15. Step-by-Step Backend Implementation Guide

Follow these steps in order. Each step builds on the last. At the end you will have a working backend with auth, profile, and stub sensor endpoints — ready for the frontend to connect.

---

### PHASE 1 — Project Setup

---

#### Step 1 — Initialize the Go Module

```bash
mkdir ATMOS-Backend && cd ATMOS-Backend
go mod init github.com/yourusername/atmos-backend
```

---

#### Step 2 — Install All Dependencies

```bash
go get github.com/jackc/pgx/v5
go get github.com/jackc/pgx/v5/pgxpool
go get golang.org/x/crypto/bcrypt
go get github.com/golang-jwt/jwt/v5
go get github.com/joho/godotenv
go get github.com/go-chi/chi/v5
go get github.com/go-chi/cors
```

| Package | Purpose |
|---|---|
| `pgx/v5` | PostgreSQL driver (fastest for Neon) |
| `pgxpool` | Connection pool — reuses DB connections |
| `bcrypt` | Hash + verify passwords |
| `golang-jwt/jwt/v5` | Sign and verify JWT tokens |
| `godotenv` | Load `.env` file in development |
| `chi` | Lightweight HTTP router with middleware support |
| `go-chi/cors` | CORS middleware |

---

#### Step 3 — Create `.env`

```bash
# .env  (never commit this file)
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/atmos?sslmode=require
JWT_SECRET=replace-with-a-long-random-string-at-least-32-chars
JWT_EXPIRY_HOURS=168

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=ATMOS <your-gmail@gmail.com>

PORT=8080
FRONTEND_ORIGIN=http://localhost:5174
```

Create `.env.example` with the same keys but empty values and commit that instead.

---

#### Step 4 — Create `.gitignore`

```
.env
*.exe
/tmp
```

---

### PHASE 2 — Database (Neon)

---

#### Step 5 — Create Neon Database

1. Go to **neon.tech** → sign in → New Project → name it `atmos`
2. Copy the **Connection string** (it looks like `postgresql://user:pass@ep-xxx.neon.tech/atmos?sslmode=require`)
3. Paste it as `DATABASE_URL` in your `.env`

---

#### Step 6 — Write the Migration SQL

Create `db/migrations/001_init.sql` with this exact content:

```sql
-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  location      VARCHAR(100),
  avatar_url    TEXT,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- OTP tokens (signup + forgot-password codes)
CREATE TABLE IF NOT EXISTS otp_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(255) NOT NULL,
  code       CHAR(6)      NOT NULL,
  type       VARCHAR(20)  NOT NULL CHECK (type IN ('signup', 'reset')),
  expires_at TIMESTAMP    NOT NULL,
  used       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_email_type ON otp_tokens (email, type);

-- Reset tokens (short-lived token returned after OTP verify for password reset)
CREATE TABLE IF NOT EXISTS reset_tokens (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT      NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used       BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Monitoring stations
CREATE TABLE IF NOT EXISTS stations (
  id         VARCHAR(20)  PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  location   VARCHAR(100) NOT NULL,
  lat        DECIMAL(9,6) NOT NULL,
  lng        DECIMAL(9,6) NOT NULL,
  active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO stations (id, name, location, lat, lng, active) VALUES
  ('UITS-01', 'UITS Campus', 'Dhaka-1212', 23.8103, 90.4125, true),
  ('DMP-02',  'Dhanmondi',   'Dhaka-1209', 23.7461, 90.3742, true),
  ('GUL-03',  'Gulshan',     'Dhaka-1212', 23.7925, 90.4078, false),
  ('MOT-04',  'Motijheel',   'Dhaka-1000', 23.7337, 90.4181, true)
ON CONFLICT (id) DO NOTHING;

-- Sensor readings (raw values + Go-calculated AQI)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id                 BIGSERIAL    PRIMARY KEY,
  station_id         VARCHAR(20)  NOT NULL REFERENCES stations(id),
  device_id          VARCHAR(50)  NOT NULL,
  recorded_at        TIMESTAMP    NOT NULL DEFAULT NOW(),

  -- Before purification
  pm25               DECIMAL(7,2),
  pm10               DECIMAL(7,2),
  co                 DECIMAL(6,3),
  o3                 DECIMAL(7,2),   -- ppb
  no2                DECIMAL(7,2),   -- ppb
  co2                DECIMAL(8,2),   -- ventilation only, not in AQI

  -- After purification (post-filter)
  pm25_after         DECIMAL(7,2),
  pm10_after         DECIMAL(7,2),

  -- AQI (calculated by Go on insert)
  aqi                SMALLINT     NOT NULL,
  aqi_level          VARCHAR(30)  NOT NULL,
  critical_pollutant VARCHAR(10)  NOT NULL,

  -- Sub-indices
  aqi_pm25           SMALLINT,
  aqi_pm10           SMALLINT,
  aqi_co             SMALLINT,
  aqi_o3             SMALLINT,
  aqi_no2            SMALLINT
);

CREATE INDEX IF NOT EXISTS idx_readings_station_time
  ON sensor_readings (station_id, recorded_at DESC);
```

---

#### Step 7 — Run the Migration

Add a small runner in `db/db.go` that executes the SQL file on startup:

```go
package db

import (
    "context"
    "os"

    "github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func Connect(databaseURL string) error {
    var err error
    Pool, err = pgxpool.New(context.Background(), databaseURL)
    if err != nil {
        return err
    }
    return Pool.Ping(context.Background())
}

func RunMigration(path string) error {
    sql, err := os.ReadFile(path)
    if err != nil {
        return err
    }
    _, err = Pool.Exec(context.Background(), string(sql))
    return err
}
```

In `main.go`, call:
```go
db.Connect(cfg.DatabaseURL)
db.RunMigration("db/migrations/001_init.sql")
```

---

### PHASE 3 — Core Infrastructure

---

#### Step 8 — Config Loader (`config/config.go`)

```go
package config

import (
    "log"
    "os"
    "strconv"

    "github.com/joho/godotenv"
)

type Config struct {
    DatabaseURL    string
    JWTSecret      string
    JWTExpiryHours int
    SMTPHost       string
    SMTPPort       int
    SMTPUser       string
    SMTPPass       string
    SMTPFrom       string
    Port           string
    FrontendOrigin string
}

func Load() *Config {
    godotenv.Load() // silently ignored in production (env vars set on server)
    hours, _ := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "168"))
    port, _  := strconv.Atoi(getEnv("SMTP_PORT", "587"))
    return &Config{
        DatabaseURL:    mustEnv("DATABASE_URL"),
        JWTSecret:      mustEnv("JWT_SECRET"),
        JWTExpiryHours: hours,
        SMTPHost:       getEnv("SMTP_HOST", "smtp.gmail.com"),
        SMTPPort:       port,
        SMTPUser:       os.Getenv("SMTP_USER"),
        SMTPPass:       os.Getenv("SMTP_PASS"),
        SMTPFrom:       getEnv("SMTP_FROM", "ATMOS"),
        Port:           getEnv("PORT", "8080"),
        FrontendOrigin: getEnv("FRONTEND_ORIGIN", "http://localhost:5174"),
    }
}

func mustEnv(key string) string {
    v := os.Getenv(key)
    if v == "" {
        log.Fatalf("required env var %s is not set", key)
    }
    return v
}

func getEnv(key, fallback string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return fallback
}
```

---

#### Step 9 — JWT Utilities (`utils/jwt.go`)

```go
package utils

import (
    "time"

    "github.com/golang-jwt/jwt/v5"
)

var jwtSecret []byte

func InitJWT(secret string) { jwtSecret = []byte(secret) }

func GenerateToken(userID string, expiryHours int) (string, error) {
    claims := jwt.MapClaims{
        "user_id": userID,
        "exp":     time.Now().Add(time.Duration(expiryHours) * time.Hour).Unix(),
    }
    return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
}

func ValidateToken(tokenStr string) (string, error) {
    token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
        return jwtSecret, nil
    })
    if err != nil || !token.Valid {
        return "", err
    }
    claims := token.Claims.(jwt.MapClaims)
    return claims["user_id"].(string), nil
}
```

---

#### Step 10 — OTP Generator (`utils/otp.go`)

```go
package utils

import (
    "crypto/rand"
    "fmt"
    "math/big"
)

// GenerateOTP returns a cryptographically random 6-digit string.
func GenerateOTP() string {
    n, _ := rand.Int(rand.Reader, big.NewInt(1_000_000))
    return fmt.Sprintf("%06d", n.Int64())
}
```

---

#### Step 11 — CORS Middleware (`middleware/cors.go`)

```go
package middleware

import (
    "net/http"

    "github.com/go-chi/cors"
)

func CORS(origin string) func(http.Handler) http.Handler {
    return cors.Handler(cors.Options{
        AllowedOrigins:   []string{origin},
        AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
        AllowCredentials: true,
    })
}
```

---

#### Step 12 — Logger Middleware (`middleware/logger.go`)

```go
package middleware

import (
    "fmt"
    "net/http"
    "time"
)

func Logger(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        rw := &responseWriter{w, http.StatusOK}
        next.ServeHTTP(rw, r)
        fmt.Printf("[%s] %s %s %d %v\n",
            time.Now().Format("15:04:05"), r.Method, r.URL.Path, rw.status, time.Since(start))
    })
}

type responseWriter struct {
    http.ResponseWriter
    status int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.status = code
    rw.ResponseWriter.WriteHeader(code)
}
```

---

#### Step 13 — Auth Middleware (`middleware/auth.go`)

```go
package middleware

import (
    "context"
    "net/http"
    "strings"

    "github.com/yourusername/atmos-backend/utils"
)

type contextKey string
const UserIDKey contextKey = "userID"

func RequireAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        header := r.Header.Get("Authorization")
        if !strings.HasPrefix(header, "Bearer ") {
            http.Error(w, `{"message":"Unauthorized"}`, http.StatusUnauthorized)
            return
        }
        userID, err := utils.ValidateToken(strings.TrimPrefix(header, "Bearer "))
        if err != nil {
            http.Error(w, `{"message":"Token invalid or expired"}`, http.StatusUnauthorized)
            return
        }
        ctx := context.WithValue(r.Context(), UserIDKey, userID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

---

### PHASE 4 — Models

---

#### Step 14 — Define Go Structs

**`models/user.go`**
```go
package models

import "time"

type User struct {
    ID           string    `json:"id"`
    Name         string    `json:"name"`
    Email        string    `json:"email"`
    PasswordHash string    `json:"-"`
    Location     string    `json:"location"`
    AvatarURL    string    `json:"avatar_url"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}
```

**`models/otp.go`**
```go
package models

import "time"

type OTPToken struct {
    ID        string
    Email     string
    Code      string
    Type      string    // "signup" or "reset"
    ExpiresAt time.Time
    Used      bool
}
```

**`models/sensor.go`**
```go
package models

import "time"

type SensorReading struct {
    ID                int64     `json:"id"`
    StationID         string    `json:"station_id"`
    DeviceID          string    `json:"device_id"`
    RecordedAt        time.Time `json:"recorded_at"`
    PM25              float64   `json:"pm25"`
    PM10              float64   `json:"pm10"`
    CO                float64   `json:"co"`
    O3                float64   `json:"o3"`
    NO2               float64   `json:"no2"`
    CO2               float64   `json:"co2"`
    PM25After         float64   `json:"pm25_after"`
    PM10After         float64   `json:"pm10_after"`
    AQI               int       `json:"aqi"`
    AQILevel          string    `json:"aqi_level"`
    CriticalPollutant string    `json:"critical_pollutant"`
    AQIPM25           int       `json:"aqi_pm25"`
    AQIPM10           int       `json:"aqi_pm10"`
    AQICO             int       `json:"aqi_co"`
    AQIO3             int       `json:"aqi_o3"`
    AQINO2            int       `json:"aqi_no2"`
}
```

---

### PHASE 5 — AQI Service

---

#### Step 15 — AQI Calculation Service (`services/aqi.go`)

Copy the `CalculateAQI` and `ClassifyAQI` functions from Section 10 into `services/aqi.go`.  
The function signature is:
```go
func CalculateAQI(pm25, pm10, co, o3, no2 float64) (aqi int, level, critical string, sub map[string]int)
```

---

### PHASE 6 — Email Service

---

#### Step 16 — Email Sender (`services/email.go`)

```go
package services

import (
    "fmt"
    "net/smtp"
)

type EmailConfig struct {
    Host, User, Pass, From string
    Port                   int
}

func SendOTPEmail(cfg EmailConfig, to, otp, purpose string) error {
    subject := "ATMOS — Your Verification Code"
    body := fmt.Sprintf(
        "Your ATMOS %s code is:\n\n  %s\n\nThis code expires in 10 minutes.",
        purpose, otp,
    )
    msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s", cfg.From, to, subject, body)
    auth := smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)
    return smtp.SendMail(fmt.Sprintf("%s:%d", cfg.Host, cfg.Port), auth, cfg.User, []string{to}, []byte(msg))
}
```

> **Gmail setup:** Enable 2-FA on your Google account → Generate an **App Password** → use that as `SMTP_PASS`.

---

### PHASE 7 — Auth Handlers

---

#### Step 17 — Signup Send OTP (`handlers/auth.go`)

```
POST /api/auth/signup/send-otp
```

Logic:
1. Decode `{ name, email, password }` from body
2. Validate: email format, password ≥ 6 chars
3. Check `users` table — reject if email already exists (409)
4. Delete any old unused OTP for this email+type
5. Generate 6-digit OTP via `utils.GenerateOTP()`
6. INSERT into `otp_tokens` (expires in 10 minutes, type = "signup")
7. Call `services.SendOTPEmail()`
8. Respond `200 { "message": "Verification code sent" }`

> Store `name` and `password` temporarily: you can keep them in the OTP token as extra columns, or ask the frontend to re-send them on verify. The frontend already passes `{ name, email, password }` as navigation state and re-sends them on verify. See Section 4.2 — the verify endpoint receives only `{ email, otp }`, so you need to persist `name + hashed_password` temporarily. Best approach: add `pending_name VARCHAR(100)` and `pending_hash VARCHAR(255)` columns to `otp_tokens`.

Alternatively (simpler): on the send-OTP step, hash the password and store it in the OTP row. On verify, read it back and use it when inserting the user.

---

#### Step 18 — Signup Verify OTP

```
POST /api/auth/signup/verify-otp
```

Logic:
1. Decode `{ email, otp }`
2. Query: `SELECT * FROM otp_tokens WHERE email=$1 AND type='signup' AND used=false AND expires_at > NOW()`
3. Compare `code = otp` — if no match or expired → 400
4. Mark OTP `used = true`
5. INSERT into `users` (name, email, password_hash from the OTP row)
6. Generate JWT via `utils.GenerateToken(userID, expiryHours)`
7. Respond `201 { "token": "...", "user": { id, name, email } }`

---

#### Step 19 — Sign In

```
POST /api/auth/login
```

Logic:
1. Decode `{ email, password }`
2. SELECT user by email — 404 if not found
3. `bcrypt.CompareHashAndPassword(user.PasswordHash, []byte(password))` — 401 if mismatch
4. Generate JWT
5. Respond `200 { "token": "...", "user": { id, name, email } }`

---

#### Step 20 — Forgot Password: Send OTP

```
POST /api/auth/forgot-password/send-otp
```

Logic:
1. Decode `{ email }`
2. SELECT user by email — 404 if not found
3. DELETE old unused reset OTPs for this email
4. Generate OTP, INSERT into `otp_tokens` (type = "reset", expires in 10 min)
5. Send email, respond `200 { "message": "Reset code sent" }`

---

#### Step 21 — Forgot Password: Verify OTP

```
POST /api/auth/forgot-password/verify-otp
```

Logic:
1. Decode `{ email, otp }`
2. Verify OTP same as Step 18 (type = "reset")
3. Mark OTP used
4. Generate a `resetToken` (use `utils.GenerateOTP()` or `uuid.New().String()`)
5. SELECT user by email, INSERT into `reset_tokens` (expires in 15 min)
6. Respond `200 { "resetToken": "..." }`

---

#### Step 22 — Reset Password

```
POST /api/auth/reset-password
```

Logic:
1. Decode `{ email, resetToken, newPassword }`
2. SELECT from `reset_tokens` JOIN `users` WHERE `token=$1 AND used=false AND expires_at > NOW()`
3. No match → 400
4. Hash `newPassword` with bcrypt
5. UPDATE `users SET password_hash=$1, updated_at=NOW() WHERE id=$2`
6. UPDATE `reset_tokens SET used=true WHERE id=$3`
7. Respond `200 { "message": "Password updated successfully" }`

---

### PHASE 8 — User Handler

---

#### Step 23 — Get Profile & Change Password (`handlers/user.go`)

Both routes require `middleware.RequireAuth`.

**`GET /api/user/me`**
```
→ SELECT id, name, email, location, avatar_url FROM users WHERE id = $userID
→ 200 { user object }
```

**`POST /api/user/change-password`**
```
Body: { currentPassword, newPassword }
→ SELECT user by id from JWT context
→ bcrypt.CompareHashAndPassword — 401 if wrong
→ bcrypt.GenerateFromPassword(newPassword, 12)
→ UPDATE users SET password_hash, updated_at WHERE id
→ 200 { "message": "Password changed" }
```

---

### PHASE 9 — Station Stubs (for dashboard)

---

#### Step 24 — Station Handlers (`handlers/station.go`)

These return mock data from the database (populated by the mock goroutine from Section 13).  
When hardware is ready, data is real — handlers do not change.

**`GET /api/stations/:stationId/latest`**
```sql
SELECT * FROM sensor_readings
WHERE station_id = $1
ORDER BY recorded_at DESC LIMIT 1;
```
→ Map columns to JSON matching Section 6.1 response shape.

**`GET /api/stations/:stationId/history?hours=1`**
```sql
SELECT recorded_at, aqi, pm25, co
FROM sensor_readings
WHERE station_id = $1
  AND recorded_at >= NOW() - ($2 || ' hours')::INTERVAL
ORDER BY recorded_at ASC;
```
→ Format `recorded_at` as `"08:30 PM"` to match the frontend chart format.

---

### PHASE 10 — Wire the Router

---

#### Step 25 — `main.go`

```go
package main

import (
    "fmt"
    "log"
    "net/http"

    "github.com/go-chi/chi/v5"
    chiMiddleware "github.com/go-chi/chi/v5/middleware"

    "github.com/yourusername/atmos-backend/config"
    "github.com/yourusername/atmos-backend/db"
    "github.com/yourusername/atmos-backend/handlers"
    "github.com/yourusername/atmos-backend/middleware"
    "github.com/yourusername/atmos-backend/utils"
)

func main() {
    cfg := config.Load()

    if err := db.Connect(cfg.DatabaseURL); err != nil {
        log.Fatal("DB connect failed:", err)
    }
    if err := db.RunMigration("db/migrations/001_init.sql"); err != nil {
        log.Fatal("Migration failed:", err)
    }

    utils.InitJWT(cfg.JWTSecret)

    r := chi.NewRouter()
    r.Use(chiMiddleware.Recoverer)
    r.Use(middleware.Logger)
    r.Use(middleware.CORS(cfg.FrontendOrigin))

    // Auth routes (no JWT required)
    r.Post("/api/auth/signup/send-otp",           handlers.SignupSendOTP)
    r.Post("/api/auth/signup/verify-otp",          handlers.SignupVerifyOTP)
    r.Post("/api/auth/login",                      handlers.Login)
    r.Post("/api/auth/forgot-password/send-otp",   handlers.ForgotSendOTP)
    r.Post("/api/auth/forgot-password/verify-otp", handlers.ForgotVerifyOTP)
    r.Post("/api/auth/reset-password",             handlers.ResetPassword)

    // Protected routes (JWT required)
    r.Group(func(r chi.Router) {
        r.Use(middleware.RequireAuth)
        r.Get("/api/user/me",                       handlers.GetMe)
        r.Post("/api/user/change-password",         handlers.ChangePassword)
        r.Get("/api/stations/{stationId}/latest",   handlers.LatestReading)
        r.Get("/api/stations/{stationId}/history",  handlers.HistoryReadings)
    })

    // ESP32 ingest (device key auth — implement later with hardware)
    r.Post("/api/sensor-data", handlers.IngestSensorData)

    log.Printf("ATMOS backend running on :%s", cfg.Port)
    log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}
```

---

### PHASE 11 — Frontend Wiring

---

#### Step 26 — Store JWT in Frontend After Login

In `src/api/authApi.js`, after `signIn` and `signupVerifyOtp` succeed:
```js
localStorage.setItem('atmos_token', data.token)
```

In `src/api/aqiApi.js`, add the auth header:
```js
const token = localStorage.getItem('atmos_token')
const res = await fetch(`${BASE}/api/stations/${stationId}/latest`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

#### Step 27 — Add Route Protection in `src/App.jsx`

Wrap `/dashboard` and `/profile` with a guard:
```jsx
function PrivateRoute({ children }) {
  const token = localStorage.getItem('atmos_token')
  return token ? children : <Navigate to="/login" replace />
}
```

---

### PHASE 12 — Testing Each Endpoint

Use this order to test manually with curl or Postman:

```bash
# 1. Signup flow
curl -X POST http://localhost:8080/api/auth/signup/send-otp \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123"}'

curl -X POST http://localhost:8080/api/auth/signup/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"CODE_FROM_EMAIL"}'

# 2. Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 3. Protected: get profile (use token from login response)
curl http://localhost:8080/api/user/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. Change password
curl -X POST http://localhost:8080/api/user/change-password \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"test123","newPassword":"newPass456"}'

# 5. Dashboard data (mock data must be populating DB first)
curl http://localhost:8080/api/stations/UITS-01/latest \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### PHASE 13 — Deploy to Render

1. Push `ATMOS-Backend/` to GitHub
2. Go to **render.com** → New → Web Service → connect your repo
3. Set **Runtime** to `Go`
4. **Build command:** `go build -o server .`
5. **Start command:** `./server`
6. Add all `.env` keys as **Environment Variables** in the Render dashboard
7. Set `FRONTEND_ORIGIN` to your Vercel URL (e.g. `https://atmos.vercel.app`)
8. After deploy, copy the Render URL and set `VITE_API_URL=https://your-app.onrender.com` in Vercel environment variables

---

### What to Do When Hardware (ESP32) is Ready

Only two files change:

| File | What to do |
|---|---|
| `services/mock.go` | Disable (comment out) the mock goroutine in `main.go` |
| `src/hooks/useAQIData.js` | Replace `generateSensors()` with `fetchLatestReadings(stationId)` and `generateAfterPurification()` with the `pm25_after`/`pm10_after` from that response |

The database schema, all API handlers, and all React components stay exactly the same.


Here's the full picture of what's pending:

---






Pending Work — Full Backend

1. util/ — 3 helper files (all empty, just package util)

┌───────────────┬────────────────────────────────────────────────────────────────────────┐
│     File      │                           What to implement                            │
├───────────────┼────────────────────────────────────────────────────────────────────────┤
│ util/jwt.go   │ GenerateToken(userID, email string) (string, error) — sign JWT with    │
│               │ SECRETKEY + 24h expiry                                                 │
├───────────────┼───────────────────────────────────────────┤
│ util/otp.go   │ GenerateOTP() string — 6-digit random number                           │
├───────────────┼───────────────────────────────────────────┤
│ util/email.go │ SendOTPEmail(to, otp string) error — SMTP send via net/smtp using .env │
│               │  SMTP vars                                │
└───────────────┴────────────────────────────────────────────────────────────────────────┘

---

2. rest/middlewares/middleware.go — Auth middleware (stub)

Auth(next http.Handler) currently just passes through. Needs to:
- Read Authorization: Bearer <t
- Validate JWT with SECRETKEY
- Inject userID into request co

---

3. rest/handlers/user/ — 10 han

┌──────────────────────┬────────────────────────────────────┐
│         File         │                        What to implement                        │
├──────────────────────┼────────────────────────────────────┤
│ signup_send_otp.go   │ Validate input → DeleteOldOTPs → hash password → SaveSignupOTP  │
│                      │ → Send                             │
├──────────────────────┼─────────────────────────────────────────────────────────────────┤
│ signup_verify_otp.go │ GetSiging_name/pending_hash →      │
│                      │ MarkOTPUsed → return JWT                                        │
├──────────────────────┼────────────────────────────────────┤
│ login.go             │ FindByEmail → bcrypt.CompareHashAndPassword → GenerateToken →   │
│                      │ return                             │
├──────────────────────┼─────────────────────────────────────────────────────────────────┤
│ forgot_send_otp.go   │ FindBydOTPs → SaveResetOTP →       │
│                      │ SendOTPEmail                                                    │
├──────────────────────┼────────────────────────────────────┤
│ forgot_verify_otp.go │ GetResetOTP → MarkOTPUsed → SaveResetToken → return resetToken  │
├──────────────────────┼────────────────────────────────────┤
│ reset_password.go    │ GetResetToken → hash new password → UpdatePassword →            │
│                      │ MarkRe                             │
├──────────────────────┼─────────────────────────────────────────────────────────────────┤
│ get_me.go            │ Read u → return user (no password  │
│                      │ hash)                                                           │
├──────────────────────┼────────────────────────────────────┤
│ update_profile.go    │ Read userID from context → validate → UpdateProfile             │
├──────────────────────┼────────────────────────────────────┤
│ change_password.go   │ FindByID → verify old password → hash new → UpdatePassword      │
├──────────────────────┼────────────────────────────────────┤
│ upload_avatar.go     │ Parse multipart file → save/upload → UpdateAvatar (can stub for │
│                      │  now)                              │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘

---

4. rest/handlers/station/ — 3 handler files (all stubs, low priority until hardware ready)

┌────────────┬────────────────────────────────────────────────────────────────┐
│    File    │                                   │
├────────────┼────────────────────────────────────────────────────────────────┤
│ latest.go  │ GetLatestReading                  │
├────────────┼────────────────────────────────────────────────────────────────┤
│ history.go │ Parse hours quer JSON             │
├────────────┼────────────────────────────────────────────────────────────────┤
│ ingest.go  │ Parse ESP32 body) → InsertReading │
└────────────┴────────────────────────────────────────────────────────────────┘

---

5. Frontend wiring (2 small changes)

┌────────────────────┬───────────────────────────────────────────────────────────────────┐
│        File        │                                      │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ src/api/authApi.js │ After sire token:                    │
│                    │ localStorage.setItem('token', data.token)                         │
├────────────────────┼──────────────────────────────────────┤
│ src/App.jsx        │ Add protected route wrapper — redirect to /login if no token in   │
│                    │ localSto                             │
└────────────────────┴───────────────────────────────────────────────────────────────────┘

---

Suggested order to implement

1. util/jwt.go
2. util/otp.go
3. util/email.go
4. middlewares/middleware.go  (
5. login.go
6. signup_send_otp.go → signup_
7. forgot_send_otp.go → forgot_verify_otp.go → reset_password.go
8. get_me.go, update_profile.go
9. Frontend: authApi.js + App.jsx
10. Station handlers (when hardware ready)