package queue

import (
	"apimq/dto"
	"apimq/variable"
	"encoding/json"
	"fmt"

	"github.com/gofiber/fiber/v2"
)

type CreateQueueRequest struct {
	Name         string                 `json:"name"`
	Key          string                 `json:"key"`
	Color        string                 `json:"color"`
	Origin       string                 `json:"origin"`
	BatchCount   int                    `json:"batchCount"`
	Headers      []map[string]string    `json:"headers"`
	Schema       string                 `json:"schema"`
	SchemaConfig map[string]interface{} `json:"schemaConfig,omitempty"`
	ErrorTrace   map[string]interface{} `json:"errorTrace,omitempty"`
}

type UpdateQueueRequest struct {
	Name         string                 `json:"name"`
	Color        string                 `json:"color"`
	Origin       string                 `json:"origin"`
	BatchCount   int                    `json:"batchCount"`
	Headers      []map[string]string    `json:"headers"`
	Schema       string                 `json:"schema"`
	SchemaConfig map[string]interface{} `json:"schemaConfig,omitempty"`
	ErrorTrace   map[string]interface{} `json:"errorTrace,omitempty"`
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
	schemaConfigJSON, _ := json.Marshal(req.SchemaConfig)
	errorTraceJSON, _ := json.Marshal(req.ErrorTrace)

	queue := Queue{
		Name:         req.Name,
		Key:          req.Key,
		Color:        req.Color,
		Origin:       req.Origin,
		BatchCount:   req.BatchCount,
		Headers:      string(headersJSON),
		Schema:       req.Schema,
		SchemaConfig: string(schemaConfigJSON),
		ErrorTrace:   string(errorTraceJSON),
		Enabled:      true,
	}

	if req.BatchCount == 0 {
		queue.BatchCount = 1
	}
	if req.Color == "" {
		queue.Color = "#6366f1"
	}

	if err := variable.Db.Create(&queue).Error; err != nil {
		return dto.InternalServerError(c, "Failed to create queue", nil)
	}

	return dto.OK(c, "Queue created successfully", queue)
}

// GetAll - GET /api/queue
func GetAll(c *fiber.Ctx) error {
	queues := make([]Queue, 0)
	if err := variable.Db.Order("created_at DESC").Find(&queues).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get queues", nil)
	}

	type messageCountRow struct {
		QueueID string `gorm:"column:queue_id"`
		Count   int64  `gorm:"column:count"`
	}

	counts := make([]messageCountRow, 0)
	if err := variable.Db.
		Table("queue_messages").
		Select("queue_id, COUNT(*) as count").
		Where("status = ?", "pending").
		Group("queue_id").
		Scan(&counts).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get queue message counts", nil)
	}

	countByQueueID := make(map[string]int64, len(counts))
	for _, row := range counts {
		countByQueueID[row.QueueID] = row.Count
	}

	for i := range queues {
		queues[i].Messages = countByQueueID[queues[i].ID.String()]
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
	schemaConfigJSON, _ := json.Marshal(req.SchemaConfig)
	errorTraceJSON, _ := json.Marshal(req.ErrorTrace)

	queue.Name = req.Name
	queue.Color = req.Color
	queue.Origin = req.Origin
	queue.BatchCount = req.BatchCount
	queue.Headers = string(headersJSON)
	queue.Schema = req.Schema
	queue.SchemaConfig = string(schemaConfigJSON)
	queue.ErrorTrace = string(errorTraceJSON)

	if req.BatchCount == 0 {
		queue.BatchCount = 1
	}
	if req.Color == "" {
		queue.Color = "#6366f1"
	}

	if err := variable.Db.Save(&queue).Error; err != nil {
		return dto.InternalServerError(c, "Failed to update queue", nil)
	}

	return dto.OK(c, "Queue updated successfully", queue)
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
		Body:    req.Body,
		Headers: req.Headers,
		Status:  QueueMessageStatusPending,
	}

	if err := variable.Db.Create(&message).Error; err != nil {
		return dto.InternalServerError(c, "Failed to add message to queue", nil)
	}

	return dto.OK(c, "Message added to queue successfully", message)
}
