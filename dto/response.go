package dto

import "github.com/gofiber/fiber/v2"

type Response struct {
	Status  int         `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Custom
func Custom(c *fiber.Ctx, status int, message string, data interface{}) error {
	return c.Status(status).JSON(Response{
		Status:  status,
		Message: message,
		Data:    data,
	})
}

// 200
func OK(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusOK).JSON(Response{
		Status:  fiber.StatusOK,
		Message: message,
		Data:    data,
	})
}

// 201
func Created(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(Response{
		Status:  fiber.StatusCreated,
		Message: message,
		Data:    data,
	})
}

// 204
func NoContent(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusOK).JSON(Response{
		Status:  fiber.StatusOK,
		Message: message,
		Data:    data,
	})
}

// 400
func BadRequest(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusBadRequest).JSON(Response{
		Status:  fiber.StatusBadRequest,
		Message: message,
		Data:    data,
	})
}

// 401
func Unauthorized(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusUnauthorized).JSON(Response{
		Status:  fiber.StatusUnauthorized,
		Message: message,
		Data:    data,
	})
}

// 403
func Forbidden(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusForbidden).JSON(Response{
		Status:  fiber.StatusForbidden,
		Message: message,
		Data:    data,
	})
}

// 404
func NotFound(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusNotFound).JSON(Response{
		Status:  fiber.StatusNotFound,
		Message: message,
		Data:    data,
	})
}

// 500
func InternalServerError(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusInternalServerError).JSON(Response{
		Status:  fiber.StatusInternalServerError,
		Message: message,
		Data:    data,
	})
}
