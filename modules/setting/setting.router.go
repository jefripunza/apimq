package setting

import (
	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(r fiber.Router) {
	r.Get("/all", All)
	r.Put("/set", Set)
}
