package apikey

import (
	"apimq/dto"
	"apimq/variable"
	"time"

	"github.com/gofiber/fiber/v2"
)

type CreateApiKeyRequest struct {
	Name      string  `json:"name"`
	ExpiresAt *string `json:"expires_at,omitempty"` // RFC3339
}

type ToggleApiKeyRequest struct {
	IsActive bool `json:"is_active"`
}

func GetAll(c *fiber.Ctx) error {
	keys := make([]ApiKey, 0)
	if err := variable.Db.Order("created_at DESC").Find(&keys).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get API keys", nil)
	}
	return dto.OK(c, "API keys retrieved successfully", keys)
}

func Create(c *fiber.Ctx) error {
	var req CreateApiKeyRequest
	if err := c.BodyParser(&req); err != nil {
		return dto.BadRequest(c, "Invalid request body", nil)
	}

	if req.Name == "" {
		return dto.BadRequest(c, "Name is required", nil)
	}

	entry := ApiKey{
		Name: req.Name,
	}

	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		parsed, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err == nil {
			entry.ExpiresAt = &parsed
		}
	}

	if err := variable.Db.Create(&entry).Error; err != nil {
		return dto.InternalServerError(c, "Failed to create API key", nil)
	}

	return dto.OK(c, "API key created successfully", entry)
}

func Toggle(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return dto.BadRequest(c, "ID is required", nil)
	}

	var req ToggleApiKeyRequest
	if err := c.BodyParser(&req); err != nil {
		return dto.BadRequest(c, "Invalid request body", nil)
	}

	var entry ApiKey
	if err := variable.Db.Where("id = ?", id).First(&entry).Error; err != nil {
		return dto.NotFound(c, "API key not found", nil)
	}

	entry.IsActive = req.IsActive
	if err := variable.Db.Save(&entry).Error; err != nil {
		return dto.InternalServerError(c, "Failed to update API key", nil)
	}

	return dto.OK(c, "API key updated successfully", entry)
}

func Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return dto.BadRequest(c, "ID is required", nil)
	}

	var entry ApiKey
	if err := variable.Db.Where("id = ?", id).First(&entry).Error; err != nil {
		return dto.NotFound(c, "API key not found", nil)
	}

	if err := variable.Db.Delete(&entry).Error; err != nil {
		return dto.InternalServerError(c, "Failed to delete API key", nil)
	}

	return dto.OK(c, "API key deleted successfully", nil)
}
