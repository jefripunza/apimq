package database

import (
	"apimq/modules"
	"apimq/variable"
	"log"
)

func init() {
	var err error
	variable.Db, err = OpenDB()
	if err != nil {
		log.Fatal(err)
	}
	log.Println("✅ Database initialized")

	modules.SeedAll(variable.Db)
	go keepDBAlive()
}
