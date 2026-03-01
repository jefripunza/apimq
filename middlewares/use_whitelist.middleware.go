package middlewares

import (
	"apimq/dto"
	"apimq/variable"
	"net"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type whitelistEntry struct {
	Type  string `gorm:"column:type"`
	Value string `gorm:"column:value"`
}

func UseWhitelist(c *fiber.Ctx) error {
	// Check if whitelist has any entries; if empty, allow all
	var count int64
	variable.Db.Table("whitelists").Count(&count)
	if count == 0 {
		return c.Next()
	}

	// Load all whitelist entries
	entries := make([]whitelistEntry, 0)
	if err := variable.Db.Table("whitelists").Select("type, value").Find(&entries).Error; err != nil {
		return c.Next() // fail open if DB error
	}

	// Get client IP
	clientIP := c.IP()
	// Also check X-Forwarded-For
	if forwarded := c.Get("X-Forwarded-For"); forwarded != "" {
		clientIP = strings.TrimSpace(strings.Split(forwarded, ",")[0])
	}
	// Also check X-Real-IP
	if realIP := c.Get("X-Real-IP"); realIP != "" {
		clientIP = strings.TrimSpace(realIP)
	}

	// Get request host/origin
	origin := c.Get("Origin")
	host := c.Hostname()

	for _, entry := range entries {
		switch entry.Type {
		case "ip":
			if matchIP(clientIP, entry.Value) {
				return c.Next()
			}
		case "domain":
			if matchDomain(host, origin, entry.Value) {
				return c.Next()
			}
		}
	}

	return dto.Forbidden(c, "Access denied: IP/domain not whitelisted", nil)
}

func matchIP(clientIP, whitelistValue string) bool {
	// Exact match
	if clientIP == whitelistValue {
		return true
	}
	// CIDR match
	if strings.Contains(whitelistValue, "/") {
		_, cidr, err := net.ParseCIDR(whitelistValue)
		if err == nil {
			ip := net.ParseIP(clientIP)
			if ip != nil && cidr.Contains(ip) {
				return true
			}
		}
	}
	return false
}

func matchDomain(host, origin, whitelistValue string) bool {
	wl := strings.ToLower(whitelistValue)
	if strings.ToLower(host) == wl {
		return true
	}
	if origin != "" && strings.Contains(strings.ToLower(origin), wl) {
		return true
	}
	return false
}
