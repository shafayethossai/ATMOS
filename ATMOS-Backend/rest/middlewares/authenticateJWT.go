package middlewares

import (
	"backend/util"
	"context"
	"net/http"
	"strings"
)

func (m *Middlware) AuthenticateJWT(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			util.SendError(w, http.StatusUnauthorized, "Unauthorized: No token provided")
			return
		}

		headerParts := strings.Split(authHeader, " ")
		if len(headerParts) != 2 || headerParts[0] != "Bearer" {
			util.SendError(w, http.StatusUnauthorized, "Unauthorized: No token provided")
			return
		}

		claims, err := util.VerifyJWT(m.cnf.SecretKey, headerParts[1])
		if err != nil {
			util.SendError(w, http.StatusUnauthorized, "Unauthorized: No token provided")
			return
		}
		ctx := context.WithValue(r.Context(), "userID", claims.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
