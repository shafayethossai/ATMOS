package user

import (
	"encoding/json"
	"net/http"

	"backend/util"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.SendError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		util.SendError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		util.SendError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	if !util.CheckPassword(user.PasswordHash, req.Password) {
		util.SendError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := util.CreateJWT(h.cnf.SecretKey, util.CustomClaims{
		UserID: user.ID,
		Name:   user.Name,
		Email:  user.Email,
	})
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	util.SendData(w, http.StatusOK, map[string]any{
		"token": token,
		"user": map[string]string{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
		},
	})
}
