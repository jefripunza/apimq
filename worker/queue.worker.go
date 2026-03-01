package worker

import (
	"apimq/modules/queue"
	"apimq/variable"
	"bytes"
	"context"
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

func init() {
	rand.Seed(time.Now().UnixNano())
}

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

func (m *Manager) sync() {
	var queues []queue.Queue
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
		var messages []queue.QueueMessage
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
	if err := variable.Db.Model(msg).Update("status", queue.QueueMessageStatusProcessing).Error; err != nil {
		log.Printf("⚠️  Failed updating status=processing message id=%s err=%v", msg.ID.String(), err)
	}

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
	client := &http.Client{Timeout: time.Duration(timeoutSec) * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		errMsg := fmt.Sprintf("request failed: %v", err)
		log.Printf("❌ Message id=%s request failed: %s", msg.ID.String(), errMsg)
		variable.Db.Model(msg).Updates(map[string]interface{}{
			"status":        queue.QueueMessageStatusFailed,
			"error_message": errMsg,
		})
		return
	}
	defer resp.Body.Close()

	// read response body for error context
	respBody, _ := io.ReadAll(resp.Body)
	respStr := string(respBody)
	if len(respStr) > 20000 {
		respStr = respStr[:20000]
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
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
	}
}

// ─── helpers ────────────────────────────────────────────────────────────────

func sleepOrCancel(ctx context.Context, d time.Duration) {
	select {
	case <-ctx.Done():
	case <-time.After(d):
	}
}
