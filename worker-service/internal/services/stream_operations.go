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

func (sm *StreamManager) validateStreamStart(cameraID string) error {
	sm.sessionsMutex.RLock()
	defer sm.sessionsMutex.RUnlock()

	if _, exists := sm.sessions[cameraID]; exists {
		return fmt.Errorf("stream already active for camera %s", cameraID)
	}

	if len(sm.sessions) >= sm.maxConcurrentStreams {
		return fmt.Errorf("maximum concurrent streams (%d) reached", sm.maxConcurrentStreams)
	}

	return nil
}

func (sm *StreamManager) registerSession(session *StreamSession) {
	sm.sessionsMutex.Lock()
	sm.sessions[session.CameraID] = session
	sm.sessionsMutex.Unlock()
}

func (sm *StreamManager) unregisterSession(cameraID string) {
	sm.sessionsMutex.Lock()
	delete(sm.sessions, cameraID)
	sm.sessionsMutex.Unlock()
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
