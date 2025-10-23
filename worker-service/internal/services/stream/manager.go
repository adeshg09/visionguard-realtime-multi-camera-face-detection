package stream

import (
	"fmt"
	"os"
	"sync"
	"time"
	"worker-service/internal/models"
	"worker-service/internal/services"
	"worker-service/internal/utils"

	"github.com/google/uuid"
)

// Manager handles multiple stream sessions
type Manager struct {
	// Core
	sessions             map[string]*models.StreamSession
	sessionsMutex        sync.RWMutex
	maxConcurrentStreams int
	mediamtxClient       *services.MediaMTXClient
	sessionManager       *SessionManager

	// Statistics
	startTime            time.Time
	totalProcessedFrames int64
	totalDetectedFaces   int64
	statsMutex           sync.Mutex

	// Configuration
	faceDetectionModelPath string
}

// NewManager creates a new stream manager
func NewManager(maxConcurrentStreams int, mediamtxClient *services.MediaMTXClient) *Manager {
	return &Manager{
		sessions:               make(map[string]*models.StreamSession),
		maxConcurrentStreams:   maxConcurrentStreams,
		mediamtxClient:         mediamtxClient,
		sessionManager:         NewSessionManager(),
		startTime:              time.Now(),
		faceDetectionModelPath: findFaceDetectionModel(),
	}
}

// findFaceDetectionModel locates the face detection model directory
func findFaceDetectionModel() string {
	possiblePaths := []string{
		"/app/models",
		"./models",
		"/models",
		os.Getenv("FACE_MODEL_PATH"),
	}

	for _, path := range possiblePaths {
		if path != "" {
			if info, err := os.Stat(path); err == nil && info.IsDir() {
				utils.GetLogger().Infof("Face detection model found at %s", path)
				return path
			}
		}
	}

	utils.GetLogger().Warn("Face detection model not found - feature disabled")
	return ""
}

// StartStream starts a new camera stream
func (m *Manager) StartStream(req *models.StartStreamRequest) (*models.StartStreamResponse, error) {
	logger := utils.GetLogger()

	// Validate request
	if err := m.validateStreamStart(req.CameraID); err != nil {
		return nil, err
	}

	// Create session
	session, err := m.sessionManager.CreateSession(req, m.faceDetectionModelPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	// Register session
	m.registerSession(session)

	// Start connection
	if err := m.sessionManager.StartConnection(session, m.mediamtxClient); err != nil {
		m.unregisterSession(req.CameraID)
		return nil, fmt.Errorf("failed to connect: %w", err)
	}

	// Start processing goroutine
	go m.runStreamSession(session)

	logger.Infof("Stream started: camera=%s, faceDetection=%v",
		req.Name, session.FaceDetectionEnabled)

	return m.buildStreamResponse(req, session), nil
}

// validateStreamStart validates if stream can be started
func (m *Manager) validateStreamStart(cameraID string) error {
	m.sessionsMutex.RLock()
	defer m.sessionsMutex.RUnlock()

	if _, exists := m.sessions[cameraID]; exists {
		return fmt.Errorf("stream already active for camera %s", cameraID)
	}

	if len(m.sessions) >= m.maxConcurrentStreams {
		return fmt.Errorf("maximum concurrent streams (%d) reached", m.maxConcurrentStreams)
	}

	return nil
}

// registerSession adds a session to the registry
func (m *Manager) registerSession(session *models.StreamSession) {
	m.sessionsMutex.Lock()
	m.sessions[session.CameraID] = session
	m.sessionsMutex.Unlock()
}

// unregisterSession removes a session from the registry
func (m *Manager) unregisterSession(cameraID string) {
	m.sessionsMutex.Lock()
	delete(m.sessions, cameraID)
	m.sessionsMutex.Unlock()
}

// buildStreamResponse creates the stream start response
func (m *Manager) buildStreamResponse(req *models.StartStreamRequest, session *models.StreamSession) *models.StartStreamResponse {
	streamID := uuid.New().String()
	mediaPath := fmt.Sprintf("camera_%s", req.CameraID)

	return &models.StartStreamResponse{
		Success:      true,
		CameraID:     req.CameraID,
		StreamID:     streamID,
		MediaMTXPath: mediaPath,
		WebRTCUrl:    fmt.Sprintf("http://localhost:%d/%s", utils.MediaMTXWebRTCPort, mediaPath),
		HLSUrl:       fmt.Sprintf("http://localhost:%d/%s/index.m3u8", utils.MediaMTXHLSPort, mediaPath),
		RTSPUrl:      fmt.Sprintf("rtsp://localhost:%d/%s", utils.MediaMTXRTSPPort, mediaPath),
		RTMPUrl:      fmt.Sprintf("rtmp://localhost:%d/%s", utils.MediaMTXRTMPPort, mediaPath),
		Message:      fmt.Sprintf("Stream started successfully for camera %s", req.Name),
	}
}

// StopStream stops a camera stream
func (m *Manager) StopStream(cameraID string) (*models.StopStreamResponse, error) {
	logger := utils.GetLogger()

	session, err := m.getSession(cameraID)
	if err != nil {
		return nil, err
	}

	logger.Infof("Stopping stream for camera %s", cameraID)

	// Stop the session
	m.sessionManager.StopSession(session)

	// Unregister
	m.unregisterSession(cameraID)

	logger.Infof("Stream stopped for camera %s", cameraID)

	return &models.StopStreamResponse{
		Success:  true,
		CameraID: cameraID,
		Message:  fmt.Sprintf("Stream stopped successfully for camera %s", cameraID),
	}, nil
}

// getSession retrieves a session by camera ID
func (m *Manager) getSession(cameraID string) (*models.StreamSession, error) {
	m.sessionsMutex.RLock()
	defer m.sessionsMutex.RUnlock()

	session, exists := m.sessions[cameraID]
	if !exists {
		return nil, fmt.Errorf("stream not found for camera %s", cameraID)
	}

	return session, nil
}

// runStreamSession runs the main stream processing loop
func (m *Manager) runStreamSession(session *models.StreamSession) {
	logger := utils.GetLogger()
	defer func() { session.Done <- true }()

	reconnectAttempts := 0

	for {
		select {
		case <-session.Stop:
			logger.Infof("Stop signal received for camera %s", session.CameraID)
			session.Status = models.StreamStatusStopped
			return

		default:
			if session.Status != models.StreamStatusStreaming {
				if err := m.sessionManager.StartConnection(session, m.mediamtxClient); err != nil {
					reconnectAttempts++

					if reconnectAttempts >= utils.MaxReconnectAttempts {
						logger.Errorf("Max reconnect attempts reached for camera %s", session.CameraID)
						return
					}

					backoff := time.Duration(reconnectAttempts) * time.Second
					logger.Infof("Retrying in %v", backoff)
					time.Sleep(backoff)
					continue
				}

				reconnectAttempts = 0
				session.Status = models.StreamStatusStreaming
				logger.Infof("Camera %s connected successfully", session.CameraID)

				go m.processFrames(session)
			}

			time.Sleep(100 * time.Millisecond)
		}
	}
}

// processFrames processes frames from the stream
func (m *Manager) processFrames(session *models.StreamSession) {
	logger := utils.GetLogger()
	logger.Infof("Starting frame processing for camera %s", session.CameraID)

	// Get service components
	frameDecoder, faceDetector, overlay, perfMonitor := m.sessionManager.GetServiceComponents(
		session.CameraID,
		m.faceDetectionModelPath,
		session.Camera.FPS,
	)
	defer faceDetector.Close()

	// Create frame processor
	processor := NewFrameProcessor(session, m, frameDecoder, faceDetector, overlay, perfMonitor)
	defer processor.Cleanup()

	for {
		select {
		case <-session.Stop:
			logger.Infof("Frame processing stopped for camera %s", session.CameraID)
			return

		default:
			if err := processor.ProcessNextFrame(); err != nil {
				if processor.ShouldStop(err) {
					session.Status = models.StreamStatusError
					return
				}
			}
		}
	}
}

// ToggleFaceDetection enables/disables face detection for a stream
func (m *Manager) ToggleFaceDetection(cameraID string, enabled bool) error {
	logger := utils.GetLogger()

	session, err := m.getSession(cameraID)
	if err != nil {
		return err
	}

	logger.Infof("Toggling face detection for camera %s to %v", cameraID, enabled)
	session.FaceDetectionEnabled = enabled

	return nil
}

// UpdateFrameSkipInterval updates the frame skip interval for a stream
func (m *Manager) UpdateFrameSkipInterval(cameraID string, interval int) error {
	logger := utils.GetLogger()

	_, err := m.getSession(cameraID)
	if err != nil {
		return err
	}

	if interval < 1 {
		return fmt.Errorf("invalid frame skip interval: %d (must be >= 1)", interval)
	}

	logger.Infof("Updating frame skip interval for camera %s to %d", cameraID, interval)

	return nil
}

// GetAllStreams returns all active stream sessions
func (m *Manager) GetAllStreams() map[string]*models.StreamSession {
	m.sessionsMutex.RLock()
	defer m.sessionsMutex.RUnlock()

	result := make(map[string]*models.StreamSession, len(m.sessions))
	for k, v := range m.sessions {
		result[k] = v
	}
	return result
}

// GetHealthStatus returns the health status of the stream manager
func (m *Manager) GetHealthStatus() *models.HealthCheckResponse {
	m.sessionsMutex.RLock()
	activeCount := len(m.sessions)
	streamStatuses := make(map[string]models.StreamStatus, len(m.sessions))
	for cameraID, session := range m.sessions {
		streamStatuses[cameraID] = session.Status
	}
	m.sessionsMutex.RUnlock()

	return &models.HealthCheckResponse{
		Status:               "healthy",
		Timestamp:            time.Now().Format(time.RFC3339),
		Service:              "VisionGuard Worker Service",
		Version:              "1.0.0",
		ActiveStreams:        activeCount,
		MaxConcurrentStreams: m.maxConcurrentStreams,
		StreamSessions:       streamStatuses,
	}
}

// IncrementFrameCount increments the total processed frames counter
func (m *Manager) IncrementFrameCount(amount int64) {
	m.statsMutex.Lock()
	m.totalProcessedFrames += amount
	m.statsMutex.Unlock()
}

// IncrementFaceCount increments the total detected faces counter
func (m *Manager) IncrementFaceCount(amount int64) {
	m.statsMutex.Lock()
	m.totalDetectedFaces += amount
	m.statsMutex.Unlock()
}
