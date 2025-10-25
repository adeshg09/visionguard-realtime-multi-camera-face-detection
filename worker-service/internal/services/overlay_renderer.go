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

// ==================== OVERLAY RENDERER CONSTANTS ====================

const (
	// Text rendering constants
	DefaultTextScale    = 2.0
	LargeTextScale      = 2.5
	TextShadowThickness = 4
	TextMainThickness   = 3
	TextShadowOffset    = 2

	// Position constants -
	TextTopMargin        = 40
	TextBottomMargin     = 30
	TextSideMargin       = 20
	TextMinY             = 35
	ConfidenceTextOffset = -8

	// Section spacing
	SectionSpacing = 35

	// Color constants
	ShadowColorR = 0
	ShadowColorG = 0
	ShadowColorB = 0
	ShadowColorA = 255

	// High-contrast text colors
	PrimaryTextColorR = 255 // Bright White
	PrimaryTextColorG = 255
	PrimaryTextColorB = 255

	// Accent colors for important info
	AccentTextColorR = 255 // Bright Yellow
	AccentTextColorG = 255
	AccentTextColorB = 0

	WarningTextColorR = 255 // Bright Red for alerts
	WarningTextColorG = 50
	WarningTextColorB = 50

	// Alpha channel for colors
	FullAlpha = 255
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
		A: FullAlpha,
	}

	// Use high-contrast white for all text
	textColor := color.RGBA{
		R: PrimaryTextColorR, // Bright White
		G: PrimaryTextColorG,
		B: PrimaryTextColorB,
		A: FullAlpha,
	}

	// Accent color for important information
	accentColor := color.RGBA{
		R: AccentTextColorR, // Bright Yellow
		G: AccentTextColorG,
		B: AccentTextColorB,
		A: FullAlpha,
	}

	// Warning color for face count
	warningColor := color.RGBA{
		R: WarningTextColorR, // Bright Red
		G: WarningTextColorG,
		B: WarningTextColorB,
		A: FullAlpha,
	}

	// Draw bounding boxes for detected faces
	if config.DrawBoundingBox && len(detections) > 0 {
		for i, detection := range detections {
			pt1 := image.Pt(int(detection.X), int(detection.Y))
			pt2 := image.Pt(int(detection.X+detection.Width), int(detection.Y+detection.Height))

			// Draw rectangle (bounding box)
			gocv.Rectangle(frame, image.Rectangle{Min: pt1, Max: pt2}, boxColor, 4)

			// Optionally draw confidence score on box
			if config.ShowConfidence && detection.Confidence > 0 {
				confidenceText := fmt.Sprintf("%.0f%%", detection.Confidence*100)
				textY := int(detection.Y) + ConfidenceTextOffset
				if textY < TextMinY {
					textY = TextMinY
				}
				// Use accent color for confidence text
				gocv.PutText(frame, confidenceText, image.Pt(int(detection.X), textY),
					gocv.FontHersheyPlain, DefaultTextScale, accentColor, TextMainThickness)
			}

			logger.Debugf("[OverlayRenderer] Face %d: box at (%d,%d) size %dx%d",
				i+1, detection.X, detection.Y, detection.Width, detection.Height)
		}
	}

	// Draw overlay information (Location, FPS, Detection count)
	if config.DrawText {
		// Helper function to draw text with shadow for better visibility
		drawVisibleText := func(text string, x, y int, scale float64, textColor color.RGBA) {

			shadowColor := color.RGBA{
				R: ShadowColorR,
				G: ShadowColorG,
				B: ShadowColorB,
				A: ShadowColorA,
			}
			gocv.PutText(frame, text, image.Pt(x+TextShadowOffset, y+TextShadowOffset),
				gocv.FontHersheyPlain, scale, shadowColor, TextShadowThickness)

			// Draw main text
			gocv.PutText(frame, text, image.Pt(x, y),
				gocv.FontHersheyPlain, scale, textColor, TextMainThickness)
		}

		currentY := TextTopMargin

		// Location (top-left, below camera name)
		if location != "" {
			locationText := fmt.Sprintf("📍 %s", location)
			drawVisibleText(locationText, TextSideMargin, currentY, DefaultTextScale, textColor)
			currentY += SectionSpacing
		}

		// FPS (top-right) - MOVED to top for better visibility
		if config.ShowFPS {
			fpsText := fmt.Sprintf("🎯 %.1f FPS", fps)
			textSize := gocv.GetTextSize(fpsText, gocv.FontHersheyPlain, DefaultTextScale, TextMainThickness)
			drawVisibleText(fpsText, frame.Cols()-textSize.X-TextSideMargin, TextTopMargin, DefaultTextScale, textColor)
		}

		// Faces Detected (bottom-left) - WITH COLOR CODING
		if config.ShowDetectionCount {
			faceCount := len(detections)
			var detectionText string
			var countColor color.RGBA

			if faceCount == 0 {
				detectionText = "👤 No faces detected"
				countColor = textColor
			} else if faceCount == 1 {
				detectionText = "👤 1 face detected"
				countColor = accentColor
			} else {
				detectionText = fmt.Sprintf("👥 %d faces detected", faceCount)
				countColor = warningColor // Red color for multiple faces
			}

			drawVisibleText(detectionText, TextSideMargin, frame.Rows()-TextBottomMargin, LargeTextScale, countColor)
		}

		// ADDED: Timestamp (bottom-right)
		timestamp := time.Now().Format("15:04:05")
		timestampText := fmt.Sprintf("🕒 %s", timestamp)
		timestampSize := gocv.GetTextSize(timestampText, gocv.FontHersheyPlain, DefaultTextScale, TextMainThickness)
		drawVisibleText(timestampText, frame.Cols()-timestampSize.X-TextSideMargin, frame.Rows()-TextBottomMargin, DefaultTextScale, textColor)
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
