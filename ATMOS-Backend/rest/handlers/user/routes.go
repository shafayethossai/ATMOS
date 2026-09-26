package user

import (
	"net/http"

	"backend/rest/middlewares"
)

func (h *Handler) RegisterRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	// ── Google OAuth (public) ────────────────────────────────────────────────
	mux.Handle("GET /api/auth/google",
		manager.With(http.HandlerFunc(h.GoogleLogin)),
	)
	mux.Handle("GET /api/auth/google/callback",
		manager.With(http.HandlerFunc(h.GoogleCallback)),
	)

	// ── Auth (public) ────────────────────────────────────────────────────────
	mux.Handle("POST /api/auth/signup/send-otp",
		manager.With(http.HandlerFunc(h.SignupSendOTP)),
	)
	mux.Handle("POST /api/auth/signup/verify-otp",
		manager.With(http.HandlerFunc(h.SignupVerifyOTP)),
	)
	mux.Handle("POST /api/auth/login",
		manager.With(http.HandlerFunc(h.Login)),
	)
	mux.Handle("POST /api/auth/forgot-password/send-otp",
		manager.With(http.HandlerFunc(h.ForgotSendOTP)),
	)
	mux.Handle("POST /api/auth/forgot-password/verify-otp",
		manager.With(http.HandlerFunc(h.ForgotVerifyOTP)),
	)
	mux.Handle("POST /api/auth/reset-password",
		manager.With(http.HandlerFunc(h.ResetPassword)),
	)

	// ── Profile (protected — requires JWT) ───────────────────────────────────
	mux.Handle("GET /api/user/me",
		manager.With(http.HandlerFunc(h.GetMe), h.middlewares.AuthenticateJWT),
	)
	mux.Handle("PATCH /api/user/profile",
		manager.With(http.HandlerFunc(h.UpdateProfile), h.middlewares.AuthenticateJWT),
	)
	mux.Handle("POST /api/user/change-password",
		manager.With(http.HandlerFunc(h.ChangePassword), h.middlewares.AuthenticateJWT),
	)
	mux.Handle("POST /api/user/avatar",
		manager.With(http.HandlerFunc(h.UploadAvatar), h.middlewares.AuthenticateJWT),
	)
}
