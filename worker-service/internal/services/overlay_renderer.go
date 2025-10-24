package services

import (
	"fmt"
	"image"
	"image/color"
	"sync"
	"time"
	"worker-service/internal/models"
	"worker-service/internal/utils"

	"gocv.io/x/gocv"
)

// OverlayRenderer handles rendering of detection results on frames
type OverlayRenderer struct {
	cameraID       string
	config         *models.OverlayConfig
	mutex          sync.RWMutex
	totalFrames    int64
	renderedFrames int64
	renderErrors   int64
	lastError      error
}

// NewOverlayRenderer creates a new overlay renderer
func NewOverlayRenderer(cameraID string) *OverlayRenderer {
	return &OverlayRenderer{
		cameraID:       cameraID,
		config:         models.DefaultOverlayConfig(),
		totalFrames:    0,
		renderedFrames: 0,
		renderErrors:   0,
	}
}

// RenderDetections renders face detections on a frame
func (or *OverlayRenderer) RenderDetections(
	frame *gocv.Mat,
	detections []models.FaceDetection,
	cameraName string,
	location string,
	fps float64,
	frameNum int64,
) error {
	or.mutex.Lock()
	defer or.mutex.Unlock()

	logger := utils.GetLogger()
	or.totalFrames++

	if frame == nil || frame.Empty() {
		or.renderErrors++
		or.lastError = fmt.Errorf("invalid or empty frame")
		return or.lastError
	}

	startTime := time.Now()

	// Get configuration
	config := or.config

	// Convert colors to color.RGBA (used for drawing operations)
	boxColor := color.RGBA{
		R: config.BoxColor.R,
		G: config.BoxColor.G,
		B: config.BoxColor.B,
		A: 255,
	}

	textColor := color.RGBA{
		R: config.TextColor.R,
		G: config.TextColor.G,
		B: config.TextColor.B,
		A: 255,
	}

	// Draw bounding boxes for detected faces
	if config.DrawBoundingBox && len(detections) > 0 {
		for i, detection := range detections {
			pt1 := image.Pt(int(detection.X), int(detection.Y))
			pt2 := image.Pt(int(detection.X+detection.Width), int(detection.Y+detection.Height))

			// Draw rectangle (bounding box)
			gocv.Rectangle(frame, image.Rectangle{Min: pt1, Max: pt2}, boxColor, config.LineWidth)

			// Optionally draw confidence score on box
			if config.ShowConfidence && detection.Confidence > 0 {
				confidenceText := fmt.Sprintf("%.0f%%", detection.Confidence*100)
				textY := int(detection.Y) - 5
				if textY < 15 {
					textY = 15
				}
				gocv.PutText(frame, confidenceText, image.Pt(int(detection.X), textY),
					gocv.FontHersheyPlain, 1.0, textColor, 1)
			}

			logger.Debugf("[OverlayRenderer] Face %d: box at (%d,%d) size %dx%d",
				i+1, detection.X, detection.Y, detection.Width, detection.Height)
		}
	}

	// Draw overlay information (Location, FPS, Detection count)
	if config.DrawText {
		// Helper function for visible text with shadow
		drawVisibleText := func(text string, x, y int, scale float64) {
			// Draw black shadow slightly offset
			gocv.PutText(frame, text, image.Pt(x+1, y+1),
				gocv.FontHersheyPlain, scale, color.RGBA{0, 0, 0, 255}, 3)

			// Draw main white text
			gocv.PutText(frame, text, image.Pt(x, y),
				gocv.FontHersheyPlain, scale, textColor, 2)
		}

		// 🟢 Location (top-left)
		if location != "" {
			locationText := fmt.Sprintf("📍 %s", location)
			drawVisibleText(locationText, 10, 25, 1.2)
		}

		// 🟢 Faces Detected (bottom-left)
		if config.ShowDetectionCount {
			detectionText := fmt.Sprintf("Faces Detected: %d", len(detections))
			drawVisibleText(detectionText, 10, frame.Rows()-10, 1.0)
		}

		// 🟢 FPS (bottom-right)
		if config.ShowFPS {
			fpsText := fmt.Sprintf("FPS: %.1f", fps)
			textSize := gocv.GetTextSize(fpsText, gocv.FontHersheyPlain, 1.0, 2)
			drawVisibleText(fpsText, frame.Cols()-textSize.X-10, frame.Rows()-10, 1.0)
		}
	}

	renderTime := time.Since(startTime)
	or.renderedFrames++

	logger.Debugf("[OverlayRenderer] Rendered frame with %d detections in %v", len(detections), renderTime)

	return nil
}

// UpdateConfig updates the overlay configuration
func (or *OverlayRenderer) UpdateConfig(config *models.OverlayConfig) {
	or.mutex.Lock()
	defer or.mutex.Unlock()

	if config != nil {
		or.config = config
	}
}

// GetConfig returns the current overlay configuration
func (or *OverlayRenderer) GetConfig() *models.OverlayConfig {
	or.mutex.RLock()
	defer or.mutex.RUnlock()
	return or.config
}

// GetStatistics returns rendering statistics
func (or *OverlayRenderer) GetStatistics() map[string]interface{} {
	or.mutex.RLock()
	defer or.mutex.RUnlock()

	successRate := float64(0)
	if or.totalFrames > 0 {
		successRate = float64(or.renderedFrames) / float64(or.totalFrames) * 100
	}

	return map[string]interface{}{
		"cameraID":       or.cameraID,
		"totalFrames":    or.totalFrames,
		"renderedFrames": or.renderedFrames,
		"renderErrors":   or.renderErrors,
		"successRate":    successRate,
		"lastError":      or.lastError,
	}
}

// SetBoxColor sets the bounding box color
func (or *OverlayRenderer) SetBoxColor(r, g, b uint8) {
	or.mutex.Lock()
	defer or.mutex.Unlock()
	or.config.BoxColor = models.RGBColor{R: r, G: g, B: b}
}

// SetTextColor sets the text color
func (or *OverlayRenderer) SetTextColor(r, g, b uint8) {
	or.mutex.Lock()
	defer or.mutex.Unlock()
	or.config.TextColor = models.RGBColor{R: r, G: g, B: b}
}

// Enable enables overlay rendering
func (or *OverlayRenderer) Enable() {
	or.mutex.Lock()
	defer or.mutex.Unlock()
	or.config.Enabled = true
}

// Disable disables overlay rendering
func (or *OverlayRenderer) Disable() {
	or.mutex.Lock()
	defer or.mutex.Unlock()
	or.config.Enabled = false
}

// IsEnabled returns if overlay is enabled
func (or *OverlayRenderer) IsEnabled() bool {
	or.mutex.RLock()
	defer or.mutex.RUnlock()
	return or.config.Enabled
}
