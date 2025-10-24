package models

// Camera represents a camera managed by the worker
type Camera struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	RTSPUrl    string `json:"rtspUrl"`
	Location   string `json:"location,omitempty"`
	Resolution string `json:"resolution,omitempty"`
	FPS        int    `json:"fps"`
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
	CameraID   string `json:"cameraId" binding:"required"`
	Name       string `json:"name" binding:"required"`
	RTSPUrl    string `json:"rtspUrl" binding:"required"`
	Location   string `json:"location" binding:"required"`
	Resolution string `json:"resolution"`
	FPS        int    `json:"fps"`
}

// StartStreamResponse is the response for starting a stream
type StartStreamResponse struct {
	CameraID     string `json:"cameraId"`
	StreamID     string `json:"streamId"`
	MediaMTXPath string `json:"mediamtxPath"`
	WebRTCUrl    string `json:"webrtcUrl"`
	HLSUrl       string `json:"hlsUrl"`
	RTSPUrl      string `json:"rtspUrl"`
	RTMPUrl      string `json:"rtmpUrl"`
}

// StopStreamRequest is the request payload for stopping a stream
type StopStreamRequest struct {
	CameraID string `json:"cameraId" binding:"required"`
}

// StopStreamResponse is the response for stopping a stream
type StopStreamResponse struct {
	CameraID string `json:"cameraId"`
}

// StreamStatusRequest is the request payload for checking stream status
type StreamStatusRequest struct {
	CameraID string `json:"cameraId" binding:"required"`
}

// StreamStatusResponse is the response for stream status
type StreamStatusResponse struct {
	CameraID  string       `json:"cameraId"`
	Status    StreamStatus `json:"status"`
	IsActive  bool         `json:"isActive"`
	UptimeMs  int64        `json:"uptimeMs"`
	WebRTCUrl string       `json:"webrtcUrl"`
	HLSUrl    string       `json:"hlsUrl"`
	RTSPUrl   string       `json:"rtspUrl"`
	RTMPUrl   string       `json:"rtmpUrl"`
}

// HealthCheckResponse is the response for health check
type HealthCheckResponse struct {
	Status               string                  `json:"status"`
	Timestamp            string                  `json:"timestamp"`
	Service              string                  `json:"service"`
	Version              string                  `json:"version"`
	ActiveStreams        int                     `json:"activeStreams"`
	MaxConcurrentStreams int                     `json:"maxConcurrentStreams"`
	StreamSessions       map[string]StreamStatus `json:"streamSessions"`
}
