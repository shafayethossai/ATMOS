package station

import "net/http"

func (h *Handler) GetLatest(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}
