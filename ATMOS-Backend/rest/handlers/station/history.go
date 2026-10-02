package station

import (
	"net/http"
	"strconv"

	"backend/util"
)

func (h *Handler) GetHistory(w http.ResponseWriter, r *http.Request) {
	stationID := r.PathValue("id")

	hours := 1
	if h := r.URL.Query().Get("hours"); h != "" {
		if n, err := strconv.Atoi(h); err == nil && n > 0 && n <= 24 {
			hours = n
		}
	}

	points, err := h.stationRepo.GetHistory(stationID, hours)
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to fetch history")
		return
	}

	type point struct {
		Time string  `json:"time"`
		AQI  int     `json:"aqi"`
		PM25 float64 `json:"pm25"`
		CO   float64 `json:"co"`
	}

	result := make([]point, len(points))
	for i, p := range points {
		result[i] = point{
			Time: p.Time.Format("15:04"),
			AQI:  p.AQI,
			PM25: p.PM25,
			CO:   p.CO,
		}
	}

	util.SendData(w, http.StatusOK, map[string]any{
		"stationId": stationID,
		"points":    result,
	})
}
