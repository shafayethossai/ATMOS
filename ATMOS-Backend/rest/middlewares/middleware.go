package middlewares

import (
	"net/http"

	"backend/config"
)

type Middlware struct {
	cnf *config.Config
}

func NewMiddleware(cnf *config.Config) *Middlware {
	return &Middlware{cnf: cnf}
}

func (m *Middlware) Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// TODO: validate JWT and inject user into context
		next.ServeHTTP(w, r)
	})
}
