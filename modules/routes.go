package modules

import (
	"apimq/middlewares"
	"apimq/modules/auth"
	"apimq/modules/example"
	"apimq/modules/setting"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(api fiber.Router) {
	// /api
	example.RegisterRoutes(api)

	// /api/auth
	authApi := api.Group("/auth")
	auth.RegisterPublicRoutes(authApi)
	auth.RegisterProtectedRoutes(authApi)

	// /api/setting (protected)
	settingProtected := api.Group("/setting", middlewares.UseToken)
	setting.RegisterRoutes(settingProtected)
}
