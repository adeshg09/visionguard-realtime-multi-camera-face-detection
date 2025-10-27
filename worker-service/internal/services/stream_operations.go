package services

// ----------------------------------------------------------------------
import (
	"fmt"
	"time"
	"worker-service/internal/models"
	"worker-service/internal/utils"
)

// ----------------------------------------------------------------------

func (sm *StreamManager) StartStream(req *models.StartStreamRequest) (*StartStreamResponse, error) {
	if err := sm.validateStreamStart(req.CameraID); err != nil {
		return nil, err
	}

	session, err := sm.createStreamSession(req)
	if err != nil {
		return nil, err
	}

	sm.registerSession(session)
	go sm.runStreamSession(session)

	if err := sm.verifyStreamIsLive(session.CameraID, 15, 2*time.Second); err != nil {
		sm.cleanupFailedSession(session)
		return nil, fmt.Errorf("stream failed to start: %v", err)
	}

	return sm.buildStreamResponse(req, session), nil
}

func (sm *StreamManager) StopStream(cameraID string) (*models.StopStreamResponse, error) {
	session, err := sm.getSession(cameraID)
	if err != nil {
		return nil, err
	}

	utils.GetLogger().Infof("Stopping stream for camera %s", cameraID)
	session.Cleanup()

	select {
	case session.Stop <- true:
	default:
	}

	select {
	case <-session.Done:
	case <-time.After(stopTimeout):
		utils.GetLogger().Warnf("Stream stop timeout for camera %s", cameraID)
	}

	sm.unregisterSession(cameraID)
	utils.GetLogger().Infof("Stream stopped for camera %s", cameraID)

	return &models.StopStreamResponse{CameraID: cameraID}, nil
}

// validateStreamStart checks if a new stream can be started
func (sm *StreamManager) validateStreamStart(cameraID string) error {
	sm.sessionsMutex.RLock()
	defer sm.sessionsMutex.RUnlock()

	logger := utils.GetLogger()

	// Check if stream already exists for this camera
	if _, exists := sm.sessions[cameraID]; exists {
		return fmt.Errorf("stream already active for camera %s", cameraID)
	}

	// Get current active stream count
	currentStreams := len(sm.sessions)

	// warning about capacity
	if currentStreams >= sm.OptimalStreamCapacity {
		// Calculate how far over optimal capacity
		overCapacity := currentStreams - sm.OptimalStreamCapacity + 1

		if overCapacity <= 4 {
			// 5-8 streams: Warning but acceptable
			logger.Warnf("⚠️ Starting stream for camera %s: %d/%d streams (exceeding optimal capacity by %d)",
				cameraID, currentStreams+1, sm.OptimalStreamCapacity, overCapacity)
		} else {
			// 9+ streams: Critical warning
			logger.Errorf("🔴 Starting stream for camera %s: %d/%d streams (CRITICALLY OVERLOADED by %d streams - expect performance degradation)",
				cameraID, currentStreams+1, sm.OptimalStreamCapacity, overCapacity)
		}
	} else {
		// Within optimal capacity
		logger.Infof("✅ Starting stream for camera %s: %d/%d streams (within optimal capacity)",
			cameraID, currentStreams+1, sm.OptimalStreamCapacity)
	}

	return nil
}

func (sm *StreamManager) registerSession(session *StreamSession) {
	sm.sessionsMutex.Lock()
	sm.sessions[session.CameraID] = session
	sm.sessionsMutex.Unlock()

	logger := utils.GetLogger()
	logger.Infof("Session registered for camera %s (total active: %d)", session.CameraID, len(sm.sessions))
}

func (sm *StreamManager) unregisterSession(cameraID string) {
	sm.sessionsMutex.Lock()
	delete(sm.sessions, cameraID)
	activeCount := len(sm.sessions)
	sm.sessionsMutex.Unlock()

	logger := utils.GetLogger()
	logger.Infof("Session unregistered for camera %s (total active: %d)", cameraID, activeCount)
}

func (sm *StreamManager) getSession(cameraID string) (*StreamSession, error) {
	sm.sessionsMutex.RLock()
	defer sm.sessionsMutex.RUnlock()

	session, exists := sm.sessions[cameraID]
	if !exists {
		return nil, fmt.Errorf("stream not found for camera %s", cameraID)
	}
	return session, nil
}
