package rest

import (
	"fmt"
	"net/http"
	"os"
	"strconv"

	"backend/config"
	stationhandler "backend/rest/handlers/station"
	userhandler "backend/rest/handlers/user"
	"backend/rest/middlewares"
)

type Server struct {
	cnf            *config.Config
	userHandler    *userhandler.Handler
	stationHandler *stationhandler.Handler
}

func NewServer(
	cnf *config.Config,
	userHandler *userhandler.Handler,
	stationHandler *stationhandler.Handler,
) *Server {
	return &Server{
		cnf:            cnf,
		userHandler:    userHandler,
		stationHandler: stationHandler,
	}
}

func (server *Server) Start() {
	manager := middlewares.NewManager()

	manager.Use(
		middlewares.Cors,
		middlewares.Preflight,
		middlewares.Logger,
	)

	mux := http.NewServeMux()
	wrappedMux := manager.WrapMux(mux)

	server.userHandler.RegisterRoutes(mux, manager)
	server.stationHandler.RegisterRoutes(mux, manager)

	addr := ":" + strconv.Itoa(server.cnf.HttpPort)
	fmt.Println("🚀 Server is running on", addr)
	if err := http.ListenAndServe(addr, wrappedMux); err != nil {
		fmt.Println("❌ Server error:", err)
		os.Exit(1)
	}
}
