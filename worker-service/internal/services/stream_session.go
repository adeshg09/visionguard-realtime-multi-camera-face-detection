package services

// ----------------------------------------------------------------------

import (
	"sync/atomic"
	"time"
	"worker-service/internal/models"
)

// ----------------------------------------------------------------------

type StreamSession struct {
	// Identity
	CameraID string
	Camera   *models.Camera

	// State
	Status    models.StreamStatus
	StartTime time.Time

	// Control channels
	Stop chan bool
	Done chan bool

	// Processing pipeline
	inputFFmpeg  *FFmpegProcess
	outputFFmpeg *FFmpegProcess
	faceDetector *FaceDetectionEngine
	overlay      *OverlayRenderer

	// Configuration
	faceDetectionEnabled bool
	detectedWidth        int
	detectedHeight       int
	detectedMaxFPS       int
	targetFPS            int

	// Alert service
	alertService  *AlertService
	lastAlertTime time.Time
	alertCooldown time.Duration

	// Frame metrics (atomic for thread-safe updates)
	totalFramesReceived  int64
	totalFramesProcessed int64
	totalFramesDropped   int64
	lastMetricsLog       time.Time
}

// ----------------------------------------------------------------------

func (s *StreamSession) IsActive() bool {
	return s.Status == models.StreamStatusStreaming
}

func (s *StreamSession) GetUptime() time.Duration {
	return time.Since(s.StartTime)
}

// Thread-safe frame metric updates
func (s *StreamSession) IncrementFramesReceived() {
	atomic.AddInt64(&s.totalFramesReceived, 1)
}

func (s *StreamSession) IncrementFramesProcessed() {
	atomic.AddInt64(&s.totalFramesProcessed, 1)
}

func (s *StreamSession) IncrementFramesDropped() {
	atomic.AddInt64(&s.totalFramesDropped, 1)
}

// Get frame metrics safely
func (s *StreamSession) GetFrameMetrics() (received, processed, dropped int64) {
	received = atomic.LoadInt64(&s.totalFramesReceived)
	processed = atomic.LoadInt64(&s.totalFramesProcessed)
	dropped = atomic.LoadInt64(&s.totalFramesDropped)
	return
}

func (s *StreamSession) Cleanup() {
	if s.faceDetector != nil {
		s.faceDetector.Close()
	}
	if s.inputFFmpeg != nil {
		s.inputFFmpeg.Close()
	}
	if s.outputFFmpeg != nil {
		s.outputFFmpeg.Close()
	}
}
