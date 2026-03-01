package queue

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(r fiber.Router) {
	r.Post("/create", Create)
	r.Get("/all", GetAll)
	r.Get("/one/:id", GetByID)
	r.Get("/by-key/:key", GetByKey)
	r.Put("/edit/:id", UpdateByID)
	r.Delete("/remove/:id", DeleteByID)
	r.Patch("/toggle/:id", PatchToggleByID)
	r.Get("/errors/:id", GetFailedMessagesByID)
	r.Get("/logs", GetLogs)
	r.Put("/message/:id/retry", RetryMessage)
	r.Put("/message/:id/ack", AckMessage)
	r.Put("/message/:id", UpdateMessage)
}

func RegisterPublicRoutes(app *fiber.App) {
	app.Post("/queue", AddToMessage)
}
