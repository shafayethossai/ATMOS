package user

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"backend/util"
)

type forgotVerifyOTPRequest struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

func (h *Handler) ForgotVerifyOTP(w http.ResponseWriter, r *http.Request) {
	var req forgotVerifyOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.SendError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.OTP == "" {
		util.SendError(w, http.StatusBadRequest, "email and otp are required")
		return
	}

	otpRow, err := h.userRepo.GetResetOTP(req.Email, req.OTP)
	if err != nil {
		util.SendError(w, http.StatusBadRequest, "invalid or expired OTP")
		return
	}

	h.userRepo.MarkOTPUsed(otpRow.ID)

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	// generate a secure random one-time reset token (not a JWT)
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to generate reset token")
		return
	}
	resetToken := hex.EncodeToString(b)

	expiresAt := time.Now().Add(15 * time.Minute)
	if err := h.userRepo.SaveResetToken(user.ID, resetToken, expiresAt); err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to save reset token")
		return
	}

	util.SendData(w, http.StatusOK, map[string]string{
		"resetToken": resetToken,
	})
}
