package queue

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Queue struct {
	ID             uuid.UUID  `json:"id" gorm:"type:char(36);primaryKey"`
	Name           string     `json:"name" gorm:"not null"`
	Key            string     `json:"key" gorm:"uniqueIndex;not null"`
	Color          string     `json:"color" gorm:"default:#6366f1"`
	Origin         string     `json:"origin" gorm:"not null"`
	BatchCount     int        `json:"batch_count" gorm:"default:1"`
	Timeout        int        `json:"timeout" gorm:"default:30"`
	IsSendNow      bool       `json:"is_send_now" gorm:"default:true"`      // if true, send immediately
	SendLaterTime  *time.Time `json:"send_later_time" gorm:"default:null"`  // if is_send_now is false, send at this time (only time-based schema)
	IsUseDelay     bool       `json:"is_use_delay" gorm:"default:true"`     // if is_send_now is true, use delay no hide, if false hide delay fields
	IsRandomDelay  bool       `json:"is_random_delay" gorm:"default:false"` // if true, add random delay
	DelaySec       int        `json:"delay_sec" gorm:"default:0"`           // delay in seconds (only delay-based schema)
	DelayStart     int        `json:"delay_start" gorm:"default:0"`         // start delay in seconds (only delay-based schema)
	DelayEnd       int        `json:"delay_end" gorm:"default:0"`           // end delay in seconds (only delay-based schema)
	IsWaitResponse bool       `json:"is_wait_response" gorm:"default:true"` // if true, wait for response, if false send without waiting for response (direct send without response)
	Headers        string     `json:"headers" gorm:"type:text"`             // JSON string
	Auth           string     `json:"auth" gorm:"type:text"`                // JSON string (method, basic, bearer, api_key)
	ErrorTrace     string     `json:"error_trace" gorm:"type:text"`         // JSON string
	Enabled        bool       `json:"enabled" gorm:"default:true"`
	CreatedAt      time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt      time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	// metadata (computed, not stored)
	Messages       int64 `json:"messages" gorm:"->;column:messages;-:migration"`               // count of pending messages
	CompletedCount int64 `json:"completed_count" gorm:"->;column:completed_count;-:migration"` // count of completed messages
	FailedCount    int64 `json:"failed_count" gorm:"->;column:failed_count;-:migration"`       // count of failed messages
}

func (q *Queue) BeforeCreate(tx *gorm.DB) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return nil
}

// ------------------------------------------------------ //

const (
	QueueMessageStatusTiming     = "timing"
	QueueMessageStatusPending    = "pending"
	QueueMessageStatusProcessing = "processing"
	QueueMessageStatusCompleted  = "completed"
	QueueMessageStatusFailed     = "failed"
)

type QueueMessage struct {
	ID           uuid.UUID `json:"id" gorm:"type:char(36);primaryKey"`
	QueueID      string    `json:"queue_id" gorm:"foreignKey:Queue.ID;not null"` // foreign key to Queue.ID
	Method       string    `json:"method" gorm:"default:POST"`
	Query        string    `json:"query,omitempty" gorm:"type:text;default:null"`   // JSON stringified (query params)
	Headers      string    `json:"headers,omitempty" gorm:"type:text;default:null"` // JSON stringified (extra headers)
	Body         string    `json:"body,omitempty" gorm:"type:text;default:null"`    // JSON stringified
	Status       string    `json:"status" gorm:"default:pending"`                   // timing, pending, processing, completed, failed
	Response     *string   `json:"response,omitempty" gorm:"type:text;default:null"`
	ErrorMessage *string   `json:"error_message,omitempty" gorm:"type:text;default:null"`
	IsAck        bool      `json:"is_ack" gorm:"default:false"`
	ReferenceID  *string   `json:"reference_id,omitempty" gorm:"type:char(36);default:null"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
	ProcessedAt  time.Time `json:"processed_at" gorm:"default:null"`
	FinishedAt   time.Time `json:"finished_at" gorm:"default:null"`
}

func (q *QueueMessage) BeforeCreate(tx *gorm.DB) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return nil
}

// ------------------------------------------------------ //

const (
	QueueLogStatusProcessing = "processing"
	QueueLogStatusCompleted  = "completed"
	QueueLogStatusFailed     = "failed"
)

type QueueLog struct {
	ID           uuid.UUID `json:"id" gorm:"type:char(36);primaryKey"`
	QueueID      string    `json:"queue_id" gorm:"index;not null"`
	QueueKey     string    `json:"queue_key" gorm:"index;not null"`
	QueueName    string    `json:"queue_name" gorm:"not null"`
	MessageID    string    `json:"message_id" gorm:"index;not null"`
	Status       string    `json:"status" gorm:"index;not null"` // processing, completed, failed
	Method       string    `json:"method" gorm:"default:POST"`
	Duration     int64     `json:"duration" gorm:"default:0"` // duration in milliseconds
	ErrorMessage *string   `json:"error_message,omitempty" gorm:"type:text;default:null"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime;index"`
}

func (q *QueueLog) BeforeCreate(tx *gorm.DB) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return nil
}
