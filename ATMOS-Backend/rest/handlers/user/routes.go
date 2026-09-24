package user

import (
	"net/http"

	"backend/rest/middlewares"
)

func (h *Handler) RegisterRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	// Auth routes (no auth required)
	mux.HandleFunc("POST /api/auth/signup/send-otp", h.SignupSendOTP)
	mux.HandleFunc("POST /api/auth/signup/verify-otp", h.SignupVerifyOTP)
	mux.HandleFunc("POST /api/auth/login", h.Login)
	mux.HandleFunc("POST /api/auth/forgot-password/send-otp", h.ForgotSendOTP)
	mux.HandleFunc("POST /api/auth/forgot-password/verify-otp", h.ForgotVerifyOTP)
	mux.HandleFunc("POST /api/auth/reset-password", h.ResetPassword)

	// Profile routes (auth required)
	mux.Handle("GET /api/user/me", manager.With(http.HandlerFunc(h.GetMe), h.middlewares.Auth))
	mux.Handle("PATCH /api/user/profile", manager.With(http.HandlerFunc(h.UpdateProfile), h.middlewares.Auth))
	mux.Handle("POST /api/user/change-password", manager.With(http.HandlerFunc(h.ChangePassword), h.middlewares.Auth))
	mux.Handle("POST /api/user/avatar", manager.With(http.HandlerFunc(h.UploadAvatar), h.middlewares.Auth))
}
