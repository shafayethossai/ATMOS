package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Version     string
	ServiceName string
	HttpPort    int
	SecretKey   string

	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string

	ConnectionString string
}

var configuration *Config

func loadConfig() {
	err := godotenv.Load()
	if err != nil {
		if _, ok := err.(*os.PathError); !ok {
			fmt.Println("Warning Error loading .env file:", err)
		} else {
			fmt.Println("Info: .env file not found (OK for production, using environment variables)")
		}
	}

	// Application configuration
	version := os.Getenv("VERSION")
	if version == "" {
		fmt.Println("Version is required!")
		os.Exit(1)
	}

	serviceName := os.Getenv("SERVICENAME")
	if serviceName == "" {
		fmt.Println("Service Name is required!")
		os.Exit(1)
	}

	httpPortStr := os.Getenv("HTTPPORT")
	if httpPortStr == "" {
		fmt.Println("HTTP Port is required!")
		os.Exit(1)
	}

	httpPort, err := strconv.Atoi(httpPortStr)
	if err != nil {
		println("Failed to convert HTTPPORT to INT!", err)
		os.Exit(1)
	}

	secretKey := os.Getenv("SECRETKEY")
	if secretKey == "" {
		fmt.Println("Secret Key is required!")
		os.Exit(1)
	}

	// Database Neon
	ConnectionString := os.Getenv("DB_STRING")
	if ConnectionString == "" {
		fmt.Println("DB_STRING is required!")
		os.Exit(1)
	}

	// Load Google OAuth config
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	if googleClientID == "" {
		fmt.Println("GOOGLE_CLIENT_ID is Required!")
		os.Exit(1)
	}

	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	if googleClientSecret == "" {
		fmt.Println("GOOGLE_CLIENT_SECRET is Required!")
		os.Exit(1)
	}

	googleRedirectURL := os.Getenv("GOOGLE_REDIRECT_URL")
	if googleRedirectURL == "" {
		fmt.Println("GOOGLE_REDIRECT_URL is Required!")
		os.Exit(1)
	}

	configuration = &Config{
		Version:            version,
		ServiceName:        serviceName,
		HttpPort:           httpPort,
		SecretKey:          secretKey,
		ConnectionString:   ConnectionString,
		GoogleClientID:     googleClientID,
		GoogleClientSecret: googleClientSecret,
		GoogleRedirectURL:  googleRedirectURL,
	}
}

func GetConfig() *Config {
	if configuration == nil {
		loadConfig()
	}
	return configuration
}
