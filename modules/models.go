package modules

import (
	"apimq/modules/setting"

	"gorm.io/gorm"
)

func Models() []interface{} {
	return []interface{}{
		&setting.Setting{},
	}
}

func SeedAll(db *gorm.DB) {
	setting.Seed(db)
}
