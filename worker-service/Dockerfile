FROM golang:1.25-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies including wget and bzip2
RUN apk add --no-cache \
    git \
    wget \
    bzip2 \
    ffmpeg \
    ca-certificates \
    tzdata \
    gcc \
    musl-dev \
    make \
    cmake \
    g++ \
    libsm \
    libxext \
    libgomp \
    libstdc++ \
    libgfortran \
    pkgconfig \
    boost-dev \
    lapack-dev \
    opencv-dev \
    libjpeg-turbo-dev \
    openblas-dev

# Build and install dlib from source
RUN mkdir /dlib && \
    cd /dlib && \
    wget http://dlib.net/files/dlib-19.24.tar.bz2 && \
    tar xf dlib-19.24.tar.bz2 && \
    cd dlib-19.24 && \
    mkdir build && \
    cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release && \
    cmake --build . --config Release && \
    make install && \
    ldconfig /usr/local/lib || true && \
    cd / && \
    rm -rf /dlib

# Copy missing JPEG headers (common issue with dlib)
RUN cp /usr/local/include/dlib/external/libjpeg/*.h /usr/include/ 2>/dev/null || true

# Set PKG_CONFIG_PATH for dlib
ENV PKG_CONFIG_PATH=/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH

# Copy Go module files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the Go binary with CGO enabled (required for go-face and gocv)
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 \
    CGO_CFLAGS="-I/usr/local/include" \
    CGO_LDFLAGS="-L/usr/local/lib -ldlib -lopenblas -llapack" \
    go build -ldflags="-s -w" -o worker-service ./cmd/main.go

# Final stage - smaller runtime image
FROM alpine:latest

# Install runtime dependencies only
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    ffmpeg \
    libstdc++ \
    libgomp \
    libgfortran \
    opencv \
    libjpeg-turbo \
    openblas \
    lapack

# Copy dlib library from builder
COPY --from=builder /usr/local/lib/libdlib.so* /usr/local/lib/
COPY --from=builder /usr/local/include/dlib /usr/local/include/dlib

# Set library path
RUN ldconfig /usr/local/lib || true

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/worker-service .

# Download face detection models from dlib
# Required by go-face for face detection and recognition
RUN mkdir -p /app/models && \
    cd /app/models && \
    wget http://dlib.net/files/mmod_human_face_detector.dat.bz2 && \
    bunzip2 mmod_human_face_detector.dat.bz2 && \
    wget http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2 && \
    bunzip2 shape_predictor_68_face_landmarks.dat.bz2 && \
    wget http://dlib.net/files/dlib_face_recognition_resnet_model_v1.dat.bz2 && \
    bunzip2 dlib_face_recognition_resnet_model_v1.dat.bz2

# Create snapshot directory
RUN mkdir -p /tmp/visionguard/snapshots

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/health || exit 1

# Run the application
CMD ["./worker-service"]