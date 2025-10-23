package stream

import (
	"fmt"
	"time"
	"worker-service/internal/models"
	"worker-service/internal/services"
	"worker-service/internal/utils"
)

// SessionManager handles stream session lifecycle
type SessionManager struct {
	ffmpegManager *FFmpegManager
}

// NewSessionManager creates a new session manager
func NewSessionManager() *SessionManager {
	return &SessionManager{
		ffmpegManager: NewFFmpegManager(),
	}
}

// CreateSession creates a new stream session with all dependencies
func (sm *SessionManager) CreateSession(
	req *models.StartStreamRequest,
	modelPath string,
) (*models.StreamSession, error) {
	session := models.NewStreamSession(
		req.CameraID,
		req.Name,
		req.RTSPUrl,
		// req.Location,
		req.FPS,
	)

	// Initialize frame decoder
	services.NewFrameDecoder(req.CameraID, 10, 2)

	// Initialize face detector
	faceDetector := services.NewFaceDetectionEngine(req.CameraID, modelPath, 0.85)
	faceDetectionEnabled := len(modelPath) > 0

	if faceDetectionEnabled {
		if err := faceDetector.Initialize(); err != nil {
			utils.GetLogger().Warnf("Face detection disabled for camera %s: %v",
				req.CameraID, err)
			faceDetectionEnabled = false
		}
	}

	session.FaceDetectionEnabled = faceDetectionEnabled

	// Initialize overlay renderer
	services.NewOverlayRenderer(req.CameraID)

	// Initialize performance optimizer
	services.NewPerformanceOptimizer(req.CameraID, req.FPS, 100)

	return session, nil
}

// StartConnection establishes FFmpeg connections for the session
func (sm *SessionManager) StartConnection(
	session *models.StreamSession,
	mediamtxClient *services.MediaMTXClient,
) error {
	logger := utils.GetLogger()
	logger.Infof("Connecting to RTSP: %s", session.Camera.RTSPUrl)

	session.Status = models.StreamStatusConnecting

	// Create MediaMTX path
	mediaPath := fmt.Sprintf("camera_%s", session.CameraID)
	if err := mediamtxClient.CreatePath(mediaPath); err != nil {
		return fmt.Errorf("failed to create media path: %w", err)
	}

	// Start input FFmpeg
	if err := sm.ffmpegManager.StartInputFFmpeg(session); err != nil {
		return fmt.Errorf("failed to start input FFmpeg: %w", err)
	}

	// Start output FFmpeg
	if err := sm.ffmpegManager.StartOutputFFmpeg(session); err != nil {
		sm.ffmpegManager.CleanupFFmpegProcesses(session)
		return fmt.Errorf("failed to start output FFmpeg: %w", err)
	}

	// Verify connection
	time.Sleep(time.Duration(utils.ConnectionTimeout) * time.Second)
	if !session.InputFFmpeg.IsRunning() {
		sm.ffmpegManager.CleanupFFmpegProcesses(session)
		return fmt.Errorf("FFmpeg input process exited immediately")
	}

	session.Status = models.StreamStatusStreaming
	return nil
}

// StopSession stops a stream session and cleans up resources
func (sm *SessionManager) StopSession(session *models.StreamSession) {
	logger := utils.GetLogger()
	logger.Infof("Stopping session for camera %s", session.CameraID)

	// Cleanup FFmpeg processes
	sm.ffmpegManager.CleanupFFmpegProcesses(session)

	// Signal stop
	select {
	case session.Stop <- true:
	default:
	}

	// Wait for completion with timeout
	select {
	case <-session.Done:
		logger.Debugf("Session %s stopped gracefully", session.CameraID)
	case <-time.After(time.Duration(utils.StopTimeout) * time.Second):
		logger.Warnf("Session %s stop timeout", session.CameraID)
	}
}

// GetServiceComponents returns service components for a session
func (sm *SessionManager) GetServiceComponents(
	cameraID string,
	modelPath string,
	fps int,
) (*services.FrameDecoder, *services.FaceDetectionEngine, *services.OverlayRenderer, *services.PerformanceOptimizer) {
	frameDecoder := services.NewFrameDecoder(cameraID, 10, 2)
	faceDetector := services.NewFaceDetectionEngine(cameraID, modelPath, 0.85)
	overlay := services.NewOverlayRenderer(cameraID)
	perfMonitor := services.NewPerformanceOptimizer(cameraID, fps, 100)

	// Initialize face detector if model path exists
	if len(modelPath) > 0 {
		if err := faceDetector.Initialize(); err != nil {
			utils.GetLogger().Warnf("Face detection initialization failed: %v", err)
		}
	}

	return frameDecoder, faceDetector, overlay, perfMonitor
}
