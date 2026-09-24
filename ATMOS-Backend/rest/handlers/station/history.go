package station

import "net/http"

func (h *Handler) GetHistory(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}
