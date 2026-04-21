package function

import (
	"errors"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

var validate = validator.New()

func ValidateStruct(req interface{}) error {
	if err := validate.Struct(req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok && len(validationErrors) > 0 {
			field := validationErrors[0].Field()
			return errors.New(field + " is required")
		}
		return errors.New("Invalid request fields")
	}
	return nil
}

func RequestBody(c *fiber.Ctx, req interface{}) error {
	if err := c.BodyParser(req); err != nil {
		return errors.New("Invalid request body")
	}

	if err := validate.Struct(req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok && len(validationErrors) > 0 {
			// fmt.Printf("Error: %+v\n", validationErrors)
			field := validationErrors[0].Field()
			return errors.New(field + " is required")
		}

		return errors.New("Invalid request fields")
	}

	return nil
}
