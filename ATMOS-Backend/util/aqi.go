package util

import "math"

type AQIResult struct {
	AQI               int
	Level             string
	CriticalPollutant string
	SubPM25           int
	SubPM10           int
	SubCO             int
	SubO3             int
	SubNO2            int
}

type aqiBreakpoint struct {
	concentrationLow  float64
	concentrationHigh float64
	indexLow          int
	indexHigh         int
}

var (
	no2Breakpoints = []aqiBreakpoint{
		{0, 53, 0, 50},
		{54, 100, 51, 100},
		{101, 360, 101, 150},
		{361, 649, 151, 200},
		{650, 1249, 201, 300},
		{1250, 2049, 301, 500},
	}
	pm25Breakpoints = []aqiBreakpoint{
		{0, 12.0, 0, 50},
		{12.1, 35.4, 51, 100},
		{35.5, 55.4, 101, 150},
		{55.5, 150.4, 151, 200},
		{150.5, 250.4, 201, 300},
		{250.5, 500.4, 301, 500},
	}
	pm10Breakpoints = []aqiBreakpoint{
		{0, 54, 0, 50},
		{55, 154, 51, 100},
		{155, 254, 101, 150},
		{255, 354, 151, 200},
		{355, 424, 201, 300},
		{425, 604, 301, 500},
	}
	coBreakpoints = []aqiBreakpoint{
		{0, 4.4, 0, 50},
		{4.5, 9.4, 51, 100},
		{9.5, 12.4, 101, 150},
		{12.5, 15.4, 151, 200},
		{15.5, 30.4, 201, 300},
		{30.5, 50.4, 301, 500},
	}
	o3Breakpoints = []aqiBreakpoint{
		{0, 54, 0, 50},
		{55, 70, 51, 100},
		{71, 85, 101, 150},
		{86, 105, 151, 200},
		{106, 200, 201, 300},
		{405, 604, 301, 500},
	}
)

func CalculateAQI(pm25, pm10, coPPM, o3PPB, no2PPB float64) AQIResult {
	result := AQIResult{
		SubPM25: interpolateAQI(truncate(pm25, 1), pm25Breakpoints),
		SubPM10: interpolateAQI(truncate(pm10, 0), pm10Breakpoints),
		SubCO:   interpolateAQI(truncate(coPPM, 1), coBreakpoints),
		SubO3:   interpolateAQI(truncate(o3PPB, 0), o3Breakpoints),
		SubNO2:  interpolateAQI(truncate(no2PPB, 0), no2Breakpoints),
	}

	indices := []struct {
		name  string
		value int
	}{
		{"PM2.5", result.SubPM25},
		{"PM10", result.SubPM10},
		{"CO", result.SubCO},
		{"O3", result.SubO3},
		{"NO2", result.SubNO2},
	}
	for _, index := range indices {
		if index.value > result.AQI {
			result.AQI = index.value
			result.CriticalPollutant = index.name
		}
	}
	result.Level = classifyAQI(result.AQI)
	return result
}

func interpolateAQI(concentration float64, breakpoints []aqiBreakpoint) int {
	if math.IsNaN(concentration) || concentration <= 0 {
		return 0
	}
	for _, breakpoint := range breakpoints {
		if concentration >= breakpoint.concentrationLow && concentration <= breakpoint.concentrationHigh {
			index := float64(breakpoint.indexHigh-breakpoint.indexLow)/
				(breakpoint.concentrationHigh-breakpoint.concentrationLow)*
				(concentration-breakpoint.concentrationLow) + float64(breakpoint.indexLow)
			return int(math.Round(index))
		}
	}
	if concentration > breakpoints[len(breakpoints)-1].concentrationHigh {
		return 500
	}
	return 0
}

func truncate(value float64, decimals int) float64 {
	if math.IsNaN(value) || math.IsInf(value, 0) || value <= 0 {
		return 0
	}
	factor := math.Pow10(decimals)
	return math.Floor(value*factor) / factor
}

func classifyAQI(value int) string {
	switch {
	case value <= 50:
		return "Good"
	case value <= 100:
		return "Moderate"
	case value <= 150:
		return "Sensitive Groups"
	case value <= 200:
		return "Unhealthy"
	case value <= 300:
		return "Very Unhealthy"
	default:
		return "Hazardous"
	}
}

// The analog sensor conversions use nominal 5 V supply and sensor calibration
// curves. Recalibrate the constants for the actual sensor modules and circuit.
// MQ135ToNO2PPB estimates NO₂ concentration from MQ135 sensor voltage.
// MQ135 has cross-sensitivity to NO₂; result is approximate (label as estimated in UI).
func MQ135ToNO2PPB(voltage float64) float64 {
	ratio := nominalResistanceRatio(voltage)
	if ratio == 0 {
		return 0
	}
	ppm := 0.1516 * math.Pow(ratio, -1.179)
	return math.Min(2049.99, ppm*1000)
}

func MQ7ToCOPPM(voltage float64) float64 {
	ratio := nominalResistanceRatio(voltage)
	if ratio == 0 {
		return 0
	}
	return math.Min(999.999, 99.042*math.Pow(ratio, -1.518))
}

func MQ131ToO3PPB(voltage float64) float64 {
	ratio := nominalResistanceRatio(voltage)
	if ratio == 0 {
		return 0
	}
	return math.Min(99999.99, 1000*math.Pow(ratio, -1.5))
}

func MG811ToCO2PPM(voltage float64) float64 {
	if math.IsNaN(voltage) || math.IsInf(voltage, 0) || voltage <= 0 {
		return 0
	}
	// Sensitivity ~0.2 V/decade for MG811 with typical op-amp conditioning circuit.
	// Recalibrate this constant against known CO2 (outdoor air ≈ 420 ppm) if readings drift.
	value := math.Pow(10, (0.45-voltage)/0.2+math.Log10(400))
	if math.IsInf(value, 0) || value > 10000 {
		return 10000
	}
	return value
}

func nominalResistanceRatio(voltage float64) float64 {
	if math.IsNaN(voltage) || math.IsInf(voltage, 0) || voltage <= 0 || voltage >= 5 {
		return 0
	}
	return (5 - voltage) / voltage
}
