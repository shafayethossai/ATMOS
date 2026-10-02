# ATMOS Backend — Complete Guide

> Everything about the Go backend: every file, what it does, and how all the pieces connect.

---

## Tech Stack

| What | Technology |
|---|---|
| Language | Go (standard `net/http`, no Gin) |
| Database | PostgreSQL on Neon (cloud) |
| DB Driver | `sqlx` + `pgx/v5` |
| Auth | JWT (`golang-jwt/jwt/v5`) + bcrypt |
| Email | SMTP with TLS (Gmail App Password) |
| Avatar Storage | Cloudinary (free tier) |
| Google OAuth | `golang.org/x/oauth2/google` |
| DB Migrations | `rubenv/sql-migrate` |
| Config | `godotenv` reads `.env` file |
| Deploy | Render.com |

---

## Complete File Map

```
ATMOS-Backend/
│
├── main.go                        — Entry point. Just calls cmd.Serve()
├── go.mod                         — Go module: module name = "backend", all dependencies
│
├── cmd/
│   └── serve.go                   — Server startup: loads config → connects DB → runs migrations
│                                    → creates repos → creates handlers → starts HTTP server
│
├── config/
│   └── config.go                  — Reads ALL environment variables. Crashes on startup if any
│                                    required var is missing. Returns a single *Config struct
│                                    used everywhere.
│
├── infra/
│   ├── connection.go              — Creates the PostgreSQL connection (singleton via sync.Once).
│   │                                Uses pgx driver through sqlx.
│   └── migrate.go                 — Runs SQL migration files from ./migrations/migrations/ on startup.
│                                    Uses rubenv/sql-migrate. Safe to run every time (skips already-run).
│
├── migrations/
│   └── migrations/
│       └── 001_create_initial_schema.sql  — Creates all 5 tables: users, otp_tokens,
│                                            reset_tokens, stations, sensor_readings
│
├── repo/
│   ├── user.go                    — All database queries for users, OTPs, reset tokens.
│   │                                Defines structs: User, OTPToken, ResetToken.
│   │                                Defines interface: UserRepo (all methods).
│   │                                Implements: userRepo (actual SQL queries).
│   └── station.go                 — Database queries for sensor readings (commented out —
│                                    waiting for ESP32 hardware). Defines: SensorReading,
│                                    HistoryPoint structs and StationRepo interface (empty for now).
│
├── rest/
│   ├── server.go                  — Creates the HTTP server. Applies global middlewares
│   │                                (CORS → Preflight → Logger). Registers all routes.
│   │                                Starts listening on configured port.
│   │
│   ├── middlewares/
│   │   ├── manager.go             — Middleware chain manager. Use() adds global middleware.
│   │   │                            With() wraps a single route with extra middleware (e.g. JWT).
│   │   │                            WrapMux() applies global middleware to the whole mux.
│   │   ├── middleware.go          — Middlware struct that holds *Config. Used by AuthenticateJWT.
│   │   ├── cors.go                — Sets Access-Control headers on every response so the
│   │   │                            React frontend (different origin) can call the API.
│   │   ├── preflight.go           — Handles OPTIONS requests (browser sends these before POST/PATCH).
│   │   │                            Returns 200 immediately with CORS headers so the real request
│   │   │                            can proceed.
│   │   ├── logger.go              — Logs every request: METHOD /path duration (e.g. POST /api/auth/login 3ms)
│   │   └── authenticateJWT.go     — Protected route middleware. Reads "Authorization: Bearer <token>"
│   │                                header → verifies JWT → injects userID into request context.
│   │                                Returns 401 if token is missing, malformed, or expired.
│   │
│   └── handlers/
│       ├── user/
│       │   ├── handler.go         — Handler struct: holds *Config, UserRepo, *Middleware.
│       │   │                        NewHandler() is the constructor.
│       │   ├── routes.go          — Registers all 12 user/auth routes on the mux.
│       │   │                        Public routes: no middleware beyond global.
│       │   │                        Protected routes: wrapped with AuthenticateJWT.
│       │   ├── signup_send_otp.go — POST /api/auth/signup/send-otp
│       │   ├── signup_verify_otp.go — POST /api/auth/signup/verify-otp
│       │   ├── login.go           — POST /api/auth/login
│       │   ├── forgot_send_otp.go — POST /api/auth/forgot-password/send-otp
│       │   ├── forgot_verify_otp.go — POST /api/auth/forgot-password/verify-otp
│       │   ├── reset_password.go  — POST /api/auth/reset-password
│       │   ├── get_me.go          — GET  /api/user/me          (JWT required)
│       │   ├── update_profile.go  — PATCH /api/user/profile    (JWT required)
│       │   ├── change_password.go — POST /api/user/change-password (JWT required)
│       │   ├── upload_avatar.go   — POST /api/user/avatar      (JWT required)
│       │   └── google_oauth.go    — GET  /api/auth/google  and  GET /api/auth/google/callback
│       │
│       └── station/
│           ├── handler.go         — Handler struct for station routes (holds StationRepo).
│           ├── routes.go          — Registers 3 station routes (GET latest, GET history, POST ingest).
│           ├── latest.go          — GET /api/stations/{id}/latest  → returns 501 (not implemented yet)
│           ├── history.go         — GET /api/stations/{id}/history → returns 501 (not implemented yet)
│           └── ingest.go          — POST /api/sensor-data          → returns 501 (not implemented yet)
│
└── util/
    ├── otp.go                     — OTP generation using crypto/rand (truly random, not math/rand).
    │                                OTP validity: 20 minutes. GenerateOTP(), GetOTPExpiry(), IsOTPExpired().
    ├── jwt.go                     — JWT create and verify. CustomClaims has UserID (UUID string),
    │                                Name, Email. Token expires in 72 hours. Algorithm: HS256.
    ├── hash.go                    — bcrypt password hashing (cost=12) and comparison.
    │                                HashPassword() and CheckPassword().
    ├── email.go                   — SMTP email sender. SMTPConfig struct. Sends HTML emails
    │                                with TLS (STARTTLS). Two email types: OTP verification
    │                                (blue OTP) and password reset (red OTP).
    │                                Errors written to smtp_errors.log file.
    └── send_data.go               — Two JSON response helpers:
                                     SendData(w, statusCode, data)  → any JSON response
                                     SendError(w, statusCode, msg)  → {"error": "msg"}
```

---

## Database Tables

5 tables total, created by `001_create_initial_schema.sql` on first startup.

### `users`
Stores registered accounts.
```
id            UUID (primary key, auto-generated)
name          TEXT
email         TEXT (unique)
password_hash TEXT (bcrypt hash, cost 12)
location      TEXT (optional — e.g. "Dhaka, Bangladesh")
avatar_url    TEXT (optional — Cloudinary URL)
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

### `otp_tokens`
Stores both signup OTPs and password-reset OTPs in the same table, separated by `type`.
```
id            UUID
email         TEXT
code          TEXT (6-digit string)
type          TEXT → 'signup' or 'reset'
pending_name  TEXT (only for signup — stores the name before user is created)
pending_hash  TEXT (only for signup — stores bcrypt hash before user is created)
expires_at    TIMESTAMP (20 minutes after creation)
used          BOOLEAN (false by default, set true after use)
created_at    TIMESTAMP
```

### `reset_tokens`
Stores the secure token issued after OTP is verified (used to authorize the actual password reset).
```
id         UUID
user_id    UUID (references users.id)
token      TEXT (64-char hex string, crypto/rand)
expires_at TIMESTAMP (15 minutes after creation)
used       BOOLEAN
created_at TIMESTAMP
```

### `stations`
Monitoring station metadata (seeded manually).
```
id        TEXT (e.g. 'UITS-01')
name      TEXT (e.g. 'UITS Main Campus')
location  TEXT (e.g. 'Dhaka-1212')
lat       FLOAT
lng       FLOAT
active    BOOLEAN
```

### `sensor_readings`
Raw sensor data + AQI calculated by Go. Populated by ESP32 via `POST /api/sensor-data` (not yet implemented).
```
id                 BIGSERIAL
station_id         TEXT
device_id          TEXT
recorded_at        TIMESTAMP
pm25, pm10         FLOAT (before purification)
co, no2, co2       FLOAT (before purification)
pm25_after         FLOAT (after purification)
pm10_after         FLOAT (after purification)
aqi                INT (final AQI = max of sub-indices)
aqi_level          TEXT ('Good' / 'Moderate' / 'Unhealthy' etc.)
critical_pollutant TEXT (which pollutant drove the AQI)
aqi_pm25, aqi_pm10, aqi_co, aqi_no2  INT (individual sub-indices)
```

---

## How Server Starts (Startup Flow)

```
main.go
  └── cmd.Serve()
        ├── 1. config.GetConfig()
        │       Reads .env file → validates every required env var → crashes if any missing
        │       Returns *Config with all settings
        │
        ├── 2. infra.NewConnection(connectionString)
        │       Opens PostgreSQL connection via pgx driver
        │       Uses sync.Once — only one connection ever created
        │
        ├── 3. infra.MigrateDB(db, "./migrations/migrations")
        │       Reads SQL files from that directory
        │       Runs any migrations not yet applied
        │       Safe to run every time (rubenv/sql-migrate tracks what's done)
        │
        ├── 4. middlewares.NewMiddleware(cnf)
        │       Creates the Middlware struct that AuthenticateJWT lives on
        │
        ├── 5. repo.NewUserRepo(db)    → creates userRepo (holds the db connection)
        │   repo.NewStationRepo(db)  → creates stationRepo
        │
        ├── 6. userH.NewHandler(cnf, userRepo, mw, db)
        │   stationH.NewHandler(cnf, stationRepo, mw, db)
        │       Creates handler structs that hold config + repo + middlewares
        │
        └── 7. rest.NewServer(...).Start()
                ├── Creates Manager, adds global middlewares: Cors → Preflight → Logger
                ├── Creates http.ServeMux
                ├── Calls handler.RegisterRoutes() for user and station handlers
                │       This registers all routes on the mux with their middleware chains
                └── http.ListenAndServe(":4000", wrappedMux)
                        Every request goes through: Logger → Preflight → Cors → route handler
```

---

## Middleware Chain — How It Works

The `Manager` handles two levels of middleware:

**Global middleware** (runs on every request, applied in `server.go`):
```
Request → Cors → Preflight → Logger → actual handler
```

**Route-level middleware** (only on specific routes, applied in `routes.go`):
```
Request → Cors → Preflight → Logger → AuthenticateJWT → actual handler
```

The `manager.With(handler, extraMiddleware...)` call wraps just that one route.

Example from `routes.go`:
```go
// Public — no extra middleware
mux.Handle("POST /api/auth/login",
    manager.With(http.HandlerFunc(h.Login)),
)

// Protected — AuthenticateJWT runs first
mux.Handle("GET /api/user/me",
    manager.With(http.HandlerFunc(h.GetMe), h.middlewares.AuthenticateJWT),
)
```

---

## All API Endpoints

### Public Auth Endpoints (no token needed)

| Method | Path | Handler file | What it does |
|---|---|---|---|
| GET | `/api/auth/google` | `google_oauth.go` | Redirects browser to Google consent screen |
| GET | `/api/auth/google/callback` | `google_oauth.go` | Google calls this after user selects account |
| POST | `/api/auth/signup/send-otp` | `signup_send_otp.go` | Validates input, hashes password, saves OTP row, emails OTP |
| POST | `/api/auth/signup/verify-otp` | `signup_verify_otp.go` | Verifies OTP, creates user, returns JWT |
| POST | `/api/auth/login` | `login.go` | Checks email+password, returns JWT |
| POST | `/api/auth/forgot-password/send-otp` | `forgot_send_otp.go` | Finds account, emails reset OTP |
| POST | `/api/auth/forgot-password/verify-otp` | `forgot_verify_otp.go` | Verifies OTP, issues resetToken |
| POST | `/api/auth/reset-password` | `reset_password.go` | Verifies resetToken, updates password |

### Protected Endpoints (JWT required in Authorization header)

| Method | Path | Handler file | What it does |
|---|---|---|---|
| GET | `/api/user/me` | `get_me.go` | Returns logged-in user's profile |
| PATCH | `/api/user/profile` | `update_profile.go` | Updates name and/or location |
| POST | `/api/user/change-password` | `change_password.go` | Verifies current password, sets new one |
| POST | `/api/user/avatar` | `upload_avatar.go` | Uploads image to Cloudinary, saves URL |

### Sensor Endpoints (not implemented — waiting for ESP32)

| Method | Path | Handler file | Status |
|---|---|---|---|
| GET | `/api/stations/{id}/latest` | `latest.go` | Returns 501 |
| GET | `/api/stations/{id}/history` | `history.go` | Returns 501 |
| POST | `/api/sensor-data` | `ingest.go` | Returns 501 |

---

## Flow Diagrams — Auth

### Signup Flow (2 steps)

```
Frontend                          Backend                           Database
   │                                 │                                  │
   │── POST /signup/send-otp ───────>│                                  │
   │   {name, email, password}       │── FindByEmail(email) ───────────>│
   │                                 │<── nil (not found, good) ────────│
   │                                 │── HashPassword(password)         │
   │                                 │── DeleteOldOTPs(email,'signup') >│
   │                                 │── GenerateOTP() = "847291"       │
   │                                 │── SaveSignupOTP(                 │
   │                                 │     email, "847291",             │
   │                                 │     name, bcryptHash,            │
   │                                 │     expiresAt=now+20min) ───────>│
   │                                 │── go SendOTPEmail(email, otp)    │  (goroutine, non-blocking)
   │<── 200 {message: "OTP sent"} ───│                                  │
   │                                 │                                  │
   │── POST /signup/verify-otp ─────>│                                  │
   │   {email, otp}                  │── GetSignupOTP(email, otp) ─────>│
   │                                 │   (checks: type=signup,          │
   │                                 │    used=false, expires_at>NOW()) │
   │                                 │<── OTPToken row ─────────────────│
   │                                 │── MarkOTPUsed(otp.ID) ──────────>│
   │                                 │── CreateUser(                    │
   │                                 │     otp.PendingName,             │
   │                                 │     email,                       │
   │                                 │     otp.PendingHash) ───────────>│
   │                                 │<── User{id, name, email} ────────│
   │                                 │── CreateJWT(userID, name, email) │
   │<── 201 {token, user} ───────────│                                  │
   │   (frontend saves to           │                                  │
   │    localStorage)                │                                  │
```

**Key design:** The password hash is stored in `otp_tokens.pending_hash` during send-otp. No user row exists until OTP is verified. This means you never have partial/unverified users in the `users` table.

---

### Login Flow

```
Frontend                          Backend                           Database
   │                                 │                                  │
   │── POST /api/auth/login ────────>│                                  │
   │   {email, password}             │── FindByEmail(email) ───────────>│
   │                                 │<── User row ─────────────────────│
   │                                 │── CheckPassword(hash, password)  │
   │                                 │   (bcrypt compare — returns bool)│
   │                                 │── CreateJWT(userID, name, email) │
   │<── 200 {token, user} ───────────│                                  │
```

---

### Forgot Password Flow (3 steps)

```
Step 1: Send OTP
   │── POST /forgot-password/send-otp ─>│
   │   {email}                           │── FindByEmail → must exist (404 if not)
   │                                     │── DeleteOldOTPs(email, 'reset')
   │                                     │── GenerateOTP → SaveResetOTP
   │                                     │── go SendPasswordResetEmail()
   │<── 200 {message} ──────────────────│

Step 2: Verify OTP → get resetToken
   │── POST /forgot-password/verify-otp >│
   │   {email, otp}                      │── GetResetOTP(email, otp)
   │                                     │── MarkOTPUsed(otp.ID)
   │                                     │── FindByEmail → get user.ID
   │                                     │── crypto/rand 32 bytes → hex = resetToken (64 chars)
   │                                     │── SaveResetToken(user.ID, resetToken, now+15min)
   │<── 200 {resetToken} ───────────────│
   │   (frontend stores this in          │
   │    navigation state)                │

Step 3: Set new password
   │── POST /reset-password ────────────>│
   │   {email, resetToken, newPassword}  │── GetResetToken(resetToken) → must be valid+unexpired
   │                                     │── FindByEmail → verify user.ID matches token.UserID
   │                                     │── HashPassword(newPassword)
   │                                     │── UpdatePassword(user.ID, hash)
   │                                     │── MarkResetTokenUsed(token.ID)
   │<── 200 {message} ──────────────────│
```

**Why two tokens?** OTP (6-digit) proves the user owns the email. `resetToken` (64-char hex) proves the OTP was already verified before `/reset-password` is called. Without `resetToken`, anyone who knew your email could call `/reset-password` directly.

---

### Google OAuth Flow

```
Browser                        Backend                        Google
   │                               │                              │
   │── GET /api/auth/google ──────>│                              │
   │                               │── generate random 16-byte    │
   │                               │   hex state string           │
   │                               │── Set cookie: oauth_state=.. │
   │<── 307 redirect ──────────────│                              │
   │                               │                              │
   │── GET accounts.google.com ───────────────────────────────────>
   │   (user sees Google login page)                              │
   │<── user selects account ─────────────────────────────────────
   │                               │                              │
   │── GET /api/auth/google/callback?code=...&state=... ────────>│
   │   (browser sends oauth_state cookie automatically)          │
   │                               │── verify: cookie == state param (CSRF check)
   │                               │── Exchange(code) → Google access token
   │                               │── GET googleapis.com/userinfo → {email, name}
   │                               │── FindByEmail → if not found, CreateUser
   │                               │── CreateJWT(userID, name, email)
   │<── 307 redirect to ───────────│
   │   localhost:5174/dashboard    │
   │   ?token=<jwt>                │
   │                               │
   │── React Dashboard loads ──────│
   │   PrivateRoute reads ?token   │
   │   → saves to localStorage     │
   │   → Dashboard renders         │
```

---

### Protected Endpoint Flow (any JWT-required route)

```
Frontend                       AuthenticateJWT middleware          Handler
   │                                    │                              │
   │── GET /api/user/me ───────────────>│                              │
   │   Authorization: Bearer <token>    │── Split header               │
   │                                    │── VerifyJWT(secret, token)   │
   │                                    │   (checks signature+expiry)  │
   │                                    │── ctx = context.WithValue(   │
   │                                    │     ctx, "userID", claims.UserID)
   │                                    │──────────────────────────────>│
   │                                    │                              │── FindByID(userID)
   │                                    │                              │── return user data
   │<── 200 {id, name, email, ...} ──────────────────────────────────│
```

---

## Key Patterns

### 1. How a handler is structured
Every handler file follows this pattern:
```go
// 1. Define request struct
type loginRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

// 2. Decode body
var req loginRequest
json.NewDecoder(r.Body).Decode(&req)

// 3. Validate
if req.Email == "" { util.SendError(w, 400, "..."); return }

// 4. Do business logic (call repo, util functions)

// 5. Send response
util.SendData(w, 200, map[string]any{...})
```

### 2. How repo queries work
`sqlx` maps SQL rows directly to Go structs using `db:` tags:
```go
var u User
db.Get(&u, `SELECT * FROM users WHERE email = $1`, email)
// u is now filled with data from the row
```
`$1, $2, ...` are parameterized — SQL injection is impossible.

### 3. Email is sent in a goroutine
```go
go func() {
    smtp := util.NewSMTPConfig()
    smtp.SendOTPEmail(email, otp)
}()
// Response is sent immediately — email sends in background
```
Without the goroutine, the API response would be delayed by SMTP (can take 1-3 seconds).

### 4. How userID travels through a protected request
```
JWT token → AuthenticateJWT extracts UserID → stores in context
→ handler reads: userID := r.Context().Value("userID").(string)
→ uses it for DB query
```

### 5. Avatar upload uses Cloudinary (not local disk)
Render.com (the deployment host) resets the filesystem on every deploy. Local file storage would be wiped. Cloudinary stores the image permanently in the cloud. The backend only saves the `https://res.cloudinary.com/...` URL in PostgreSQL.

Using `userID` as the Cloudinary `PublicID` means each user has exactly one avatar slot — uploading a new photo overwrites the old one automatically.

---

## Environment Variables (`.env`)

```bash
# App
VERSION=1.0.0
SERVICENAME=atmos-backend
HTTPPORT=4000
SECRETKEY=your-jwt-secret-key-here

# Database (Neon)
DB_STRING=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# Google OAuth
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URL=http://localhost:4000/api/auth/google/callback
FRONTEND_URL=http://localhost:5174

# SMTP (use Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_FROM=ATMOS <your@gmail.com>

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

## What Is Not Done Yet (Hardware pending)

The 3 station endpoints in `rest/handlers/station/` all return `501 Not Implemented`. When the ESP32 hardware is ready:

1. **Uncomment** the 3 methods in `repo/station.go` (`GetLatestReading`, `GetHistory`, `InsertReading`)
2. **Uncomment** the `StationRepo` interface methods
3. **Implement** `ingest.go` — decode ESP32 JSON body, calculate AQI using EPA formula, call `InsertReading`
4. **Implement** `latest.go` — call `GetLatestReading`, return the row as JSON
5. **Implement** `history.go` — call `GetHistory`, return array of `{time, aqi, pm25, co}`
6. **Update frontend** `src/hooks/useAQIData.js` — replace `generateSensors()` mock with real API calls

AQI formula to implement in Go (EPA piecewise linear):
```
Ip = ((IHi - ILo) / (BPHi - BPLo)) × (Cp - BPLo) + ILo
Final AQI = MAX(aqi_pm25, aqi_pm10, aqi_co, aqi_no2)
```

---

## How to Run

```bash
cd ATMOS-Backend
cp .env.example .env   # fill in your values
go run main.go

# Server starts on :4000
# ✅ Database connected and migrated successfully
# ✅ Migrations applied successfully
# 🚀 Server is running on :4000
```