# Single stage build for Go worker service with OpenCV
FROM gocv/opencv:4.8.1

# Set working directory
WORKDIR /app

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    ca-certificates \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Go 1.23.0
RUN wget -O go1.23.0.linux-amd64.tar.gz https://golang.org/dl/go1.23.0.linux-amd64.tar.gz && \
    rm -rf /usr/local/go && \
    tar -C /usr/local -xzf go1.23.0.linux-amd64.tar.gz && \
    rm go1.23.0.linux-amd64.tar.gz

# Update PATH to use the new Go version
ENV PATH="/usr/local/go/bin:${PATH}"

# Verify Go version
RUN go version

# Copy Go module files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the Go binary
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o worker-service ./cmd/main.go

# Create models directory and download face detection models
RUN mkdir -p /app/models && \
    cd /app/models && \
    wget -q https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel && \
    wget -q https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt

# Create snapshot directory
RUN mkdir -p /tmp/visionguard/snapshots

# Expose port
EXPOSE 5000

# Run the application
CMD ["./worker-service"]