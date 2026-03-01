package main

import (
	"apimq/database"
	"apimq/dto"
	"apimq/modules"
	"apimq/socket"
	"apimq/variable"
	"embed"
	"io/fs"
	"log"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/doquangtan/socketio/v4"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

//go:embed dist/*
var embedDist embed.FS

func main() {
	// Initialize database
	database.OpenDB()

	// Ensure uploads directory exists
	os.MkdirAll(variable.UploadsPath, 0755)

	io := socketio.New()
	socket.Init(io)

	app := fiber.New(fiber.Config{
		AppName:       "ApiMQ",
		ServerHeader:  "ApiMQ",
		Prefork:       false,
		StrictRouting: true,
		CaseSensitive: true,
		BodyLimit:     1024 * 1024 * 10, // MB
		Concurrency:   256 * 1024,
	})

	app.Use(cors.New())
	app.Use(helmet.New())
	app.Use(recover.New())

	// Socket.IO (note: with StrictRouting enabled, we must handle both /socket.io and /socket.io/)
	app.Use("/socket.io", io.FiberMiddleware)
	app.Use("/socket.io/", io.FiberMiddleware)
	app.Route("/socket.io", io.FiberRoute)
	app.Route("/socket.io/", io.FiberRoute)

	// Serve embedded frontend (SPA)
	distFS, _ := fs.Sub(embedDist, "dist")
	app.Use(func(c *fiber.Ctx) error {
		path := c.Path()
		// skip API and backend routes
		skips := []string{"/api", "/queue", "/socket.io", "/subscribe", "/icon", "/file", "/upload", "/ws", "/webhook"}
		for _, skip := range skips {
			if strings.HasPrefix(path, skip) {
				return c.Next()
			}
		}
		// try to serve the exact file
		filePath := strings.TrimPrefix(path, "/")
		if filePath == "" {
			filePath = "index.html"
		}
		data, err := fs.ReadFile(distFS, filePath)
		if err != nil {
			// SPA fallback: serve index.html for unknown routes
			data, err = fs.ReadFile(distFS, "index.html")
			if err != nil {
				return fiber.ErrNotFound
			}
			c.Set("Content-Type", "text/html; charset=utf-8")
			return c.Send(data)
		}
		// set content type based on extension
		ext := filepath.Ext(filePath)
		if ct := mime.TypeByExtension(ext); ct != "" {
			c.Set("Content-Type", ct)
		}
		return c.Send(data)
	})
	app.Use(logger.New()) // biarkan disini ...

	// Serve uploaded files with Cross-Origin-Resource-Policy header
	app.Use("/upload", func(c *fiber.Ctx) error {
		c.Set("Cross-Origin-Resource-Policy", "cross-origin")
		return c.Next()
	})
	app.Static("/upload", variable.UploadsPath)

	api := app.Group("/api")
	modules.SetupRoutes(app, api)

	// Catch-all "joke" routes (matching Express behavior)
	jokeRoutes := []string{"/api/route", "/_next", "/_next/server", "/app"}
	for _, route := range jokeRoutes {
		app.Use(route, func(c *fiber.Ctx) error {
			return c.JSON(fiber.Map{"status": "BASTARD", "message": "You are a bastard!"})
		})
	}

	// Global error handler for API
	app.Use(func(c *fiber.Ctx) error {
		return dto.NotFound(c, "endpoint not found", nil)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	log.Fatal(app.Listen(":" + port))
}
