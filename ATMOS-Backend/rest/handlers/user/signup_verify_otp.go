package user

import (
	"encoding/json"
	"net/http"

	"backend/util"
)

type signupVerifyOTPRequest struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

func (h *Handler) SignupVerifyOTP(w http.ResponseWriter, r *http.Request) {
	var req signupVerifyOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.SendError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.OTP == "" {
		util.SendError(w, http.StatusBadRequest, "email and otp are required")
		return
	}

	// get OTP row from DB — query checks: correct email+code, type='signup', not used, not expired
	otpRow, err := h.userRepo.GetSignupOTP(req.Email, req.OTP)
	if err != nil {
		util.SendError(w, http.StatusBadRequest, "invalid or expired OTP")
		return
	}

	// mark OTP as used so it cannot be reused
	h.userRepo.MarkOTPUsed(otpRow.ID)

	// create the user using name+hash that were saved in the OTP row during send-otp
	user, err := h.userRepo.CreateUser(otpRow.PendingName, req.Email, otpRow.PendingHash)
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	// generate JWT for the new user
	token, err := util.CreateJWT(h.cnf.SecretKey, util.CustomClaims{
		UserID: user.ID,
		Name:   user.Name,
		Email:  user.Email,
	})
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	util.SendData(w, http.StatusCreated, map[string]any{
		"token": token,
		"user": map[string]string{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
		},
	})
}
