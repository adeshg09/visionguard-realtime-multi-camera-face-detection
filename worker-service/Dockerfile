FROM golang:1.25-alpine

# Set working directory
WORKDIR /app

# Install dependencies
RUN apk add --no-cache git ffmpeg ca-certificates tzdata gcc musl-dev

# Copy Go module files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the Go binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o worker-service ./cmd/main.go

# Create snapshot directory
RUN mkdir -p /tmp/visionguard/snapshots

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/health || exit 1

# Run the application
CMD ["./worker-service"]
