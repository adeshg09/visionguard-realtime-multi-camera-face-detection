package services

// ----------------------------------------------------------------------

import (
	"fmt"
	"worker-service/internal/utils"
)

// ----------------------------------------------------------------------

func (sm *StreamManager) ToggleFaceDetection(cameraID string, enabled bool) error {
	session, err := sm.getSession(cameraID)
	if err != nil {
		return err
	}

	utils.GetLogger().Infof("Toggling face detection for camera %s to %v", cameraID, enabled)
	session.faceDetectionEnabled = enabled
	return nil
}

func (sm *StreamManager) UpdateFPS(cameraID string, targetFPS int) error {
	session, err := sm.getSession(cameraID)
	if err != nil {
		return err
	}

	if targetFPS > session.detectedMaxFPS {
		return fmt.Errorf("target FPS (%d) exceeds camera maximum (%d)", targetFPS, session.detectedMaxFPS)
	}

	if targetFPS < 1 {
		return fmt.Errorf("target FPS must be at least 1")
	}

	utils.GetLogger().Infof("Updating FPS for camera %s: %d -> %d", cameraID, session.targetFPS, targetFPS)
	session.targetFPS = targetFPS
	return nil
}
