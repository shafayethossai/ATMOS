package station

import (
	"backend/config"
	"backend/repo"
	"backend/rest/middlewares"
)

type Handler struct {
	cnf         *config.Config
	stationRepo repo.StationRepo
	middlewares *middlewares.Middlware
}

func NewHandler(cnf *config.Config, stationRepo repo.StationRepo, mv *middlewares.Middlware, db interface{}) *Handler {
	return &Handler{
		cnf:         cnf,
		stationRepo: stationRepo,
		middlewares: mv,
	}
}
