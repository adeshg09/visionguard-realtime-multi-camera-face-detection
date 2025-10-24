package models

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
	Enabled            bool     `json:"enabled"`
	DrawBoundingBox    bool     `json:"drawBoundingBox"`
	DrawText           bool     `json:"drawText"`
	ShowFPS            bool     `json:"showFps"`
	ShowDetectionCount bool     `json:"showDetectionCount"`
	ShowConfidence     bool     `json:"showConfidence"`
	BoxColor           RGBColor `json:"boxColor"`
	TextColor          RGBColor `json:"textColor"`
	LineWidth          int      `json:"lineWidth"`
}

// RGBColor represents a color in RGB format
type RGBColor struct {
	R uint8 `json:"r"`
	G uint8 `json:"g"`
	B uint8 `json:"b"`
}

// Default overlay colors
var (
	ColorGreen = RGBColor{R: 0, G: 255, B: 0}
	ColorWhite = RGBColor{R: 255, G: 255, B: 255}
)

// DefaultOverlayConfig returns the default overlay configuration
func DefaultOverlayConfig() *OverlayConfig {
	return &OverlayConfig{
		Enabled:            true,
		DrawBoundingBox:    true,
		DrawText:           true,
		ShowFPS:            false,
		ShowDetectionCount: true,
		ShowConfidence:     false,
		BoxColor:           ColorGreen,
		TextColor:          ColorWhite,
		LineWidth:          2,
	}
}
