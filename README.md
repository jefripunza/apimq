# ApiMQ

ApiMQ adalah aplikasi **HTTP Message Queue** yang ringan dan self-hosted untuk mengantrekan request HTTP dan memprosesnya secara reliable menggunakan worker.

Frontend (React) dibuild menjadi folder `dist/` dan **di-embed** ke binary Go sehingga cukup menjalankan satu executable.

## Docker Hub

Image resmi tersedia di:

- `jefriherditriyanto/apimq`

Pull:

```bash
docker pull jefriherditriyanto/apimq:latest
```

Run:

```bash
docker run --rm -p 3000:3000 --name apimq jefriherditriyanto/apimq:latest
```

Untuk production, disarankan menjalankan dengan env variable (contoh):

```bash
docker run --rm -p 3000:3000 --name apimq \
  -e PORT=3000 \
  -e JWT_SECRET="change-me" \
  jefriherditriyanto/apimq:latest
```

## Fitur

- **Queue Management**
  - Create/update queue (origin, timeout, headers, batch).
  - Enable/disable queue.
- **Delivery Control**
  - Fixed delay atau random delay.
  - Scheduled sending (status `timing` → `pending` pada jam yang ditentukan).
- **Retry & Error Handling**
  - Failed message bisa di-retry / ack dari UI.
  - Log lengkap untuk tracing.
- **Security**
  - Admin dashboard protected via token.
  - Public endpoint `/queue` bisa diproteksi via **API key** dan/atau **whitelist**.
- **Realtime Dashboard**
  - Socket.IO room `live_data` untuk push statistik secara live.

## Arsitektur Singkat

- **Backend**: Go + Fiber v2 + GORM (SQLite atau provider lain via env).
- **Worker**: goroutine worker per queue + loop checker untuk queue scheduled.
- **Realtime**: Socket.IO (`/socket.io`).
- **Frontend**: React + Vite + Tailwind.

## Requirements

- Go (untuk development backend)
- Bun atau Node.js (untuk build frontend)
- (Opsional) Docker

## Menjalankan Secara Development

### 1) Backend (Go)

```bash
go run main.go
```

Aplikasi default listen di:

- `http://localhost:3000`

### 2) Frontend (Vite)

Jika kamu menjalankan Vite terpisah untuk dev UI, pastikan `VITE_HOST_API` mengarah ke backend.

```bash
bun install
bun run dev
```

Konfigurasi Vite sudah diset supaya **perubahan file Go tidak memicu HMR/hot reload**.

## Menjalankan Dengan Docker

Project menyediakan `Dockerfile` multi-stage (build FE lalu embed ke BE).

```bash
docker build -t apimq .
docker run --rm -p 3000:3000 apimq
```

Jika kamu menggunakan script:

```bash
bash docker.sh
```

## Konfigurasi Environment Variables

### Server

- `PORT` (default: `3000`)

### Auth / Token

- `JWT_SECRET` (default fallback: `apimq-secret-key`)

### Database

Database provider diambil dari env (lihat `environment/database.env.go`):

- `DATABASE_PROVIDER`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASS`
- `DATABASE_NAME`

### Frontend

- `VITE_HOST_API` (base URL untuk API backend)

## Endpoint Penting

### Admin API (Protected)

Semua endpoint admin berada di prefix `/api/*` dan diproteksi token.

- `GET /api/dashboard/stats`
- `GET /api/queue`
- `POST /api/queue`
- `GET /api/log`
- `GET /api/whitelist`
- `GET /api/apikey`

### Public Queue Endpoint

- `POST /queue`

Header yang umum:

- `Content-Type: application/json`
- `X-Api-Key: apimq_...` (wajib jika API key sudah dibuat)

Contoh:

```bash
curl -X POST http://localhost:3000/queue \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: apimq_your_key" \
  -d '{
    "key": "my-queue",
    "method": "POST",
    "body": "{\"hello\":\"world\"}",
    "headers": "{}",
    "query": "{}"
  }'
```

## Realtime (Socket.IO)

- URL: `/socket.io`
- Room: `live_data`
- Event: `live_data`

Frontend join:

- `join_live_data`
- `leave_live_data`

## Dokumentasi UI

Dokumentasi menu tersedia di:

- `GET /doc`

## Catatan Security

- Untuk production, **wajib** set `JWT_SECRET` ke nilai yang kuat.
- Jika kamu mengaktifkan API key, pastikan key didistribusikan secara aman.
- Whitelist bisa dipakai untuk membatasi akses ke endpoint `/queue`.
