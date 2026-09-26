package user

import (
	"encoding/json"
	"net/http"

	"backend/util"
)

type forgotSendOTPRequest struct {
	Email string `json:"email"`
}

func (h *Handler) ForgotSendOTP(w http.ResponseWriter, r *http.Request) {
	var req forgotSendOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.SendError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" {
		util.SendError(w, http.StatusBadRequest, "email is required")
		return
	}

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil || user == nil {
		util.SendError(w, http.StatusNotFound, "no account found with this email")
		return
	}

	h.userRepo.DeleteOldOTPs(req.Email, "reset")

	otp := util.GenerateOTP()
	expiresAt := util.GetOTPExpiry()

	if err := h.userRepo.SaveResetOTP(req.Email, otp, expiresAt); err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to save OTP")
		return
	}

	go func() {
		smtp := util.NewSMTPConfig()
		smtp.SendPasswordResetEmail(req.Email, otp)
	}()

	util.SendData(w, http.StatusOK, map[string]string{
		"message": "OTP sent to " + req.Email,
	})
}
