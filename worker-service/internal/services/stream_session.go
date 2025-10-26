package services

// ----------------------------------------------------------------------

import (
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
}

// ----------------------------------------------------------------------

func (s *StreamSession) IsActive() bool {
	return s.Status == models.StreamStatusStreaming
}

func (s *StreamSession) GetUptime() time.Duration {
	return time.Since(s.StartTime)
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
