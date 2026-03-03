package middlewares

import (
	"context"
	"fmt"
	"strings"
	"time"

	"apimq/dto"
	"apimq/environment"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type claimsContextKey string

const ClaimsContextKey claimsContextKey = "claims"

func validateBearerToken(authHeader string) (jwt.MapClaims, string) {
	if authHeader == "" {
		return nil, "Missing authorization header"
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return nil, "Invalid authorization format"
	}

	tok, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return environment.GetJWTSecret(), nil
	})
	if err != nil || tok == nil || !tok.Valid {
		return nil, "Invalid or expired token"
	}

	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return nil, "Invalid token payload"
	}

	now := time.Now().Unix()
	expiredAt, ok := claims["exp"].(float64)
	if !ok {
		return nil, "Invalid token payload"
	}
	if expiredAt < float64(now) {
		return nil, "Token expired"
	}

	return claims, ""
}

func UseToken(c *fiber.Ctx) error {
	claims, errMsg := validateBearerToken(c.Get("Authorization"))
	if errMsg != "" {
		return dto.Unauthorized(c, errMsg, nil)
	}
	ctx := context.WithValue(c.UserContext(), ClaimsContextKey, claims)
	c.SetUserContext(ctx)
	return c.Next()
}
