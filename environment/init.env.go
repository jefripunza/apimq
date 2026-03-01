package environment

import (
	"log"

	"github.com/joho/godotenv"
)

func init() {
	// load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println(".env file not found")
	} else {
		log.Println("✅ .env file loaded")
	}
}
