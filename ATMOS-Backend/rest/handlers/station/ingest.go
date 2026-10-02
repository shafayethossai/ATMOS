package station

import (
	"encoding/json"
	"net/http"

	"backend/repo"
	"backend/util"
)

type ingestRequest struct {
	StationID string `json:"station_id"`
	DeviceID  string `json:"device_id"`
	Before    struct {
		PM1_0 float64 `json:"pm1_0"`
		PM2_5 float64 `json:"pm2_5"`
		PM10  float64 `json:"pm10"`
	} `json:"before"`
	After struct {
		PM1_0 float64 `json:"pm1_0"`
		PM2_5 float64 `json:"pm2_5"`
		PM10  float64 `json:"pm10"`
	} `json:"after"`
	Gas struct {
		MQ7Raw       int     `json:"mq7Raw"`
		MQ7Voltage   float64 `json:"mq7Voltage"`
		MQ135Raw     int     `json:"mq135Raw"`
		MQ135Voltage float64 `json:"mq135Voltage"`
		MQ131Raw     int     `json:"mq131Raw"`
		MQ131Voltage float64 `json:"mq131Voltage"`
		MG811Raw     int     `json:"mg811Raw"`
		MG811Voltage float64 `json:"mg811Voltage"`
	} `json:"gas"`
	Purification struct {
		PM25Reduction float64 `json:"pm25Reduction"`
	} `json:"purification"`
	Fan struct {
		AutoMode  bool `json:"autoMode"`
		IsRunning bool `json:"isRunning"`
	} `json:"fan"`
}

func (h *Handler) IngestReading(w http.ResponseWriter, r *http.Request) {
	var req ingestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.SendError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.StationID == "" {
		req.StationID = "UITS-01"
	}
	if req.DeviceID == "" {
		req.DeviceID = "ESP32-001"
	}

	// Convert gas sensor voltages → concentration units
	coPPM  := util.MQ7ToCOPPM(req.Gas.MQ7Voltage)
	o3PPB  := util.MQ131ToO3PPB(req.Gas.MQ131Voltage)
	co2PPM := util.MG811ToCO2PPM(req.Gas.MG811Voltage)
	no2PPB := util.MQ135ToNO2PPB(req.Gas.MQ135Voltage) // estimated via MQ135 cross-sensitivity

	// EPA piecewise AQI (MAX of all sub-indices)
	result := util.CalculateAQI(req.Before.PM2_5, req.Before.PM10, coPPM, o3PPB, no2PPB)

	reading := repo.SensorReading{
		StationID:         req.StationID,
		DeviceID:          req.DeviceID,
		PM25:              req.Before.PM2_5,
		PM10:              req.Before.PM10,
		CO:                coPPM,
		O3:                o3PPB,
		NO2:               no2PPB,
		CO2:               co2PPM,
		PM25After:         req.After.PM2_5,
		PM10After:         req.After.PM10,
		AQI:               result.AQI,
		AQILevel:          result.Level,
		CriticalPollutant: result.CriticalPollutant,
		AQIPM25:           result.SubPM25,
		AQIPM10:           result.SubPM10,
		AQICO:             result.SubCO,
		AQIO3:             result.SubO3,
		AQINO2:            result.SubNO2,
		PM1_0:             req.Before.PM1_0,
		PM1_0After:        req.After.PM1_0,
		MQ7Raw:            req.Gas.MQ7Raw,
		MQ7Voltage:        req.Gas.MQ7Voltage,
		MQ135Raw:          req.Gas.MQ135Raw,
		MQ135Voltage:      req.Gas.MQ135Voltage,
		MQ131Raw:          req.Gas.MQ131Raw,
		MQ131Voltage:      req.Gas.MQ131Voltage,
		MG811Raw:          req.Gas.MG811Raw,
		MG811Voltage:      req.Gas.MG811Voltage,
		PurificationPct:   req.Purification.PM25Reduction,
		FanAuto:           req.Fan.AutoMode,
		FanRunning:        req.Fan.IsRunning,
	}

	if err := h.stationRepo.InsertReading(reading); err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to store reading")
		return
	}

	util.SendData(w, http.StatusCreated, map[string]any{
		"aqi":       result.AQI,
		"aqi_level": result.Level,
		"critical":  result.CriticalPollutant,
	})
}
