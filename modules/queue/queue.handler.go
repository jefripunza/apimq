package queue

import (
	"apimq/dto"
	"apimq/function"
	"apimq/variable"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type ToggleQueueRequest struct {
	Enabled bool `json:"enabled"`
}

// Create - POST /api/queue
func Create(c *fiber.Ctx) error {
	var body struct {
		Name           string                 `json:"name" validate:"required"`
		Key            string                 `json:"key" validate:"required"`
		Color          string                 `json:"color"`
		Origin         string                 `json:"origin" validate:"required"`
		BatchCount     int                    `json:"batchCount"`
		Timeout        int                    `json:"timeout"`
		Headers        []map[string]string    `json:"headers"`
		IsSendNow      bool                   `json:"isSendNow"`
		SendLaterTime  *string                `json:"sendLaterTime,omitempty"`
		IsUseDelay     bool                   `json:"isUseDelay"`
		IsRandomDelay  bool                   `json:"isRandomDelay"`
		DelaySec       int                    `json:"delaySec"`
		DelayStart     int                    `json:"delayStart"`
		DelayEnd       int                    `json:"delayEnd"`
		IsWaitResponse *bool                  `json:"isWaitResponse,omitempty"`
		Auth           map[string]interface{} `json:"auth,omitempty"`
		ErrorTrace     map[string]interface{} `json:"errorTrace,omitempty"`
	}
	if err := function.RequestBody(c, &body); err != nil {
		return dto.BadRequest(c, err.Error(), nil)
	}

	// Check if key already exists
	var existing Queue
	if err := variable.Db.Where("key = ?", body.Key).First(&existing).Error; err == nil {
		return dto.BadRequest(c, fmt.Sprintf("Queue with key '%s' already exists", body.Key), nil)
	}

	// Marshal JSON fields
	headersJSON, _ := json.Marshal(body.Headers)
	authJSON, _ := json.Marshal(body.Auth)
	errorTraceJSON, _ := json.Marshal(body.ErrorTrace)

	// Parse send later time if provided
	var sendLaterTime *time.Time
	if body.SendLaterTime != nil && *body.SendLaterTime != "" {
		parsed, err := time.Parse(time.RFC3339, *body.SendLaterTime)
		if err == nil {
			sendLaterTime = &parsed
		}
	}

	// Normalize delay fields based on IsUseDelay
	if !body.IsUseDelay {
		body.IsRandomDelay = false
		body.DelaySec = 0
		body.DelayStart = 0
		body.DelayEnd = 0
	}

	isWaitResponse := true
	if body.IsWaitResponse != nil {
		isWaitResponse = *body.IsWaitResponse
	}

	queue := Queue{
		Name:           body.Name,
		Key:            body.Key,
		Color:          body.Color,
		Origin:         body.Origin,
		BatchCount:     body.BatchCount,
		Timeout:        body.Timeout,
		Headers:        string(headersJSON),
		Auth:           string(authJSON),
		IsSendNow:      body.IsSendNow,
		SendLaterTime:  sendLaterTime,
		IsUseDelay:     body.IsUseDelay,
		IsRandomDelay:  body.IsRandomDelay,
		DelaySec:       body.DelaySec,
		DelayStart:     body.DelayStart,
		DelayEnd:       body.DelayEnd,
		IsWaitResponse: isWaitResponse,
		ErrorTrace:     string(errorTraceJSON),
		Enabled:        true,
	}

	if body.BatchCount == 0 {
		queue.BatchCount = 1
	}
	if body.Timeout <= 0 {
		queue.Timeout = 30
	}
	if body.Color == "" {
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
		Where("status IN ?", []string{QueueMessageStatusTiming, QueueMessageStatusPending}).
		Group("queue_id, status").
		Scan(&counts).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get queue message counts", nil)
	}

	// Get completed count (completed + failed but acknowledged)
	type completedCountRow struct {
		QueueID string `gorm:"column:queue_id"`
		Count   int64  `gorm:"column:count"`
	}
	completedCounts := make([]completedCountRow, 0)
	if err := variable.Db.
		Table("queue_messages").
		Select("queue_id, COUNT(*) as count").
		Where("status = ? OR (status = ? AND is_ack = true)", QueueMessageStatusCompleted, QueueMessageStatusFailed).
		Group("queue_id").
		Scan(&completedCounts).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get completed message counts", nil)
	}

	// Get failed count excluding acknowledged messages
	type failedCountRow struct {
		QueueID string `gorm:"column:queue_id"`
		Count   int64  `gorm:"column:count"`
	}
	failedCounts := make([]failedCountRow, 0)
	if err := variable.Db.
		Table("queue_messages").
		Select("queue_id, COUNT(*) as count").
		Where("status = ? AND is_ack = false", QueueMessageStatusFailed).
		Group("queue_id").
		Scan(&failedCounts).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get failed message counts", nil)
	}

	// Build maps for each status
	pendingByQueueID := make(map[string]int64)
	completedByQueueID := make(map[string]int64)
	failedByQueueID := make(map[string]int64)
	for _, row := range counts {
		switch row.Status {
		case QueueMessageStatusTiming:
			pendingByQueueID[row.QueueID] += row.Count
		case QueueMessageStatusPending:
			pendingByQueueID[row.QueueID] += row.Count
		}
	}
	for _, row := range completedCounts {
		completedByQueueID[row.QueueID] = row.Count
	}
	for _, row := range failedCounts {
		failedByQueueID[row.QueueID] = row.Count
	}

	for i := range queues {
		qid := queues[i].ID.String()
		queues[i].Messages = pendingByQueueID[qid]
		queues[i].CompletedCount = completedByQueueID[qid]
		queues[i].FailedCount = failedByQueueID[qid]
	}

	return dto.OK(c, "Queues retrieved successfully", queues)
}

func GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return dto.BadRequest(c, "ID is required", nil)
	}

	var queue Queue
	if err := variable.Db.Where("id = ?", id).First(&queue).Error; err != nil {
		return dto.NotFound(c, "Queue not found", nil)
	}

	return dto.OK(c, "Queue retrieved successfully", queue)
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

func UpdateByID(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return dto.BadRequest(c, "ID is required", nil)
	}

	var queue Queue
	if err := variable.Db.Where("id = ?", id).First(&queue).Error; err != nil {
		return dto.NotFound(c, "Queue not found", nil)
	}

	var req struct {
		Name           string                 `json:"name" validate:"required"`
		Color          string                 `json:"color"`
		Origin         string                 `json:"origin" validate:"required"`
		BatchCount     int                    `json:"batchCount"`
		Timeout        int                    `json:"timeout"`
		Headers        []map[string]string    `json:"headers"`
		IsSendNow      bool                   `json:"isSendNow"`
		SendLaterTime  *string                `json:"sendLaterTime,omitempty"`
		IsUseDelay     bool                   `json:"isUseDelay"`
		IsRandomDelay  bool                   `json:"isRandomDelay"`
		DelaySec       int                    `json:"delaySec"`
		DelayStart     int                    `json:"delayStart"`
		DelayEnd       int                    `json:"delayEnd"`
		IsWaitResponse *bool                  `json:"isWaitResponse,omitempty"`
		Auth           map[string]interface{} `json:"auth,omitempty"`
		ErrorTrace     map[string]interface{} `json:"errorTrace,omitempty"`
	}
	if err := function.RequestBody(c, &req); err != nil {
		return dto.BadRequest(c, err.Error(), nil)
	}

	// Marshal JSON fields
	headersJSON, _ := json.Marshal(req.Headers)
	authJSON, _ := json.Marshal(req.Auth)
	errorTraceJSON, _ := json.Marshal(req.ErrorTrace)

	// Parse send later time if provided
	var sendLaterTime *time.Time
	if req.SendLaterTime != nil && *req.SendLaterTime != "" {
		parsed, err := time.Parse(time.RFC3339, *req.SendLaterTime)
		if err == nil {
			sendLaterTime = &parsed
		}
	}

	// Normalize delay fields based on IsUseDelay
	if !req.IsUseDelay {
		req.IsRandomDelay = false
		req.DelaySec = 0
		req.DelayStart = 0
		req.DelayEnd = 0
	}

	queue.Name = req.Name
	queue.Color = req.Color
	queue.Origin = req.Origin
	queue.BatchCount = req.BatchCount
	queue.Timeout = req.Timeout
	queue.Headers = string(headersJSON)
	queue.Auth = string(authJSON)
	queue.IsSendNow = req.IsSendNow
	queue.SendLaterTime = sendLaterTime
	queue.IsUseDelay = req.IsUseDelay
	queue.IsRandomDelay = req.IsRandomDelay
	queue.DelaySec = req.DelaySec
	queue.DelayStart = req.DelayStart
	queue.DelayEnd = req.DelayEnd
	if req.IsWaitResponse != nil {
		queue.IsWaitResponse = *req.IsWaitResponse
	}
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

func DeleteByID(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return dto.BadRequest(c, "ID is required", nil)
	}

	var queue Queue
	if err := variable.Db.Where("id = ?", id).First(&queue).Error; err != nil {
		return dto.NotFound(c, "Queue not found", nil)
	}

	if err := variable.Db.Delete(&queue).Error; err != nil {
		return dto.InternalServerError(c, "Failed to delete queue", nil)
	}

	return dto.OK(c, "Queue deleted successfully", nil)
}

func PatchToggleByID(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return dto.BadRequest(c, "ID is required", nil)
	}

	var queue Queue
	if err := variable.Db.Where("id = ?", id).First(&queue).Error; err != nil {
		return dto.NotFound(c, "Queue not found", nil)
	}

	var req ToggleQueueRequest
	if err := function.RequestBody(c, &req); err != nil {
		return dto.BadRequest(c, err.Error(), nil)
	}

	queue.Enabled = req.Enabled

	if err := variable.Db.Save(&queue).Error; err != nil {
		return dto.InternalServerError(c, "Failed to toggle queue", nil)
	}

	return dto.OK(c, "Queue toggled successfully", queue)
}

// ---------------------------------------------------- //

// Mutex-protected map to track per-queue message insert counts
var (
	queueInsertCountsMu sync.RWMutex
	queueInsertCounts   = make(map[string]int)
)

// IncrementQueueInsertCount increments the insert count for a queue key
func IncrementQueueInsertCount(queueKey string) {
	queueInsertCountsMu.Lock()
	defer queueInsertCountsMu.Unlock()
	queueInsertCounts[queueKey]++
}

// GetAndResetQueueInsertCounts returns the current counts and resets them to zero
func GetAndResetQueueInsertCounts() map[string]int {
	queueInsertCountsMu.Lock()
	defer queueInsertCountsMu.Unlock()
	result := make(map[string]int, len(queueInsertCounts))
	for k, v := range queueInsertCounts {
		result[k] = v
	}
	// Reset
	queueInsertCounts = make(map[string]int)
	return result
}

func AddToMessage(c *fiber.Ctx) error {
	var body struct {
		Key     string                 `json:"key" validate:"required"`
		Method  string                 `json:"method" validate:"required"`
		Query   *string                `json:"query,omitempty"`
		Body    map[string]interface{} `json:"body" validate:"required"`
		Headers *string                `json:"headers,omitempty"`
	}
	if err := function.RequestBody(c, &body); err != nil {
		return dto.BadRequest(c, err.Error(), nil)
	}

	var queue Queue
	if err := variable.Db.Where("key = ?", body.Key).First(&queue).Error; err != nil {
		return dto.NotFound(c, "Queue not found", nil)
	}

	// Determine initial status based on queue timing config
	initialStatus := QueueMessageStatusPending
	if !queue.IsSendNow && queue.SendLaterTime != nil {
		initialStatus = QueueMessageStatusTiming
	}

	// json stringify body
	bodyJSON, err := json.Marshal(body.Body)
	if err != nil {
		return dto.InternalServerError(c, "Failed to marshal body", nil)
	}

	message := QueueMessage{
		QueueID: queue.ID.String(),
		Method:  body.Method,
		Query:   body.Query,
		Body:    string(bodyJSON),
		Headers: body.Headers,
		Status:  initialStatus,
	}
	if err := variable.Db.Create(&message).Error; err != nil {
		return dto.InternalServerError(c, "Failed to add message to queue", nil)
	}

	// Increment per-queue insert counter for live stats
	IncrementQueueInsertCount(queue.Key)

	return dto.OK(c, "Message added to queue successfully", nil)
}

func GetFailedMessagesByID(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return dto.BadRequest(c, "ID is required", nil)
	}

	var queue Queue
	if err := variable.Db.Where("id = ?", id).First(&queue).Error; err != nil {
		return dto.NotFound(c, "Queue not found", nil)
	}

	messages := make([]QueueMessage, 0)
	if err := variable.Db.
		Where("queue_id = ? AND status = ? AND is_ack = false", queue.ID.String(), QueueMessageStatusFailed).
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

	var newMessage QueueMessage
	err := variable.Db.Transaction(func(tx *gorm.DB) error {
		newMessage = QueueMessage{
			QueueID: message.QueueID,
			Method:  message.Method,
			Query:   message.Query,
			Body:    message.Body,
			Headers: message.Headers,
			Status:  QueueMessageStatusPending,
		}

		if err := tx.Create(&newMessage).Error; err != nil {
			return err
		}

		referenceID := newMessage.ID.String()
		message.IsAck = true
		message.ReferenceID = &referenceID

		if err := tx.Save(&message).Error; err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return dto.InternalServerError(c, "Failed to retry message", nil)
	}

	return dto.OK(c, "Message re-queued successfully", newMessage)
}

// AckMessage - PUT /api/queue/message/:id/ack
func AckMessage(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return dto.BadRequest(c, "Message ID is required", nil)
	}

	var message QueueMessage
	if err := variable.Db.Where("id = ?", id).First(&message).Error; err != nil {
		return dto.NotFound(c, "Message not found", nil)
	}

	if message.Status != QueueMessageStatusFailed {
		return dto.BadRequest(c, "Only failed messages can be acknowledged", nil)
	}

	// Mark as acknowledged
	message.IsAck = true

	if err := variable.Db.Save(&message).Error; err != nil {
		return dto.InternalServerError(c, "Failed to acknowledge message", nil)
	}

	return dto.OK(c, "Message acknowledged successfully", message)
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
	if err := function.RequestBody(c, &req); err != nil {
		return dto.BadRequest(c, err.Error(), nil)
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

// GetLogs - GET /api/queue/logs
// Query params: limit (default 25), cursor (optional, ID for pagination), status (optional filter)
func GetLogs(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 25)
	if limit <= 0 || limit > 100 {
		limit = 25
	}
	cursor := c.Query("cursor", "")
	status := c.Query("status", "")

	query := variable.Db.Model(&QueueLog{}).Order("created_at DESC")

	// Apply cursor-based pagination (fetch logs older than cursor)
	if cursor != "" {
		var cursorLog QueueLog
		if err := variable.Db.Where("id = ?", cursor).First(&cursorLog).Error; err == nil {
			query = query.Where("created_at < ?", cursorLog.CreatedAt)
		}
	}

	// Apply status filter
	if status != "" && (status == QueueLogStatusProcessing || status == QueueLogStatusCompleted || status == QueueLogStatusFailed) {
		query = query.Where("status = ?", status)
	}

	logs := make([]QueueLog, 0)
	if err := query.Limit(limit).Find(&logs).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get logs", nil)
	}

	// Get next cursor (last item's ID if we have a full page)
	var nextCursor string
	if len(logs) == limit {
		nextCursor = logs[len(logs)-1].ID.String()
	}

	return dto.OK(c, "Logs retrieved successfully", fiber.Map{
		"logs":        logs,
		"next_cursor": nextCursor,
	})
}
