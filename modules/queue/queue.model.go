package queue

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Queue struct {
	ID            uuid.UUID  `json:"id" gorm:"type:char(36);primaryKey"`
	Name          string     `json:"name" gorm:"not null"`
	Key           string     `json:"key" gorm:"uniqueIndex;not null"`
	Color         string     `json:"color" gorm:"default:#6366f1"`
	Enabled       bool       `json:"enabled" gorm:"default:true"`
	Origin        string     `json:"origin" gorm:"not null"`
	BatchCount    int        `json:"batch_count" gorm:"default:1"`
	Timeout       int        `json:"timeout" gorm:"default:30"`
	Headers       string     `json:"headers" gorm:"type:text"`             // JSON string
	IsSendNow     bool       `json:"is_send_now" gorm:"default:true"`      // if true, send immediately
	SendLaterTime *time.Time `json:"send_later_time" gorm:"default:null"`  // if is_send_now is false, send at this time (only time-based schema)
	IsRandomDelay bool       `json:"is_random_delay" gorm:"default:false"` // if true, add random delay
	DelaySec      int        `json:"delay_sec" gorm:"default:0"`           // delay in seconds (only delay-based schema)
	DelayStart    int        `json:"delay_start" gorm:"default:0"`         // start delay in seconds (only delay-based schema)
	DelayEnd      int        `json:"delay_end" gorm:"default:0"`           // end delay in seconds (only delay-based schema)
	ErrorTrace    string     `json:"error_trace" gorm:"type:text"`         // JSON string
	CreatedAt     time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
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
	QueueID      string    `json:"queue_id" gorm:"foreignKey:Queue.ID;not null"` // foreign key to Queue.ID
	Method       string    `json:"method" gorm:"default:POST"`
	Query        *string   `json:"query,omitempty" gorm:"type:text;default:null"`   // JSON stringified (query params)
	Headers      *string   `json:"headers,omitempty" gorm:"type:text;default:null"` // JSON stringified (extra headers)
	Body         string    `json:"body" gorm:"type:text"`                           // JSON stringified
	Status       string    `json:"status" gorm:"default:pending"`                   // pending, processing, completed, failed
	Response     *string   `json:"response,omitempty" gorm:"type:text;default:null"`
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
