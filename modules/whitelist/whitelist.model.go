package whitelist

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Whitelist struct {
	ID        uuid.UUID `json:"id" gorm:"type:char(36);primaryKey"`
	Type      string    `json:"type" gorm:"not null"`            // "ip" or "domain"
	Value     string    `json:"value" gorm:"uniqueIndex;not null"` // IP address or domain
	Label     *string   `json:"label,omitempty" gorm:"default:null"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (w *Whitelist) BeforeCreate(tx *gorm.DB) error {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	return nil
}
