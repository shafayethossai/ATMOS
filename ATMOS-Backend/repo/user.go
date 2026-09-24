package repo

import (
	"time"

	"github.com/jmoiron/sqlx"
)

type User struct {
	ID           string    `db:"id"`
	Name         string    `db:"name"`
	Email        string    `db:"email"`
	PasswordHash string    `db:"password_hash"`
	Location     string    `db:"location"`
	AvatarURL    string    `db:"avatar_url"`
	CreatedAt    time.Time `db:"created_at"`
	UpdatedAt    time.Time `db:"updated_at"`
}

type OTPToken struct {
	ID          string    `db:"id"`
	Email       string    `db:"email"`
	Code        string    `db:"code"`
	Type        string    `db:"type"`
	PendingName string    `db:"pending_name"`
	PendingHash string    `db:"pending_hash"`
	ExpiresAt   time.Time `db:"expires_at"`
	Used        bool      `db:"used"`
	CreatedAt   time.Time `db:"created_at"`
}

type ResetToken struct {
	ID        string    `db:"id"`
	UserID    string    `db:"user_id"`
	Token     string    `db:"token"`
	ExpiresAt time.Time `db:"expires_at"`
	Used      bool      `db:"used"`
	CreatedAt time.Time `db:"created_at"`
}

type UserRepo interface {
	FindByEmail(email string) (*User, error)
	FindByID(id string) (*User, error)
	CreateUser(name, email, hash string) (*User, error)
	UpdatePassword(userID, newHash string) error
	UpdateProfile(userID, name, location string) error
	UpdateAvatar(userID, url string) error

	SaveSignupOTP(email, code, name, hash string, expiresAt time.Time) error
	GetSignupOTP(email, code string) (*OTPToken, error)
	MarkOTPUsed(otpID string) error
	DeleteOldOTPs(email, otpType string) error

	SaveResetOTP(email, code string, expiresAt time.Time) error
	GetResetOTP(email, code string) (*OTPToken, error)

	SaveResetToken(userID, token string, expiresAt time.Time) error
	GetResetToken(token string) (*ResetToken, error)
	MarkResetTokenUsed(tokenID string) error
}

type userRepo struct {
	db *sqlx.DB
}

func NewUserRepo(db *sqlx.DB) UserRepo {
	return &userRepo{db: db}
}

func (r *userRepo) FindByEmail(email string) (*User, error) {
	var u User
	err := r.db.Get(&u, `SELECT * FROM users WHERE email = $1`, email)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepo) FindByID(id string) (*User, error) {
	var u User
	err := r.db.Get(&u, `SELECT * FROM users WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepo) CreateUser(name, email, hash string) (*User, error) {
	var u User
	err := r.db.Get(&u, `
		INSERT INTO users (name, email, password_hash)
		VALUES ($1, $2, $3)
		RETURNING *`,
		name, email, hash)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepo) UpdatePassword(userID, newHash string) error {
	_, err := r.db.Exec(`
		UPDATE users SET password_hash = $1, updated_at = NOW()
		WHERE id = $2`,
		newHash, userID)
	return err
}

func (r *userRepo) UpdateProfile(userID, name, location string) error {
	_, err := r.db.Exec(`
		UPDATE users SET name = $1, location = $2, updated_at = NOW()
		WHERE id = $3`,
		name, location, userID)
	return err
}

func (r *userRepo) UpdateAvatar(userID, url string) error {
	_, err := r.db.Exec(`
		UPDATE users SET avatar_url = $1, updated_at = NOW()
		WHERE id = $2`,
		url, userID)
	return err
}

func (r *userRepo) SaveSignupOTP(email, code, name, hash string, expiresAt time.Time) error {
	_, err := r.db.Exec(`
		INSERT INTO otp_tokens (email, code, type, pending_name, pending_hash, expires_at)
		VALUES ($1, $2, 'signup', $3, $4, $5)`,
		email, code, name, hash, expiresAt)
	return err
}

func (r *userRepo) GetSignupOTP(email, code string) (*OTPToken, error) {
	var t OTPToken
	err := r.db.Get(&t, `
		SELECT * FROM otp_tokens
		WHERE email = $1 AND code = $2 AND type = 'signup'
		  AND used = FALSE AND expires_at > NOW()
		ORDER BY created_at DESC LIMIT 1`,
		email, code)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *userRepo) MarkOTPUsed(otpID string) error {
	_, err := r.db.Exec(`UPDATE otp_tokens SET used = TRUE WHERE id = $1`, otpID)
	return err
}

func (r *userRepo) DeleteOldOTPs(email, otpType string) error {
	_, err := r.db.Exec(`DELETE FROM otp_tokens WHERE email = $1 AND type = $2`, email, otpType)
	return err
}

func (r *userRepo) SaveResetOTP(email, code string, expiresAt time.Time) error {
	_, err := r.db.Exec(`
		INSERT INTO otp_tokens (email, code, type, expires_at)
		VALUES ($1, $2, 'reset', $3)`,
		email, code, expiresAt)
	return err
}

func (r *userRepo) GetResetOTP(email, code string) (*OTPToken, error) {
	var t OTPToken
	err := r.db.Get(&t, `
		SELECT * FROM otp_tokens
		WHERE email = $1 AND code = $2 AND type = 'reset'
		  AND used = FALSE AND expires_at > NOW()
		ORDER BY created_at DESC LIMIT 1`,
		email, code)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *userRepo) SaveResetToken(userID, token string, expiresAt time.Time) error {
	_, err := r.db.Exec(`
		INSERT INTO reset_tokens (user_id, token, expires_at)
		VALUES ($1, $2, $3)`,
		userID, token, expiresAt)
	return err
}

func (r *userRepo) GetResetToken(token string) (*ResetToken, error) {
	var t ResetToken
	err := r.db.Get(&t, `
		SELECT * FROM reset_tokens
		WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
		token)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *userRepo) MarkResetTokenUsed(tokenID string) error {
	_, err := r.db.Exec(`UPDATE reset_tokens SET used = TRUE WHERE id = $1`, tokenID)
	return err
}
