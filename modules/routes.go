package modules

import (
	"apimq/middlewares"
	"apimq/modules/auth"
	"apimq/modules/example"
	"apimq/modules/queue"
	"apimq/modules/setting"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App, api fiber.Router) {
	// /api
	example.RegisterRoutes(api)

	// /api/auth
	authApi := api.Group("/auth")
	auth.RegisterPublicRoutes(authApi)
	auth.RegisterProtectedRoutes(authApi)

	// /api/setting (protected)
	settingProtected := api.Group("/setting", middlewares.UseToken)
	setting.RegisterRoutes(settingProtected)

	// /api/queue (protected)
	queueProtected := api.Group("/queue", middlewares.UseToken)
	queue.RegisterRoutes(queueProtected)
	queue.RegisterPublicRoutes(app)
}
