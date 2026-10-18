# ATMOS Version 2 — Full ML Integration Plan
**Date:** 2026-10-16 (updated 2026-10-19)
**Goal:** Add ML-powered AQI forecasting, user dashboard predictions, and admin dashboard.

---

## Overview

```
Version 1 (now):  Device → Backend → PostgreSQL → Frontend (live AQI only)
Version 2 (next): Device → Backend → PostgreSQL
                                  ↓ (forward readings)
                            ML Model API (Azure App Service)
                                  ↓ (fetch forecasts every 30 min)
                         Backend cache in PostgreSQL
                                  ↓
                     Frontend (live + hourly + 30-day forecast + admin)
```

---

## ML API — All 5 Endpoints (Request & Response)

**Base URL:** `https://atmos-ml-api-e8a4ameghchmhwbp.centralindia-01.azurewebsites.net`

| # | Endpoint | Method | Auth | Who Calls It |
|---|---|---|---|---|
| 1 | `/healthz` | GET | None | Backend on startup |
| 2 | `/api/v1/readings` | POST | `SENSOR_KEY` | Backend on every sensor reading |
| 3 | `/api/v1/forecast/hourly` | GET | `READ_KEY` | Backend sync job every 30 min |
| 4 | `/api/v1/forecast/daily` | GET | `READ_KEY` | Backend sync job every 30 min |
| 5 | `/api/v1/device-requirement` | GET | `READ_KEY` | Backend sync job every 30 min |

**API Keys:**
- `SENSOR_KEY` = `atmos-sensor-key-2026` → header: `X-API-Key`
- `READ_KEY` = `atmos-read-key-2026` → header: `X-API-Key`

---

### 1️⃣ GET `/healthz` — Health Check

No auth required. Call this to confirm server is alive.

**Request:**
```bash
GET /healthz
```

**Response:**
```json
{
  "ok": true,
  "model_version": "atmos-final-20261016-1631",
  "cities": ["Azimpur", "Dhaka", "Paltan", "Tungi"],
  "time": "2026-10-19T00:15:00+06:00"
}
```

---

### 2️⃣ POST `/api/v1/readings` — Send Sensor Data

Receives sensor readings from the device, validates them, and stores in ML model's SQLite DB so the model can learn from real readings over time.

**Request:**
```json
POST /api/v1/readings
X-API-Key: atmos-sensor-key-2026

{
  "device_id": "device1",
  "location": "Tungi",
  "observed_at": "2026-10-19T14:30:00+06:00",
  "pm2_5": 81.2,
  "pm10": 140.0,
  "carbon_monoxide": 420.0,
  "nitrogen_dioxide": 35.0,
  "sulphur_dioxide": 6.0,
  "ozone": 22.0
}
```

**Field rules:**
- `observed_at` must include timezone (`+06:00`) — required
- Reading cannot be older than 6 hours or in the future
- All pollutant fields are optional but at least one must be valid
- `location` must be one of: `Dhaka`, `Azimpur`, `Paltan`, `Tungi`

**Response (success):**
```json
{ "accepted": true, "duplicate": false, "location": "Tungi" }
```

**Response (duplicate timestamp for same device):**
```json
{ "accepted": true, "duplicate": true, "location": "Tungi" }
```

**Response (wrong key):**
```json
{ "detail": "bad key" }   ← HTTP 403
```

---

### 3️⃣ GET `/api/v1/forecast/hourly` — Hourly Forecast (+1h, +3h, +6h)

Returns current AQI and forecasts for the next 1, 3, and 6 hours. Needs at least 25 hours of readings to make predictions.

**Request:**
```bash
GET /api/v1/forecast/hourly?device_id=device1&location=Tungi
X-API-Key: atmos-read-key-2026
```

**Response (enough data — 25+ hours of readings):**
```json
{
  "device_id": "device1",
  "location": "Tungi",
  "status": "ok",
  "hours_available": 48,
  "hours_required": 25,
  "current": {
    "aqi": 152.0,
    "level": "Unhealthy",
    "level_index": 3,
    "color": "#FF0000",
    "advice": "Everyone may begin to experience health effects",
    "hour_start": "2026-10-19T14:00:00",
    "pm2_5": 81.2,
    "pm10": 140.0
  },
  "forecasts": [
    {
      "horizon_hours": 1,
      "hour_start": "2026-10-19T15:00:00",
      "aqi": 158.0,
      "level": "Unhealthy",
      "level_index": 3,
      "color": "#FF0000",
      "advice": "Everyone may begin to experience health effects",
      "change_from_current": 6.0,
      "trend": "worsening",
      "pm2_5": 85.3,
      "pm10": 145.1
    },
    {
      "horizon_hours": 3,
      "hour_start": "2026-10-19T17:00:00",
      "aqi": 165.0,
      "level": "Unhealthy",
      "level_index": 3,
      "color": "#FF0000",
      "advice": "Everyone may begin to experience health effects",
      "change_from_current": 13.0,
      "trend": "worsening",
      "pm2_5": 89.1,
      "pm10": 150.0
    },
    {
      "horizon_hours": 6,
      "hour_start": "2026-10-19T20:00:00",
      "aqi": 148.0,
      "level": "Unhealthy for Sensitive Groups",
      "level_index": 2,
      "color": "#FF7E00",
      "advice": "Sensitive groups should reduce outdoor activity",
      "change_from_current": -4.0,
      "trend": "stable",
      "pm2_5": 79.0,
      "pm10": 138.0
    }
  ]
}
```

**Response (warming up — not enough data yet):**
```json
{
  "device_id": "device1",
  "location": "Tungi",
  "status": "warming_up",
  "hours_available": 10,
  "hours_required": 25,
  "message": "Collecting 10/25",
  "current": { "aqi": 152.0, "level": "Unhealthy", ... },
  "forecasts": []
}
```

**`trend` values:** `"worsening"` (AQI up >5), `"improving"` (AQI down >5), `"stable"` (within ±5)

---

### 4️⃣ GET `/api/v1/forecast/daily` — 30-Day Forecast

Returns a 30-day AQI forecast with low/high uncertainty bands.

**Request:**
```bash
GET /api/v1/forecast/daily?device_id=device1&location=Tungi&days=30
X-API-Key: atmos-read-key-2026
```

**Response:**
```json
{
  "device_id": "device1",
  "location": "Tungi",
  "basis": "live_sensor_history",
  "history_days_used": 15,
  "forecast": [
    {
      "date": "2026-10-20",
      "day": 1,
      "aqi": 145.0,
      "level": "Unhealthy for Sensitive Groups",
      "level_index": 2,
      "color": "#FF7E00",
      "advice": "Sensitive groups should reduce outdoor activity",
      "aqi_low": 130.0,
      "aqi_high": 160.0,
      "pm2_5": 76.3,
      "pm2_5_low": 68.0,
      "pm2_5_high": 84.5,
      "pm10": 132.0,
      "pm10_low": 118.0,
      "pm10_high": 146.0
    }
    // ... up to 30 days
  ]
}
```

**`basis` field:**
- `"live_sensor_history"` — model used actual readings (3+ days of data available)
- `"seasonal_only"` — not enough data yet, uses seasonal patterns from training data

---

### 5️⃣ GET `/api/v1/device-requirement` — Purifier Count

Calculates how many air purifiers are needed per day for the next 30 days based on forecast PM2.5 and room physics.

**Request:**
```bash
GET /api/v1/device-requirement?device_id=device1&location=Tungi&scenario=indoor_normal&target_aqi=100&hours=24&area_ft2=700&height_ft=10&cadr_cfm=120
X-API-Key: atmos-read-key-2026
```

**Query parameters:**
| Parameter | Default | Options/Notes |
|-----------|---------|---------------|
| `scenario` | `indoor_normal` | `indoor_sealed`, `indoor_normal`, `indoor_windows_open`, `outdoor_semi_open`, `outdoor_open` |
| `target_aqi` | `100` | `50`, `100`, `150`, `200` |
| `hours` | `24` | hours to reach target |
| `area_ft2` | `700` | room area in sq feet |
| `height_ft` | `10` | ceiling height in feet |
| `cadr_cfm` | `120` | purifier CADR rating in CFM |

**Response:**
```json
{
  "device_id": "device1",
  "location": "Tungi",
  "room": { "area_ft2": 700.0, "height_ft": 10.0, "volume_m3": 198.2 },
  "device_cadr_cfm": 120.0,
  "scenario": "indoor_normal",
  "scenario_description": "Normal",
  "target": { "aqi": 100, "pm2_5": 35.4, "within_hours": 24.0 },
  "basis": "live_sensor_history",
  "history_days_used": 15,
  "summary": {
    "typical_devices": 2,
    "max_devices_forecast": 3,
    "max_devices_high_case": 4
  },
  "days": [
    {
      "date": "2026-10-20",
      "day": 1,
      "forecast_outdoor_pm2_5": 76.3,
      "forecast_high_case_pm2_5": 84.5,
      "devices_needed": 2,
      "devices_needed_high_case": 3,
      "note": ""
    }
    // ... 30 days
  ],
  "disclaimer": "Physics model with assumed air-exchange values."
}
```

---

**Location system:** User picks their Dhaka neighborhood from a dropdown → backend maps it to the nearest ML monitoring station → ML API called with that station name. See Location Architecture section below for full details.

---

## ✅ Phase 1 — Prepare & Verify ML Model (COMPLETED)

### Step 1.1 — Run the Notebook on Google Colab ✅

Notebook: `ML Model/Final_ML_Model.ipynb`

**Results after running all 19 cells on Google Colab (T4 GPU):**
- Model trained for 4 cities: Azimpur, Dhaka, Paltan, Tungi
- +1h accuracy: 88.9% exact, 100% within ±1 AQI unit
- +3h accuracy: 75%, +6h accuracy: 68%
- Bundle size: 135MB (`bundle.joblib`)
- Model version: `atmos-final-20261016-1631`

**Bundle uploaded to Google Drive:**
- File ID: `1fZ67lbHcm0bQnydEwdBz8XO6vPwygkTB`
- Size: 141MB
- The bundle is stored on Drive (not in Git) because GitHub rejects files over 100MB

### Step 1.2 — Create Deployment Folder ✅

Created `ATMOS-ML-API/` with these files:

```
ATMOS-ML-API/
├── serve.py              ← patched version (auto-downloads bundle from Drive)
├── requirements.txt      ← includes gdown for Drive download
├── Procfile              ← web: python serve.py
├── Dockerfile            ← for Azure/Docker deployment
├── .gitignore            ← ignores bundle + db files
└── .github/
    └── workflows/
        └── deploy.yml    ← GitHub Actions auto-deploy to Azure
```

**Key changes in serve.py vs notebook's original:**
1. **Bundle auto-download** — if `bundle.joblib` not present, downloads from Google Drive using `gdown`
2. **Device key fix** — original only accepted `device1`; now any `device_id` works
3. **DailyForecasterCity class** — added class definition so joblib can unpickle the bundle correctly

---

## ✅ Phase 2 — Deploy ML Model to Azure (COMPLETED)

### Why We Tried Multiple Platforms First

The ML model needs **>512MB RAM** to load. Here is everything we tried:

#### ❌ Attempt 1 — Render.com (Free Tier)
- **Why tried:** Simple Git deployment, free tier
- **What happened:** Crashed with `Out of memory (used over 512MB)` on startup
- **Why failed:** Render free tier only has 512MB RAM. Model needs ~500MB just to load, plus Python/FastAPI overhead = total >512MB
- **Cost to fix:** Would need $25/month plan (1 CPU, 2GB RAM) on Render

#### ❌ Attempt 2 — Hugging Face Spaces (Docker)
- **Why tried:** Designed for ML models, free, 16GB RAM
- **What happened:** Docker spaces now require a paid PRO subscription
- **Why failed:** Policy changed — only Static spaces are free now

#### ❌ Attempt 3 — Oracle Cloud Always Free
- **Why tried:** 4 ARM cores, 24GB RAM, completely free forever
- **What happened:** Could not complete signup
- **Why failed:** Requires a credit/debit card for identity verification. Only had student ID card.

#### ✅ Solution — Microsoft Azure for Students
- **Why chose:** Free $100 credit, **no credit card needed**, only student email required
- **How:** Signed up at azure.microsoft.com/free/students → verified student email → got $100 credit (365 days)
- **Cost:** ~$12/month from the $100 credit = covers ~8 months

---

### What We Did on Azure (Step by Step)

#### Step 2.1 — Activated Azure for Students ✅
1. Went to azure.microsoft.com → searched for "Azure for Students"
2. Clicked Start → signed in with Microsoft account
3. Went through academic verification (email with verification link)
4. Clicked the verification link → confirmation page
5. Filled in address details → clicked Sign up
6. **Result:** $100 credit, 365 days, activated

#### Step 2.2 — Created GitHub Repo for ML API ✅
- Repo: `github.com/shafayethossai/atmos-ml-api`
- Contains: `serve.py`, `requirements.txt`, `Procfile`, `Dockerfile`, `.github/workflows/deploy.yml`
- **Why separate repo:** Keeps ML deployment code isolated from the main ATMOS project

#### Step 2.3 — Created Azure App Service ✅

**Why App Service instead of VM:**
- Azure for Students restricts VM sizes (B-series unavailable in most regions)
- App Service is simpler — no SSH, no server management
- Supports Docker containers directly

**Settings used:**
- **Name:** `atmos-ml-api`
- **Publish:** Container (Docker)
- **OS:** Linux
- **Region:** Central India (East US, Southeast Asia, West US 3 all blocked by student subscription policy)
- **Pricing:** Basic B1 — 1 vCPU, **1.75GB RAM** — enough for the model
- **Cost:** ~$12.41/month from student credit

**Why Central India worked:** Azure for Students from Bangladesh assigns "best available regions" — India regions are geographically closest and within the allowed policy.

#### Step 2.4 — Why Docker? ✅

Docker packages the entire application (Python version, all libraries, serve.py) into one container image. This ensures:
- The exact same environment runs on any server
- No "works on my machine" problems
- Azure pulls and runs the container image directly
- Rebuild and redeploy automatically on every code change

**Dockerfile created:**
```dockerfile
FROM python:3.10-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY serve.py .
RUN mkdir -p atmos_bundle
EXPOSE 7860
ENV PORT=7860
CMD ["python", "serve.py"]
```

#### Step 2.5 — Set Up GitHub Actions Auto-Deploy ✅

**Why GitHub Actions:**
- Every time we push code to GitHub, it automatically rebuilds and redeploys to Azure
- No manual deployment needed
- Free for public repositories

**How it works:**
1. Push code to `main` branch on GitHub
2. GitHub Actions triggers `deploy.yml` workflow
3. Workflow builds Docker image and pushes to GitHub Container Registry (`ghcr.io`)
4. Workflow tells Azure App Service to pull the new image
5. Azure restarts with the new container

**Secrets added to GitHub repo:**
- `AZURE_WEBAPP_PUBLISH_PROFILE` — Azure credentials (downloaded from App Service → Overview → Download publish profile)
- `ATMOS_BUNDLE_GDRIVE_ID` = `1fZ67lbHcm0bQnydEwdBz8XO6vPwygkTB`
- `SENSOR_KEY` = `atmos-sensor-key-2026`
- `READ_KEY` = `atmos-read-key-2026`

#### Step 2.6 — Fix: DailyForecasterCity Class ✅

**Problem:** After first deploy, Azure logs showed:
```
AttributeError: Can't get attribute 'DailyForecasterCity' on <module '__main__'>
```

**Why it happened:** The ML model bundle was trained in a Jupyter notebook where `DailyForecasterCity` was defined. When `joblib` saves a Python object, it stores a reference to the class name. When loading in `serve.py`, Python couldn't find the class because it wasn't defined there.

**Fix:** Added the full `DailyForecasterCity` class definition + helper functions (`fourier`, `anomaly_feats`) to `serve.py` before the `joblib.load()` call.

**Pushed fix → GitHub Actions ran in 1m 8s → deployed successfully.**

#### Step 2.7 — Verified ML API is Live ✅

```bash
curl https://atmos-ml-api-e8a4ameghchmhwbp.centralindia-01.azurewebsites.net/healthz
```

**Response:**
```json
{
  "ok": true,
  "model_version": "atmos-final-20261016-1631",
  "cities": ["Azimpur", "Dhaka", "Paltan", "Tungi"],
  "time": "2026-10-18T23:49:51.482297+06:00"
}
```

**ML API is live at:**
```
https://atmos-ml-api-e8a4ameghchmhwbp.centralindia-01.azurewebsites.net
```

**API Keys:**
- Sensor key: `atmos-sensor-key-2026` (header: `X-API-Key`)
- Read key: `atmos-read-key-2026` (header: `X-API-Key`)

---

## Phase 3 — Backend Updates (Go) — NEXT

### Step 3.1 — Add ML API config

Add to `.env`:
```
ML_API_URL=https://atmos-ml-api-e8a4ameghchmhwbp.centralindia-01.azurewebsites.net
ML_SENSOR_KEY=atmos-sensor-key-2026
ML_READ_KEY=atmos-read-key-2026
```

Add to `config/config.go`:
```go
MLApiURL      string
MLSensorKey   string
MLReadKey     string
```

### Step 3.2 — Forward sensor readings to ML API

**File:** `ATMOS-Backend/rest/handlers/station/ingest.go`

After storing in PostgreSQL, also forward to ML API:
```
POST /api/v1/readings
{
  "device_id": "device1",
  "location": "Tungi",           ← from user's ml_station in DB
  "observed_at": "...",
  "pm2_5": 81.2,
  "pm10": 140.0,
  "carbon_monoxide": 420,
  "nitrogen_dioxide": 35,
  "sulphur_dioxide": 6,
  "ozone": 22
}
```

**Unit conversion needed** (current backend stores PPM/PPB, ML API needs µg/m³):
- CO: PPM × 1.145 = µg/m³
- NO2: PPB × 1.88 = µg/m³
- O3: PPB × 1.96 = µg/m³
- SO2: PPM × 2620 = µg/m³

### Step 3.3 — Add forecast cache tables (new migration)

Create `migrations/migrations/003_add_forecast_cache.sql`:
```sql
-- +migrate Up

-- Stores hourly forecast from ML API (keyed by device_id + ml_station)
CREATE TABLE forecast_hourly_cache (
    id          BIGSERIAL    PRIMARY KEY,
    device_id   VARCHAR(50)  NOT NULL,
    ml_station  VARCHAR(100) NOT NULL,   -- one of: Dhaka, Azimpur, Paltan, Tungi
    fetched_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    payload     JSONB        NOT NULL
);

-- Stores daily forecast from ML API
CREATE TABLE forecast_daily_cache (
    id          BIGSERIAL    PRIMARY KEY,
    device_id   VARCHAR(50)  NOT NULL,
    ml_station  VARCHAR(100) NOT NULL,
    fetched_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    payload     JSONB        NOT NULL
);

-- Stores device requirement from ML API
CREATE TABLE device_requirement_cache (
    id          BIGSERIAL    PRIMARY KEY,
    device_id   VARCHAR(50)  NOT NULL,
    ml_station  VARCHAR(100) NOT NULL,
    fetched_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    payload     JSONB        NOT NULL
);

-- Admin flag + ml_station mapping on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin   BOOLEAN      DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ml_station VARCHAR(100) DEFAULT 'Dhaka';

CREATE INDEX idx_forecast_hourly_device ON forecast_hourly_cache (device_id, fetched_at DESC);
CREATE INDEX idx_forecast_daily_device  ON forecast_daily_cache  (device_id, fetched_at DESC);
```

### Step 3.4 — Add background forecast fetch job

Create `ATMOS-Backend/util/ml_sync.go`:
- Every 30 minutes, call ML API for each known location
- Store response in `forecast_hourly_cache` and `forecast_daily_cache`
- Start this goroutine in `main.go`

### Step 3.5 — New API endpoints for frontend

Add to station routes:
```
GET  /api/forecast/hourly    → returns latest cached hourly forecast (JWT: reads user's ml_station)
GET  /api/forecast/daily     → returns latest cached daily forecast
GET  /api/devices            → returns device requirement
```

These read from cache tables, not ML API directly (fast for frontend).

### Step 3.6 — Admin endpoints

Add new `admin` handler:
```
GET  /api/admin/devices/all        → device count per location
GET  /api/admin/stations           → all stations + latest readings
GET  /api/admin/users              → user list with locations
```

Protected by: `AuthenticateJWT` + `RequireAdmin` middleware.

---

## Phase 4 — Frontend Updates

### Step 4.1 — User Dashboard forecast cards

Add to `Dashboard.jsx`:

**Hourly Forecast Section:**
```
┌─────────────────────────────────────────┐
│  Current AQI: 152  [Unhealthy 🔴]       │
│  Advice: Wear a mask outdoors           │
│                                          │
│  +1h: 158  +3h: 165  +6h: 172          │
│  Trend: Worsening ↑                     │
└─────────────────────────────────────────┘
```

**30-Day Forecast Section:**
- Chart with AQI line + uncertainty band (aqi_low to aqi_high)
- Table below with date, AQI, level badge

### Step 4.2 — Location dropdown in Profile

Replace the free-text location field in `Profile.jsx` with a **grouped dropdown of Dhaka neighborhoods**:

```
── Central Dhaka ──
  Paltan · Motijheel · Shahbagh · Ramna · Segunbagicha

── South Dhaka ──
  Azimpur · Lalbagh · Old Dhaka · Sutrapur · Wari

── North / East Dhaka ──
  Bashundhara · Uttara · Gulshan · Banani · Baridhara
  Badda · Khilkhet · Rampura · Khilgaon

── West / Central Dhaka ──
  Mirpur · Dhanmondi · Mohammadpur · Shyamoli · Adabor
  Kafrul · Agargaon

── Industrial / North ──
  Tongi · Gazipur · Ashulia · Savar
```

**Backend mapping table** (`util/location.go`):
```go
var areaToStation = map[string]string{
    "bashundhara": "Dhaka", "uttara": "Dhaka", "gulshan": "Dhaka",
    "banani": "Dhaka", "baridhara": "Dhaka", "badda": "Dhaka",
    "mirpur": "Dhaka", "dhanmondi": "Dhaka", "mohammadpur": "Dhaka",
    "azimpur": "Azimpur", "lalbagh": "Azimpur", "old dhaka": "Azimpur",
    "paltan": "Paltan", "motijheel": "Paltan", "shahbagh": "Paltan",
    "tongi": "Tungi", "gazipur": "Tungi", "ashulia": "Tungi",
}
func AreaToMLStation(area string) string {
    station, ok := areaToStation[strings.ToLower(strings.TrimSpace(area))]
    if !ok { return "Dhaka" }
    return station
}
```

When user saves profile:
1. Frontend sends `location = "Bashundhara"`
2. Backend: `AreaToMLStation("Bashundhara")` → `"Dhaka"`
3. Saves both: `users.location = "Bashundhara"`, `users.ml_station = "Dhaka"`
4. Frontend shows "Bashundhara" — user never sees "Dhaka station"

### Step 4.3 — Admin Dashboard (new page)

Create `ATMOS-Frontend/src/pages/AdminDashboard.jsx`:
- Device requirement summary table per location
- 30-day per-location device forecast charts
- Live station status (last reading time + AQI per station)
- Route: `/admin` (redirect to login if not admin)

---

## Phase 5 — Testing & Polish

### Step 5.1 — End-to-end test
1. Send sensor reading → backend → verify ML API receives it
2. Wait 30 min OR manually trigger sync → check forecast cache
3. Open user dashboard → verify forecast cards show

### Step 5.2 — Error states in frontend
- ML API starting up → show "Forecast loading, please wait"
- Stale data → show "Last updated X hours ago"
- Location not set → show "Set your location in Profile to see forecasts"

---

## Step-by-Step Order

```
[✅] 1. Run notebook on Colab → bundle.joblib + serve.py + requirements.txt
[✅] 2. Upload bundle.joblib to Google Drive (too large for GitHub)
[✅] 3. Create ATMOS-ML-API/ folder with serve.py, requirements.txt, Procfile, Dockerfile
[✅] 4. Create GitHub repo: github.com/shafayethossai/atmos-ml-api
[✅] 5. Sign up for Azure for Students ($100 free, student email only)
[✅] 6. Create Azure App Service (Central India, B1, 1.75GB RAM)
[✅] 7. Set up GitHub Actions (deploy.yml) for auto-deploy on push
[✅] 8. Add secrets to GitHub (Azure publish profile + API keys)
[✅] 9. Fix DailyForecasterCity class missing from serve.py
[✅] 10. Verify ML API live → /healthz returns ok:true
[ ] 11. Add ML_API_URL + keys to backend .env
[ ] 12. Update ingest.go to forward readings to ML API
[ ] 13. Create migration 003 (forecast cache tables + is_admin + ml_station)
[ ] 14. Add ml_sync.go background job (30 min fetch)
[ ] 15. Add /api/forecast/hourly and /api/forecast/daily endpoints
[ ] 16. Create util/location.go (area → ML station mapping)
[ ] 17. Update Dashboard.jsx with forecast cards
[ ] 18. Update Profile.jsx with location dropdown
[ ] 19. Add /api/admin/* endpoints + RequireAdmin middleware
[ ] 20. Create AdminDashboard.jsx page
[ ] 21. End-to-end test
```

---

## Key Things to Know

### ML API URL (live)
```
https://atmos-ml-api-e8a4ameghchmhwbp.centralindia-01.azurewebsites.net
```
Test: `curl .../healthz`

### Azure App Service
- Plan: Basic B1 (1 vCPU, 1.75GB RAM)
- Region: Central India
- Cost: ~$12.41/month from $100 student credit (~8 months free)
- Auto-redeploys when you push to GitHub main branch

### Why bundle is on Google Drive, not GitHub
GitHub rejects files over 100MB. The model bundle is 135MB. `serve.py` auto-downloads it from Drive on first startup using `gdown`.

### Why cache forecasts in PostgreSQL
- Azure App Service B1 can handle it but ML inference takes time
- Frontend should be fast — reads from PostgreSQL, not ML API directly
- Background job fetches every 30 min silently

### Location mapping (user profile → ML API)
```
User sets "Bashundhara" in Profile
         ↓
Backend: AreaToMLStation("Bashundhara") → "Dhaka"
         ↓
Saves: users.location="Bashundhara", users.ml_station="Dhaka"
         ↓
ML API called with location="Dhaka"
         ↓
Frontend shows forecast labeled "Bashundhara"
```

### Admin access
Set `is_admin = true` directly in PostgreSQL:
```sql
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
```

---

## Files Created/Modified Summary

| File | Action | Status |
|---|---|---|
| `ATMOS-ML-API/serve.py` | Created (with DailyForecasterCity fix) | ✅ Done |
| `ATMOS-ML-API/requirements.txt` | Created | ✅ Done |
| `ATMOS-ML-API/Procfile` | Created | ✅ Done |
| `ATMOS-ML-API/Dockerfile` | Created | ✅ Done |
| `ATMOS-ML-API/.github/workflows/deploy.yml` | Created | ✅ Done |
| `ATMOS-Backend/.env` | Add ML vars | ⬜ Next |
| `ATMOS-Backend/config/config.go` | Add ML config | ⬜ Next |
| `ATMOS-Backend/rest/handlers/station/ingest.go` | Forward to ML | ⬜ Next |
| `ATMOS-Backend/migrations/003_add_forecast_cache.sql` | Create | ⬜ Next |
| `ATMOS-Backend/util/ml_sync.go` | Create | ⬜ Next |
| `ATMOS-Backend/util/location.go` | Create | ⬜ Next |
| `ATMOS-Backend/rest/handlers/station/forecast.go` | Create | ⬜ Next |
| `ATMOS-Backend/rest/handlers/admin/handler.go` | Create | ⬜ Next |
| `ATMOS-Frontend/src/pages/Dashboard.jsx` | Add forecast cards | ⬜ Next |
| `ATMOS-Frontend/src/pages/Profile.jsx` | Location dropdown | ⬜ Next |
| `ATMOS-Frontend/src/pages/AdminDashboard.jsx` | Create | ⬜ Next |





*************************************************************************************************************************





listen now what in my mind. right now my project only have software + hardware. only have user portal. so now i want to add ml model with this project. so that i get some predicted data. so i deployed the model into azure server. i can call 5 api. one is for checking server status. one is for posting device data. 3 are for next 1, 3, 6 hour prediction, next 30 days prediction, last for we actually design this for 2 place. one is for home where this device will hang on window or wall like ac. outside of building air will purify and spray fresh clean air in room. for this i design this user portal now have version 1. after ml integrating in version 2 i will update in frontend i will remove some part and i will add some place for hourly prediction for next 1h, 3, 6h and a place for next 30 days. so here i need area base prediction like in dhaka have 2 place kuril, badda. if two device is placed on these two location. and model have to predict for these two place. model will not predict same because device is set in dhaka. i want different prediction if in these two locations air quality really different. you said global air quality or index prediction system work like collected data from current place + closest station = real prediction. so user will set location from profile then system will know the location then for model prediction from backend system can request with location.

these for user portal and home system. and now only left device count part. our another idea is to set this device in any local station in outdoor. like bus station, train station so device will collect data and model will see current aqi a value like 300 but if we talk about for bangladesh. here aqi 150 to 170 is normal. we can't to reduce aqi between 100 so we need switzerland. so for bangladesh we will try to control aqi between normal level. but current aqi is to much weighted. so for need to reduce aqi and take this into normal level how many device should set in this staion? model have to predict. for this prediction i will build a admin portal which is only admins can access for controlling stations. from one website we can go in user and admin portal.

so that's it. so for these actually need to happen. now tell me is everything correct in model for these? if need to update anything let's update and in frontend and backend i will update it's not the problem. so now tell me about this project.

──────────────────────────────────────────────────────────────────────────────────── 1 new message ─────────────────────────────────────────────────────────────────────────────────────

Let me assess your current ML API against both use cases clearly.

What You're Building

Use Case 1 — User Portal (Home System)
- Device on window/wall → purifies outdoor air → blows clean air inside
- User sets their Dhaka neighborhood in profile
- Frontend shows: current AQI, +1h/+3h/+6h hourly forecast, 30-day calendar

Use Case 2 — Admin Portal (Outdoor Station)
- Device placed at bus/train station outdoors
- Bangladesh context: AQI 150-170 is their "normal" (not 50 like Western standards)
- Question: how many purifier devices needed at this station to bring AQI down to Bangladesh normal?
- Only admins can access this

---

Current API vs Your Needs

For User Portal — all 3 endpoints work correctly:

┌───────────────────────────┬─────────────────────────────┬──────────┐
│           Need            │          Endpoint           │  Status  │
├───────────────────────────┼─────────────────────────────┼──────────┤
│ Post device readings      │ POST /api/v1/readings       │ ✅ Works │
├───────────────────────────┼─────────────────────────────┼──────────┤
│ Hourly forecast (+1/3/6h) │ GET /api/v1/forecast/hourly │ ✅ Works │
├───────────────────────────┼─────────────────────────────┼──────────┤
│ 30-day forecast           │ GET /api/v1/forecast/daily  │ ✅ Works │
└───────────────────────────┴─────────────────────────────┴──────────┘

Your concern: Kuril vs Badda — will they get different predictions?

YES, they will. Here's why: the hourly endpoint uses device_id. Device at Kuril posts its own PM2.5 readings (say, 180), device at Badda posts its own readings (say, 120). When the backend requests forecast, it passes device_id=kuril-device and device_id=badda-device separately. The model uses each device's recent readings as the primary signal → completely different predictions for each device. The location parameter (mapped to nearest ML station like Tungi or Dhaka) only provides the seasonal baseline. This is correct.

For Admin Portal — device-requirement works but needs the right parameters:

The endpoint already has scenario options:
- outdoor_semi_open → covered bus/train platform
- outdoor_open → fully open outdoor area

And target_aqi=150 for Bangladesh's normal level.

The awkward part: outdoor "area" isn't like a room. But you can estimate — a bus station platform might be 50m × 20m = ~10,000 sq ft. You'd pass area_ft2=10000&height_ft=15&scenario=outdoor_semi_open&target_aqi=150. The answer "you need 12 devices" gives admins the number to deploy.

---

No ML Model Changes Needed

The 5 endpoints already cover both portals. Nothing in the Python/FastAPI code needs to change.

What actually needs to happen next is in backend + frontend:

Backend changes needed:

1. Add ml_station column to users table (maps their neighborhood to Azimpur/Dhaka/Paltan/Tungi)
2. Forward device readings to ML API every time a reading comes in
3. Background job every 30 min: fetch hourly + daily forecast for each device → cache in PostgreSQL
4. New endpoints: GET /api/forecast/hourly and GET /api/forecast/daily for frontend to read
5. is_admin column on users → GET /api/admin/* routes protected by admin middleware
6. Admin endpoint: POST /api/admin/station-requirement → calls ML device-requirement endpoint

Frontend changes needed:

1. User portal: add hourly forecast cards (+1h/+3h/+6h) + 30-day chart
2. Profile: add Dhaka neighborhood dropdown
3. Admin portal: new page, shows all stations, device counts, can trigger requirement calculation

---

One Real Limitation to Know

The ML model is trained only on 4 Dhaka stations (Azimpur, Dhaka, Paltan, Tungi). So:
- For a device in Kuril → maps to nearest station (probably Dhaka or Tungi) → uses that station's seasonal patterns + the device's own live readings
- The micro-location difference is captured through live sensor data, not the model's training
- This is standard practice — all global AQI prediction systems work this way

For your capstone, this is completely valid and the right approach.