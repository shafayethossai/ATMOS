# ATMOS Frontend — File Guide

This document explains every file and folder in the frontend project in simple English. Read this to understand what each file does and why it exists.

---

## Big Picture — How the Project is Organized

```
ATMOS-Frontend/
├── src/              ← All your actual code lives here
├── public/           ← Files that go to browser as-is (favicon etc.)
├── dist/             ← The built/compiled version ready to deploy
├── node_modules/     ← Libraries downloaded by npm (don't touch)
├── index.html        ← The single HTML page the browser loads
├── package.json      ← Project settings and list of libraries
├── vite.config.js    ← Build tool settings
└── .gitignore        ← Tells git which files to ignore
```

---

## Root Files (in ATMOS-Frontend/)

| File | What it does |
|---|---|
| `index.html` | The only HTML file in the whole project. The browser loads this one page. React then takes over and shows different pages (Login, Dashboard, etc.) without full page reloads. It has one `<div id="root">` where all React content appears. |
| `package.json` | The project's "recipe book". Lists all libraries used (React, Tailwind, React Router, Lucide icons). Also defines commands: `npm run dev` starts the development server, `npm run build` creates the deployable version. |
| `package-lock.json` | An auto-generated file that locks the exact version of every library. Never edit this by hand — npm manages it. |
| `vite.config.js` | Settings for Vite (the build tool). Tells Vite to use the React plugin and Tailwind. Vite runs the dev server on port 5174 and bundles code for production. |
| `.gitignore` | Tells Git to ignore `node_modules/` and `dist/` — these are too large to store in git and can always be recreated. |
| `.oxlintrc.json` | Settings for oxlint, the code quality checker. Runs when you do `npm run lint` to catch coding mistakes. |
| `README.md` | Auto-generated file from the Vite template. Not project-specific. |

---

## public/ — Static Files

These files go directly to the browser without any processing.

| File | What it does |
|---|---|
| `public/favicon.svg` | The tiny icon that appears in the browser tab. |
| `public/icons.svg` | SVG icon set used across the app. |

---

## dist/ — The Built Version (auto-generated, do not edit)

This folder is created when you run `npm run build`. It is what you upload to Vercel to deploy the website. You never edit files here — they are auto-generated.

| File | What it does |
|---|---|
| `dist/index.html` | The production version of index.html, optimized for speed. |
| `dist/assets/index-[hash].js` | All your JavaScript code (React components, logic, etc.) bundled into one file. The random letters in the filename (`BKeR_Ide`) change every build so browsers don't use a stale cached version. |
| `dist/assets/index-[hash].css` | All CSS styles bundled into one file. Same random name trick. |
| `dist/assets/Atmos-logo-[hash].png` | The ATMOS logo image, copied here during build. |
| `dist/assets/login-background-[hash].jpeg` | The background image for the login page, copied here during build. |

---

## src/ — Your Source Code

This is where all the code you write lives. It is split into folders by purpose.

---

### src/main.jsx — Entry Point

The very first file React runs. It finds the `<div id="root">` in index.html and starts your app inside it. It wraps everything in `<ThemeProvider>` and `<StationProvider>` (so theme and station data are available everywhere), then renders `<App />`.

Think of it as: **"turn the engine on"**.

---

### src/App.jsx — Route Map

Defines all the URL routes. When you go to `/login` it shows `Login.jsx`. When you go to `/dashboard` it shows `Dashboard.jsx`. If you type a random URL it redirects you to `/login`.

Think of it as: **"the map of all pages"**.

---

### src/index.css — Global Styles

Defines the entire colour and font system using CSS variables (tokens). Things like `--bg`, `--surface`, `--text-1` are defined here. Also handles dark mode — when the user switches to dark theme, these variables change colour automatically. All components use these variables instead of hardcoded colours.

Think of it as: **"the design rulebook"**.

---

### src/api/ — Talking to the Backend

These files are the only place in the app that makes HTTP requests to the Go backend. No other file should call `fetch()` directly.

| File | What it does |
|---|---|
| `api/authApi.js` | Handles all 6 login/signup/password functions: send OTP, verify OTP, sign in, forgot password OTP, verify forgot OTP, reset password. In dev mode (no backend running) it returns fake success responses so you can test the UI. |
| `api/aqiApi.js` | Handles 2 sensor data functions: get the latest sensor reading from a station, get the last 60 minutes of history. In dev mode returns `null` so the dashboard uses mock data instead. When the Go backend is ready, you just set `VITE_API_URL` in `.env` and these calls go live. |

---

### src/assets/ — Images and Logo

| File | What it does |
|---|---|
| `assets/Atmos-logo.png` | The ATMOS logo image file (PNG). |
| `assets/AtmosLogo.jsx` | A React component that displays the logo image. Used everywhere you see the logo. Pass `size` to control how big it appears (e.g. `<AtmosLogo size={80} />`). |
| `assets/login-background.jpeg` | The background photo shown on the login/signup pages. |

---

### src/components/ — Reusable Pieces of UI

Components are building blocks. Pages are built by combining components together.

#### src/components/layout/ — Page Structure

| File | What it does |
|---|---|
| `layout/Navbar.jsx` | The top navigation bar shown on the Dashboard and Profile pages. Contains: ATMOS logo (click to go home), LIVE indicator with station name and last update time, Refresh button, dark/light mode toggle, and the user menu (click to go to Profile or Sign out). |
| `layout/PageContainer.jsx` | A simple wrapper that adds consistent padding around page content. Every page uses this so the spacing looks the same everywhere. |

#### src/components/ui/ — Dashboard Building Blocks

| File | What it does |
|---|---|
| `ui/AuthShell.jsx` | The shared wrapper for all auth pages (login, signup, forgot password etc.). Contains: the background image, the white card in the centre, the ATMOS logo at the top, and shared small components like `BtnPrimary` (the blue button), `Err` (red error text), `EyeToggle` (show/hide password), `PasswordStrength` (the strength bar), `inputProps` (shared input styling). All auth pages import from here — nothing is duplicated. |
| `ui/OTPInput.jsx` | The 6-box OTP code input used on the signup verify and forgot password verify pages. Handles: typing moves to next box automatically, backspace goes back, paste fills all boxes at once. Also contains the 30-second countdown timer and "Resend code" button. |
| `ui/SensorCard.jsx` | One sensor reading card (e.g. PM2.5 card). Shows: sensor name, current value, unit, a colour bar showing how high the value is, a safe-limit marker, and a label saying "ABOVE SAFE" or "WITHIN SAFE". Used 5 times in a row on the dashboard for the before-purification sensors. |
| `ui/MetricCard.jsx` | A top stat tile. Shows a large number with a label and a small subtitle below. Used for the 3 cards at the top of the dashboard: AQI INDEX, SENSORS, DATA POINTS. |
| `ui/StatusBadge.jsx` | A small coloured pill/chip label. Used in the chart legends (Good, Moderate, USG, Unhealthy labels). |
| `ui/AQIChart.jsx` | The AQI trend line chart (the big chart in the dashboard). Drawn with inline SVG — no chart library. Shows the AQI value over the last 60 minutes with colour-coded background zones (green = good, yellow = moderate, orange = USG, red = unhealthy). |
| `ui/Sparkline.jsx` | A smaller trend chart. Used for the PM2.5 trend and CO trend below the main AQI chart. Also inline SVG with colour zones and a safe-limit dashed line. |
| `ui/ArcGauge.jsx` | A semicircle (arc) gauge used in the "KEY INDICATORS" section of the right sidebar. Shows PM2.5, PM10, and CO as arc gauges with a safe-limit tick mark. |

---

### src/context/ — Shared Global State

Context files store data that needs to be available in every component without passing it as props.

| File | What it does |
|---|---|
| `context/ThemeContext.jsx` | Stores the current theme (light / dark / system). When the user clicks the moon/sun icon in the navbar, this updates. It saves the choice to `localStorage` so it is remembered after a page refresh. Sets `data-theme="dark"` or `data-theme="light"` on the `<html>` element so CSS picks it up. |
| `context/StationContext.jsx` | Stores which monitoring station is currently selected (e.g. UITS-01, Dhanmondi). The navbar has a station selector — changing it here updates the whole dashboard. |

---

### src/data/ — Static/Mock Data

| File | What it does |
|---|---|
| `data/mockAQI.js` | All the fake data used while the real hardware is not connected. Contains: the 4 station locations, the 5 sensor definitions (name, unit, colour, safe limit), the 2 after-purification sensor definitions, the 6 EPA AQI level colours and descriptions (Good, Moderate, etc.), the AQI colour zones for charts, and 20 pre-loaded history data points for the trend chart. |

---

### src/hooks/ — Smart Data Fetching

| File | What it does |
|---|---|
| `hooks/useAQIData.js` | The brain of the dashboard. Automatically refreshes sensor data every 8 seconds. Calculates AQI, level, critical pollutant, and sub-indices from the sensor values. Returns everything the Dashboard page needs: `sensors`, `sensorsAfter`, `history`, `aqiValue`, `aqiLevel`, `criticalPollutant`, `subIndices`, `aboveSafe`, `isLoading`, `lastUpdated`, `refresh`. In dev mode uses mock data. When hardware is ready, swap `generateSensors()` with `fetchLatestReadings()` from `aqiApi.js`. |

---

### src/services/ — Business Logic (Calculations)

| File | What it does |
|---|---|
| `services/aqiCalc.js` | All the AQI maths. Contains the EPA breakpoint tables and the piecewise interpolation formula. Functions: `computeSubIndices()` calculates the AQI sub-index for each pollutant (PM2.5, PM10, CO, NO₂), `computeAQI()` returns the final AQI as the MAX of all sub-indices, `classifyAQI()` converts a number into a level name (e.g. 74 → "Moderate"), `aqiZoneColor()` returns the EPA colour for a value, `generateSensors()` creates random mock sensor readings, `generateAfterPurification()` simulates 40–70% reduction in PM2.5 and PM10 after the air purifier. |

---

### src/pages/ — The 8 Pages

Each file is one full page the user sees.

| File | URL | What it does |
|---|---|---|
| `pages/Login.jsx` | `/login` | Shows the Sign In and Sign Up tabs. Sign In: email + password form. Sign Up: name, email, password, confirm password form. Clicking Sign In calls the login API. Clicking Sign Up sends an OTP email then navigates to the verify page. |
| `pages/SignUp.jsx` | `/signup` | Dedicated sign up page with the full registration form. Validates inputs then calls `signupSendOtp`. Passes name, email, password to the next page via navigation state. |
| `pages/SignUpOTP.jsx` | `/signup/verify` | Shows the 6-box OTP entry for new account verification. User enters the code from their email. On success the account is created and user goes to the dashboard. Has a 30-second resend timer. |
| `pages/ForgotPassword.jsx` | `/forgot-password` | Email entry form for password reset. Calls `forgotSendOtp` then navigates to OTP verify page. |
| `pages/ForgotOTP.jsx` | `/forgot-password/verify` | OTP verify step for password reset. On success receives a `resetToken` and navigates to the new password page. |
| `pages/ResetPassword.jsx` | `/reset-password` | New password form. Shows which email is being reset at the top. Has a password strength bar. On success shows a "Password reset!" screen with a back-to-login button. |
| `pages/Dashboard.jsx` | `/dashboard` | The main air quality dashboard. Left side: 3 stat cards (AQI, Sensors, Data Points) + 5 before-purification sensor cards + 2 after-purification comparison cards + AQI trend chart + PM2.5 and CO sparklines. Right side (scrollable): Overall AQI status card + pollutant sub-indices breakdown + arc gauges + EPA classification scale + system info. |
| `pages/Profile.jsx` | `/profile` | User profile page. Shows avatar (click to upload photo), account details (name, email, location), account info section, and a password change form (current password + new password + confirm). |

---

### src/redux/ — State Store (currently unused)

| File | What it does |
|---|---|
| `redux/store.js` | A Redux store file that was set up but is not currently used. The app uses React Context (ThemeContext, StationContext) for global state instead. This file can be removed or kept for future use. |

---

### src/utils/ — Helper Functions

| File | What it does |
|---|---|
| `utils/format.js` | Small helper functions used across the app. `fmtTime()` formats a Date as "8:30 PM". `fmtShortTime()` formats as "08:30". `pct()` calculates a percentage (value / max × 100), used for the sensor bar widths. |

---

## Page Navigation — Where Each Button Goes

This section explains every button click and what page it leads to. There are no `<a href>` links in this app — everything uses `navigate('/path')` from React Router, which changes the URL without reloading the page.

---

### SignUp.jsx (`/signup`)

| Button / Action | Where it goes | How |
|---|---|---|
| Click **"Continue →"** (form submit) | Goes to `/signup/verify` | Calls `signupSendOtp()` API → on success → `navigate('/signup/verify', { state: { name, email, password } })` — it also passes the name, email and password secretly to the next page so it doesn't need to ask again |
| Click **Google** button | Goes to `/dashboard` | After 1.2 seconds delay (simulating Google login) → `navigate('/dashboard')` |
| Already have the Sign In / Sign Up tabs | Switches between `/login` and `/signup` | The tab links use React Router `<Link to="/login">` and `<Link to="/signup">` |

> **Key point about `state`:** When SignUp navigates to `/signup/verify`, it passes `{ name, email, password }` hidden in navigation state. This is like a secret envelope — the next page (SignUpOTP) opens the envelope with `useLocation().state` to get the email. If someone opens `/signup/verify` directly without going through SignUp, the envelope is empty, so it sends them back to `/signup` automatically.

---

### SignUpOTP.jsx (`/signup/verify`)

| Button / Action | Where it goes | How |
|---|---|---|
| Enter 6-digit code → click **"Create account"** | Goes to `/dashboard` | Calls `signupVerifyOtp()` API → on success → `navigate('/dashboard')` |
| Click **"← Back"** button | Goes back to `/signup` | `navigate('/signup')` |
| Opens this page directly (no email in state) | Redirected to `/signup` | Guard check: `if (!email) navigate('/signup', { replace: true })` |

---

### Login.jsx (`/login`)

| Button / Action | Where it goes | How |
|---|---|---|
| Click **"Sign in"** button | Goes to `/dashboard` | Calls `signIn()` API → on success → `navigate('/dashboard')` |
| Click **Google** button | Goes to `/dashboard` | After 1.2 seconds → `navigate('/dashboard')` |
| Click **"Reset it"** link (forgot password) | Goes to `/forgot-password` | React Router `<Link to="/forgot-password">` |
| Click **Sign up** tab | Goes to `/signup` | React Router `<Link to="/signup">` |

---

### ForgotPassword.jsx (`/forgot-password`)

| Button / Action | Where it goes | How |
|---|---|---|
| Enter email → click **"Send Reset Code →"** | Goes to `/forgot-password/verify` | Calls `forgotSendOtp()` API → on success → `navigate('/forgot-password/verify', { state: { email } })` — passes email to next page |
| Click **"Sign in"** link at bottom | Goes to `/login` | React Router `<Link to="/login">` |

---

### ForgotOTP.jsx (`/forgot-password/verify`)

| Button / Action | Where it goes | How |
|---|---|---|
| Enter 6-digit code → click **"Verify Code →"** | Goes to `/reset-password` | Calls `forgotVerifyOtp()` API → on success → `navigate('/reset-password', { state: { email, resetToken } })` — passes email + reset token to next page |
| Click **"← Back"** button | Goes back to `/forgot-password` | `navigate('/forgot-password')` |
| Opens this page directly (no email in state) | Redirected to `/forgot-password` | Guard check: `if (!email) navigate('/forgot-password', { replace: true })` |

---

### ResetPassword.jsx (`/reset-password`)

| Button / Action | Where it goes | How |
|---|---|---|
| Enter new password → click **"Reset Password"** | Stays on same page, shows success screen | Calls `resetPassword()` API → on success shows "Password reset! ✓" message (no navigation yet) |
| Click **"Back to Sign in"** (on success screen) | Goes to `/login` | `navigate('/login')` |
| Opens this page directly (no email in state) | Redirected to `/forgot-password` | Guard check: `if (!email) navigate('/forgot-password', { replace: true })` |

---

### Dashboard.jsx (`/dashboard`)

| Button / Action | Where it goes | How |
|---|---|---|
| Click **ATMOS logo** | Stays on `/dashboard` (already here) | `navigate('/dashboard')` |
| Click **user menu → Profile** | Goes to `/profile` | `navigate('/profile')` inside UserMenu |
| Click **user menu → Sign out** | Goes to `/login` | `navigate('/login')` inside UserMenu |

---

### Profile.jsx (`/profile`)

| Button / Action | Where it goes | How |
|---|---|---|
| Click **ATMOS logo** | Goes to `/dashboard` | `navigate('/dashboard')` |
| Click **"← Dashboard"** button | Goes to `/dashboard` | `navigate('/dashboard')` |

---

### Full Journey Map

```
/login ──────────────────────────────────────────→ /dashboard
   │ (forgot password link)
   ↓
/forgot-password
   │ (send OTP → success)
   ↓
/forgot-password/verify
   │ (verify OTP → success)
   ↓
/reset-password
   │ (password changed → click Back to Sign in)
   ↓
/login

/signup
   │ (continue → OTP sent)
   ↓
/signup/verify
   │ (OTP verified → account created)
   ↓
/dashboard
   │ (user menu → Profile)
   ↓
/profile
   │ (← Dashboard button or logo click)
   ↓
/dashboard
```

---

### Why `navigate()` instead of `<a href="...">`?

Normal HTML links (`<a href="/login">`) reload the whole browser page — all JavaScript restarts, all state is lost.

React Router's `navigate('/login')` just swaps out which component is shown, keeping everything else running. This is why the app feels fast — no full page reloads ever happen.

---



When the user opens the Dashboard:

```
Browser loads index.html
    ↓
main.jsx starts React, wraps in ThemeProvider + StationProvider
    ↓
App.jsx sees the URL is /dashboard → renders Dashboard.jsx
    ↓
Dashboard.jsx calls useAQIData() hook
    ↓
useAQIData calls generateSensors() from aqiCalc.js (mock data in dev)
    ↓
useAQIData returns sensors, aqiValue, history, etc.
    ↓
Dashboard.jsx passes data to components:
  sensors → SensorCard × 5
  sensorsAfter → after-purification cards × 2
  history → AQIChart + Sparkline × 2
  aqiValue → MetricCard + right sidebar
  subIndices → sub-index breakdown bars
    ↓
Every 8 seconds useAQIData refreshes with new mock values
    ↓
Components re-render with new data automatically
```

---

## Quick Reference — Which File to Edit for What

| I want to change... | Edit this file |
|---|---|
| The dashboard layout or sections | `src/pages/Dashboard.jsx` |
| The top navigation bar | `src/components/layout/Navbar.jsx` |
| A sensor card appearance | `src/components/ui/SensorCard.jsx` |
| The AQI trend chart | `src/components/ui/AQIChart.jsx` |
| The PM2.5 or CO sparkline | `src/components/ui/Sparkline.jsx` |
| The arc gauges | `src/components/ui/ArcGauge.jsx` |
| The login/signup form | `src/pages/Login.jsx` or `src/pages/SignUp.jsx` |
| The shared login card/button style | `src/components/ui/AuthShell.jsx` |
| The OTP input boxes | `src/components/ui/OTPInput.jsx` |
| Colours, dark mode, fonts | `src/index.css` |
| The AQI calculation formula | `src/services/aqiCalc.js` |
| The mock sensor data | `src/data/mockAQI.js` |
| How often data refreshes | `src/hooks/useAQIData.js` |
| API calls to the backend | `src/api/authApi.js` or `src/api/aqiApi.js` |
| Page routing (which URL shows which page) | `src/App.jsx` |
| The ATMOS logo image | `src/assets/Atmos-logo.png` |
| The logo component | `src/assets/AtmosLogo.jsx` |
| Profile page | `src/pages/Profile.jsx` |
