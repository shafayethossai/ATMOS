package util

import (
	"log"
	"time"

	"backend/repo"
)

var syncTargets = []struct{ deviceID, mlStation string }{
	{"device1", "Tungi"},
	{"device1", "Dhaka"},
	{"device1", "Paltan"},
	{"device1", "Azimpur"},
}

// StartMLSync starts a background goroutine that fetches forecasts from the ML API
// every 30 minutes and stores them in the forecast cache tables.
func StartMLSync(client *MLClient, forecastRepo repo.ForecastRepo) {
	go func() {
		runSync(client, forecastRepo)
		ticker := time.NewTicker(30 * time.Minute)
		for range ticker.C {
			runSync(client, forecastRepo)
		}
	}()
}

func runSync(client *MLClient, forecastRepo repo.ForecastRepo) {
	for _, t := range syncTargets {
		hourly, err := client.FetchHourly(t.deviceID, t.mlStation)
		if err != nil {
			log.Printf("ml_sync: hourly %s/%s: %v", t.deviceID, t.mlStation, err)
		} else if err := forecastRepo.UpsertHourlyForecast(t.deviceID, t.mlStation, hourly); err != nil {
			log.Printf("ml_sync: store hourly %s/%s: %v", t.deviceID, t.mlStation, err)
		}

		daily, err := client.FetchDaily(t.deviceID, t.mlStation, 30)
		if err != nil {
			log.Printf("ml_sync: daily %s/%s: %v", t.deviceID, t.mlStation, err)
		} else if err := forecastRepo.UpsertDailyForecast(t.deviceID, t.mlStation, daily); err != nil {
			log.Printf("ml_sync: store daily %s/%s: %v", t.deviceID, t.mlStation, err)
		}
	}
	log.Printf("ml_sync: completed at %s", time.Now().Format(time.RFC3339))
}
