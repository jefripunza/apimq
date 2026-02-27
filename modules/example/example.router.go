package example

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(r fiber.Router) {
	r.Get("/", HelloWorld)
}
