package station

import (
	"database/sql"
	"errors"
	"net/http"

	"backend/util"
)

func (h *Handler) GetHourlyForecast(w http.ResponseWriter, r *http.Request) {
	mlStation := h.resolveMLStation(r)

	payload, err := h.forecastRepo.GetLatestHourlyForecast("device1", mlStation)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			util.SendData(w, http.StatusOK, map[string]any{
				"status":     "no_data",
				"ml_station": mlStation,
				"message":    "No forecast cached yet — sync runs every 30 minutes",
				"forecasts":  []any{},
			})
			return
		}
		util.SendError(w, http.StatusInternalServerError, "failed to get hourly forecast")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(payload) //nolint:errcheck
}

func (h *Handler) GetDailyForecast(w http.ResponseWriter, r *http.Request) {
	mlStation := h.resolveMLStation(r)

	payload, err := h.forecastRepo.GetLatestDailyForecast("device1", mlStation)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			util.SendData(w, http.StatusOK, map[string]any{
				"status":     "no_data",
				"ml_station": mlStation,
				"message":    "No forecast cached yet — sync runs every 30 minutes",
				"forecast":   []any{},
			})
			return
		}
		util.SendError(w, http.StatusInternalServerError, "failed to get daily forecast")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(payload) //nolint:errcheck
}

// resolveMLStation returns the ML station for this request.
// Priority: JWT user's saved ml_station → query param → "Dhaka".
func (h *Handler) resolveMLStation(r *http.Request) string {
	if userID, ok := r.Context().Value("userID").(string); ok && userID != "" {
		if user, err := h.userRepo.FindByID(userID); err == nil && user.MLStation != "" {
			return user.MLStation
		}
	}
	if loc := r.URL.Query().Get("location"); loc != "" {
		return loc
	}
	return "Dhaka"
}
