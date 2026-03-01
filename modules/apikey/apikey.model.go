package apikey

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ApiKey struct {
	ID        uuid.UUID  `json:"id" gorm:"type:char(36);primaryKey"`
	Name      string     `json:"name" gorm:"not null"`
	Key       string     `json:"key" gorm:"uniqueIndex;not null"`
	IsActive  bool       `json:"is_active" gorm:"default:true"`
	ExpiresAt *time.Time `json:"expires_at,omitempty" gorm:"default:null"`
	LastUsed  *time.Time `json:"last_used,omitempty" gorm:"default:null"`
	CreatedAt time.Time  `json:"created_at" gorm:"autoCreateTime"`
}

func (a *ApiKey) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	if a.Key == "" {
		a.Key = generateKey()
	}
	return nil
}

func generateKey() string {
	b := make([]byte, 32)
	rand.Read(b)
	return "apimq_" + hex.EncodeToString(b)
}
