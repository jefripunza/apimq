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
	Headers      string    `json:"headers" gorm:"type:text"`       // JSON string
	Schema       string    `json:"schema"`                         // "", "delay", "timing"
	SchemaConfig string    `json:"schema_config" gorm:"type:text"` // JSON string
	ErrorTrace   string    `json:"error_trace" gorm:"type:text"`   // JSON string
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    time.Time `json:"updated_at" gorm:"autoUpdateTime"`
	// metadata
	Messages int64 `json:"messages" gorm:"->;column:messages;-:migration"` // count of messages
}

func (q *Queue) BeforeCreate(tx *gorm.DB) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return nil
}

// ------------------------------------------------------ //

const (
	QueueMessageStatusPending    = "pending"
	QueueMessageStatusProcessing = "processing"
	QueueMessageStatusCompleted  = "completed"
	QueueMessageStatusFailed     = "failed"
)

type QueueMessage struct {
	ID           uuid.UUID `json:"id" gorm:"type:char(36);primaryKey"`
	QueueID      string    `json:"queue_id" gorm:"foreignKey:Queue.ID;not null"`    // foreign key to Queue.ID
	Headers      *string   `json:"headers,omitempty" gorm:"type:text;default:null"` // JSON stringified (extra headers)
	Body         string    `json:"body" gorm:"type:text"`                           // JSON stringified
	Status       string    `json:"status" gorm:"default:pending"`                   // pending, processing, completed, failed
	ErrorMessage *string   `json:"error_message,omitempty" gorm:"type:text;default:null"`
	IsAck        bool      `json:"is_ack" gorm:"default:false"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (q *QueueMessage) BeforeCreate(tx *gorm.DB) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return nil
}
