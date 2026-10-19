package util

import "strings"

// stationToMLStation maps backend station IDs to the nearest ML monitoring station.
var stationToMLStation = map[string]string{
	"UITS-01": "Tungi",
	"DMP-02":  "Dhaka",
	"GUL-03":  "Dhaka",
	"MOT-04":  "Paltan",
}

func StationToMLStation(stationID string) string {
	if s, ok := stationToMLStation[stationID]; ok {
		return s
	}
	return "Dhaka"
}

// areaToMLStation maps Dhaka neighbourhood names to the nearest ML monitoring station.
var areaToMLStation = map[string]string{
	// North / East Dhaka → Dhaka station
	"bashundhara": "Dhaka", "uttara": "Dhaka", "gulshan": "Dhaka",
	"banani": "Dhaka", "baridhara": "Dhaka", "badda": "Dhaka",
	"khilkhet": "Dhaka", "rampura": "Dhaka", "khilgaon": "Dhaka",
	// West / Central → Dhaka station
	"mirpur": "Dhaka", "dhanmondi": "Dhaka", "mohammadpur": "Dhaka",
	"shyamoli": "Dhaka", "adabor": "Dhaka", "kafrul": "Dhaka", "agargaon": "Dhaka",
	// South Dhaka → Azimpur station
	"azimpur": "Azimpur", "lalbagh": "Azimpur", "old dhaka": "Azimpur",
	"sutrapur": "Azimpur", "wari": "Azimpur",
	// Central → Paltan station
	"paltan": "Paltan", "motijheel": "Paltan", "shahbagh": "Paltan",
	"ramna": "Paltan", "segunbagicha": "Paltan",
	// Industrial / North → Tungi station
	"tongi": "Tungi", "gazipur": "Tungi", "ashulia": "Tungi", "savar": "Tungi",
}

// AreaToMLStation converts a user-entered neighbourhood name to the nearest ML station.
// Falls back to "Dhaka" for unknown areas.
func AreaToMLStation(area string) string {
	s := strings.ToLower(strings.TrimSpace(area))
	if station, ok := areaToMLStation[s]; ok {
		return station
	}
	return "Dhaka"
}
