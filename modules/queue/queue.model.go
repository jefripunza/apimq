package queue

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Queue struct {
	ID           uuid.UUID `json:"id" gorm:"type:char(36);primaryKey"`
	Name         string    `json:"name" gorm:"not null"`
	Key          string    `json:"key" gorm:"uniqueIndex;not null"`
	Color        string    `json:"color" gorm:"default:#6366f1"`
	Enabled      bool      `json:"enabled" gorm:"default:true"`
	Origin       string    `json:"origin" gorm:"not null"`
	BatchCount   int       `json:"batch_count" gorm:"default:1"`
	Headers      string    `json:"headers" gorm:"type:text"` // JSON string
	Schema       string    `json:"schema"`                   // "", "delay", "timing"
	SchemaConfig string    `json:"schema_config" gorm:"type:text"` // JSON string
	ErrorTrace   string    `json:"error_trace" gorm:"type:text"`   // JSON string
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (q *Queue) BeforeCreate(tx *gorm.DB) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return nil
}
