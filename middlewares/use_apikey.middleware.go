package middlewares

import (
	"apimq/dto"
	"apimq/variable"
	"time"

	"github.com/gofiber/fiber/v2"
)

type apiKeyRow struct {
	ID        string     `gorm:"column:id"`
	Key       string     `gorm:"column:key"`
	IsActive  bool       `gorm:"column:is_active"`
	ExpiresAt *time.Time `gorm:"column:expires_at"`
}

func UseApiKey(c *fiber.Ctx) error {
	// Check if any API keys exist; if none, allow all (no keys configured)
	var count int64
	variable.Db.Table("api_keys").Count(&count)
	if count == 0 {
		return c.Next()
	}

	// Get API key from header
	key := c.Get("X-API-Key")
	if key == "" {
		// Also check query param
		key = c.Query("api_key")
	}
	if key == "" {
		return dto.Unauthorized(c, "API key is required", nil)
	}

	// Look up the key
	var entry apiKeyRow
	if err := variable.Db.Table("api_keys").
		Where("key = ?", key).
		First(&entry).Error; err != nil {
		return dto.Unauthorized(c, "Invalid API key", nil)
	}

	if !entry.IsActive {
		return dto.Forbidden(c, "API key is disabled", nil)
	}

	if entry.ExpiresAt != nil && entry.ExpiresAt.Before(time.Now()) {
		return dto.Forbidden(c, "API key has expired", nil)
	}

	// Update last_used timestamp
	now := time.Now()
	variable.Db.Table("api_keys").Where("id = ?", entry.ID).Update("last_used", now)

	return c.Next()
}
