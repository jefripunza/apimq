package modules

import (
	"apimq/modules/apikey"
	"apimq/modules/queue"
	"apimq/modules/setting"
	"apimq/modules/whitelist"

	"gorm.io/gorm"
)

func Models() []interface{} {
	return []interface{}{
		&setting.Setting{},
		&queue.Queue{},
		&queue.QueueMessage{},
		&queue.QueueLog{},
		&whitelist.Whitelist{},
		&apikey.ApiKey{},
	}
}

func SeedAll(db *gorm.DB) {
	setting.Seed(db)
}
