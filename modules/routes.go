package modules

import (
	"apimq/middlewares"
	"apimq/modules/apikey"
	"apimq/modules/auth"
	"apimq/modules/dashboard"
	"apimq/modules/example"
	"apimq/modules/queue"
	"apimq/modules/setting"
	"apimq/modules/whitelist"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")

	// /api
	example.RegisterRoutes(api)

	// /api/auth
	auth.RegisterPublicRoutes(api.Group("/auth"))
	auth.RegisterProtectedRoutes(api.Group("/auth", middlewares.UseToken))

	// /api/setting (protected)
	setting.RegisterRoutes(api.Group("/setting", middlewares.UseToken))

	// /api/queue (protected)
	queue.RegisterRoutes(api.Group("/queue", middlewares.UseToken))
	queue.RegisterPublicRoutes(app.Group("/queue", middlewares.UseWhitelist, middlewares.UseApiKey))

	// /api/dashboard (protected)
	dashboard.RegisterRoutes(api.Group("/dashboard", middlewares.UseToken))

	// /api/whitelist (protected)
	whitelist.RegisterRoutes(api.Group("/whitelist", middlewares.UseToken))

	// /api/apikey (protected)
	apikey.RegisterRoutes(api.Group("/apikey", middlewares.UseToken))
}
