package whitelist

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(r fiber.Router) {
	r.Get("/all", GetAll)
	r.Post("/create", Create)
	r.Delete("/remove/:id", Delete)
}
