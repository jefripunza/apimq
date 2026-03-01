package dashboard

import (
	"apimq/dto"
	"apimq/variable"

	"github.com/gofiber/fiber/v2"
)

type DashboardStats struct {
	TotalQueues    int64 `json:"total_queues"`
	TotalMessages  int64 `json:"total_messages"`
	TotalCompleted int64 `json:"total_completed"`
	TotalFailed    int64 `json:"total_failed"`
	TotalTiming    int64 `json:"total_timing"`
	TotalPending   int64 `json:"total_pending"`
}

func GetStats(c *fiber.Ctx) error {
	var stats DashboardStats

	// Total queues
	variable.Db.Table("queues").Count(&stats.TotalQueues)

	// Total messages (all statuses)
	variable.Db.Table("queue_messages").Count(&stats.TotalMessages)

	// Count by status
	variable.Db.Table("queue_messages").Where("status = ?", "completed").Count(&stats.TotalCompleted)
	variable.Db.Table("queue_messages").Where("status = ? AND is_ack = false", "failed").Count(&stats.TotalFailed)
	variable.Db.Table("queue_messages").Where("status = ?", "timing").Count(&stats.TotalTiming)
	variable.Db.Table("queue_messages").Where("status = ?", "pending").Count(&stats.TotalPending)

	return dto.OK(c, "Dashboard stats retrieved successfully", stats)
}
