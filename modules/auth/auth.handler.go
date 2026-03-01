package auth

import (
	"crypto/md5"
	"fmt"
	"time"

	"apimq/dto"
	"apimq/environment"
	"apimq/modules/setting"
	"apimq/variable"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func GenerateToken() (string, error) {
	claims := jwt.MapClaims{
		"exp": time.Now().Add(24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(environment.GetJWTSecret())
}

func ParseToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return environment.GetJWTSecret(), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

type LoginRequest struct {
	Password string `json:"password"`
}

func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return dto.BadRequest(c, "Invalid request body", nil)
	}

	if req.Password == "" {
		return dto.BadRequest(c, "Password is required", nil)
	}

	var s setting.Setting
	if err := variable.Db.Where("key = ?", "auth_password").First(&s).Error; err != nil {
		return dto.Unauthorized(c, "Invalid password (1)", nil)
	}

	// compare MD5 hash
	hash := fmt.Sprintf("%x", md5.Sum([]byte(req.Password)))
	// fmt.Printf("Req Password: %s | Now Password: %s | Hash: %s\n", req.Password, s.Value, hash)
	if hash != s.Value {
		return dto.Unauthorized(c, "Invalid password (2)", nil)
	}

	token, err := GenerateToken()
	if err != nil {
		return dto.InternalServerError(c, "Failed to generate token", nil)
	}

	return dto.OK(c, "Login success", fiber.Map{
		"token": token,
	})
}

func Logout(c *fiber.Ctx) error {
	// logic revoke
	return dto.OK(c, "Logout success", nil)
}

func Validate(c *fiber.Ctx) error {
	return dto.OK(c, "Token valid", nil)
}
