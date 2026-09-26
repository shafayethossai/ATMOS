package util

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"os"
	"time"
)

func logSMTPError(context string, err error) {
	if err == nil {
		return
	}
	logFile, errFile := os.OpenFile("smtp_errors.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if errFile != nil {
		fmt.Printf("Failed to open error log: %v\n", errFile)
		return
	}
	defer logFile.Close()

	timestamp := time.Now().Format("2006-01-02 15:04:05")
	logFile.WriteString(fmt.Sprintf("[%s] %s - Error: %v\n", timestamp, context, err))
}

type SMTPConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	From     string
}

func NewSMTPConfig() *SMTPConfig {
	password := os.Getenv("SMTP_PASSWORD")
	if password == "" {
		password = os.Getenv("SMTP_PASS")
	}
	return &SMTPConfig{
		Host:     os.Getenv("SMTP_HOST"),
		Port:     os.Getenv("SMTP_PORT"),
		User:     os.Getenv("SMTP_USER"),
		Password: password,
		From:     os.Getenv("SMTP_FROM"),
	}
}

func (s *SMTPConfig) senderEmail() string {
	if s.From != "" {
		return s.From
	}
	return s.User
}

func (s *SMTPConfig) isConfigured() error {
	missing := []string{}
	if s.Host == "" {
		missing = append(missing, "SMTP_HOST")
	}
	if s.Port == "" {
		missing = append(missing, "SMTP_PORT")
	}
	if s.User == "" {
		missing = append(missing, "SMTP_USER")
	}
	if s.Password == "" {
		missing = append(missing, "SMTP_PASSWORD")
	}
	if len(missing) > 0 {
		return fmt.Errorf("SMTP config incomplete - missing: %v", missing)
	}
	return nil
}

func sendMailWithTimeout(addr, host, user, password, from string, recipients []string, message []byte, timeout time.Duration) error {
	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %v", err)
	}
	defer conn.Close()

	if err := conn.SetDeadline(time.Now().Add(timeout)); err != nil {
		return fmt.Errorf("failed to set SMTP deadline: %v", err)
	}

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %v", err)
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{ServerName: host}
		if err := client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("failed to start TLS: %v", err)
		}
	}

	if user != "" && password != "" {
		auth := smtp.PlainAuth("", user, password, host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("failed to authenticate: %v", err)
		}
	}

	if err := client.Mail(from); err != nil {
		return fmt.Errorf("failed to set sender: %v", err)
	}
	for _, recipient := range recipients {
		if err := client.Rcpt(recipient); err != nil {
			return fmt.Errorf("failed to set recipient %s: %v", recipient, err)
		}
	}

	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to open data writer: %v", err)
	}
	if _, err := writer.Write(message); err != nil {
		_ = writer.Close()
		return fmt.Errorf("failed to write email body: %v", err)
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("failed to finalize email: %v", err)
	}

	return nil
}

func (s *SMTPConfig) SendOTPEmail(toEmail, otp string) error {
	if err := s.isConfigured(); err != nil {
		return err
	}

	subject := "Your ATMOS Verification Code"
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    .header { text-align: center; color: #333; }
    .otp-box { background: #f0f0f0; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
    .otp-code { font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 5px; }
    .message { color: #666; text-align: center; }
    .footer { color: #999; font-size: 12px; text-align: center; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>ATMOS — Email Verification</h1></div>
    <div class="message"><p>Your verification code is:</p></div>
    <div class="otp-box"><div class="otp-code">%s</div></div>
    <div class="message">
      <p>This code expires in 10 minutes.</p>
      <p>If you didn't request this, ignore this email.</p>
    </div>
    <div class="footer"><p>&copy; 2026 ATMOS. All rights reserved.</p></div>
  </div>
</body>
</html>`, otp)

	message := []byte(fmt.Sprintf(
		"To: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=\"UTF-8\"\r\n\r\n%s",
		toEmail, subject, htmlBody,
	))

	err := sendMailWithTimeout(s.Host+":"+s.Port, s.Host, s.User, s.Password, s.senderEmail(), []string{toEmail}, message, 15*time.Second)
	if err != nil {
		logSMTPError(fmt.Sprintf("SendOTPEmail to %s", toEmail), err)
	}
	return err
}

func (s *SMTPConfig) SendPasswordResetEmail(toEmail, otp string) error {
	if err := s.isConfigured(); err != nil {
		return err
	}

	subject := "ATMOS Password Reset Code"
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    .header { text-align: center; color: #333; }
    .otp-box { background: #f0f0f0; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
    .otp-code { font-size: 32px; font-weight: bold; color: #e74c3c; letter-spacing: 5px; }
    .message { color: #666; text-align: center; }
    .footer { color: #999; font-size: 12px; text-align: center; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Password Reset Request</h1></div>
    <div class="message"><p>Use this code to reset your password:</p></div>
    <div class="otp-box"><div class="otp-code">%s</div></div>
    <div class="message">
      <p>This code expires in 10 minutes.</p>
      <p>If you didn't request this, contact support immediately.</p>
    </div>
    <div class="footer"><p>&copy; 2026 ATMOS. All rights reserved.</p></div>
  </div>
</body>
</html>`, otp)

	message := []byte(fmt.Sprintf(
		"To: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=\"UTF-8\"\r\n\r\n%s",
		toEmail, subject, htmlBody,
	))

	err := sendMailWithTimeout(s.Host+":"+s.Port, s.Host, s.User, s.Password, s.senderEmail(), []string{toEmail}, message, 15*time.Second)
	if err != nil {
		logSMTPError(fmt.Sprintf("SendPasswordResetEmail to %s", toEmail), err)
	}
	return err
}
