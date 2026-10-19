-- +migrate Up

CREATE TABLE forecast_hourly_cache (
    id         BIGSERIAL    PRIMARY KEY,
    device_id  VARCHAR(50)  NOT NULL,
    ml_station VARCHAR(100) NOT NULL,
    fetched_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    payload    JSONB        NOT NULL
);

CREATE TABLE forecast_daily_cache (
    id         BIGSERIAL    PRIMARY KEY,
    device_id  VARCHAR(50)  NOT NULL,
    ml_station VARCHAR(100) NOT NULL,
    fetched_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    payload    JSONB        NOT NULL
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin   BOOLEAN      DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ml_station VARCHAR(100) DEFAULT 'Dhaka';

CREATE INDEX idx_forecast_hourly_device ON forecast_hourly_cache (device_id, ml_station, fetched_at DESC);
CREATE INDEX idx_forecast_daily_device  ON forecast_daily_cache  (device_id, ml_station, fetched_at DESC);

-- +migrate Down

DROP INDEX IF EXISTS idx_forecast_daily_device;
DROP INDEX IF EXISTS idx_forecast_hourly_device;
DROP TABLE IF EXISTS forecast_daily_cache;
DROP TABLE IF EXISTS forecast_hourly_cache;
ALTER TABLE users DROP COLUMN IF EXISTS ml_station;
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
