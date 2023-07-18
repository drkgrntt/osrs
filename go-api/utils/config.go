package utils

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Environment string `mapstructure:"ENVIRONMENT"`
	MongoUri    string `mapstructure:"MONGO_URI"`
	Port        string `mapstructure:"PORT"`
}

var ConfigInstance Config

func LoadConfig(path string) (config Config, err error) {
	if err = godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file:", err)
	}

	config = Config{
		Environment: os.Getenv("ENVIRONMENT"),
		MongoUri:    os.Getenv("MONGO_URI"),
		Port:        os.Getenv("PORT"),
	}

	ConfigInstance = config
	return
}

func GetConfig() Config {
	return ConfigInstance
}
