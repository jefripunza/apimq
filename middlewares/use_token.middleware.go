package middlewares

import (
	"fmt"
	"os"
	"strings"
	"time"

	"apimq/dto"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func jwtSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "molinar-logger-secret-key"
	}
	return []byte(secret)
}

func UseToken(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return dto.Unauthorized(c, "Missing authorization header", nil)
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return dto.Unauthorized(c, "Invalid authorization format", nil)
	}

	tok, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return jwtSecret(), nil
	})
	if err != nil || tok == nil || !tok.Valid {
		return dto.Unauthorized(c, "Invalid or expired token", nil)
	}

	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return dto.Unauthorized(c, "Invalid token payload", nil)
	}

	// calculate expired
	now := time.Now().Unix()
	expiredAt, ok := claims["exp"].(float64)
	if !ok {
		return dto.Unauthorized(c, "Invalid token payload", nil)
	}
	if expiredAt < float64(now) {
		return dto.Unauthorized(c, "Token expired", nil)
	}

	return c.Next()
}
