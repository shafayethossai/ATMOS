package repo

import (
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

type SensorReading struct {
	ID                int64     `db:"id"`
	StationID         string    `db:"station_id"`
	DeviceID          string    `db:"device_id"`
	RecordedAt        time.Time `db:"recorded_at"`
	PM25              float64   `db:"pm25"`
	PM10              float64   `db:"pm10"`
	CO                float64   `db:"co"`
	O3                float64   `db:"o3"`
	NO2               float64   `db:"no2"`
	CO2               float64   `db:"co2"`
	PM25After         float64   `db:"pm25_after"`
	PM10After         float64   `db:"pm10_after"`
	AQI               int       `db:"aqi"`
	AQILevel          string    `db:"aqi_level"`
	CriticalPollutant string    `db:"critical_pollutant"`
	AQIPM25           int       `db:"aqi_pm25"`
	AQIPM10           int       `db:"aqi_pm10"`
	AQICO             int       `db:"aqi_co"`
	AQIO3             int       `db:"aqi_o3"`
	AQINO2            int       `db:"aqi_no2"`
}

type HistoryPoint struct {
	Time time.Time `db:"recorded_at"`
	AQI  int       `db:"aqi"`
	PM25 float64   `db:"pm25"`
	CO   float64   `db:"co"`
}

type StationRepo interface {
	GetLatestReading(stationID string) (*SensorReading, error)
	GetHistory(stationID string, hours int) ([]HistoryPoint, error)
	InsertReading(data SensorReading) error
}

type stationRepo struct {
	db *sqlx.DB
}

func NewStationRepo(db *sqlx.DB) StationRepo {
	return &stationRepo{db: db}
}

func (r *stationRepo) GetLatestReading(stationID string) (*SensorReading, error) {
	var s SensorReading
	err := r.db.Get(&s, `
		SELECT * FROM sensor_readings
		WHERE station_id = $1
		ORDER BY recorded_at DESC LIMIT 1`,
		stationID)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *stationRepo) GetHistory(stationID string, hours int) ([]HistoryPoint, error) {
	var points []HistoryPoint
	err := r.db.Select(&points, `
		SELECT recorded_at, aqi, pm25, co
		FROM sensor_readings
		WHERE station_id = $1
		  AND recorded_at >= NOW() - $2::TEXT::INTERVAL
		ORDER BY recorded_at ASC`,
		stationID, fmt.Sprintf("%d hours", hours))
	if err != nil {
		return nil, err
	}
	return points, nil
}

func (r *stationRepo) InsertReading(data SensorReading) error {
	_, err := r.db.Exec(`
		INSERT INTO sensor_readings (
			station_id, device_id,
			pm25, pm10, co, o3, no2, co2,
			pm25_after, pm10_after,
			aqi, aqi_level, critical_pollutant,
			aqi_pm25, aqi_pm10, aqi_co, aqi_o3, aqi_no2
		) VALUES (
			$1,  $2,
			$3,  $4,  $5,  $6,  $7,  $8,
			$9,  $10,
			$11, $12, $13,
			$14, $15, $16, $17, $18
		)`,
		data.StationID, data.DeviceID,
		data.PM25, data.PM10, data.CO, data.O3, data.NO2, data.CO2,
		data.PM25After, data.PM10After,
		data.AQI, data.AQILevel, data.CriticalPollutant,
		data.AQIPM25, data.AQIPM10, data.AQICO, data.AQIO3, data.AQINO2)
	return err
}
