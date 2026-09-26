package user

import (
	"encoding/json"
	"net/http"

	"backend/util"
)

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		util.SendError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req changePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.SendError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		util.SendError(w, http.StatusBadRequest, "currentPassword and newPassword are required")
		return
	}

	if len(req.NewPassword) < 8 {
		util.SendError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		util.SendError(w, http.StatusNotFound, "user not found")
		return
	}

	if !util.CheckPassword(user.PasswordHash, req.CurrentPassword) {
		util.SendError(w, http.StatusUnauthorized, "current password is incorrect")
		return
	}

	hash, err := util.HashPassword(req.NewPassword)
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	if err := h.userRepo.UpdatePassword(userID, hash); err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to update password")
		return
	}

	util.SendData(w, http.StatusOK, map[string]string{
		"message": "password changed successfully",
	})
}
