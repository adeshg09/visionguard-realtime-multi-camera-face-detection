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

// FrameDecoder handles decoding and buffering of video frames
type FrameDecoder struct {
	cameraID             string
	frameQueue           chan gocv.Mat
	maxQueueSize         int
	frameSkipInterval    int
	frameCounter         int64
	startTime            time.Time
	mutex                sync.RWMutex
	closed               bool
	faceDetectionEnabled bool
	lastFrameTime        time.Time
	totalFrames          int64
	metrics              *models.ProcessingMetrics
}

// NewFrameDecoder creates a new frame decoder
func NewFrameDecoder(cameraID string, maxQueueSize int, frameSkipInterval int) *FrameDecoder {
	return &FrameDecoder{
		cameraID:             cameraID,
		frameQueue:           make(chan gocv.Mat, maxQueueSize),
		maxQueueSize:         maxQueueSize,
		frameSkipInterval:    frameSkipInterval,
		frameCounter:         0,
		startTime:            time.Now(),
		closed:               false,
		faceDetectionEnabled: true,
		lastFrameTime:        time.Now(),
		metrics: &models.ProcessingMetrics{
			StreamID:              "",
			CameraID:              cameraID,
			FramesProcessed:       0,
			FacesDetected:         0,
			AverageProcessingTime: 0,
			CurrentFPS:            0,
			DetectionRate:         0,
			AverageConfidence:     0,
		},
	}
}

// PushFrame adds a frame to the processing queue
func (fd *FrameDecoder) PushFrame(frame gocv.Mat) error {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	if fd.closed {
		return fmt.Errorf("frame decoder is closed")
	}

	// Increment frame counter
	fd.frameCounter++
	fd.totalFrames++

	// Apply frame skipping
	if fd.frameSkipInterval > 0 && fd.frameCounter%int64(fd.frameSkipInterval) != 0 {
		return nil // Skip this frame
	}

	// Try to send frame, drop if queue is full (non-blocking)
	select {
	case fd.frameQueue <- frame.Clone():
		fd.lastFrameTime = time.Now()
		return nil
	default:
		// Queue full, drop frame to prevent blocking
		logger := utils.GetLogger()
		logger.Warnf("[FrameDecoder] Queue full for camera %s, dropping frame", fd.cameraID)
		return fmt.Errorf("frame queue full, frame dropped")
	}
}

// GetFrame retrieves a frame from the processing queue (blocking)
func (fd *FrameDecoder) GetFrame() (gocv.Mat, error) {
	select {
	case frame := <-fd.frameQueue:
		return frame, nil
	case <-time.After(5 * time.Second):
		return gocv.Mat{}, fmt.Errorf("timeout waiting for frame")
	}
}

// GetFrameNonBlocking retrieves a frame without blocking
func (fd *FrameDecoder) GetFrameNonBlocking() (gocv.Mat, error) {
	select {
	case frame := <-fd.frameQueue:
		return frame, nil
	default:
		return gocv.Mat{}, fmt.Errorf("no frame available")
	}
}

// QueueSize returns current queue size
func (fd *FrameDecoder) QueueSize() int {
	fd.mutex.RLock()
	defer fd.mutex.RUnlock()
	return len(fd.frameQueue)
}

// GetMetrics returns current processing metrics
func (fd *FrameDecoder) GetMetrics() *models.ProcessingMetrics {
	fd.mutex.RLock()
	defer fd.mutex.RUnlock()

	uptime := time.Since(fd.startTime).Seconds()
	currentFPS := float64(0)
	if uptime > 0 {
		currentFPS = float64(fd.totalFrames) / uptime
	}

	return &models.ProcessingMetrics{
		StreamID:              fd.metrics.StreamID,
		CameraID:              fd.cameraID,
		FramesProcessed:       fd.metrics.FramesProcessed,
		FacesDetected:         fd.metrics.FacesDetected,
		AverageProcessingTime: fd.metrics.AverageProcessingTime,
		CurrentFPS:            currentFPS,
		DetectionRate:         fd.metrics.DetectionRate,
		AverageConfidence:     fd.metrics.AverageConfidence,
	}
}

// UpdateMetrics updates the processing metrics
func (fd *FrameDecoder) UpdateMetrics(detectionCount int, processingTime int64, confidence float32) {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	fd.metrics.FramesProcessed++
	fd.metrics.FacesDetected += int64(detectionCount)

	// Update average processing time
	totalTime := fd.metrics.CumulativeProcessingTime + processingTime
	fd.metrics.CumulativeProcessingTime = totalTime
	if fd.metrics.FramesProcessed > 0 {
		fd.metrics.AverageProcessingTime = float64(totalTime) / float64(fd.metrics.FramesProcessed)
	}

	// Update detection rate
	if fd.metrics.FramesProcessed > 0 {
		fd.metrics.DetectionRate = float64(fd.metrics.FacesDetected) / float64(fd.metrics.FramesProcessed)
	}

	// Update average confidence
	if detectionCount > 0 && fd.metrics.FacesDetected > 0 {
		totalConfidence := fd.metrics.AverageConfidence * float64(fd.metrics.FacesDetected-int64(detectionCount))
		totalConfidence += float64(confidence) * float64(detectionCount)
		fd.metrics.AverageConfidence = totalConfidence / float64(fd.metrics.FacesDetected)
	}

	if detectionCount > 0 {
		fd.metrics.LastDetectionTime = time.Now().Unix()
	}
}

// SetFaceDetectionEnabled enables/disables face detection processing
func (fd *FrameDecoder) SetFaceDetectionEnabled(enabled bool) {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()
	fd.faceDetectionEnabled = enabled
}

// IsFaceDetectionEnabled returns if face detection is enabled
func (fd *FrameDecoder) IsFaceDetectionEnabled() bool {
	fd.mutex.RLock()
	defer fd.mutex.RUnlock()
	return fd.faceDetectionEnabled
}

// SetFrameSkipInterval changes the frame skip interval
func (fd *FrameDecoder) SetFrameSkipInterval(interval int) {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()
	fd.frameSkipInterval = interval
}

// Close closes the frame decoder and cleans up resources
func (fd *FrameDecoder) Close() error {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	if fd.closed {
		return fmt.Errorf("frame decoder already closed")
	}

	fd.closed = true

	// Drain and release all frames in queue
	for {
		select {
		case frame := <-fd.frameQueue:
			frame.Close()
		default:
			close(fd.frameQueue)
			return nil
		}
	}
}

// DrawDetections draws bounding boxes and text on a frame using gocv
func (fd *FrameDecoder) DrawDetections(frame *gocv.Mat, detections []models.FaceDetection, config *models.OverlayConfig, cameraName string, fps float64, frameNum int64) error {
	if !config.Enabled {
		return nil
	}

	logger := utils.GetLogger()

	if frame == nil || frame.Empty() {
		return fmt.Errorf("invalid or empty frame")
	}

	// Convert colors to color.RGBA (used for drawing operations)
	boxColor := color.RGBA{
		R: config.BoxColor.R,
		G: config.BoxColor.G,
		B: config.BoxColor.B,
		A: 255, // Fully opaque
	}

	textColor := color.RGBA{
		R: config.TextColor.R,
		G: config.TextColor.G,
		B: config.TextColor.B,
		A: 255,
	}

	// Draw bounding boxes for each detected face
	if config.DrawBoundingBox {
		for i, detection := range detections {
			pt1 := image.Pt(int(detection.X), int(detection.Y))
			pt2 := image.Pt(int(detection.X+detection.Width), int(detection.Y+detection.Height))

			// Draw bounding box
			gocv.Rectangle(frame, image.Rectangle{Min: pt1, Max: pt2}, boxColor, config.LineWidth)

			// Draw confidence if enabled
			if config.ShowConfidence {
				confidenceText := fmt.Sprintf("%.0f%%", detection.Confidence*100)
				gocv.PutText(frame, confidenceText, image.Pt(int(detection.X), int(detection.Y)-5),
					gocv.FontHersheyPlain, 1.0, textColor, 1)
			}

			logger.Debugf("[DrawDetections] Face %d at (%d,%d) size %dx%d confidence %.2f",
				i+1, detection.X, detection.Y, detection.Width, detection.Height, detection.Confidence)
		}
	}

	// Draw overlay text (Camera ID, FPS, Detection count)
	if config.DrawText {
		// Draw FPS in top-left
		if config.ShowFPS {
			fpsText := fmt.Sprintf("FPS: %.1f", fps)
			gocv.PutText(frame, fpsText, image.Pt(10, 30),
				gocv.FontHersheyPlain, 1.2, textColor, 2)
		}

		// Draw Camera ID in top-right
		if config.ShowCameraID {
			cameraText := fmt.Sprintf("Camera: %s", cameraName)
			gocv.PutText(frame, cameraText, image.Pt(frame.Cols()-200, 30),
				gocv.FontHersheyPlain, 1.2, textColor, 2)
		}

		// Draw detection count in bottom-left
		if config.ShowDetectionCount {
			detectionText := fmt.Sprintf("Faces: %d", len(detections))
			gocv.PutText(frame, detectionText, image.Pt(10, frame.Rows()-10),
				gocv.FontHersheyPlain, 1.2, textColor, 2)
		}

		// Draw frame number in bottom-right
		frameText := fmt.Sprintf("Frame: %d", frameNum)
		gocv.PutText(frame, frameText, image.Pt(frame.Cols()-150, frame.Rows()-10),
			gocv.FontHersheyPlain, 1.0, textColor, 1)
	}

	return nil
}

// ResizeFrame resizes a frame to specified dimensions
func (fd *FrameDecoder) ResizeFrame(frame *gocv.Mat, width, height int) gocv.Mat {
	if frame == nil || frame.Empty() {
		return gocv.Mat{}
	}

	resized := gocv.NewMat()
	gocv.Resize(*frame, &resized, image.Pt(width, height), 0, 0, gocv.InterpolationLinear)
	return resized
}

// ConvertToGray converts frame to grayscale
func (fd *FrameDecoder) ConvertToGray(frame *gocv.Mat) gocv.Mat {
	if frame == nil || frame.Empty() {
		return gocv.Mat{}
	}

	gray := gocv.NewMat()
	gocv.CvtColor(*frame, &gray, gocv.ColorBGRToGray)
	return gray
}

// FrameInfo returns information about a frame
func (fd *FrameDecoder) FrameInfo(frame *gocv.Mat) *models.FrameProcessingStats {
	if frame == nil || frame.Empty() {
		return nil
	}

	return &models.FrameProcessingStats{
		Width:        int32(frame.Cols()),
		Height:       int32(frame.Rows()),
		ChannelCount: int32(frame.Channels()),
		BytesSize:    int64(frame.Cols() * frame.Rows() * frame.Channels()),
	}
}
