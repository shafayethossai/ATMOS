package util

import "testing"

func TestCalculateAQIUsesMaximumSubIndex(t *testing.T) {
	result := CalculateAQI(20, 100, 5, 80, 0)

	if result.AQI != 133 {
		t.Fatalf("AQI = %d, want 133", result.AQI)
	}
	if result.Level != "Sensitive Groups" {
		t.Fatalf("level = %q, want Sensitive Groups", result.Level)
	}
	if result.CriticalPollutant != "O3" {
		t.Fatalf("critical pollutant = %q, want O3", result.CriticalPollutant)
	}
}

func TestCalculateAQITruncatesAndCapsConcentrations(t *testing.T) {
	result := CalculateAQI(12.09, 54.9, 4.49, 54.9, 0)
	if result.SubPM25 != 50 || result.SubPM10 != 50 || result.SubCO != 50 || result.SubO3 != 50 {
		t.Fatalf("sub-indices = (%d, %d, %d, %d), want all 50", result.SubPM25, result.SubPM10, result.SubCO, result.SubO3)
	}

	result = CalculateAQI(501, 0, 0, 0, 0)
	if result.AQI != 500 || result.Level != "Hazardous" {
		t.Fatalf("AQI/level = %d/%q, want 500/Hazardous", result.AQI, result.Level)
	}
}

func TestSensorConversionsHandleInvalidVoltages(t *testing.T) {
	for _, convert := range []func(float64) float64{MQ7ToCOPPM, MQ131ToO3PPB, MG811ToCO2PPM} {
		if value := convert(0); value != 0 {
			t.Fatalf("conversion at zero voltage = %v, want 0", value)
		}
	}
	if value := MQ7ToCOPPM(4.999); value > 999.999 {
		t.Fatalf("CO conversion = %v, exceeds sensor_readings.co precision", value)
	}
	if value := MQ131ToO3PPB(4.999); value > 99999.99 {
		t.Fatalf("O3 conversion = %v, exceeds sensor_readings.o3 precision", value)
	}
}
