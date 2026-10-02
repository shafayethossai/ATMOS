package station

import (
	"net/http"

	"backend/util"
)

func (h *Handler) GetLatest(w http.ResponseWriter, r *http.Request) {
	stationID := r.PathValue("id")

	reading, err := h.stationRepo.GetLatestReading(stationID)
	if err != nil {
		util.SendError(w, http.StatusNotFound, "no readings found for this station")
		return
	}

	util.SendData(w, http.StatusOK, map[string]any{
		"stationId":          reading.StationID,
		"timestamp":          reading.RecordedAt,
		"pm25":               reading.PM25,
		"pm10":               reading.PM10,
		"co":                 reading.CO,
		"no2":                reading.NO2,
		"co2":                reading.CO2,
		"o3":                 reading.O3,
		"pm25_after":         reading.PM25After,
		"pm10_after":         reading.PM10After,
		"pm1_0":              reading.PM1_0,
		"pm1_0_after":        reading.PM1_0After,
		"purification_pct":   reading.PurificationPct,
		"fan_auto":           reading.FanAuto,
		"fan_running":        reading.FanRunning,
		"aqi":                reading.AQI,
		"aqi_level":          reading.AQILevel,
		"critical_pollutant": reading.CriticalPollutant,
		"sub_indices": map[string]int{
			"pm25": reading.AQIPM25,
			"pm10": reading.AQIPM10,
			"co":   reading.AQICO,
			"o3":   reading.AQIO3,
			"no2":  reading.AQINO2,
		},
	})
}
