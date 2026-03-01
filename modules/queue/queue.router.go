package queue

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(r fiber.Router) {
	r.Post("/", Create)
	r.Get("/", GetAll)
	r.Get("/:key", GetByKey)
	r.Put("/:key", Update)
	r.Delete("/:key", Delete)
	r.Patch("/:key/toggle", PatchToggle)
}
