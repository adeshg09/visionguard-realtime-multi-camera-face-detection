package models

// DetectionResult represents face detection results for a frame
type DetectionResult struct {
	FrameID       int64           `json:"frameId"`
	CameraID      string          `json:"cameraId"`
	Timestamp     int64           `json:"timestamp"`
	DetectionTime int64           `json:"detectionTime"`
	FaceCount     int             `json:"faceCount"`
	Faces         []FaceDetection `json:"faces"`
	FPS           float64         `json:"fps"`
	ProcessedAt   int64           `json:"processedAt"`
}

// FaceDetection represents a single detected face
type FaceDetection struct {
	ID         string  `json:"id"`
	X          int32   `json:"x"`
	Y          int32   `json:"y"`
	Width      int32   `json:"width"`
	Height     int32   `json:"height"`
	Confidence float32 `json:"confidence"`
}

// OverlayConfig defines overlay rendering configuration
type OverlayConfig struct {
	Enabled             bool     `json:"enabled"`
	DrawBoundingBox     bool     `json:"drawBoundingBox"`
	DrawText            bool     `json:"drawText"`
	ShowCameraID        bool     `json:"showCameraId"`
	ShowFPS             bool     `json:"showFps"`
	ShowDetectionCount  bool     `json:"showDetectionCount"`
	ShowConfidence      bool     `json:"showConfidence"`
	BoxColor            RGBColor `json:"boxColor"`
	TextColor           RGBColor `json:"textColor"`
	TextBackgroundColor RGBColor `json:"textBackgroundColor"`
	LineWidth           int      `json:"lineWidth"`
	FontScale           float64  `json:"fontScale"`
}

// RGBColor represents a color in RGB format
type RGBColor struct {
	R uint8 `json:"r"`
	G uint8 `json:"g"`
	B uint8 `json:"b"`
}

// Default overlay colors
var (
	ColorGreen  = RGBColor{R: 0, G: 255, B: 0}     // Green for boxes
	ColorWhite  = RGBColor{R: 255, G: 255, B: 255} // White for text
	ColorBlack  = RGBColor{R: 0, G: 0, B: 0}       // Black for text background
	ColorRed    = RGBColor{R: 255, G: 0, B: 0}     // Red for alerts
	ColorYellow = RGBColor{R: 255, G: 255, B: 0}   // Yellow for warnings
)

// DefaultOverlayConfig returns the default overlay configuration
func DefaultOverlayConfig() *OverlayConfig {
	return &OverlayConfig{
		Enabled:             true,
		DrawBoundingBox:     true,
		DrawText:            true,
		ShowCameraID:        true,
		ShowFPS:             true,
		ShowDetectionCount:  true,
		ShowConfidence:      false,
		BoxColor:            ColorGreen,
		TextColor:           ColorWhite,
		TextBackgroundColor: ColorBlack,
		LineWidth:           2,
		FontScale:           0.5,
	}
}

// ProcessingMetrics tracks performance metrics
type ProcessingMetrics struct {
	StreamID                 string  `json:"streamId"`
	CameraID                 string  `json:"cameraId"`
	FramesProcessed          int64   `json:"framesProcessed"`
	FacesDetected            int64   `json:"facesDetected"`
	AverageProcessingTime    float64 `json:"averageProcessingTime"`
	CurrentFPS               float64 `json:"currentFps"`
	DetectionRate            float64 `json:"detectionRate"`
	AverageConfidence        float64 `json:"averageConfidence"`
	ProcessingTimeMin        int64   `json:"processingTimeMin"`
	ProcessingTimeMax        int64   `json:"processingTimeMax"`
	LastDetectionTime        int64   `json:"lastDetectionTime"`
	CumulativeProcessingTime int64   `json:"cumulativeProcessingTime"`
}

// FrameProcessingStats represents stats about a frame
type FrameProcessingStats struct {
	FrameID             int64 `json:"frameId"`
	Width               int32 `json:"width"`
	Height              int32 `json:"height"`
	ChannelCount        int32 `json:"channelCount"`
	BytesSize           int64 `json:"bytesSize"`
	ProcessingStartTime int64 `json:"processingStartTime"`
	ProcessingEndTime   int64 `json:"processingEndTime"`
	DetectionCount      int   `json:"detectionCount"`
	ProcessingDuration  int64 `json:"processingDuration"`
}
