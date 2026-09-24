-- +migrate Up

CREATE TABLE users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    location      VARCHAR(100) DEFAULT '',
    avatar_url    TEXT         DEFAULT '',
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE otp_tokens (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL,
    code          CHAR(6)      NOT NULL,
    type          VARCHAR(20)  NOT NULL CHECK (type IN ('signup', 'reset')),
    pending_name  VARCHAR(100) DEFAULT '',
    pending_hash  VARCHAR(255) DEFAULT '',
    expires_at    TIMESTAMP    NOT NULL,
    used          BOOLEAN      DEFAULT FALSE,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reset_tokens (
    id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT      UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used       BOOLEAN   DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stations (
    id         VARCHAR(20)  PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    location   VARCHAR(100) NOT NULL,
    lat        DECIMAL(9,6) NOT NULL,
    lng        DECIMAL(9,6) NOT NULL,
    active     BOOLEAN      DEFAULT TRUE,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensor_readings (
    id                 BIGSERIAL    PRIMARY KEY,
    station_id         VARCHAR(20)  NOT NULL REFERENCES stations(id),
    device_id          VARCHAR(50)  NOT NULL,
    recorded_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    pm25               DECIMAL(7,2),
    pm10               DECIMAL(7,2),
    co                 DECIMAL(6,3),
    o3                 DECIMAL(7,2),
    no2                DECIMAL(7,2),
    co2                DECIMAL(8,2),
    pm25_after         DECIMAL(7,2),
    pm10_after         DECIMAL(7,2),
    aqi                SMALLINT     NOT NULL,
    aqi_level          VARCHAR(30)  NOT NULL,
    critical_pollutant VARCHAR(10)  NOT NULL,
    aqi_pm25           SMALLINT,
    aqi_pm10           SMALLINT,
    aqi_co             SMALLINT,
    aqi_o3             SMALLINT,
    aqi_no2            SMALLINT
);

CREATE INDEX idx_otp_email_type        ON otp_tokens      (email, type);
CREATE INDEX idx_readings_station_time ON sensor_readings  (station_id, recorded_at DESC);

INSERT INTO stations (id, name, location, lat, lng, active) VALUES
    ('UITS-01', 'UITS Campus', 'Dhaka-1212', 23.810300, 90.412500, TRUE),
    ('DMP-02',  'Dhanmondi',   'Dhaka-1209', 23.746100, 90.374200, TRUE),
    ('GUL-03',  'Gulshan',     'Dhaka-1212', 23.792500, 90.407800, FALSE),
    ('MOT-04',  'Motijheel',   'Dhaka-1000', 23.733700, 90.418100, TRUE)
ON CONFLICT (id) DO NOTHING;

-- +migrate Down

DROP TABLE IF EXISTS sensor_readings;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS reset_tokens;
DROP TABLE IF EXISTS otp_tokens;
DROP TABLE IF EXISTS users;
