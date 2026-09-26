package middlewares

import (
	"backend/config"
)

type Middlware struct {
	cnf *config.Config
}

func NewMiddleware(cnf *config.Config) *Middlware {
	return &Middlware{cnf: cnf}
}
