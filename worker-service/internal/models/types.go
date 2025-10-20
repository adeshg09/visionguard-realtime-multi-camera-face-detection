package models

import (
	"time"
)

// Camera represents a camera managed by the worker
type Camera struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	RTSPUrl  string `json:"rtspUrl"`
	Location string `json:"location,omitempty"`
	FPS      int    `json:"fps"`
}

// StreamSession represents an active streaming session
type StreamSession struct {
	CameraID        string
	Camera          *Camera
	Status          StreamStatus
	StartTime       time.Time
	RTSPInputStream string // Path in MediaMTX
	WebRTCOutputURL string // URL for frontend
	FrameCount      int64
	LastFrameTime   time.Time
	ErrorCount      int
	LastError       error
	Reconnect       chan bool
	Stop            chan bool
	Done            chan bool
}

// StreamStatus represents the current status of a stream
type StreamStatus string

const (
	StreamStatusConnecting StreamStatus = "CONNECTING"
	StreamStatusStreaming  StreamStatus = "STREAMING"
	StreamStatusReconnect  StreamStatus = "RECONNECT"
	StreamStatusStopped    StreamStatus = "STOPPED"
	StreamStatusError      StreamStatus = "ERROR"
)

// StartStreamRequest is the request payload for starting a stream
type StartStreamRequest struct {
	CameraID string `json:"cameraId" binding:"required"`
	RTSPUrl  string `json:"rtspUrl" binding:"required"`
	Name     string `json:"name" binding:"required"`
	FPS      int    `json:"fps"`
}

// StartStreamResponse is the response for starting a stream
type StartStreamResponse struct {
	Success      bool   `json:"success"`
	CameraID     string `json:"cameraId"`
	StreamID     string `json:"streamId"`
	MediaMTXPath string `json:"mediamtxPath"`

	WebRTCUrl string `json:"webrtcUrl"`
	HLSUrl    string `json:"hlsUrl"`
	RTSPUrl   string `json:"rtspUrl"`
	RTMPUrl   string `json:"rtmpUrl"`

	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

// StopStreamRequest is the request payload for stopping a stream
type StopStreamRequest struct {
	CameraID string `json:"cameraId" binding:"required"`
}

// StopStreamResponse is the response for stopping a stream
type StopStreamResponse struct {
	Success  bool   `json:"success"`
	CameraID string `json:"cameraId"`
	Message  string `json:"message,omitempty"`
	Error    string `json:"error,omitempty"`
}

// StreamStatusRequest is the request payload for checking stream status
type StreamStatusRequest struct {
	CameraID string `json:"cameraId" binding:"required"`
}

// StreamStatusResponse is the response for stream status
type StreamStatusResponse struct {
	CameraID   string       `json:"cameraId"`
	Status     StreamStatus `json:"status"`
	IsActive   bool         `json:"isActive"`
	UptimeMs   int64        `json:"uptimeMs"`
	FrameCount int64        `json:"frameCount"`

	WebRTCUrl string `json:"webrtcUrl,omitempty"`
	HLSUrl    string `json:"hlsUrl,omitempty"`
	RTSPUrl   string `json:"rtspUrl,omitempty"`
	RTMPUrl   string `json:"rtmpUrl,omitempty"`

	LastError  string `json:"lastError,omitempty"`
	ErrorCount int    `json:"errorCount"`
}

// HealthCheckResponse is the response for health check
type HealthCheckResponse struct {
	Status               string                  `json:"status"`
	Timestamp            string                  `json:"timestamp"`
	Service              string                  `json:"service"`
	Version              string                  `json:"version"`
	ActiveStreams        int                     `json:"activeStreams"`
	MaxConcurrentStreams int                     `json:"maxConcurrentStreams"`
	TotalProcessedFrames int64                   `json:"totalProcessedFrames"`
	UptimeSeconds        int64                   `json:"uptimeSeconds"`
	StreamSessions       map[string]StreamStatus `json:"streamSessions"`
}
