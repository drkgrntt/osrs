package database

import (
	"context"
	"fmt"
	"log"

	"github.com/drkgrntt/osrs/go-api/utils"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	mongoDB *mongo.Database
)

func ConnectDB(config *utils.Config) {
	var err error

	fmt.Println("Connecting using the following URI: " + config.MongoUri)

	// Set client options
	clientOptions := options.Client().ApplyURI(config.MongoUri)

	if err = clientOptions.Validate(); err != nil {
		log.Fatal(err)
	}

	// Connect to MongoDB
	client, err := mongo.Connect(context.TODO(), clientOptions)

	if err != nil {
		log.Fatal(err)
	}

	// Check the connection
	err = client.Ping(context.TODO(), nil)

	if err != nil {
		log.Fatal("Failed to connect to the Mongo Database: ", err.Error())
	}

	mongoDB = client.Database("osrs-wiki")
	fmt.Println("? Connected Successfully to the Mongo Database")
}

func GetDatabase() *mongo.Database {
	return mongoDB
}
