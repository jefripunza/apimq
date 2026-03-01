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
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

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

	m.mu.Lock()
	defer m.mu.Unlock()

	// build set of current queue IDs
	activeIDs := make(map[string]bool, len(queues))
	for _, q := range queues {
		id := q.ID.String()
		activeIDs[id] = true

		if entry, exists := m.workers[id]; exists {
			// update enabled state
			entry.setEnabled(q.Enabled)
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
	log.Printf("▶️  Worker started for queue %s (%s)", q.Key, q.ID.String())
}

// ─── per-queue worker goroutine ─────────────────────────────────────────────

func (m *Manager) runWorker(ctx context.Context, entry *workerEntry, queueID string, batchCount int) {
	if batchCount < 1 {
		batchCount = 1
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		// if disabled, wait until enabled or cancelled
		if !entry.isEnabled() {
			select {
			case <-ctx.Done():
				return
			case <-entry.wake:
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

		for _, msg := range messages {
			select {
			case <-ctx.Done():
				return
			default:
			}

			if !entry.isEnabled() {
				break // will re-enter the outer loop and pause
			}

			m.processMessage(&q, &msg)
		}
	}
}

// ─── process a single message ───────────────────────────────────────────────

func (m *Manager) processMessage(q *queue.Queue, msg *queue.QueueMessage) {
	// mark as processing
	variable.Db.Model(msg).Update("status", queue.QueueMessageStatusProcessing)

	// build URL
	targetURL := strings.TrimRight(q.Origin, "/")

	// append query params if present
	if msg.Query != nil && *msg.Query != "" {
		var queryParams map[string]interface{}
		if err := json.Unmarshal([]byte(*msg.Query), &queryParams); err == nil && len(queryParams) > 0 {
			params := url.Values{}
			for k, v := range queryParams {
				params.Set(k, fmt.Sprintf("%v", v))
			}
			if strings.Contains(targetURL, "?") {
				targetURL += "&" + params.Encode()
			} else {
				targetURL += "?" + params.Encode()
			}
		}
	}

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
		variable.Db.Model(msg).Updates(map[string]interface{}{
			"status":        queue.QueueMessageStatusFailed,
			"error_message": errMsg,
		})
		return
	}

	// default content-type for methods with body
	if method == "POST" || method == "PUT" || method == "PATCH" {
		req.Header.Set("Content-Type", "application/json")
	}

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
		var msgHeaders map[string]string
		if err := json.Unmarshal([]byte(*msg.Headers), &msgHeaders); err == nil {
			for k, v := range msgHeaders {
				req.Header.Set(k, v)
			}
		}
	}

	// execute request
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		errMsg := fmt.Sprintf("request failed: %v", err)
		variable.Db.Model(msg).Updates(map[string]interface{}{
			"status":        queue.QueueMessageStatusFailed,
			"error_message": errMsg,
		})
		return
	}
	defer resp.Body.Close()

	// read response body for error context
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		// success
		variable.Db.Model(msg).Update("status", queue.QueueMessageStatusCompleted)
	} else {
		// HTTP error
		errMsg := fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(respBody))
		if len(errMsg) > 2000 {
			errMsg = errMsg[:2000]
		}
		variable.Db.Model(msg).Updates(map[string]interface{}{
			"status":        queue.QueueMessageStatusFailed,
			"error_message": errMsg,
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
