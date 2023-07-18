package main

import (
	"log"

	"github.com/drkgrntt/osrs/go-api/controllers"
	"github.com/drkgrntt/osrs/go-api/database"
	"github.com/drkgrntt/osrs/go-api/utils"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var (
	server         *gin.Engine
	ItemController controllers.ItemController
)

func init() {
	config, err := utils.LoadConfig(".")
	if err != nil {
		log.Fatal("? Could not load environment variables", err)
	}

	database.ConnectDB(&config)

	ItemController = controllers.CreateItemController(database.GetDatabase())

	log.Println("Server is running in", config.Environment, "mode")
	if config.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	server = gin.Default()
}

func main() {
	config, err := utils.LoadConfig(".")
	if err != nil {
		log.Fatal("? Could not load environment variables", err)
	}

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	// Allow all origins
	corsConfig.AllowAllOrigins = true

	server.Use(cors.New(corsConfig))

	router := server.Group("/")

	ItemController.LoadItemRoutes(router)

	log.Fatal(server.Run(":" + config.Port))
}
