package utils

// Stream constants
const (
	DefaultFrameWidth    = 1920
	DefaultFrameHeight   = 1080
	DefaultFPS           = 30
	DefaultBytesPerPixel = 3 // BGR24

	MaxReconnectAttempts = 5
	MaxConsecutiveErrors = 10
	ConnectionTimeout    = 2 // seconds
	StopTimeout          = 5 // seconds

	MediaMTXRTMPPort   = 1935
	MediaMTXWebRTCPort = 8889
	MediaMTXHLSPort    = 8888
	MediaMTXRTSPPort   = 8554
)

// Response messages
const (
	HealthCheckSuccess     = "Health check successful"
	StreamStartSuccess     = "Stream started successfully"
	StreamStopSuccess      = "Stream stopped successfully"
	FaceDetectionToggled   = "Face detection toggled successfully"
	FrameSkipUpdated       = "Frame skip interval updated successfully"
	InvalidRequestError    = "Invalid request payload"
	StreamNotFoundError    = "Stream not found"
	MaxStreamsReachedError = "Maximum concurrent streams reached"
)
