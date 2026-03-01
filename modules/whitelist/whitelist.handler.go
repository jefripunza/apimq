package whitelist

import (
	"apimq/dto"
	"apimq/variable"

	"github.com/gofiber/fiber/v2"
)

type CreateWhitelistRequest struct {
	Type  string  `json:"type"`
	Value string  `json:"value"`
	Label *string `json:"label,omitempty"`
}

func GetAll(c *fiber.Ctx) error {
	entries := make([]Whitelist, 0)
	if err := variable.Db.Order("created_at DESC").Find(&entries).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get whitelist entries", nil)
	}
	return dto.OK(c, "Whitelist entries retrieved successfully", entries)
}

func Create(c *fiber.Ctx) error {
	var req CreateWhitelistRequest
	if err := c.BodyParser(&req); err != nil {
		return dto.BadRequest(c, "Invalid request body", nil)
	}

	if req.Type != "ip" && req.Type != "domain" {
		return dto.BadRequest(c, "Type must be 'ip' or 'domain'", nil)
	}
	if req.Value == "" {
		return dto.BadRequest(c, "Value is required", nil)
	}

	// Check if value already exists
	var existing Whitelist
	if err := variable.Db.Where("value = ?", req.Value).First(&existing).Error; err == nil {
		return dto.BadRequest(c, "Entry with this value already exists", nil)
	}

	entry := Whitelist{
		Type:  req.Type,
		Value: req.Value,
		Label: req.Label,
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
