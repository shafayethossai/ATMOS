package user

import "net/http"

func (h *Handler) ForgotVerifyOTP(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}
