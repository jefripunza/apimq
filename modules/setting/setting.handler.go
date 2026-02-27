package setting

import (
	"apimq/dto"
	"apimq/variable"
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func All(c *fiber.Ctx) error {
	var settings []Setting
	if err := variable.Db.Find(&settings).Error; err != nil {
		return dto.InternalServerError(c, "Failed to get settings", nil)
	}

	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}

	return dto.OK(c, "Settings retrieved successfully!", result)
}

func Set(c *fiber.Ctx) error {
	// Parse multipart form
	form, err := c.MultipartForm()
	if err != nil {
		// Try JSON body fallback
		var bodies map[string]string
		if err := c.BodyParser(&bodies); err != nil {
			return dto.BadRequest(c, "Invalid request body", nil)
		}
		for key, value := range bodies {
			var s Setting
			if err := variable.Db.Where("key = ?", key).First(&s).Error; err != nil {
				return dto.NotFound(c, "Setting not found", nil)
			}
			oldValue := s.Value
			if key == "auth_password" && value != oldValue {
				hash, err := bcrypt.GenerateFromPassword([]byte(value), 10)
				if err == nil {
					token := string(hash)[1:]
					c.Set("x-new-token", token)
				}
			}
			s.Value = value
			variable.Db.Save(&s)
		}
		return dto.OK(c, "Setting updated successfully!", nil)
	}

	// Handle file uploads
	uploadsPath := variable.UploadsPath
	if form.File != nil {
		for fieldname, files := range form.File {
			if len(files) == 0 {
				continue
			}
			file := files[0]

			var s Setting
			if err := variable.Db.Where("key = ?", fieldname).First(&s).Error; err != nil {
				return dto.NotFound(c, fmt.Sprintf("Setting not found: %s", fieldname), nil)
			}

			// Save file
			filename := file.Filename
			dst := uploadsPath + "/" + filename
			if err := c.SaveFile(file, dst); err != nil {
				return dto.InternalServerError(c, "Failed to save file", nil)
			}

			s.Value = filename
			variable.Db.Save(&s)
		}
	}

	// Handle text fields
	if form.Value != nil {
		for key, values := range form.Value {
			if len(values) == 0 {
				continue
			}
			value := values[0]
			var s Setting
			if err := variable.Db.Where("key = ?", key).First(&s).Error; err != nil {
				continue
			}
			oldValue := s.Value
			if key == "auth_password" && value != oldValue {
				hash, err := bcrypt.GenerateFromPassword([]byte(value), 10)
				if err == nil {
					token := string(hash)[1:]
					c.Set("x-new-token", token)
				}
			}
			s.Value = value
			variable.Db.Save(&s)
		}
	}

	return dto.OK(c, "Setting updated successfully!", nil)
}

func SeedSettings(db *gorm.DB) {
	settings := map[string]string{
		"password": "admin",
	}

	inserts := []string{}
	exists := []string{}
	for key, value := range settings {
		var s Setting
		if err := db.Where("key = ?", key).First(&s).Error; err != nil {
			db.Create(&Setting{Key: key, Value: value})
			inserts = append(inserts, key)
		} else {
			exists = append(exists, key)
		}
	}
	log.Printf("✅ Inserted %d settings!", len(inserts))
	log.Printf("👌 Already exists %d settings!", len(exists))
}
