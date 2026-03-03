package worker

import (
	"apimq/modules/queue"
	"apimq/variable"
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const debug = false

// ─── worker entry per queue ─────────────────────────────────────────────────

type workerEntry struct {
	cancel  context.CancelFunc
	enabled bool
	mu      sync.Mutex
	wake    chan struct{} // signal to wake up paused/sleeping worker
}

func (w *workerEntry) setEnabled(v bool) {
	w.mu.Lock()
	changed := w.enabled != v
	w.enabled = v
	w.mu.Unlock()
	if changed && v {
		// wake up the worker if it was paused
		select {
		case w.wake <- struct{}{}:
		default:
		}
	}
}

func (w *workerEntry) isEnabled() bool {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.enabled
}

// ─── Manager ────────────────────────────────────────────────────────────────

type Manager struct {
	workers map[string]*workerEntry // keyed by queue ID string
	mu      sync.Mutex
}

func NewManager() *Manager {
	return &Manager{
		workers: make(map[string]*workerEntry),
	}
}

// Start launches the sync loop that reconciles DB queues with active workers.
func (m *Manager) Start() {
	go m.syncLoop()
	go m.timingCheckerLoop()
	log.Println("🚀 Queue worker manager started")
}

func (m *Manager) syncLoop() {
	// initial sync immediately
	log.Println("🔄 Worker sync loop started")
	m.sync()

	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		m.sync()
	}
}

// timingCheckerLoop checks for scheduled queues and converts timing messages to pending when time arrives
func (m *Manager) timingCheckerLoop() {
	log.Println("⏰ Timing checker loop started")
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// Find all queues with IsSendNow=false and SendLaterTime IS NOT NULL
		queues := make([]queue.Queue, 0)
		now := time.Now()
		if err := variable.Db.
			Where("is_send_now = ? AND send_later_time IS NOT NULL", false).
			Find(&queues).Error; err != nil {
			log.Printf("⚠️  Timing checker: failed to fetch scheduled queues: %v", err)
			continue
		}

		// Check each queue's scheduled time manually
		for _, q := range queues {
			if q.SendLaterTime == nil {
				continue
			}

			// Convert SendLaterTime to local timezone first (DB may store in UTC)
			scheduledLocal := q.SendLaterTime.In(now.Location())

			// Extract just the TIME (hour:minute:second) from local time
			scheduledHour := scheduledLocal.Hour()
			scheduledMin := scheduledLocal.Minute()
			scheduledSec := scheduledLocal.Second()

			// Calculate TODAY's target time using the scheduled time in local timezone
			todayTarget := time.Date(
				now.Year(), now.Month(), now.Day(),
				scheduledHour, scheduledMin, scheduledSec, 0,
				now.Location(),
			)

			// If current time is BEFORE today's target, nothing to do yet
			if now.Before(todayTarget) {
				log.Printf("⏰ Queue %s waiting: now=%v, today_target=%v (in %v)",
					q.Key, now.Format("15:04:05"), todayTarget.Format("15:04:05"), todayTarget.Sub(now))
				continue
			}

			// Current time is AT or AFTER today's target - time to execute!
			// Only convert messages that were created AT or BEFORE today's target time
			// Messages created AFTER today's target should wait for tomorrow
			log.Printf("⏰ Queue %s time reached: now=%v, today_target=%v",
				q.Key, now.Format("15:04:05"), todayTarget.Format("15:04:05"))

			// Count how many timing messages exist for debug
			var timingCount int64
			variable.Db.Model(&queue.QueueMessage{}).
				Where("queue_id = ? AND status = ?", q.ID.String(), queue.QueueMessageStatusTiming).
				Count(&timingCount)

			if timingCount > 0 {
				log.Printf("⏰ Queue %s has %d timing messages to check", q.Key, timingCount)
			}

			// Load timing messages and evaluate eligibility in Go to avoid DB timezone edge-cases.
			messages := make([]queue.QueueMessage, 0)
			if err := variable.Db.
				Where("queue_id = ? AND status = ?", q.ID.String(), queue.QueueMessageStatusTiming).
				Find(&messages).Error; err != nil {
				log.Printf("⚠️  Timing checker: failed to load timing messages for queue %s: %v", q.Key, err)
				continue
			}

			eligibleIDs := make([]string, 0)
			for _, msg := range messages {
				createdLocal := msg.CreatedAt.In(now.Location())

				// Each message runs at the next occurrence of scheduled HH:mm:ss
				// after its creation time.
				nextRun := time.Date(
					createdLocal.Year(), createdLocal.Month(), createdLocal.Day(),
					scheduledHour, scheduledMin, scheduledSec, 0,
					now.Location(),
				)
				if createdLocal.After(nextRun) {
					nextRun = nextRun.Add(24 * time.Hour)
				}

				if !now.Before(nextRun) {
					eligibleIDs = append(eligibleIDs, msg.ID.String())
				}
			}

			if len(eligibleIDs) == 0 {
				if timingCount > 0 {
					log.Printf("⏰ Queue %s: no due timing messages yet (total=%d, schedule=%v)",
						q.Key, timingCount, todayTarget.Format("15:04:05"))
				}
				continue
			}

			result := variable.Db.Model(&queue.QueueMessage{}).
				Where("id IN ?", eligibleIDs).
				Update("status", queue.QueueMessageStatusPending)

			if result.Error != nil {
				log.Printf("⚠️  Timing checker: failed to update messages for queue %s: %v", q.Key, result.Error)
			} else if result.RowsAffected > 0 {
				log.Printf("⏰ Timing checker: converted %d timing→pending messages for queue %s",
					result.RowsAffected, q.Key)
			}
		}
	}
}

func (m *Manager) sync() {
	queues := make([]queue.Queue, 0)
	if err := variable.Db.Find(&queues).Error; err != nil {
		log.Printf("⚠️  Worker sync: failed to load queues: %v", err)
		return
	}
	if debug {
		log.Printf("🔄 Worker sync: found %d queues", len(queues))
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// build set of current queue IDs
	activeIDs := make(map[string]bool, len(queues))
	for _, q := range queues {
		id := q.ID.String()
		activeIDs[id] = true

		if entry, exists := m.workers[id]; exists {
			// update enabled state
			prevEnabled := entry.isEnabled()
			entry.setEnabled(q.Enabled)
			if prevEnabled != q.Enabled && debug {
				log.Printf("🧷 Worker sync: queue %s (%s) enabled changed %v -> %v", q.Key, id, prevEnabled, q.Enabled)
			}
		} else {
			// new queue → start worker
			m.startWorker(q)
		}
	}

	// stop workers for deleted queues
	for id, entry := range m.workers {
		if !activeIDs[id] {
			entry.cancel()
			delete(m.workers, id)
			log.Printf("🛑 Worker stopped for deleted queue %s", id)
		}
	}
}

func (m *Manager) startWorker(q queue.Queue) {
	ctx, cancel := context.WithCancel(context.Background())
	entry := &workerEntry{
		cancel:  cancel,
		enabled: q.Enabled,
		wake:    make(chan struct{}, 1),
	}
	m.workers[q.ID.String()] = entry

	go m.runWorker(ctx, entry, q.ID.String(), q.BatchCount)

	if debug {
		log.Printf("▶️  Worker started for queue %s (%s) batchCount=%d enabled=%v origin=%s", q.Key, q.ID.String(), q.BatchCount, q.Enabled, q.Origin)
	}
}

// ─── per-queue worker goroutine ─────────────────────────────────────────────

func (m *Manager) runWorker(ctx context.Context, entry *workerEntry, queueID string, batchCount int) {
	if batchCount < 1 {
		batchCount = 1
	}

	if debug {
		log.Printf("👂 Worker loop running queueID=%s batchCount=%d", queueID, batchCount)
	}

	for {
		select {
		case <-ctx.Done():
			log.Printf("🛑 Worker loop stopped queueID=%s", queueID)
			return
		default:
		}

		// if disabled, wait until enabled or cancelled
		if !entry.isEnabled() {
			log.Printf("⏸️  Worker paused queueID=%s (enabled=false)", queueID)
			select {
			case <-ctx.Done():
				log.Printf("🛑 Worker loop stopped while paused queueID=%s", queueID)
				return
			case <-entry.wake:
				log.Printf("▶️  Worker resumed queueID=%s (enabled=true)", queueID)
				continue
			}
		}

		// fetch pending messages (up to batchCount)
		messages := make([]queue.QueueMessage, 0)
		if err := variable.Db.
			Where("queue_id = ? AND status = ?", queueID, queue.QueueMessageStatusPending).
			Order("created_at ASC").
			Limit(batchCount).
			Find(&messages).Error; err != nil {
			log.Printf("⚠️  Worker %s: failed to fetch messages: %v", queueID, err)
			sleepOrCancel(ctx, 2*time.Second)
			continue
		}

		if debug {
			log.Printf("📥 Worker queueID=%s fetched pending=%d", queueID, len(messages))
		}

		if len(messages) == 0 {
			// no pending messages — sleep then re-check
			sleepOrCancel(ctx, 1*time.Second)
			continue
		}

		// re-read queue config each batch (origin, headers may change)
		var q queue.Queue
		if err := variable.Db.Where("id = ?", queueID).First(&q).Error; err != nil {
			log.Printf("⚠️  Worker %s: queue not found, stopping", queueID)
			return
		}
		if debug {
			log.Printf("⚙️  Worker queueID=%s config key=%s enabled=%v origin=%s", queueID, q.Key, q.Enabled, q.Origin)
		}

		// Compute delay once per batch for logging
		delay := computeQueueDelay(&q)
		if debug {
			log.Printf("⏱️  Queue %s delay config: IsSendNow=%v IsUseDelay=%v IsRandomDelay=%v DelaySec=%d DelayStart=%d DelayEnd=%d → computed=%v",
				q.Key, q.IsSendNow, q.IsUseDelay, q.IsRandomDelay, q.DelaySec, q.DelayStart, q.DelayEnd, delay)
		}

		for _, msg := range messages {
			select {
			case <-ctx.Done():
				log.Printf("🛑 Worker loop stopped queueID=%s", queueID)
				return
			default:
			}

			if !entry.isEnabled() {
				log.Printf("⏸️  Worker paused mid-batch queueID=%s", queueID)
				break // will re-enter the outer loop and pause
			}

			m.processMessage(&q, &msg)

			// Apply delay AFTER processing each message
			delay := computeQueueDelay(&q)
			if delay > 0 {
				sleepOrCancel(ctx, delay)
			}
		}
	}
}

func computeQueueDelay(q *queue.Queue) time.Duration {
	if q == nil {
		return 0
	}

	if !q.IsUseDelay {
		return 0
	}

	// Use new explicit delay fields
	if !q.IsRandomDelay {
		// Fixed delay
		if q.DelaySec <= 0 {
			return 0
		}
		return time.Duration(q.DelaySec) * time.Second
	}

	// Random delay between DelayStart and DelayEnd
	min := q.DelayStart
	max := q.DelayEnd
	if min < 0 {
		min = 0
	}
	if max < min {
		max = min
	}

	sec := min
	if max > min {
		sec = rand.Intn(max-min+1) + min
	}
	if sec <= 0 {
		return 0
	}
	return time.Duration(sec) * time.Second
}

// ─── process a single message ───────────────────────────────────────────────

func (m *Manager) processMessage(q *queue.Queue, msg *queue.QueueMessage) {
	if debug {
		log.Printf(
			"➡️  Processing message id=%s queueKey=%s queueID=%s method=%s status=%s",
			msg.ID.String(),
			q.Key,
			msg.QueueID,
			msg.Method,
			msg.Status,
		)
	}

	// mark as processing
	startTime := time.Now()
	if err := variable.Db.Model(msg).Update("status", queue.QueueMessageStatusProcessing).Error; err != nil {
		log.Printf("⚠️  Failed updating status=processing message id=%s err=%v", msg.ID.String(), err)
	}
	// Log processing status
	createLogAndEmit(q, msg, queue.QueueLogStatusProcessing, 0, nil)

	// build URL (merge origin query + message query)
	origin := strings.TrimSpace(q.Origin)
	parsedURL, err := url.Parse(origin)
	if err != nil {
		errMsg := fmt.Sprintf("invalid origin URL: %v", err)
		log.Printf("❌ Message id=%s invalid origin=%q err=%s", msg.ID.String(), origin, errMsg)
		variable.Db.Model(msg).Updates(map[string]interface{}{
			"status":        queue.QueueMessageStatusFailed,
			"error_message": errMsg,
		})
		duration := time.Since(startTime).Milliseconds()
		createLogAndEmit(q, msg, queue.QueueLogStatusFailed, duration, &errMsg)
		return
	}

	if msg.Query != nil && *msg.Query != "" {
		var queryParams map[string]interface{}
		if err := json.Unmarshal([]byte(*msg.Query), &queryParams); err == nil && len(queryParams) > 0 {
			qv := parsedURL.Query()
			for k, v := range queryParams {
				qv.Set(k, fmt.Sprintf("%v", v))
			}
			parsedURL.RawQuery = qv.Encode()
		}
	}

	targetURL := parsedURL.String()

	// build request
	method := strings.ToUpper(msg.Method)
	if method == "" {
		method = "POST"
	}

	var bodyReader io.Reader
	if msg.Body != "" {
		bodyReader = bytes.NewBufferString(msg.Body)
	}

	req, err := http.NewRequest(method, targetURL, bodyReader)
	if err != nil {
		errMsg := fmt.Sprintf("failed to build request: %v", err)
		log.Printf("❌ Message id=%s build request failed: %s", msg.ID.String(), errMsg)
		variable.Db.Model(msg).Updates(map[string]interface{}{
			"status":        queue.QueueMessageStatusFailed,
			"error_message": errMsg,
		})
		duration := time.Since(startTime).Milliseconds()
		createLogAndEmit(q, msg, queue.QueueLogStatusFailed, duration, &errMsg)
		return
	}
	if debug {
		log.Printf("🌐 Message id=%s request %s %s", msg.ID.String(), method, targetURL)
	}

	// default content-type for methods with body
	if method == "POST" || method == "PUT" || method == "PATCH" {
		req.Header.Set("Content-Type", "application/json")
	}

	// override User-Agent
	req.Header.Set("User-Agent", "ApiMQ/1.0")

	// merge queue-level headers
	if q.Headers != "" {
		var queueHeaders []map[string]string
		if err := json.Unmarshal([]byte(q.Headers), &queueHeaders); err == nil {
			for _, h := range queueHeaders {
				for k, v := range h {
					req.Header.Set(k, v)
				}
			}
		}
	}

	// merge message-level headers (override queue headers)
	if msg.Headers != nil && *msg.Headers != "" {
		var msgHeaders map[string]interface{}
		if err := json.Unmarshal([]byte(*msg.Headers), &msgHeaders); err == nil {
			for k, v := range msgHeaders {
				req.Header.Set(k, fmt.Sprintf("%v", v))
			}
		}
	}

	// execute request
	timeoutSec := q.Timeout
	if timeoutSec <= 0 {
		timeoutSec = 30
	}
	tlsConfig := &tls.Config{
		InsecureSkipVerify: true,
	}
	transport := &http.Transport{
		TLSClientConfig: tlsConfig,
		Proxy: func(*http.Request) (*url.URL, error) {
			return nil, nil
		},
	}
	client := &http.Client{
		Timeout:   time.Duration(timeoutSec) * time.Second,
		Transport: transport,
	}

	// Check if we should wait for response or fire-and-forget
	if !q.IsWaitResponse {
		// Fire-and-forget: send request in goroutine, don't wait for response
		go func() {
			resp, err := client.Do(req)
			if err != nil {
				log.Printf("⚠️  [fire-and-forget] Message id=%s request error: %v", msg.ID.String(), err)
				return
			}
			defer resp.Body.Close()
			// Drain body to allow connection reuse
			io.Copy(io.Discard, resp.Body)
			if debug {
				log.Printf("🚀 [fire-and-forget] Message id=%s sent, HTTP %d", msg.ID.String(), resp.StatusCode)
			}
		}()

		// Mark as completed immediately (fire-and-forget mode)
		if debug {
			log.Printf("🚀 Message id=%s sent (fire-and-forget, not waiting for response)", msg.ID.String())
		}
		if err := variable.Db.Model(msg).Updates(map[string]interface{}{
			"status":   queue.QueueMessageStatusCompleted,
			"is_ack":   true,
			"response": "[fire-and-forget: response not captured]",
		}).Error; err != nil {
			log.Printf("⚠️  Failed updating status=completed message id=%s err=%v", msg.ID.String(), err)
		}
		duration := time.Since(startTime).Milliseconds()
		createLogAndEmit(q, msg, queue.QueueLogStatusCompleted, duration, nil)
		return
	}

	// Wait for response (default behavior)
	resp, err := client.Do(req)
	if err != nil {
		errMsg := fmt.Sprintf("request failed: %v", err)
		log.Printf("❌ Message id=%s request failed: %s", msg.ID.String(), errMsg)
		variable.Db.Model(msg).Updates(map[string]interface{}{
			"status":        queue.QueueMessageStatusFailed,
			"error_message": errMsg,
		})
		duration := time.Since(startTime).Milliseconds()
		createLogAndEmit(q, msg, queue.QueueLogStatusFailed, duration, &errMsg)
		return
	}
	defer resp.Body.Close()

	// read response body for error context
	respBody, _ := io.ReadAll(resp.Body)
	respStr := string(respBody)
	if len(respStr) > 20000 {
		respStr = respStr[:20000]
	}

	if resp.StatusCode >= 100 && resp.StatusCode < 400 {
		// success
		if debug {
			log.Printf("✅ Message id=%s success HTTP %d", msg.ID.String(), resp.StatusCode)
		}
		if err := variable.Db.Model(msg).Updates(map[string]interface{}{
			"status":   queue.QueueMessageStatusCompleted,
			"is_ack":   true,
			"response": respStr,
		}).Error; err != nil {
			log.Printf("⚠️  Failed updating status=completed message id=%s err=%v", msg.ID.String(), err)
		}
		duration := time.Since(startTime).Milliseconds()
		createLogAndEmit(q, msg, queue.QueueLogStatusCompleted, duration, nil)
	} else {
		// HTTP error
		// Prefer JSON {message: "..."} if response body is JSON
		errDetail := respStr
		var parsed map[string]interface{}
		if json.Unmarshal(respBody, &parsed) == nil {
			if v, ok := parsed["message"]; ok {
				errDetail = fmt.Sprintf("%v", v)
			} else if v, ok := parsed["error"]; ok {
				errDetail = fmt.Sprintf("%v", v)
			}
		}

		errMsg := fmt.Sprintf("HTTP %d: %s", resp.StatusCode, errDetail)
		if len(errMsg) > 2000 {
			errMsg = errMsg[:2000]
		}
		log.Printf("❌ Message id=%s failed: %s", msg.ID.String(), errMsg)
		variable.Db.Model(msg).Updates(map[string]interface{}{
			"status":        queue.QueueMessageStatusFailed,
			"error_message": errMsg,
			"response":      respStr,
		})
		duration := time.Since(startTime).Milliseconds()
		createLogAndEmit(q, msg, queue.QueueLogStatusFailed, duration, &errMsg)
	}
}

// ─── helpers ────────────────────────────────────────────────────────────────

func sleepOrCancel(ctx context.Context, d time.Duration) {
	select {
	case <-ctx.Done():
	case <-time.After(d):
	}
}

// createLogAndEmit creates a QueueLog entry and emits socket events
func createLogAndEmit(q *queue.Queue, msg *queue.QueueMessage, status string, duration int64, errMsg *string) {
	// Create log entry
	logEntry := queue.QueueLog{
		QueueID:      q.ID.String(),
		QueueKey:     q.Key,
		QueueName:    q.Name,
		MessageID:    msg.ID.String(),
		Status:       status,
		Method:       msg.Method,
		Duration:     duration,
		ErrorMessage: errMsg,
	}
	if err := variable.Db.Create(&logEntry).Error; err != nil {
		log.Printf("⚠️  Failed creating log entry: %v", err)
	}

	// Emit to update_log room
	if variable.SocketIO != nil {
		_ = variable.SocketIO.To("update_log").Emit("update_log", logEntry)
	}

	// Emit queue stats update to update_queue room
	emitQueueStats(q)
}

// emitQueueStats fetches current queue stats and emits to update_queue room
func emitQueueStats(q *queue.Queue) {
	if variable.SocketIO == nil {
		return
	}

	// Get counts
	var pendingCount int64
	var completedCount int64
	var failedCount int64

	variable.Db.Model(&queue.QueueMessage{}).Where("queue_id = ? AND status = ?", q.ID.String(), queue.QueueMessageStatusPending).Count(&pendingCount)
	variable.Db.Model(&queue.QueueMessage{}).Where("queue_id = ? AND (status = ? OR (status = ? AND is_ack = true))", q.ID.String(), queue.QueueMessageStatusCompleted, queue.QueueMessageStatusFailed).Count(&completedCount)
	variable.Db.Model(&queue.QueueMessage{}).Where("queue_id = ? AND status = ? AND is_ack = false", q.ID.String(), queue.QueueMessageStatusFailed).Count(&failedCount)

	statsPayload := map[string]interface{}{
		"id":              q.ID.String(),
		"enabled":         q.Enabled,
		"batch_count":     q.BatchCount,
		"is_send_now":     q.IsSendNow,
		"send_later_time": q.SendLaterTime,
		"is_use_delay":    q.IsUseDelay,
		"is_random_delay": q.IsRandomDelay,
		"delay_sec":       q.DelaySec,
		"delay_start":     q.DelayStart,
		"delay_end":       q.DelayEnd,
		"messages":        pendingCount,
		"completed_count": completedCount,
		"failed_count":    failedCount,
	}

	_ = variable.SocketIO.To("update_queue").Emit("update_queue", statsPayload)
}
