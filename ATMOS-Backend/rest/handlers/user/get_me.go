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

	util.SendData(w, http.StatusOK, map[string]string{
		"id":         user.ID,
		"name":       user.Name,
		"email":      user.Email,
		"location":   user.Location,
		"avatar_url": user.AvatarURL,
	})
}
