package modules

import (
	"apimq/modules/queue"
	"apimq/modules/setting"

	"gorm.io/gorm"
)

func Models() []interface{} {
	return []interface{}{
		&setting.Setting{},
		&queue.Queue{},
		&queue.QueueMessage{},
		&queue.QueueLog{},
	}
}

func SeedAll(db *gorm.DB) {
	setting.Seed(db)
}
