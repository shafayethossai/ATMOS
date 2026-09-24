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

	userHandler := userH.NewHandler(cnf, userRepo, mw, dbCon)
	stationHandler := stationH.NewHandler(cnf, stationRepo, mw, dbCon)

	server := rest.NewServer(
		cnf,
		userHandler,
		stationHandler,
	)
	server.Start()
}
