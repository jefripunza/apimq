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

	// /api/dashboard (protected)
	dashboardProtected := api.Group("/dashboard", middlewares.UseToken)
	dashboard.RegisterRoutes(dashboardProtected)

	// /api/whitelist (protected)
	whitelistProtected := api.Group("/whitelist", middlewares.UseToken)
	whitelist.RegisterRoutes(whitelistProtected)

	// /api/apikey (protected)
	apikeyProtected := api.Group("/apikey", middlewares.UseToken)
	apikey.RegisterRoutes(apikeyProtected)
}
