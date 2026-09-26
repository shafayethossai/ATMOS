package util

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"time"
)

const OTPLength = 6
const OTPValidityTime = 20 * time.Minute

func GenerateOTP() string { // random 6-digit using crypto/rand
	otp := ""

	for i := 0; i < OTPLength; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			num = big.NewInt(int64(i % 10))
		}
		otp += fmt.Sprintf("%d", num.Int64())
	}
	return otp
}
func GetOTPExpiry() time.Time { // time.Now().Add(OTPValidityTime)
	return time.Now().Add(OTPValidityTime)
}
func IsOTPExpired(expiryTime time.Time) bool { // time.Now().After(t)
	return time.Now().After(expiryTime)
}
