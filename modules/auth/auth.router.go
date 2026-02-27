package auth

import (
	"apimq/middlewares"

	"github.com/gofiber/fiber/v2"
)

func RegisterPublicRoutes(r fiber.Router) {
	r.Post("/login", Login)
	r.Post("/logout", Logout)
}

func RegisterProtectedRoutes(r fiber.Router) {
	r.Get("/validate", middlewares.UseToken, Validate)
}
