package repo

import (
	"encoding/json"
	"time"

	"github.com/jmoiron/sqlx"
)

type ForecastCache struct {
	ID        int64           `db:"id"`
	DeviceID  string          `db:"device_id"`
	MLStation string          `db:"ml_station"`
	FetchedAt time.Time       `db:"fetched_at"`
	Payload   json.RawMessage `db:"payload"`
}

type ForecastRepo interface {
	UpsertHourlyForecast(deviceID, mlStation string, payload []byte) error
	UpsertDailyForecast(deviceID, mlStation string, payload []byte) error
	GetLatestHourlyForecast(deviceID, mlStation string) (json.RawMessage, error)
	GetLatestDailyForecast(deviceID, mlStation string) (json.RawMessage, error)
}

type forecastRepo struct {
	db *sqlx.DB
}

func NewForecastRepo(db *sqlx.DB) ForecastRepo {
	return &forecastRepo{db: db}
}

func (r *forecastRepo) UpsertHourlyForecast(deviceID, mlStation string, payload []byte) error {
	_, err := r.db.Exec(`
		INSERT INTO forecast_hourly_cache (device_id, ml_station, payload)
		VALUES ($1, $2, $3)`,
		deviceID, mlStation, payload)
	return err
}

func (r *forecastRepo) UpsertDailyForecast(deviceID, mlStation string, payload []byte) error {
	_, err := r.db.Exec(`
		INSERT INTO forecast_daily_cache (device_id, ml_station, payload)
		VALUES ($1, $2, $3)`,
		deviceID, mlStation, payload)
	return err
}

func (r *forecastRepo) GetLatestHourlyForecast(deviceID, mlStation string) (json.RawMessage, error) {
	var cache ForecastCache
	err := r.db.Get(&cache, `
		SELECT * FROM forecast_hourly_cache
		WHERE device_id = $1 AND ml_station = $2
		ORDER BY fetched_at DESC LIMIT 1`,
		deviceID, mlStation)
	if err != nil {
		return nil, err
	}
	return cache.Payload, nil
}

func (r *forecastRepo) GetLatestDailyForecast(deviceID, mlStation string) (json.RawMessage, error) {
	var cache ForecastCache
	err := r.db.Get(&cache, `
		SELECT * FROM forecast_daily_cache
		WHERE device_id = $1 AND ml_station = $2
		ORDER BY fetched_at DESC LIMIT 1`,
		deviceID, mlStation)
	if err != nil {
		return nil, err
	}
	return cache.Payload, nil
}
