package database

import (
	"apimq/modules"
	"apimq/variable"
	"log"
	"os"
)

func init() {
	// create dir if not exists
	if _, err := os.Stat("./database"); os.IsNotExist(err) {
		os.Mkdir("./database", 0755)
	}

	var err error
	variable.Db, err = OpenDB()
	if err != nil {
		log.Fatal(err)
	}
	log.Println("✅ Database initialized")

	modules.SeedAll(variable.Db)
	go keepDBAlive()
}
