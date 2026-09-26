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
	FrontendURL        string

	ConnectionString string

	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string

	CloudinaryCloudName string
	CloudinaryAPIKey    string
	CloudinaryAPISecret string
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

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		fmt.Println("FRONTEND_URL is required!")
		os.Exit(1)
	}

	// SMTP
	smtpHost := os.Getenv("SMTP_HOST")
	if smtpHost == "" {
		fmt.Println("SMTP_HOST is required!")
		os.Exit(1)
	}

	smtpPort := os.Getenv("SMTP_PORT")
	if smtpPort == "" {
		fmt.Println("SMTP_PORT is required!")
		os.Exit(1)
	}

	smtpUser := os.Getenv("SMTP_USER")
	if smtpUser == "" {
		fmt.Println("SMTP_USER is required!")
		os.Exit(1)
	}

	smtpPassword := os.Getenv("SMTP_PASSWORD")
	if smtpPassword == "" {
		fmt.Println("SMTP_PASSWORD is required!")
		os.Exit(1)
	}

	smtpFrom := os.Getenv("SMTP_FROM")

	cloudinaryCloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	if cloudinaryCloudName == "" {
		fmt.Println("CLOUDINARY_CLOUD_NAME is required!")
		os.Exit(1)
	}

	cloudinaryAPIKey := os.Getenv("CLOUDINARY_API_KEY")
	if cloudinaryAPIKey == "" {
		fmt.Println("CLOUDINARY_API_KEY is required!")
		os.Exit(1)
	}

	cloudinaryAPISecret := os.Getenv("CLOUDINARY_API_SECRET")
	if cloudinaryAPISecret == "" {
		fmt.Println("CLOUDINARY_API_SECRET is required!")
		os.Exit(1)
	}

	configuration = &Config{
		Version:     version,
		ServiceName: serviceName,
		HttpPort:    httpPort,
		SecretKey:   secretKey,

		ConnectionString: ConnectionString,

		GoogleClientID:     googleClientID,
		GoogleClientSecret: googleClientSecret,
		GoogleRedirectURL:  googleRedirectURL,
		FrontendURL:        frontendURL,

		SMTPHost:     smtpHost,
		SMTPPort:     smtpPort,
		SMTPUser:     smtpUser,
		SMTPPassword: smtpPassword,
		SMTPFrom:     smtpFrom,

		CloudinaryCloudName: cloudinaryCloudName,
		CloudinaryAPIKey:    cloudinaryAPIKey,
		CloudinaryAPISecret: cloudinaryAPISecret,
	}
}

func GetConfig() *Config {
	if configuration == nil {
		loadConfig()
	}
	return configuration
}
