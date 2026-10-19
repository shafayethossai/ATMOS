package station

import (
	"net/http"

	"backend/rest/middlewares"
)

func (h *Handler) RegisterRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	mux.HandleFunc("GET /api/stations/{id}/latest", h.GetLatest)
	mux.HandleFunc("GET /api/stations/{id}/history", h.GetHistory)
	mux.HandleFunc("POST /api/sensor-data", h.IngestReading)

	mux.Handle("GET /api/forecast/hourly",
		manager.With(http.HandlerFunc(h.GetHourlyForecast), h.middlewares.AuthenticateJWT),
	)
	mux.Handle("GET /api/forecast/daily",
		manager.With(http.HandlerFunc(h.GetDailyForecast), h.middlewares.AuthenticateJWT),
	)
}
