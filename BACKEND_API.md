# ATMOS — Backend API & Database Design Reference

This document covers every API endpoint the frontend calls, what it sends, what it expects back, where in the code it is used, and the full database schema the backend needs to support all of it.

---

## 1. Environment Setup

All API calls read the base URL from one environment variable.  
Create a `.env` file in the project root:

```
VITE_API_URL=https://your-backend.com
```

- **When set** → every function makes a real HTTP request to your server.  
- **When missing** → functions return mock data so the UI works during development without a backend.

---

## 2. User Journeys — What the User Sees & What Happens

Every page in the app is its own file. Pages pass data to the next page through navigation state (`navigate('/path', { state: {...} })`). If someone refreshes or visits an OTP page directly without going through the flow, they are automatically sent back to the start.

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

**User is now logged in and on the dashboard.**

---

### Journey 2 — Sign In (existing user)

```
/login  →  /dashboard
```

**Step 1 — User opens the app**
- App loads at `/login` with the **Sign in** tab active.

**Step 2 — User enters Email and Password, clicks "Sign in"**
- Frontend validates (email has @, password ≥ 6 chars).
- Calls **`POST /api/auth/login`** with `{ email, password }`.
- Backend: finds the user by email, compares password against the stored bcrypt hash, returns JWT token + user object.
- Frontend navigates to `/dashboard`.

**If credentials are wrong**, the backend returns `{ "message": "Incorrect password" }` and the frontend shows it in red under the form. No navigation happens.

---

### Journey 3 — Forgot Password (user locked out)

```
/login  →  /forgot-password  →  /forgot-password/verify  →  /reset-password  →  /login
```

**Step 1 — User is on /login, clicks "Reset it"**
- A small link below the Sign In button: "Forgot password? Reset it"
- Browser navigates to `/forgot-password`.

**Step 2 — User enters their email, clicks "Send Reset Code →"**
- Calls **`POST /api/auth/forgot-password/send-otp`** with `{ email }`.
- Backend: looks up the email in the `users` table. If found, generates a reset OTP and emails it.
- Frontend navigates to `/forgot-password/verify`, passing `{ email }` as navigation state.

**Step 3 — User enters the 6-digit reset code**
- Same OTP input UI as signup.
- User clicks "Verify Code →".
- Calls **`POST /api/auth/forgot-password/verify-otp`** with `{ email, otp }`.
- Backend: verifies the OTP, creates a short-lived `resetToken` (15-minute TTL), returns it.
- Frontend navigates to `/reset-password`, passing `{ email, resetToken }` as navigation state.

**Step 4 — User enters a new password**
- Page shows email at the top ("For user@example.com") so the user knows which account they're resetting.
- Fields: New Password (with strength bar) + Confirm Password.
- User clicks "Reset Password".
- Calls **`POST /api/auth/reset-password`** with `{ email, resetToken, newPassword }`.
- Backend: validates the `resetToken` is real and not expired, hashes the new password, updates the `users` table, marks the token as used so it cannot be reused.
- Frontend shows a **success screen** ("Password reset! ✓").

**Step 5 — User clicks "Back to Sign in"**
- Navigates to `/login`. User can now sign in with the new password.

---

### Journey 4 — Change Password from Profile (logged-in user)

```
/dashboard  →  /profile  →  (password changed in place, stays on /profile)
```

This is a **different flow** from Forgot Password. The user is already logged in, so no email OTP is needed — they prove their identity with their **current password** instead.

- User goes to `/profile` from the dashboard navbar.
- Fills in: Current Password, New Password, Confirm New Password.
- Frontend sends all three to the backend (endpoint to be built — e.g. `POST /api/user/change-password`).
- Backend verifies the current password matches what is stored, then updates the hash.

---

### Summary — Which API each page calls

| Page (file) | Route | API called |
|---|---|---|
| `SignUp.jsx` | `/signup` | `POST /api/auth/signup/send-otp` |
| `SignUpOTP.jsx` | `/signup/verify` | `POST /api/auth/signup/verify-otp` (+ resend calls send-otp again) |
| `Login.jsx` | `/login` | `POST /api/auth/login` |
| `ForgotPassword.jsx` | `/forgot-password` | `POST /api/auth/forgot-password/send-otp` |
| `ForgotOTP.jsx` | `/forgot-password/verify` | `POST /api/auth/forgot-password/verify-otp` (+ resend) |
| `ResetPassword.jsx` | `/reset-password` | `POST /api/auth/reset-password` |
| `Dashboard.jsx` | `/dashboard` | `GET /api/stations/:id/latest` · `GET /api/stations/:id/history` · `GET /api/predict/:id` |
| `Profile.jsx` | `/profile` | `POST /api/user/change-password` *(to be built)* |

---

## 3. Auth API — `src/api/authApi.js`

All requests are `POST` with `Content-Type: application/json`.  
All error responses must have the shape `{ "message": "Human-readable error" }` so the frontend can display it directly.

---

### 3.1 Sign Up — Send OTP

```
POST /api/auth/signup/send-otp
```

**Purpose:**  
User fills the sign-up form. The frontend sends the details to the backend. The backend validates the email (not already registered), hashes and temporarily stores the password, generates a 6-digit OTP, and emails it to the user. The account is **not created yet** at this step.

**Request body:**
```json
{
  "name": "Shafayat Ullah",
  "email": "user@example.com",
  "password": "mypassword123"
}
```

**Success response `200`:**
```json
{
  "message": "Verification code sent to user@example.com"
}
```

**Possible error responses:**
```json
{ "message": "Email already registered" }       // 409
{ "message": "Invalid email format" }            // 400
{ "message": "Password too short (min 6 chars)" }// 400
```

**Used in:**  
`src/pages/Login.jsx` → `SignUpForm` → on form submit → calls `signupSendOtp(name, email, password)`

---

### 3.2 Sign Up — Verify OTP & Create Account

```
POST /api/auth/signup/verify-otp
```

**Purpose:**  
User enters the 6-digit code from their email. The backend checks the OTP, ensures it hasn't expired (recommend 10-minute TTL), creates the user account in the database, and returns a session token so the user is immediately logged in.

**Request body:**
```json
{
  "email": "user@example.com",
  "otp": "482910"
}
```

**Success response `201`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "name": "Shafayat Ullah",
    "email": "user@example.com"
  }
}
```

**Possible error responses:**
```json
{ "message": "Invalid or expired code" }         // 400
{ "message": "Code already used" }               // 400
{ "message": "No pending signup for this email" }// 400
```

**Used in:**  
`src/pages/Login.jsx` → `SignUpOTP` → on OTP form submit → calls `signupVerifyOtp(email, otp)` → on success, navigates to `/dashboard`

---

### 3.3 Sign In

```
POST /api/auth/login
```

**Purpose:**  
Standard email + password login. Backend checks credentials, returns a JWT token and user object.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "mypassword123"
}
```

**Success response `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "name": "Shafayat Ullah",
    "email": "user@example.com"
  }
}
```

**Possible error responses:**
```json
{ "message": "No account found with this email" }// 404
{ "message": "Incorrect password" }              // 401
{ "message": "Account not verified" }            // 403
```

**Used in:**  
`src/pages/Login.jsx` → `SignInForm` → on form submit → calls `signIn(email, password)` → on success, navigates to `/dashboard`

---

### 3.4 Forgot Password — Send OTP

```
POST /api/auth/forgot-password/send-otp
```

**Purpose:**  
User enters their email on the forgot password page. The backend checks the email exists, generates a reset OTP (separate from signup OTP), and emails it. Also used by the **Resend** button on the OTP screen.

**Request body:**
```json
{
  "email": "user@example.com"
}
```

**Success response `200`:**
```json
{
  "message": "Reset code sent to user@example.com"
}
```

**Possible error responses:**
```json
{ "message": "No account found with this email" }// 404
{ "message": "Too many attempts, wait 60 seconds" }// 429
```

**Used in:**  
`src/pages/ForgotPassword.jsx` → step 1 form submit + Resend button → calls `forgotSendOtp(email)`

---

### 3.5 Forgot Password — Verify OTP

```
POST /api/auth/forgot-password/verify-otp
```

**Purpose:**  
User enters the 6-digit reset code. The backend validates it and returns a short-lived `resetToken` (not a session token — only valid for step 3, the actual password change). This prevents anyone from resetting a password without first proving email access.

**Request body:**
```json
{
  "email": "user@example.com",
  "otp": "371045"
}
```

**Success response `200`:**
```json
{
  "resetToken": "a1b2c3d4e5f6-short-lived-signed-token"
}
```

**Possible error responses:**
```json
{ "message": "Invalid or expired code" }         // 400
{ "message": "Code already used" }               // 400
```

**Used in:**  
`src/pages/ForgotPassword.jsx` → step 2 OTP verify submit → calls `forgotVerifyOtp(email, otp)` → stores `resetToken` in component state → moves to step 3

---

### 3.6 Reset Password

```
POST /api/auth/reset-password
```

**Purpose:**  
Final step. The backend checks the `resetToken` is valid and not expired (recommend 15-minute TTL), hashes the new password, updates the user record, and invalidates the token. The frontend shows a success screen and redirects to `/login`.

**Request body:**
```json
{
  "email": "user@example.com",
  "resetToken": "a1b2c3d4e5f6-short-lived-signed-token",
  "newPassword": "newSecurePassword456"
}
```

**Success response `200`:**
```json
{
  "message": "Password updated successfully"
}
```

**Possible error responses:**
```json
{ "message": "Reset token is invalid or expired" }// 400
{ "message": "Password too short (min 8 chars)" } // 400
```

**Used in:**  
`src/pages/ForgotPassword.jsx` → step 3 new password form submit → calls `resetPassword(email, resetToken, newPassword)` → on success, sets step to `'done'`

---

## 4. AQI Sensor API — `src/api/aqiApi.js`

These three endpoints are **stubbed** — they return `null` in dev mode and the dashboard uses local mock data. When your hardware is ready, the `useAQIData` hook in `src/hooks/useAQIData.js` should be updated to call these instead of generating random values.

All requests are `GET`. Authentication header recommended: `Authorization: Bearer <token>`

---

### 3.1 Latest Sensor Readings

```
GET /api/stations/:stationId/latest
```

**Purpose:**  
Returns the most recent reading from every sensor on the given station. The dashboard displays these as the live metric cards (PM2.5, PM10, CO, NO₂, SO₂, CO₂, O₃).

**Example request:**
```
GET /api/stations/UITS-01/latest
```

**Success response `200`:**
```json
{
  "stationId": "UITS-01",
  "timestamp": "2026-09-04T15:30:00Z",
  "readings": {
    "pm25":  42.3,
    "pm10":  78.1,
    "co":    2.14,
    "no2":   61.0,
    "so2":   18.5,
    "co2":   612.0,
    "o3":    55.2
  }
}
```

**Used in:**  
`src/api/aqiApi.js` → `fetchLatestReadings(stationId)`  
Will replace mock sensor generation in `src/hooks/useAQIData.js`

---

### 3.2 Historical Readings

```
GET /api/stations/:stationId/history?hours=1
```

**Purpose:**  
Returns a time-series of readings used to draw the AQI trend chart, PM2.5 sparkline, and CO sparkline. The `hours` query parameter controls how far back to look (default 1, meaning last 60 minutes at 3-minute intervals = 20 data points).

**Example request:**
```
GET /api/stations/UITS-01/history?hours=1
```

**Success response `200`:**
```json
{
  "stationId": "UITS-01",
  "points": [
    { "time": "08:15 PM", "aqi": 78,  "pm25": 22.1, "co": 1.8 },
    { "time": "08:18 PM", "aqi": 82,  "pm25": 24.3, "co": 1.9 },
    { "time": "08:21 PM", "aqi": 91,  "pm25": 28.0, "co": 2.1 },
    "... 17 more points"
  ]
}
```

**Used in:**  
`src/api/aqiApi.js` → `fetchHistory(stationId, hours)`  
Will replace `HISTORY_PRELOAD` mock array in `src/data/mockAQI.js`

---

### 3.3 ML Prediction

```
GET /api/predict/:stationId
```

**Purpose:**  
Returns the current ML model prediction for the station — AQI level classification, confidence score, and which pollutant is driving the result. The dashboard right sidebar "RF + LSTM · MULTI-POLLUTANT" card displays this.

**Example request:**
```
GET /api/predict/UITS-01
```

**Success response `200`:**
```json
{
  "stationId": "UITS-01",
  "timestamp": "2026-09-04T15:30:00Z",
  "level": "Moderate",
  "aqiValue": 87,
  "confidence": 91,
  "primaryPollutant": "PM2.5",
  "modelVersion": "rf-lstm-v2.1"
}
```

**Used in:**  
`src/api/aqiApi.js` → `fetchPrediction(stationId)`  
Will replace `aqiFromPM25` + `classifyAQI` calculations in `src/hooks/useAQIData.js`

---

## 5. Database Schema

You need **6 tables**. Below is the design for each, with columns, types, constraints, and purpose.

---

### Table 1 — `users`

Stores registered accounts.

```sql
CREATE TABLE users (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100)  NOT NULL,
  email        VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  location     VARCHAR(100),
  avatar_url   TEXT,
  created_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP     NOT NULL DEFAULT NOW()
);
```

| Column | Why |
|---|---|
| `id` | UUID primary key — safer than auto-increment for public APIs |
| `email` | UNIQUE — one account per email |
| `password_hash` | Store bcrypt hash, never plaintext |
| `location` | From Profile page location field |
| `avatar_url` | For future profile photo upload |
| `updated_at` | Update this on every profile save |

**Linked to:** `otp_tokens.email`, `reset_tokens.user_id`, `sessions.user_id`

---

### Table 2 — `otp_tokens`

Stores short-lived OTPs for both signup verification and password reset.

```sql
CREATE TABLE otp_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(255) NOT NULL,
  code       CHAR(6)     NOT NULL,
  type       VARCHAR(20) NOT NULL CHECK (type IN ('signup', 'reset')),
  expires_at TIMESTAMP   NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_email_type ON otp_tokens (email, type);
```

| Column | Why |
|---|---|
| `email` | Target email — user may not exist yet (signup case) |
| `code` | The 6-digit string sent in the email |
| `type` | `'signup'` or `'reset'` — same table, different flow |
| `expires_at` | Set to `NOW() + 10 minutes` on creation |
| `used` | Mark true after first successful use — prevents replay attacks |

**Backend logic when verifying:**  
1. Find row where `email = $email AND type = $type AND used = false AND expires_at > NOW()`  
2. Compare `code = $otp`  
3. If match → set `used = true`, proceed  
4. If no row or code wrong → return error

---

### Table 3 — `reset_tokens`

Stores the short-lived `resetToken` returned after OTP verification in the forgot-password flow. It authorizes step 3 (the actual password change) without re-checking the OTP.

```sql
CREATE TABLE reset_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMP   NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);
```

| Column | Why |
|---|---|
| `token` | A long random string (e.g. `crypto.randomBytes(32).toString('hex')`). The frontend holds this in memory only — never stored in localStorage |
| `expires_at` | Set to `NOW() + 15 minutes` |
| `used` | Mark true after the password is changed |

**Backend logic for `POST /api/auth/reset-password`:**  
1. Look up token where `token = $resetToken AND used = false AND expires_at > NOW()`  
2. Hash new password, update `users.password_hash`  
3. Set `used = true` on the reset token  
4. Return success

---

### Table 4 — `stations`

Stores air quality monitoring station metadata.

```sql
CREATE TABLE stations (
  id         VARCHAR(20)   PRIMARY KEY,       -- e.g. 'UITS-01'
  name       VARCHAR(100)  NOT NULL,
  location   VARCHAR(100)  NOT NULL,
  lat        DECIMAL(9,6)  NOT NULL,
  lng        DECIMAL(9,6)  NOT NULL,
  active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP     NOT NULL DEFAULT NOW()
);
```

| Column | Why |
|---|---|
| `id` | Human-readable string ID used in API paths (`/api/stations/UITS-01/latest`) |
| `lat` / `lng` | For a future map view |
| `active` | Inactive stations are hidden from the selector |

**Seed data (from `src/data/mockAQI.js`):**
```sql
INSERT INTO stations VALUES
  ('UITS-01', 'UITS Campus',  'Dhaka-1212', 23.8103, 90.4125, true),
  ('DMP-02',  'Dhanmondi',    'Dhaka-1209', 23.7461, 90.3742, true),
  ('GUL-03',  'Gulshan',      'Dhaka-1212', 23.7925, 90.4078, false),
  ('MOT-04',  'Motijheel',    'Dhaka-1000', 23.7337, 90.4181, true);
```

---

### Table 5 — `sensor_readings`

Stores every raw reading from the hardware sensors. This is the main time-series table.

```sql
CREATE TABLE sensor_readings (
  id           BIGSERIAL   PRIMARY KEY,
  station_id   VARCHAR(20) NOT NULL REFERENCES stations(id),
  recorded_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
  pm25         DECIMAL(7,2),   -- μg/m³
  pm10         DECIMAL(7,2),   -- μg/m³
  co           DECIMAL(6,3),   -- ppm
  no2          DECIMAL(7,2),   -- ppb
  so2          DECIMAL(7,2),   -- ppb
  co2          DECIMAL(8,2),   -- ppm
  o3           DECIMAL(7,2)    -- ppb
);

CREATE INDEX idx_readings_station_time
  ON sensor_readings (station_id, recorded_at DESC);
```

| Column | Why |
|---|---|
| `BIGSERIAL` | Not UUID — this table grows fast (every 3 minutes per station = ~175,000 rows/year per station). Integer is smaller and faster for range queries |
| `recorded_at` | When the hardware captured the reading — not when it was inserted |
| Index on `(station_id, recorded_at DESC)` | Powers both `/latest` (top 1 row) and `/history` (last N rows) queries efficiently |

**How `/api/stations/:id/latest` works:**
```sql
SELECT * FROM sensor_readings
WHERE station_id = $1
ORDER BY recorded_at DESC
LIMIT 1;
```

**How `/api/stations/:id/history?hours=1` works:**
```sql
SELECT recorded_at, pm25, co,
       -- compute AQI from pm25 in application code
FROM sensor_readings
WHERE station_id = $1
  AND recorded_at >= NOW() - INTERVAL '1 hour'
ORDER BY recorded_at ASC;
```

---

### Table 6 — `aqi_predictions`

Stores the output of each ML model run. The model reads from `sensor_readings`, classifies the AQI level, and writes the result here. The `/api/predict/:id` endpoint reads from this table — it does **not** run the model on every request.

```sql
CREATE TABLE aqi_predictions (
  id                BIGSERIAL    PRIMARY KEY,
  station_id        VARCHAR(20)  NOT NULL REFERENCES stations(id),
  predicted_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
  level             VARCHAR(20)  NOT NULL CHECK (level IN ('Good','Moderate','Poor','Hazardous')),
  aqi_value         SMALLINT     NOT NULL,
  confidence        SMALLINT     NOT NULL,  -- 0–100 percent
  primary_pollutant VARCHAR(10)  NOT NULL,  -- e.g. 'PM2.5', 'NO₂'
  model_version     VARCHAR(30)  NOT NULL
);

CREATE INDEX idx_predictions_station_time
  ON aqi_predictions (station_id, predicted_at DESC);
```

| Column | Why |
|---|---|
| `level` | The 4-class output: Good / Moderate / Poor / Hazardous |
| `confidence` | Model's confidence score for this classification (87–96%) |
| `primary_pollutant` | Which sensor is contributing most to the current level |
| `model_version` | Track which version of RF/LSTM produced this prediction — useful when you retrain |

**How `/api/predict/:id` works:**
```sql
SELECT * FROM aqi_predictions
WHERE station_id = $1
ORDER BY predicted_at DESC
LIMIT 1;
```

---

## 6. Table Relationships

```
users
  ├── otp_tokens   (email → email)  — signup & reset OTPs
  └── reset_tokens (id → user_id)   — password reset authorization

stations
  ├── sensor_readings  (id → station_id)  — raw hardware data
  └── aqi_predictions  (id → station_id)  — ML model output
```

---

## 7. Complete Route → API → Database Map

| User action | Page | API function | Endpoint | DB tables touched |
|---|---|---|---|---|
| Sign up (submit form) | `Login.jsx` | `signupSendOtp` | `POST /api/auth/signup/send-otp` | `otp_tokens` (INSERT) |
| Sign up (enter OTP) | `Login.jsx` | `signupVerifyOtp` | `POST /api/auth/signup/verify-otp` | `otp_tokens` (UPDATE used=true), `users` (INSERT) |
| Sign in | `Login.jsx` | `signIn` | `POST /api/auth/login` | `users` (SELECT) |
| Forgot password (enter email) | `ForgotPassword.jsx` | `forgotSendOtp` | `POST /api/auth/forgot-password/send-otp` | `otp_tokens` (INSERT) |
| Forgot password (enter OTP) | `ForgotPassword.jsx` | `forgotVerifyOtp` | `POST /api/auth/forgot-password/verify-otp` | `otp_tokens` (UPDATE used=true), `reset_tokens` (INSERT) |
| Forgot password (new password) | `ForgotPassword.jsx` | `resetPassword` | `POST /api/auth/reset-password` | `reset_tokens` (UPDATE used=true), `users` (UPDATE password_hash) |
| Dashboard loads | `Dashboard.jsx` (via hook) | `fetchLatestReadings` *(stub)* | `GET /api/stations/:id/latest` | `sensor_readings` (SELECT 1 row) |
| Dashboard chart | `Dashboard.jsx` (via hook) | `fetchHistory` *(stub)* | `GET /api/stations/:id/history` | `sensor_readings` (SELECT N rows) |
| Dashboard prediction card | `Dashboard.jsx` (via hook) | `fetchPrediction` *(stub)* | `GET /api/predict/:id` | `aqi_predictions` (SELECT 1 row) |

---

## 8. When Hardware is Ready — What to Change

Only **one file** needs editing to switch the dashboard from mock to real data:

**`src/hooks/useAQIData.js`** — replace `generateSensors()` and `HISTORY_PRELOAD` with calls to:
```js
import { fetchLatestReadings, fetchHistory, fetchPrediction } from '../api/aqiApi'
```

The components (`SensorCard`, `AQIChart`, `Sparkline`, etc.) do not need any changes — they only receive data as props.

---

## 9. Recommended Backend Stack

| Concern | Suggestion |
|---|---|
| Runtime | Node.js (Express) or Python (FastAPI / Django REST) |
| Database | PostgreSQL — handles time-series queries well with proper indexes |
| Password hashing | bcrypt (cost factor 12) |
| JWT signing | `jsonwebtoken` with HS256, 7-day expiry |
| OTP generation | `crypto.randomInt(100000, 999999)` |
| Email sending | Nodemailer + Gmail SMTP, or SendGrid, or Resend |
| ML model serving | Python FastAPI microservice that reads from `sensor_readings` and writes to `aqi_predictions` on a schedule (e.g. every 3 minutes via cron) |
