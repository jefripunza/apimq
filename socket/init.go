package socket

import (
	"log"
	"time"

	"github.com/doquangtan/socketio/v4"
)

func Init(io *socketio.Io) {
	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			// _ = io.Emit("info:system", payload)
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
