package socket

import (
	"apimq/modules/queue"
	"apimq/variable"
	"log"
	"time"

	"github.com/doquangtan/socketio/v4"
)

type liveStats struct {
	TotalQueues    int64          `json:"total_queues"`
	TotalMessages  int64          `json:"total_messages"`
	TotalCompleted int64          `json:"total_completed"`
	TotalFailed    int64          `json:"total_failed"`
	TotalTiming    int64          `json:"total_timing"`
	TotalPending   int64          `json:"total_pending"`
	Queue          map[string]int `json:"queue"`
}

func fetchLiveStats() liveStats {
	var s liveStats
	variable.Db.Table("queues").Count(&s.TotalQueues)
	variable.Db.Table("queue_messages").Count(&s.TotalMessages)
	variable.Db.Table("queue_messages").Where("status = ?", "completed").Count(&s.TotalCompleted)
	variable.Db.Table("queue_messages").Where("status = ? AND is_ack = false", "failed").Count(&s.TotalFailed)
	variable.Db.Table("queue_messages").Where("status = ?", "timing").Count(&s.TotalTiming)
	variable.Db.Table("queue_messages").Where("status = ?", "pending").Count(&s.TotalPending)
	// Get per-queue insert counts since last fetch (and reset)
	s.Queue = queue.GetAndResetQueueInsertCounts()
	return s
}

func Init(io *socketio.Io) {
	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			stats := fetchLiveStats()
			io.To("live_data").Emit("live_data", stats)
		}
	}()

	io.OnConnection(func(socket *socketio.Socket) {
		log.Println("[socket] client connected:", socket.Id)
		log.Printf("✅ Websocket: User %s connected", socket.Id)

		// Client joins update_queue room to receive queue stats updates
		socket.On("join_update_queue", func(event *socketio.EventPayload) {
			socket.Join("update_queue")
			log.Println("[socket] client joined room: update_queue")
		})

		// Client leaves update_queue room
		socket.On("leave_update_queue", func(event *socketio.EventPayload) {
			socket.Leave("update_queue")
			log.Println("[socket] client left room: update_queue")
		})

		// Client joins update_log room to receive new log entries
		socket.On("join_update_log", func(event *socketio.EventPayload) {
			socket.Join("update_log")
			log.Println("[socket] client joined room: update_log")
		})

		// Client joins live_data room to receive real-time dashboard stats
		socket.On("join_live_data", func(event *socketio.EventPayload) {
			socket.Join("live_data")
			log.Println("[socket] client joined room: live_data")
			// Push current stats immediately on join
			stats := fetchLiveStats()
			socket.Emit("live_data", stats)
		})

		// Client leaves live_data room
		socket.On("leave_live_data", func(event *socketio.EventPayload) {
			socket.Leave("live_data")
			log.Println("[socket] client left room: live_data")
		})

		// Client leaves update_log room
		socket.On("leave_update_log", func(event *socketio.EventPayload) {
			socket.Leave("update_log")
			log.Println("[socket] client left room: update_log")
		})

		socket.On("disconnect", func(event *socketio.EventPayload) {
			log.Println("[socket] client disconnected:", socket.Id)
			log.Printf("🛸 Websocket: User %s disconnected", socket.Id)
		})
	})
}
