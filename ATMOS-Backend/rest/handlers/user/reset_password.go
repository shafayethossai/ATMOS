package user

import (
	"encoding/json"
	"net/http"

	"backend/util"
)

type resetPasswordRequest struct {
	Email      string `json:"email"`
	ResetToken string `json:"resetToken"`
	NewPassword string `json:"newPassword"`
}

func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.SendError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.ResetToken == "" || req.NewPassword == "" {
		util.SendError(w, http.StatusBadRequest, "email, resetToken and newPassword are required")
		return
	}

	if len(req.NewPassword) < 8 {
		util.SendError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	resetToken, err := h.userRepo.GetResetToken(req.ResetToken)
	if err != nil {
		util.SendError(w, http.StatusBadRequest, "invalid or expired reset token")
		return
	}

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil || user.ID != resetToken.UserID {
		util.SendError(w, http.StatusBadRequest, "invalid reset token")
		return
	}

	hash, err := util.HashPassword(req.NewPassword)
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	if err := h.userRepo.UpdatePassword(user.ID, hash); err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to update password")
		return
	}

	h.userRepo.MarkResetTokenUsed(resetToken.ID)

	util.SendData(w, http.StatusOK, map[string]string{
		"message": "password reset successful",
	})
}
