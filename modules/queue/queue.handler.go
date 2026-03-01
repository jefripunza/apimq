package queue

import (
	"apimq/dto"
	"apimq/variable"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
)

type CreateQueueRequest struct {
	Name          string                 `json:"name"`
	Key           string                 `json:"key"`
	Color         string                 `json:"color"`
	Origin        string                 `json:"origin"`
	BatchCount    int                    `json:"batchCount"`
	Timeout       int                    `json:"timeout"`
	Headers       []map[string]string    `json:"headers"`
	IsSendNow     bool                   `json:"isSendNow"`
	SendLaterTime *string                `json:"sendLaterTime,omitempty"`
	IsRandomDelay bool                   `json:"isRandomDelay"`
	DelaySec      int                    `json:"delaySec"`
	DelayStart    int                    `json:"delayStart"`
	DelayEnd      int                    `json:"delayEnd"`
	ErrorTrace    map[string]interface{} `json:"errorTrace,omitempty"`
}

type UpdateQueueRequest struct {
	Name          string                 `json:"name"`
	Color         string                 `json:"color"`
	Origin        string                 `json:"origin"`
	BatchCount    int                    `json:"batchCount"`
	Timeout       int                    `json:"timeout"`
	Headers       []map[string]string    `json:"headers"`
	IsSendNow     bool                   `json:"isSendNow"`
	SendLaterTime *string                `json:"sendLaterTime,omitempty"`
	IsRandomDelay bool                   `json:"isRandomDelay"`
	DelaySec      int                    `json:"delaySec"`
	DelayStart    int                    `json:"delayStart"`
	DelayEnd      int                    `json:"delayEnd"`
	ErrorTrace    map[string]interface{} `json:"errorTrace,omitempty"`
}

type ToggleQueueRequest struct {
	Enabled bool `json:"enabled"`
}

// Create - POST /api/queue
func Create(c *fiber.Ctx) error {
	var req CreateQueueRequest
	if err := c.BodyParser(&req); err != nil {
		return dto.BadRequest(c, "Invalid request body", nil)
	}

	if req.Name == "" {
		return dto.BadRequest(c, "Name is required", nil)
	}
	if req.Key == "" {
		return dto.BadRequest(c, "Key is required", nil)
	}
	if req.Origin == "" {
		return dto.BadRequest(c, "Origin is required", nil)
	}

	// Check if key already exists
	var existing Queue
	if err := variable.Db.Where("key = ?", req.Key).First(&existing).Error; err == nil {
		return dto.BadRequest(c, fmt.Sprintf("Queue with key '%s' already exists", req.Key), nil)
	}

	// Marshal JSON fields
	headersJSON, _ := json.Marshal(req.Headers)
	errorTraceJSON, _ := json.Marshal(req.ErrorTrace)

	// Parse send later time if provided
	var sendLaterTime *time.Time
	if req.SendLaterTime != nil && *req.SendLaterTime != "" {
		parsed, err := time.Parse(time.RFC3339, *req.SendLaterTime)
		if err == nil {
			sendLaterTime = &parsed
		}
	}

	queue := Queue{
		Name:          req.Name,
		Key:           req.Key,
		Color:         req.Color,
		Origin:        req.Origin,
		BatchCount:    req.BatchCount,
		Timeout:       req.Timeout,
		Headers:       string(headersJSON),
		IsSendNow:     req.IsSendNow,
		SendLaterTime: sendLaterTime,
		IsRandomDelay: req.IsRandomDelay,
		DelaySec:      req.DelaySec,
		DelayStart:    req.DelayStart,
		DelayEnd:      req.DelayEnd,
		ErrorTrace:    string(errorTraceJSON),
		Enabled:       true,
	}

	if req.BatchCount == 0 {
		queue.BatchCount = 1
	}
	if req.Timeout <= 0 {
		queue.Timeout = 30
	}
	if req.Color == "" {
		queue.Color = "#6366f1"
	}

	if err := variable.Db.Create(&queue).Error; err != nil {
		return dto.InternalServerError(c, "Failed to create queue", nil)
	}

	return dto.OK(c, "Queue created successfully", nil)
}

// GetAll - GET /api/queue
func GetAll(c *fiber.Ctx) error {
	queues := make([]Queue, 0)
	if err := variable.Db.Order("created_at DESC").Find(&queues).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get queues", nil)
	}

	type messageCountRow struct {
		QueueID string `gorm:"column:queue_id"`
		Status  string `gorm:"column:status"`
		Count   int64  `gorm:"column:count"`
	}

	counts := make([]messageCountRow, 0)
	if err := variable.Db.
		Table("queue_messages").
		Select("queue_id, status, COUNT(*) as count").
		Group("queue_id, status").
		Scan(&counts).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get queue message counts", nil)
	}

	// Build maps for each status
	pendingByQueueID := make(map[string]int64)
	completedByQueueID := make(map[string]int64)
	failedByQueueID := make(map[string]int64)
	for _, row := range counts {
		switch row.Status {
		case QueueMessageStatusPending:
			pendingByQueueID[row.QueueID] = row.Count
		case QueueMessageStatusCompleted:
			completedByQueueID[row.QueueID] = row.Count
		case QueueMessageStatusFailed:
			failedByQueueID[row.QueueID] = row.Count
		}
	}

	for i := range queues {
		qid := queues[i].ID.String()
		queues[i].Messages = pendingByQueueID[qid]
		queues[i].CompletedCount = completedByQueueID[qid]
		queues[i].FailedCount = failedByQueueID[qid]
	}

	return dto.OK(c, "Queues retrieved successfully", queues)
}

// GetByKey - GET /api/queue/:key
func GetByKey(c *fiber.Ctx) error {
	key := c.Params("key")
	if key == "" {
		return dto.BadRequest(c, "Key is required", nil)
	}

	var queue Queue
	if err := variable.Db.Where("key = ?", key).First(&queue).Error; err != nil {
		return dto.NotFound(c, "Queue not found", nil)
	}

	return dto.OK(c, "Queue retrieved successfully", queue)
}

// Update - PUT /api/queue/:key
func Update(c *fiber.Ctx) error {
	key := c.Params("key")
	if key == "" {
		return dto.BadRequest(c, "Key is required", nil)
	}

	var queue Queue
	if err := variable.Db.Where("key = ?", key).First(&queue).Error; err != nil {
		return dto.NotFound(c, "Queue not found", nil)
	}

	var req UpdateQueueRequest
	if err := c.BodyParser(&req); err != nil {
		return dto.BadRequest(c, "Invalid request body", nil)
	}

	if req.Name == "" {
		return dto.BadRequest(c, "Name is required", nil)
	}
	if req.Origin == "" {
		return dto.BadRequest(c, "Origin is required", nil)
	}

	// Marshal JSON fields
	headersJSON, _ := json.Marshal(req.Headers)
	errorTraceJSON, _ := json.Marshal(req.ErrorTrace)

	// Parse send later time if provided
	var sendLaterTime *time.Time
	if req.SendLaterTime != nil && *req.SendLaterTime != "" {
		parsed, err := time.Parse(time.RFC3339, *req.SendLaterTime)
		if err == nil {
			sendLaterTime = &parsed
		}
	}

	queue.Name = req.Name
	queue.Color = req.Color
	queue.Origin = req.Origin
	queue.BatchCount = req.BatchCount
	queue.Timeout = req.Timeout
	queue.Headers = string(headersJSON)
	queue.IsSendNow = req.IsSendNow
	queue.SendLaterTime = sendLaterTime
	queue.IsRandomDelay = req.IsRandomDelay
	queue.DelaySec = req.DelaySec
	queue.DelayStart = req.DelayStart
	queue.DelayEnd = req.DelayEnd
	queue.ErrorTrace = string(errorTraceJSON)

	if req.BatchCount == 0 {
		queue.BatchCount = 1
	}
	if req.Timeout <= 0 {
		queue.Timeout = 30
	}
	if req.Color == "" {
		queue.Color = "#6366f1"
	}

	if err := variable.Db.Save(&queue).Error; err != nil {
		return dto.InternalServerError(c, "Failed to update queue", nil)
	}

	return dto.OK(c, "Queue updated successfully", nil)
}

// Delete - DELETE /api/queue/:key
func Delete(c *fiber.Ctx) error {
	key := c.Params("key")
	if key == "" {
		return dto.BadRequest(c, "Key is required", nil)
	}

	var queue Queue
	if err := variable.Db.Where("key = ?", key).First(&queue).Error; err != nil {
		return dto.NotFound(c, "Queue not found", nil)
	}

	if err := variable.Db.Delete(&queue).Error; err != nil {
		return dto.InternalServerError(c, "Failed to delete queue", nil)
	}

	return dto.OK(c, "Queue deleted successfully", nil)
}

// PatchToggle - PATCH /api/queue/:key/toggle
func PatchToggle(c *fiber.Ctx) error {
	key := c.Params("key")
	if key == "" {
		return dto.BadRequest(c, "Key is required", nil)
	}

	var queue Queue
	if err := variable.Db.Where("key = ?", key).First(&queue).Error; err != nil {
		return dto.NotFound(c, "Queue not found", nil)
	}

	var req ToggleQueueRequest
	if err := c.BodyParser(&req); err != nil {
		return dto.BadRequest(c, "Invalid request body", nil)
	}

	queue.Enabled = req.Enabled

	if err := variable.Db.Save(&queue).Error; err != nil {
		return dto.InternalServerError(c, "Failed to toggle queue", nil)
	}

	return dto.OK(c, "Queue toggled successfully", queue)
}

// ---------------------------------------------------- //

type AddToMessageRequest struct {
	Key     string  `json:"key"`
	Method  string  `json:"method"`
	Query   *string `json:"query,omitempty"`
	Body    string  `json:"body"`
	Headers *string `json:"headers,omitempty"`
}

func AddToMessage(c *fiber.Ctx) error {
	var req AddToMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return dto.BadRequest(c, "Invalid request body", nil)
	}

	if req.Key == "" {
		return dto.BadRequest(c, "Key is required", nil)
	}
	if req.Method == "" {
		return dto.BadRequest(c, "Method is required", nil)
	}
	if req.Body == "" {
		return dto.BadRequest(c, "Body is required", nil)
	}

	var queue Queue
	if err := variable.Db.Where("key = ?", req.Key).First(&queue).Error; err != nil {
		return dto.NotFound(c, "Queue not found", nil)
	}

	message := QueueMessage{
		QueueID: queue.ID.String(),
		Method:  req.Method,
		Query:   req.Query,
		Body:    req.Body,
		Headers: req.Headers,
		Status:  QueueMessageStatusPending,
	}
	if err := variable.Db.Create(&message).Error; err != nil {
		return dto.InternalServerError(c, "Failed to add message to queue", nil)
	}

	return dto.OK(c, "Message added to queue successfully", nil)
}

// GetFailedMessages - GET /api/queue/:key/errors
func GetFailedMessages(c *fiber.Ctx) error {
	key := c.Params("key")
	if key == "" {
		return dto.BadRequest(c, "Key is required", nil)
	}

	var queue Queue
	if err := variable.Db.Where("key = ?", key).First(&queue).Error; err != nil {
		return dto.NotFound(c, "Queue not found", nil)
	}

	messages := make([]QueueMessage, 0)
	if err := variable.Db.
		Where("queue_id = ? AND status = ?", queue.ID.String(), QueueMessageStatusFailed).
		Order("created_at DESC").
		Find(&messages).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get failed messages", nil)
	}

	return dto.OK(c, "Failed messages retrieved successfully", messages)
}

// RetryMessage - PUT /api/queue/message/:id/retry
func RetryMessage(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return dto.BadRequest(c, "Message ID is required", nil)
	}

	var message QueueMessage
	if err := variable.Db.Where("id = ?", id).First(&message).Error; err != nil {
		return dto.NotFound(c, "Message not found", nil)
	}

	if message.Status != QueueMessageStatusFailed {
		return dto.BadRequest(c, "Only failed messages can be retried", nil)
	}

	// Reset status to pending and clear error
	message.Status = QueueMessageStatusPending
	message.ErrorMessage = nil
	message.Response = nil

	if err := variable.Db.Save(&message).Error; err != nil {
		return dto.InternalServerError(c, "Failed to retry message", nil)
	}

	return dto.OK(c, "Message queued for retry", message)
}

// UpdateMessage - PUT /api/queue/message/:id
type UpdateMessageRequest struct {
	Method  string  `json:"method"`
	Query   *string `json:"query,omitempty"`
	Body    string  `json:"body"`
	Headers *string `json:"headers,omitempty"`
}

func UpdateMessage(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return dto.BadRequest(c, "Message ID is required", nil)
	}

	var message QueueMessage
	if err := variable.Db.Where("id = ?", id).First(&message).Error; err != nil {
		return dto.NotFound(c, "Message not found", nil)
	}

	var req UpdateMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return dto.BadRequest(c, "Invalid request body", nil)
	}

	if req.Method != "" {
		message.Method = req.Method
	}
	message.Query = req.Query
	message.Body = req.Body
	message.Headers = req.Headers

	if err := variable.Db.Save(&message).Error; err != nil {
		return dto.InternalServerError(c, "Failed to update message", nil)
	}

	return dto.OK(c, "Message updated successfully", message)
}
