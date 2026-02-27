package environment

import (
	"os"
	"strings"
)

func GetDatabaseEnv() (string, string, string, string, string, string) {
	provider := strings.ToLower(os.Getenv("DATABASE_PROVIDER"))
	host := os.Getenv("DATABASE_HOST")
	port := os.Getenv("DATABASE_PORT")
	user := os.Getenv("DATABASE_USER")
	pass := os.Getenv("DATABASE_PASS")
	dbName := os.Getenv("DATABASE_NAME")

	return provider, host, port, user, pass, dbName
}
