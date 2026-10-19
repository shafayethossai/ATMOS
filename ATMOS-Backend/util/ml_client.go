package util

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type MLReadingPayload struct {
	DeviceID        string  `json:"device_id"`
	Location        string  `json:"location"`
	ObservedAt      string  `json:"observed_at"`
	PM25            float64 `json:"pm2_5"`
	PM10            float64 `json:"pm10"`
	CarbonMonoxide  float64 `json:"carbon_monoxide"`
	NitrogenDioxide float64 `json:"nitrogen_dioxide"`
	SulphurDioxide  float64 `json:"sulphur_dioxide"`
	Ozone           float64 `json:"ozone"`
}

type MLClient struct {
	baseURL    string
	sensorKey  string
	readKey    string
	httpClient *http.Client
}

func NewMLClient(baseURL, sensorKey, readKey string) *MLClient {
	return &MLClient{
		baseURL:    baseURL,
		sensorKey:  sensorKey,
		readKey:    readKey,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *MLClient) ForwardReading(payload MLReadingPayload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost,
		c.baseURL+"/api/v1/readings", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", c.sensorKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("ml api %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

func (c *MLClient) FetchHourly(deviceID, mlStation string) (json.RawMessage, error) {
	url := fmt.Sprintf("%s/api/v1/forecast/hourly?device_id=%s&location=%s",
		c.baseURL, deviceID, mlStation)
	return c.get(url, c.readKey)
}

func (c *MLClient) FetchDaily(deviceID, mlStation string, days int) (json.RawMessage, error) {
	url := fmt.Sprintf("%s/api/v1/forecast/daily?device_id=%s&location=%s&days=%d",
		c.baseURL, deviceID, mlStation, days)
	return c.get(url, c.readKey)
}

func (c *MLClient) get(url, apiKey string) (json.RawMessage, error) {
	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-API-Key", apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("ml api %d: %s", resp.StatusCode, string(b))
	}
	return json.RawMessage(b), nil
}
