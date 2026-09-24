package user

import "net/http"

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}
