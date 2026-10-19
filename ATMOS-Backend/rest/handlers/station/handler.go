package station

import (
	"backend/config"
	"backend/repo"
	"backend/rest/middlewares"
	"backend/util"
)

type Handler struct {
	cnf          *config.Config
	stationRepo  repo.StationRepo
	forecastRepo repo.ForecastRepo
	userRepo     repo.UserRepo
	mlClient     *util.MLClient
	middlewares  *middlewares.Middlware
}

func NewHandler(
	cnf *config.Config,
	stationRepo repo.StationRepo,
	forecastRepo repo.ForecastRepo,
	userRepo repo.UserRepo,
	mv *middlewares.Middlware,
	mlClient *util.MLClient,
) *Handler {
	return &Handler{
		cnf:          cnf,
		stationRepo:  stationRepo,
		forecastRepo: forecastRepo,
		userRepo:     userRepo,
		mlClient:     mlClient,
		middlewares:  mv,
	}
}
