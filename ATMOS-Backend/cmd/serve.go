package cmd

import (
	"fmt"
	"os"

	"backend/config"
	"backend/infra"
	"backend/repo"
	"backend/rest"
	stationH "backend/rest/handlers/station"
	userH "backend/rest/handlers/user"
	"backend/rest/middlewares"
	"backend/util"
)

func Serve() {
	cnf := config.GetConfig()

	dbCon, err := infra.NewConnection(cnf.ConnectionString)
	if err != nil {
		fmt.Println("Database Connection Error:", err)
		os.Exit(1)
	}

	err = infra.MigrateDB(dbCon, "./migrations/migrations")
	if err != nil {
		fmt.Println("Migration Error:", err)
		os.Exit(1)
	}
	fmt.Println("✅ Database connected and migrated successfully")

	mw := middlewares.NewMiddleware(cnf)

	userRepo := repo.NewUserRepo(dbCon)
	stationRepo := repo.NewStationRepo(dbCon)
	forecastRepo := repo.NewForecastRepo(dbCon)

	var mlClient *util.MLClient
	if cnf.MLApiURL != "" {
		mlClient = util.NewMLClient(cnf.MLApiURL, cnf.MLSensorKey, cnf.MLReadKey)
		util.StartMLSync(mlClient, forecastRepo)
		fmt.Println("✅ ML API integration enabled:", cnf.MLApiURL)
	}

	userHandler := userH.NewHandler(cnf, userRepo, mw, dbCon)
	stationHandler := stationH.NewHandler(cnf, stationRepo, forecastRepo, userRepo, mw, mlClient)

	server := rest.NewServer(
		cnf,
		userHandler,
		stationHandler,
	)
	server.Start()
}
