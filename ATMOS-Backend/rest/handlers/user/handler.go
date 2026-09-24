package user

import (
	"backend/config"
	"backend/repo"
	"backend/rest/middlewares"
)

type Handler struct {
	cnf         *config.Config
	userRepo    repo.UserRepo
	middlewares *middlewares.Middlware
}

func NewHandler(cnf *config.Config, userRepo repo.UserRepo, mv *middlewares.Middlware, db interface{}) *Handler {
	return &Handler{
		cnf:         cnf,
		userRepo:    userRepo,
		middlewares: mv,
	}
}
