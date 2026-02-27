package setting

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Setting struct {
	ID    uuid.UUID `json:"id" gorm:"type:char(36);primaryKey"`
	Key   string    `json:"key" gorm:"uniqueIndex"`
	Value string    `json:"value" gorm:"type:text"`
}

func (s *Setting) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

type Access struct {
	ID       uuid.UUID `json:"id" gorm:"type:char(36);primaryKey"`
	IP       string    `json:"ip"`
	Country  string    `json:"country"`
	AccessAt time.Time `json:"access_at" gorm:"autoCreateTime"`
}

func (a *Access) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
