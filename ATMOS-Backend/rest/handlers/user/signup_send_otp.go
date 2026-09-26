package user

import (
	"context"
	"encoding/json"
	"net/http"
	"regexp"

	"backend/util"
)

type signupSendOTPRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) SignupSendOTP(w http.ResponseWriter, r *http.Request) {
	var req signupSendOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.SendError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" || req.Email == "" || req.Password == "" {
		util.SendError(w, http.StatusBadRequest, "name, email and password are required")
		return
	}

	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(req.Email) {
		util.SendError(w, http.StatusBadRequest, "invalid email format")
		return
	}

	if len(req.Password) < 8 {
		util.SendError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	// check if email already registered
	existing, _ := h.userRepo.FindByEmail(req.Email)
	if existing != nil {
		util.SendError(w, http.StatusConflict, "email already registered")
		return
	}

	// hash password before storing in OTP row (so we don't store plain text)
	hash, err := util.HashPassword(req.Password)
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	// delete any old OTPs for this email so only one is active at a time
	h.userRepo.DeleteOldOTPs(req.Email, "signup")

	otp := util.GenerateOTP()
	expiresAt := util.GetOTPExpiry()

	if err := h.userRepo.SaveSignupOTP(req.Email, otp, req.Name, hash, expiresAt); err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to save OTP")
		return
	}

	// send email in background so the response is not blocked by SMTP
	go func() {
		smtp := util.NewSMTPConfig()
		if err := smtp.SendOTPEmail(req.Email, otp); err != nil {
			_ = context.Background()
		}
	}()

	util.SendData(w, http.StatusOK, map[string]string{
		"message": "OTP sent to " + req.Email,
	})
}
