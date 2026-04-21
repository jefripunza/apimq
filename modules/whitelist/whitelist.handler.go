package whitelist

import (
	"apimq/dto"
	"apimq/function"
	"apimq/variable"

	"github.com/gofiber/fiber/v2"
)

func GetAll(c *fiber.Ctx) error {
	entries := make([]Whitelist, 0)
	if err := variable.Db.Order("created_at DESC").Find(&entries).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get whitelist entries", nil)
	}
	return dto.OK(c, "Whitelist entries retrieved successfully", entries)
}

func Create(c *fiber.Ctx) error {
	var body struct {
		Type  string  `json:"type" validate:"required"`
		Value string  `json:"value" validate:"required"`
		Label *string `json:"label,omitempty"`
	}
	if err := function.RequestBody(c, &body); err != nil {
		return dto.BadRequest(c, err.Error(), nil)
	}

	if body.Type != "ip" && body.Type != "domain" {
		return dto.BadRequest(c, "Type must be 'ip' or 'domain'", nil)
	}

	// Check if value already exists
	var existing Whitelist
	if err := variable.Db.Where("value = ?", body.Value).First(&existing).Error; err == nil {
		return dto.BadRequest(c, "Entry with this value already exists", nil)
	}

	entry := Whitelist{
		Type:  body.Type,
		Value: body.Value,
		Label: body.Label,
	}
	if err := variable.Db.Create(&entry).Error; err != nil {
		return dto.InternalServerError(c, "Failed to create whitelist entry", nil)
	}

	return dto.OK(c, "Whitelist entry created successfully", entry)
}

func Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return dto.BadRequest(c, "ID is required", nil)
	}

	var entry Whitelist
	if err := variable.Db.Where("id = ?", id).First(&entry).Error; err != nil {
		return dto.NotFound(c, "Whitelist entry not found", nil)
	}

	if err := variable.Db.Delete(&entry).Error; err != nil {
		return dto.InternalServerError(c, "Failed to delete whitelist entry", nil)
	}

	return dto.OK(c, "Whitelist entry deleted successfully", nil)
}
