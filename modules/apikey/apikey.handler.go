package apikey

import (
	"apimq/dto"
	"apimq/function"
	"apimq/variable"
	"time"

	"github.com/gofiber/fiber/v2"
)

func GetAll(c *fiber.Ctx) error {
	keys := make([]ApiKey, 0)
	if err := variable.Db.Order("created_at DESC").Find(&keys).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get API keys", nil)
	}
	return dto.OK(c, "API keys retrieved successfully", keys)
}

func Create(c *fiber.Ctx) error {
	var body struct {
		Name      string  `json:"name" validate:"required"`
		ExpiresAt *string `json:"expires_at,omitempty"` // RFC3339
	}
	if err := function.RequestBody(c, &body); err != nil {
		return dto.BadRequest(c, err.Error(), nil)
	}

	entry := ApiKey{
		Name: body.Name,
	}

	if body.ExpiresAt != nil && *body.ExpiresAt != "" {
		parsed, err := time.Parse(time.RFC3339, *body.ExpiresAt)
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

	var body struct {
		IsActive bool `json:"is_active"`
	}
	if err := function.RequestBody(c, &body); err != nil {
		return dto.BadRequest(c, err.Error(), nil)
	}

	var entry ApiKey
	if err := variable.Db.Where("id = ?", id).First(&entry).Error; err != nil {
		return dto.NotFound(c, "API key not found", nil)
	}

	entry.IsActive = body.IsActive
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
