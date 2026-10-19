package user

import (
	"net/http"

	"backend/util"
)

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		util.SendError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		util.SendError(w, http.StatusNotFound, "user not found")
		return
	}

	util.SendData(w, http.StatusOK, map[string]any{
		"id":         user.ID,
		"name":       user.Name,
		"email":      user.Email,
		"location":   user.Location,
		"ml_station": user.MLStation,
		"is_admin":   user.IsAdmin,
		"avatar_url": user.AvatarURL,
	})
}
