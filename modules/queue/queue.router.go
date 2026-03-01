package queue

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(r fiber.Router) {
	r.Post("/create", Create)
	r.Get("/all", GetAll)
	r.Get("/one/:key", GetByKey)
	r.Put("/edit/:key", Update)
	r.Delete("/remove/:key", Delete)
	r.Patch("/toggle/:key", PatchToggle)
	r.Get("/errors/:key", GetFailedMessages)
	r.Put("/message/:id/retry", RetryMessage)
	r.Put("/message/:id", UpdateMessage)
}

func RegisterPublicRoutes(app *fiber.App) {
	app.Post("/queue", AddToMessage)
}
