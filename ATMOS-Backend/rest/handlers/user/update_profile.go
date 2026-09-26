package user

import (
	"encoding/json"
	"net/http"

	"backend/util"
)

type updateProfileRequest struct {
	Name     string `json:"name"`
	Location string `json:"location"`
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		util.SendError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req updateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.SendError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" && req.Location == "" {
		util.SendError(w, http.StatusBadRequest, "nothing to update")
		return
	}

	if err := h.userRepo.UpdateProfile(userID, req.Name, req.Location); err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to update profile")
		return
	}

	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to fetch updated user")
		return
	}

	util.SendData(w, http.StatusOK, map[string]string{
		"id":         user.ID,
		"name":       user.Name,
		"email":      user.Email,
		"location":   user.Location,
		"avatar_url": user.AvatarURL,
	})
}
