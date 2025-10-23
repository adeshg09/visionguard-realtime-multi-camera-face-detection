package stream

import (
	"fmt"
	"io"
	"worker-service/internal/models"
	"worker-service/internal/services"
	"worker-service/internal/utils"

	"gocv.io/x/gocv"
)

// FrameProcessor handles frame-by-frame processing
type FrameProcessor struct {
	session           *models.StreamSession
	manager           *Manager
	frameSize         int
	frameBuffer       []byte
	consecutiveErrors int
	frameCounter      int64
	skipCounter       int

	// Service dependencies
	frameDecoder *services.FrameDecoder
	faceDetector *services.FaceDetectionEngine
	overlay      *services.OverlayRenderer
	perfMonitor  *services.PerformanceOptimizer
}

// NewFrameProcessor creates a new frame processor
func NewFrameProcessor(
	session *models.StreamSession,
	manager *Manager,
	decoder *services.FrameDecoder,
	detector *services.FaceDetectionEngine,
	overlay *services.OverlayRenderer,
	perfMonitor *services.PerformanceOptimizer,
) *FrameProcessor {
	frameSize := utils.DefaultFrameWidth * utils.DefaultFrameHeight * utils.DefaultBytesPerPixel

	return &FrameProcessor{
		session:      session,
		manager:      manager,
		frameSize:    frameSize,
		frameBuffer:  make([]byte, frameSize),
		frameDecoder: decoder,
		faceDetector: detector,
		overlay:      overlay,
		perfMonitor:  perfMonitor,
	}
}

// ProcessNextFrame reads and processes the next frame
func (fp *FrameProcessor) ProcessNextFrame() error {
	// Read frame from FFmpeg
	frame, err := fp.readFrame()
	if err != nil {
		return err
	}

	// Apply frame skipping
	if fp.shouldSkipFrame() {
		return nil
	}

	// Convert raw bytes to OpenCV Mat
	mat, err := fp.bytesToMat(frame)
	if err != nil {
		return nil // Skip bad frames
	}
	defer mat.Close()

	// Detect faces if enabled
	detections := fp.detectFaces(mat)

	// Render overlay
	fp.renderOverlay(mat, detections)

	// Write to output FFmpeg
	if err := fp.writeToOutput(mat); err != nil {
		return err
	}

	// Update metrics
	fp.updateMetrics(detections)

	return nil
}

// readFrame reads a single frame from input FFmpeg
func (fp *FrameProcessor) readFrame() ([]byte, error) {
	if fp.session.InputFFmpeg == nil || fp.session.InputFFmpeg.StdoutPipe == nil {
		return nil, fmt.Errorf("input pipe not available")
	}

	n, err := io.ReadFull(fp.session.InputFFmpeg.StdoutPipe, fp.frameBuffer)
	if err != nil {
		fp.consecutiveErrors++
		return nil, err
	}

	if n != fp.frameSize {
		return nil, fmt.Errorf("incomplete frame: got %d bytes, expected %d", n, fp.frameSize)
	}

	fp.consecutiveErrors = 0
	fp.frameCounter++
	fp.session.FrameCount = fp.frameCounter
	fp.session.LastFrameTime = utils.GetCurrentTime()

	return fp.frameBuffer, nil
}

// shouldSkipFrame determines if current frame should be skipped
func (fp *FrameProcessor) shouldSkipFrame() bool {
	interval := 1
	if fp.perfMonitor != nil {
		interval = fp.perfMonitor.GetFrameSkipInterval()
	}

	fp.skipCounter++
	if fp.skipCounter%interval != 0 {
		if fp.perfMonitor != nil {
			fp.perfMonitor.RecordFrameDrop()
		}
		return true
	}

	return false
}

// bytesToMat converts raw frame bytes to OpenCV Mat
func (fp *FrameProcessor) bytesToMat(data []byte) (gocv.Mat, error) {
	mat, err := gocv.NewMatFromBytes(
		utils.DefaultFrameHeight,
		utils.DefaultFrameWidth,
		gocv.MatTypeCV8UC3,
		data,
	)

	if err != nil || mat.Empty() {
		if !mat.Empty() {
			mat.Close()
		}
		return gocv.Mat{}, fmt.Errorf("failed to create Mat from bytes")
	}

	return mat, nil
}

// detectFaces performs face detection on the frame
func (fp *FrameProcessor) detectFaces(mat gocv.Mat) []models.FaceDetection {
	if !fp.session.FaceDetectionEnabled || fp.faceDetector == nil {
		return nil
	}

	detections, err := fp.faceDetector.DetectFaces(mat)
	if err != nil {
		utils.GetLogger().Debugf("Face detection error: %v", err)
		return nil
	}

	if len(detections) > 0 {
		fp.manager.IncrementFaceCount(int64(len(detections)))
	}

	return detections
}

// renderOverlay draws detection results on the frame
func (fp *FrameProcessor) renderOverlay(mat gocv.Mat, detections []models.FaceDetection) {
	if fp.overlay == nil || !fp.overlay.IsEnabled() {
		return
	}

	fps := 0.0
	if fp.perfMonitor != nil {
		fps = fp.perfMonitor.GetProcessingFPS()
	}

	fp.overlay.RenderDetections(
		&mat,
		detections,
		fp.session.Camera.Name,
		fps,
		fp.frameCounter,
	)
}

// writeToOutput writes the processed frame to output FFmpeg
func (fp *FrameProcessor) writeToOutput(mat gocv.Mat) error {
	if fp.session.OutputFFmpeg == nil || fp.session.OutputFFmpeg.StdinPipe == nil {
		return fmt.Errorf("output pipe not available")
	}

	rawBytes := mat.ToBytes()
	_, err := fp.session.OutputFFmpeg.StdinPipe.Write(rawBytes)

	return err
}

// updateMetrics updates processing metrics
func (fp *FrameProcessor) updateMetrics(detections []models.FaceDetection) {
	fp.manager.IncrementFrameCount(1)

	// Periodic health check
	if fp.frameCounter%100 == 0 && fp.perfMonitor != nil {
		if isHealthy, msg := fp.perfMonitor.CheckPerformance(); !isHealthy {
			utils.GetLogger().Warnf("[Camera %s] Performance issue: %s",
				fp.session.CameraID, msg)
		}
	}
}

// ShouldStop determines if processing should stop
func (fp *FrameProcessor) ShouldStop(err error) bool {
	if err == io.EOF {
		utils.GetLogger().Warnf("[Camera %s] Stream ended", fp.session.CameraID)
		return true
	}

	if fp.consecutiveErrors >= utils.MaxConsecutiveErrors {
		utils.GetLogger().Errorf("[Camera %s] Too many consecutive errors (%d)",
			fp.session.CameraID, fp.consecutiveErrors)
		return true
	}

	return false
}

// Cleanup performs cleanup operations
func (fp *FrameProcessor) Cleanup() {
	// Cleanup resources if needed
	utils.GetLogger().Debugf("[Camera %s] Frame processor cleaned up", fp.session.CameraID)
}
