FROM oven/bun:latest AS frontend
FROM golang:tip-trixie AS backend
FROM debian:bookworm-slim AS runner
LABEL org.opencontainers.image.authors="Jefri Herdi Triyanto <jefriherditriyanto@gmail.com>"
LABEL description="ApiMQ - lightweight self-hosted HTTP message queue with embedded React dashboard (Go Fiber + Socket.IO)"

# =======================================================================================
# Build Frontend
# =======================================================================================

FROM frontend AS fe-builder
WORKDIR /app

# install dependencies
COPY package.json ./
RUN bun install

# COPY .env.docker ./.env

# build
COPY . .
ENV VITE_IS_DOCKER=true
RUN bun run build

# =======================================================================================
# Build Backend
# =======================================================================================

FROM backend AS be-builder
WORKDIR /app

COPY ./go.mod ./
RUN go mod download

COPY . .
COPY --from=fe-builder /app/dist ./dist

RUN go build -o apimq main.go

# =======================================================================================
# Run
# =======================================================================================

FROM runner
WORKDIR /app

# copy compiled files
COPY --from=be-builder /app/apimq /app/apimq

# run
CMD ["./apimq"]
