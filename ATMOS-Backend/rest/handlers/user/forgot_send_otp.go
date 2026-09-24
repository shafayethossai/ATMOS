package user

import "net/http"

func (h *Handler) ForgotSendOTP(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}
