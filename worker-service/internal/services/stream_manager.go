package services

// ----------------------------------------------------------------------

import (
	"fmt"
	"math/rand"
	"os"
	"sync"
	"time"
	"worker-service/internal/config"
	"worker-service/internal/models"
	"worker-service/internal/utils"

	"github.com/google/uuid"
)

// ----------------------------------------------------------------------

const (
	maxReconnectAttempts = 10
	maxConsecutiveErrors = 10
	connectionTimeout    = 2 * time.Second
	stopTimeout          = 5 * time.Second
	defaultBytesPerPixel = 3 // BGR24

	// Exponential backoff configuration
	baseRetryDelay = 1 * time.Second
	maxRetryDelay  = 60 * time.Second // Cap at 1 minute
	jitterPercent  = 20               // ±20% random jitter
)

// ----------------------------------------------------------------------

type StreamManager struct {
	sessions               map[string]*StreamSession
	sessionsMutex          sync.RWMutex
	config                 *config.Config
	OptimalStreamCapacity  int
	mediamtxClient         *MediaMTXClient
	faceDetectionModelPath string
	alertService           *AlertService
}

type StartStreamResponse struct {
	CameraID     string `json:"cameraId"`
	StreamID     string `json:"streamId"`
	MediaMTXPath string `json:"mediamtxPath"`
	WebRTCUrl    string `json:"webrtcUrl"`
	HLSUrl       string `json:"hlsUrl"`
	RTSPUrl      string `json:"rtspUrl"`
	RTMPUrl      string `json:"rtmpUrl"`
}

func NewStreamManager(cfg *config.Config, mediamtxClient *MediaMTXClient, alertService *AlertService) *StreamManager {
	// Seed random for jitter
	rand.New(rand.NewSource(time.Now().UnixNano()))

	sm := &StreamManager{
		sessions:               make(map[string]*StreamSession),
		config:                 cfg,
		OptimalStreamCapacity:  cfg.OptimalStreamCapacity,
		mediamtxClient:         mediamtxClient,
		faceDetectionModelPath: findFaceDetectionModel(),
		alertService:           alertService,
	}

	if sm.faceDetectionModelPath == "" {
		utils.GetLogger().Warn("Face detection model not found - feature disabled")
	} else {
		utils.GetLogger().Infof("Face detection model found at %s", sm.faceDetectionModelPath)
	}

	return sm
}

// ----------------------------------------------------------------------

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
				return path
			}
		}
	}
	return ""
}

// Calculate exponential backoff with cap and jitter
func calculateBackoff(attempt int) time.Duration {
	// Exponential: 1s, 2s, 4s, 8s, 16s, 32s, 60s (capped)
	delay := baseRetryDelay * time.Duration(1<<uint(attempt))

	// Cap at maximum delay
	if delay > maxRetryDelay {
		delay = maxRetryDelay
	}

	// Add random jitter (±20%)
	jitterRange := float64(delay) * float64(jitterPercent) / 100.0
	jitter := time.Duration(rand.Float64()*jitterRange*2 - jitterRange)

	finalDelay := delay + jitter

	// Ensure minimum delay of 1 second
	if finalDelay < time.Second {
		finalDelay = time.Second
	}

	return finalDelay
}

// reconnection with exponential backoff
func (sm *StreamManager) runStreamSession(session *StreamSession) {
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
				// Set reconnecting status
				if reconnectAttempts > 0 {
					session.Status = models.StreamStatusReconnecting
				}

				if err := sm.connectAndStream(session); err != nil {
					reconnectAttempts++

					// Calculate exponential backoff
					backoff := calculateBackoff(reconnectAttempts)

					logger.Warnf("🔄 Connection failed for camera %s (attempt %d/%d): %v - retrying in %v",
						session.CameraID, reconnectAttempts, maxReconnectAttempts, err, backoff)

					if reconnectAttempts >= maxReconnectAttempts {
						logger.Errorf("❌ Max reconnect attempts reached for camera %s", session.CameraID)
						session.Status = models.StreamStatusError
						return
					}

					// Sleep with exponential backoff
					time.Sleep(backoff)
					continue
				}

				// Reset on successful connection
				reconnectAttempts = 0
				session.Status = models.StreamStatusStreaming
				logger.Infof("✅ Camera %s connected successfully", session.CameraID)

				// Start frame processing
				frameProcessor := NewFrameProcessor(session)
				go frameProcessor.ProcessFrames()
			}

			time.Sleep(100 * time.Millisecond)
		}
	}
}

func (sm *StreamManager) connectAndStream(session *StreamSession) error {
	logger := utils.GetLogger()
	logger.Infof("Connecting to RTSP: %s", session.Camera.RTSPUrl)

	session.Status = models.StreamStatusConnecting

	// Create MediaMTX path
	mediaPath := fmt.Sprintf("camera_%s", session.CameraID)
	if err := sm.mediamtxClient.CreatePath(mediaPath); err != nil {
		return err
	}

	// Start input FFmpeg
	if err := sm.startInputFFmpeg(session); err != nil {
		return err
	}

	// Start output FFmpeg
	if err := sm.startOutputFFmpeg(session); err != nil {
		session.inputFFmpeg.Close()
		return err
	}

	// Verify connection
	time.Sleep(5 * time.Second)
	if !session.inputFFmpeg.IsRunning() {
		return fmt.Errorf("FFmpeg exited immediately")
	}

	return nil
}

func (sm *StreamManager) createStreamSession(req *models.StartStreamRequest) (*StreamSession, error) {
	// Probe stream info from RTSP URL
	width, height, maxFPS, err := sm.probeStreamInfo(req.RTSPUrl)
	if err != nil {
		utils.GetLogger().Warnf("Failed to probe stream %s, using defaults: %v", req.RTSPUrl, err)
		width, height, maxFPS = 640, 480, 15 // Safe defaults
	}

	faceDetectionEnabled := req.FaceDetectionEnabled && len(sm.faceDetectionModelPath) > 0

	utils.GetLogger().Infof("Face detection for camera %s: %v (model exists: %v)",
		req.Name, faceDetectionEnabled, len(sm.faceDetectionModelPath) > 0)

	// Create session with frame metrics
	session := &StreamSession{
		CameraID: req.CameraID,
		Camera: &models.Camera{
			ID:       req.CameraID,
			Name:     req.Name,
			RTSPUrl:  req.RTSPUrl,
			Location: req.Location,
		},
		Status:    models.StreamStatusConnecting,
		StartTime: time.Now(),
		Stop:      make(chan bool, 1),
		Done:      make(chan bool, 1),

		detectedWidth:  width,
		detectedHeight: height,
		detectedMaxFPS: maxFPS,
		targetFPS:      maxFPS,

		faceDetector:         NewFaceDetectionEngine(req.CameraID, sm.faceDetectionModelPath),
		overlay:              NewOverlayRenderer(req.CameraID),
		faceDetectionEnabled: faceDetectionEnabled,
		alertService:         sm.alertService,
		alertCooldown:        5 * time.Second,
		lastAlertTime:        time.Time{},

		// Initialize frame metrics
		totalFramesReceived:  0,
		totalFramesProcessed: 0,
		totalFramesDropped:   0,
		lastMetricsLog:       time.Now(),
	}

	// Initialize face detection if available
	if session.faceDetectionEnabled {
		if err := session.faceDetector.Initialize(); err != nil {
			utils.GetLogger().Warnf("Face detection disabled for camera %s: %v", session.CameraID, err)
			session.faceDetectionEnabled = false
		}
	}

	return session, nil
}

func (sm *StreamManager) buildStreamResponse(req *models.StartStreamRequest, session *StreamSession) *StartStreamResponse {
	streamID := uuid.New().String()
	mediaPath := fmt.Sprintf("camera_%s", req.CameraID)

	return &StartStreamResponse{
		CameraID:     req.CameraID,
		StreamID:     streamID,
		MediaMTXPath: mediaPath,
		WebRTCUrl:    fmt.Sprintf("http://localhost:%d/%s", sm.config.MediaMTXWebRTCPort, mediaPath),
		HLSUrl:       fmt.Sprintf("http://localhost:%d/%s/index.m3u8", sm.config.MediaMTXHLSPort, mediaPath),
		RTSPUrl:      fmt.Sprintf("rtsp://localhost:%d/%s", sm.config.MediaMTXRTSPPort, mediaPath),
		RTMPUrl:      fmt.Sprintf("rtmp://localhost:%d/%s", sm.config.MediaMTXRTMPPort, mediaPath),
	}
}

func (sm *StreamManager) cleanupFailedSession(session *StreamSession) {
	utils.GetLogger().Warnf("Cleaning up failed session for camera %s", session.CameraID)
	session.Cleanup()

	// Signal stop
	select {
	case session.Stop <- true:
	default:
	}

	sm.unregisterSession(session.CameraID)
}
