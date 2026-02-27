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

		// // Client sends "join_station" with stationId to subscribe to sensor updates
		// socket.On("join_station", func(event *socketio.EventPayload) {
		// 	if len(event.Data) == 0 || event.Data[0] == nil {
		// 		return
		// 	}

		// 	// Parse stationId from event data
		// 	raw, _ := json.Marshal(event.Data[0])
		// 	stationId := ""
		// 	_ = json.Unmarshal(raw, &stationId)
		// 	if stationId == "" {
		// 		return
		// 	}

		// 	if _, err := uuid.Parse(stationId); err != nil {
		// 		return
		// 	}

		// 	room := "station:" + stationId
		// 	socket.Join(room)
		// 	log.Println("[socket] client joined room:", room)

		// 	// Load sensors from DB and emit to the client
		// 	var sensors []sensor.Sensor
		// 	if err := variable.Db.Where("station_id = ?", stationId).Order("created_at desc").Find(&sensors).Error; err != nil {
		// 		log.Println("[socket] error loading sensors:", err)
		// 		return
		// 	}
		// 	socket.Emit("sensors:list", sensors)
		// })

		// // Client sends "leave_station" to unsubscribe
		// socket.On("leave_station", func(event *socketio.EventPayload) {
		// 	if len(event.Data) == 0 || event.Data[0] == nil {
		// 		return
		// 	}
		// 	raw, _ := json.Marshal(event.Data[0])
		// 	stationId := ""
		// 	_ = json.Unmarshal(raw, &stationId)
		// 	if stationId == "" {
		// 		return
		// 	}
		// 	room := "station:" + stationId
		// 	socket.Leave(room)
		// 	log.Println("[socket] client left room:", room)
		// })

		socket.On("disconnect", func(event *socketio.EventPayload) {
			log.Println("[socket] client disconnected:", socket.Id)
			log.Printf("🛸 Websocket: User %s disconnected", socket.Id)
		})
	})
}
