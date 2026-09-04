import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { StationProvider } from './context/StationContext'
import Login          from './pages/Login'
import SignUp         from './pages/SignUp'
import SignUpOTP      from './pages/SignUpOTP'
import ForgotPassword from './pages/ForgotPassword'
import ForgotOTP      from './pages/ForgotOTP'
import ResetPassword  from './pages/ResetPassword'
import Dashboard      from './pages/Dashboard'
import Profile        from './pages/Profile'

export default function App() {
  return (
    <ThemeProvider>
      <StationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"                       element={<Navigate to="/login" replace />} />
            <Route path="/login"                  element={<Login />} />
            <Route path="/signup"                 element={<SignUp />} />
            <Route path="/signup/verify"          element={<SignUpOTP />} />
            <Route path="/forgot-password"        element={<ForgotPassword />} />
            <Route path="/forgot-password/verify" element={<ForgotOTP />} />
            <Route path="/reset-password"         element={<ResetPassword />} />
            <Route path="/dashboard"              element={<Dashboard />} />
            <Route path="/profile"               element={<Profile />} />
            <Route path="*"                       element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </StationProvider>
    </ThemeProvider>
  )
}
