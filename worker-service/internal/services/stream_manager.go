package services

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
	"worker-service/internal/models"
	"worker-service/internal/utils"

	"github.com/google/uuid"
	"gocv.io/x/gocv"
)

// ==================== CONFIGURATION ====================

const (
	defaultFrameWidth    = 1920
	defaultFrameHeight   = 1080
	defaultFPS           = 30
	defaultBytesPerPixel = 3 // BGR24

	maxReconnectAttempts = 5
	maxConsecutiveErrors = 10
	connectionTimeout    = 2 * time.Second
	stopTimeout          = 5 * time.Second

	mediaMTXRTMPPort   = 1935
	mediaMTXWebRTCPort = 8889
	mediaMTXHLSPort    = 8888
	mediaMTXRTSPPort   = 8554
)

// ==================== STREAM SESSION ====================

// StreamSession represents an active camera stream
type StreamSession struct {
	// Identity
	CameraID string
	Camera   *models.Camera

	// State
	Status    models.StreamStatus
	StartTime time.Time

	// Metrics
	FrameCount    int64
	LastFrameTime time.Time
	ErrorCount    int
	LastError     error

	// Control channels
	Reconnect chan bool
	Stop      chan bool
	Done      chan bool

	// Processing pipeline
	inputFFmpeg  *FFmpegProcess
	outputFFmpeg *FFmpegProcess
	frameDecoder *FrameDecoder
	faceDetector *FaceDetectionEngine
	overlay      *OverlayRenderer
	perfMonitor  *PerformanceOptimizer

	// Configuration
	faceDetectionEnabled bool
}

// ==================== FFMPEG WRAPPER ====================

// FFmpegProcess wraps an FFmpeg process for cleaner management
type FFmpegProcess struct {
	cmd         *exec.Cmd
	stdinPipe   io.WriteCloser
	stdoutPipe  io.ReadCloser
	streamID    string
	processType string // "input" or "output"
}

func (fp *FFmpegProcess) Start() error {
	return fp.cmd.Start()
}

func (fp *FFmpegProcess) Kill() error {
	if fp.cmd != nil && fp.cmd.Process != nil {
		return fp.cmd.Process.Kill()
	}
	return nil
}

func (fp *FFmpegProcess) IsRunning() bool {
	if fp.cmd == nil || fp.cmd.ProcessState == nil {
		return true // Not started yet or still running
	}
	return !fp.cmd.ProcessState.Exited()
}

func (fp *FFmpegProcess) Close() {
	if fp.stdinPipe != nil {
		fp.stdinPipe.Close()
	}
	if fp.stdoutPipe != nil {
		fp.stdoutPipe.Close()
	}
	fp.Kill()
}

// ==================== STREAM MANAGER ====================

type StreamManager struct {
	// Core
	sessions             map[string]*StreamSession
	sessionsMutex        sync.RWMutex
	maxConcurrentStreams int
	mediamtxClient       *MediaMTXClient

	// Statistics
	startTime            time.Time
	totalProcessedFrames int64
	totalDetectedFaces   int64
	statsMutex           sync.Mutex

	// Configuration
	faceDetectionModelPath string
}

// ==================== INITIALIZATION ====================

func NewStreamManager(maxConcurrentStreams int, mediamtxClient *MediaMTXClient) *StreamManager {
	sm := &StreamManager{
		sessions:               make(map[string]*StreamSession),
		maxConcurrentStreams:   maxConcurrentStreams,
		mediamtxClient:         mediamtxClient,
		startTime:              time.Now(),
		faceDetectionModelPath: findFaceDetectionModel(),
	}

	sm.validateFaceDetectionModel()
	return sm
}

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

func (sm *StreamManager) validateFaceDetectionModel() {
	logger := utils.GetLogger()

	if sm.faceDetectionModelPath == "" {
		logger.Warn("Face detection model not found - feature disabled")
		return
	}

	logger.Infof("Face detection model found at %s", sm.faceDetectionModelPath)
}

// ==================== STREAM LIFECYCLE ====================

func (sm *StreamManager) StartStream(req *models.StartStreamRequest) (*models.StartStreamResponse, error) {
	logger := utils.GetLogger()

	// Validation
	if err := sm.validateStreamStart(req.CameraID); err != nil {
		return nil, err
	}

	// Create session
	session := sm.createStreamSession(req)

	// Initialize components
	if err := sm.initializeSessionComponents(session); err != nil {
		return nil, fmt.Errorf("failed to initialize session: %w", err)
	}

	// Register and start
	sm.registerSession(session)
	go sm.runStreamSession(session)

	// Wait for connection
	if err := sm.waitForStreamConnection(session, connectionTimeout); err != nil {
		sm.unregisterSession(req.CameraID)
		return nil, err
	}

	logger.Infof("Stream started: camera=%s, faceDetection=%v",
		req.Name, session.faceDetectionEnabled)

	return sm.buildStreamResponse(req, session), nil
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

func (sm *StreamManager) createStreamSession(req *models.StartStreamRequest) *StreamSession {
	return &StreamSession{
		CameraID:  req.CameraID,
		Camera:    &models.Camera{ID: req.CameraID, Name: req.Name, RTSPUrl: req.RTSPUrl, FPS: req.FPS},
		Status:    models.StreamStatusConnecting,
		StartTime: time.Now(),
		Reconnect: make(chan bool, 1),
		Stop:      make(chan bool, 1),
		Done:      make(chan bool, 1),

		frameDecoder:         NewFrameDecoder(req.CameraID, 10, 2),
		faceDetector:         NewFaceDetectionEngine(req.CameraID, sm.faceDetectionModelPath, 0.85),
		overlay:              NewOverlayRenderer(req.CameraID),
		perfMonitor:          NewPerformanceOptimizer(req.CameraID, req.FPS, 100),
		faceDetectionEnabled: len(sm.faceDetectionModelPath) > 0,
	}
}

func (sm *StreamManager) initializeSessionComponents(session *StreamSession) error {
	if !session.faceDetectionEnabled {
		return nil
	}

	if err := session.faceDetector.Initialize(); err != nil {
		utils.GetLogger().Warnf("Face detection disabled for camera %s: %v",
			session.CameraID, err)
		session.faceDetectionEnabled = false
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

func (sm *StreamManager) waitForStreamConnection(session *StreamSession, timeout time.Duration) error {
	time.Sleep(timeout)

	sm.sessionsMutex.RLock()
	status := session.Status
	sm.sessionsMutex.RUnlock()

	if status == models.StreamStatusError {
		return fmt.Errorf("connection failed")
	}

	return nil
}

func (sm *StreamManager) buildStreamResponse(req *models.StartStreamRequest, session *StreamSession) *models.StartStreamResponse {
	streamID := uuid.New().String()
	mediaPath := fmt.Sprintf("camera_%s", req.CameraID)

	return &models.StartStreamResponse{
		Success:      true,
		CameraID:     req.CameraID,
		StreamID:     streamID,
		MediaMTXPath: mediaPath,
		WebRTCUrl:    fmt.Sprintf("http://localhost:%d/%s", mediaMTXWebRTCPort, mediaPath),
		HLSUrl:       fmt.Sprintf("http://localhost:%d/%s/index.m3u8", mediaMTXHLSPort, mediaPath),
		RTSPUrl:      fmt.Sprintf("rtsp://localhost:%d/%s", mediaMTXRTSPPort, mediaPath),
		RTMPUrl:      fmt.Sprintf("rtmp://localhost:%d/%s", mediaMTXRTMPPort, mediaPath),
		Message:      fmt.Sprintf("Stream started successfully for camera %s", req.Name),
	}
}

// ==================== STREAM STOPPING ====================

func (sm *StreamManager) StopStream(cameraID string) (*models.StopStreamResponse, error) {
	logger := utils.GetLogger()

	session, err := sm.getSession(cameraID)
	if err != nil {
		return nil, err
	}

	logger.Infof("Stopping stream for camera %s", cameraID)

	// Cleanup resources
	sm.cleanupSession(session)

	// Signal stop
	sm.signalStop(session)

	// Wait for completion
	sm.waitForSessionCompletion(session, stopTimeout)

	// Unregister
	sm.unregisterSession(cameraID)

	logger.Infof("Stream stopped for camera %s", cameraID)

	return &models.StopStreamResponse{
		Success:  true,
		CameraID: cameraID,
		Message:  fmt.Sprintf("Stream stopped successfully for camera %s", cameraID),
	}, nil
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

func (sm *StreamManager) cleanupSession(session *StreamSession) {
	if session.frameDecoder != nil {
		session.frameDecoder.Close()
	}
	if session.faceDetector != nil {
		session.faceDetector.Close()
	}
	if session.inputFFmpeg != nil {
		session.inputFFmpeg.Close()
	}
	if session.outputFFmpeg != nil {
		session.outputFFmpeg.Close()
	}
}

func (sm *StreamManager) signalStop(session *StreamSession) {
	select {
	case session.Stop <- true:
	default:
	}
}

func (sm *StreamManager) waitForSessionCompletion(session *StreamSession, timeout time.Duration) {
	select {
	case <-session.Done:
	case <-time.After(timeout):
		utils.GetLogger().Warnf("Stream stop timeout for camera %s", session.CameraID)
	}
}

// ==================== STREAM EXECUTION ====================

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
				if err := sm.connectAndStream(session); err != nil {
					reconnectAttempts++

					if sm.shouldStopReconnecting(session, reconnectAttempts, maxReconnectAttempts) {
						return
					}

					sm.backoffAndRetry(reconnectAttempts)
					continue
				}

				reconnectAttempts = 0
				session.Status = models.StreamStatusStreaming
				logger.Infof("Camera %s connected successfully", session.CameraID)

				go sm.processFrames(session)
			}

			time.Sleep(100 * time.Millisecond)
		}
	}
}

func (sm *StreamManager) shouldStopReconnecting(session *StreamSession, attempts, maxAttempts int) bool {
	if attempts >= maxAttempts {
		utils.GetLogger().Errorf("Max reconnect attempts reached for camera %s", session.CameraID)
		return true
	}
	return false
}

func (sm *StreamManager) backoffAndRetry(attempts int) {
	backoff := time.Duration(attempts) * time.Second
	utils.GetLogger().Infof("Retrying in %v", backoff)
	time.Sleep(backoff)
}

func (sm *StreamManager) connectAndStream(session *StreamSession) error {
	logger := utils.GetLogger()
	logger.Infof("Connecting to RTSP: %s", session.Camera.RTSPUrl)

	session.Status = models.StreamStatusConnecting

	// Create MediaMTX path
	if err := sm.createMediaPath(session); err != nil {
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
	time.Sleep(connectionTimeout)
	if !session.inputFFmpeg.IsRunning() {
		return fmt.Errorf("FFmpeg exited immediately")
	}

	return nil
}

func (sm *StreamManager) createMediaPath(session *StreamSession) error {
	mediaPath := fmt.Sprintf("camera_%s", session.CameraID)
	return sm.mediamtxClient.CreatePath(mediaPath)
}

// ==================== FFMPEG MANAGEMENT ====================

func (sm *StreamManager) startInputFFmpeg(session *StreamSession) error {
	cmd := exec.Command(
		"ffmpeg",
		"-rtsp_transport", "tcp",
		"-i", session.Camera.RTSPUrl,
		"-c:v", "rawvideo",
		"-pix_fmt", "bgr24",
		"-f", "rawvideo",
		"pipe:1",
	)

	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("stderr pipe failed: %w", err)
	}

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("stdout pipe failed: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("FFmpeg start failed: %w", err)
	}

	session.inputFFmpeg = &FFmpegProcess{
		cmd:         cmd,
		stdoutPipe:  stdoutPipe,
		streamID:    session.CameraID,
		processType: "input",
	}

	sm.monitorFFmpegLogs(stderrPipe, session.CameraID, "input")
	sm.monitorFFmpegProcess(session.inputFFmpeg, session)

	return nil
}

func (sm *StreamManager) startOutputFFmpeg(session *StreamSession) error {
	fps := session.Camera.FPS
	if fps == 0 {
		fps = defaultFPS
	}

	mediaPath := fmt.Sprintf("camera_%s", session.CameraID)

	cmd := exec.Command(
		"ffmpeg",
		"-f", "rawvideo",
		"-vcodec", "rawvideo",
		"-pix_fmt", "bgr24",
		"-s", fmt.Sprintf("%dx%d", defaultFrameWidth, defaultFrameHeight),
		"-r", fmt.Sprintf("%d", fps),
		"-i", "pipe:0",
		"-c:v", "libx264",
		"-preset", "ultrafast",
		"-tune", "zerolatency",
		"-pix_fmt", "yuv420p",
		"-profile:v", "baseline",
		"-level", "3.1",
		"-b:v", "2000k",
		"-maxrate", "2500k",
		"-bufsize", "5000k",
		"-g", fmt.Sprintf("%d", fps*2),
		"-f", "flv",
		fmt.Sprintf("rtmp://mediamtx:%d/%s", mediaMTXRTMPPort, mediaPath),
	)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("stdin pipe failed: %w", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		stdin.Close()
		return fmt.Errorf("stderr pipe failed: %w", err)
	}

	if err := cmd.Start(); err != nil {
		stdin.Close()
		return fmt.Errorf("FFmpeg start failed: %w", err)
	}

	session.outputFFmpeg = &FFmpegProcess{
		cmd:         cmd,
		stdinPipe:   stdin,
		streamID:    session.CameraID,
		processType: "output",
	}

	sm.monitorFFmpegLogs(stderr, session.CameraID, "output")
	sm.monitorFFmpegProcess(session.outputFFmpeg, session)

	return nil
}

func (sm *StreamManager) monitorFFmpegLogs(pipe io.ReadCloser, cameraID, processType string) {
	logger := utils.GetLogger()

	go func() {
		scanner := bufio.NewScanner(pipe)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.Contains(strings.ToLower(line), "error") {
				logger.Warnf("[%s FFmpeg %s] %s", cameraID, processType, line)
			}
		}
	}()
}

func (sm *StreamManager) monitorFFmpegProcess(ffmpeg *FFmpegProcess, session *StreamSession) {
	logger := utils.GetLogger()

	go func() {
		if err := ffmpeg.cmd.Wait(); err != nil {
			logger.Errorf("[%s FFmpeg %s] Process exited: %v",
				session.CameraID, ffmpeg.processType, err)
			session.LastError = err
			session.Status = models.StreamStatusError
		}
	}()
}

// ==================== FRAME PROCESSING ====================

func (sm *StreamManager) processFrames(session *StreamSession) {
	logger := utils.GetLogger()
	logger.Infof("Starting frame processing for camera %s", session.CameraID)

	processor := NewFrameProcessor(session, sm)
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

// ==================== FRAME PROCESSOR (HELPER) ====================

type FrameProcessor struct {
	session           *StreamSession
	manager           *StreamManager
	frameSize         int
	frameBuffer       []byte
	consecutiveErrors int
	frameCounter      int64
	skipCounter       int
}

func NewFrameProcessor(session *StreamSession, manager *StreamManager) *FrameProcessor {
	frameSize := defaultFrameWidth * defaultFrameHeight * defaultBytesPerPixel

	return &FrameProcessor{
		session:     session,
		manager:     manager,
		frameSize:   frameSize,
		frameBuffer: make([]byte, frameSize),
	}
}

func (fp *FrameProcessor) ProcessNextFrame() error {
	// Read frame
	frame, err := fp.readFrame()
	if err != nil {
		return err
	}

	// Skip if needed
	if fp.shouldSkipFrame() {
		return nil
	}

	// Convert to Mat
	mat, err := fp.bytesToMat(frame)
	if err != nil {
		return nil // Skip bad frames
	}
	defer mat.Close()

	// Process frame
	detections := fp.detectFaces(mat)
	fp.renderOverlay(mat, detections)

	// Send to output
	if err := fp.writeToOutput(mat); err != nil {
		return err
	}

	// Update metrics
	fp.updateMetrics(detections)

	return nil
}

func (fp *FrameProcessor) readFrame() ([]byte, error) {
	if fp.session.inputFFmpeg == nil || fp.session.inputFFmpeg.stdoutPipe == nil {
		return nil, fmt.Errorf("input pipe not available")
	}

	n, err := io.ReadFull(fp.session.inputFFmpeg.stdoutPipe, fp.frameBuffer)
	if err != nil {
		fp.consecutiveErrors++
		return nil, err
	}

	if n != fp.frameSize {
		return nil, fmt.Errorf("incomplete frame")
	}

	fp.consecutiveErrors = 0
	fp.frameCounter++
	fp.session.FrameCount = fp.frameCounter
	fp.session.LastFrameTime = time.Now()

	return fp.frameBuffer, nil
}

func (fp *FrameProcessor) shouldSkipFrame() bool {
	interval := 1
	if fp.session.perfMonitor != nil {
		interval = fp.session.perfMonitor.GetFrameSkipInterval()
	}

	fp.skipCounter++
	if fp.skipCounter%interval != 0 {
		if fp.session.perfMonitor != nil {
			fp.session.perfMonitor.RecordFrameDrop()
		}
		return true
	}

	return false
}

func (fp *FrameProcessor) bytesToMat(data []byte) (gocv.Mat, error) {
	mat, err := gocv.NewMatFromBytes(defaultFrameHeight, defaultFrameWidth, gocv.MatTypeCV8UC3, data)
	if err != nil || mat.Empty() {
		if !mat.Empty() {
			mat.Close()
		}
		return gocv.Mat{}, fmt.Errorf("failed to create Mat")
	}
	return mat, nil
}

func (fp *FrameProcessor) detectFaces(mat gocv.Mat) []models.FaceDetection {
	if !fp.session.faceDetectionEnabled || fp.session.faceDetector == nil {
		return nil
	}

	detections, err := fp.session.faceDetector.DetectFaces(mat)
	if err != nil {
		return nil
	}

	if len(detections) > 0 {
		fp.manager.IncrementFaceCount(int64(len(detections)))
	}

	return detections
}

func (fp *FrameProcessor) renderOverlay(mat gocv.Mat, detections []models.FaceDetection) {
	if fp.session.overlay == nil || !fp.session.overlay.IsEnabled() {
		return
	}

	fps := 0.0
	if fp.session.perfMonitor != nil {
		fps = fp.session.perfMonitor.GetProcessingFPS()
	}

	fp.session.overlay.RenderDetections(
		&mat,
		detections,
		fp.session.Camera.Name,
		fps,
		fp.frameCounter,
	)
}

func (fp *FrameProcessor) writeToOutput(mat gocv.Mat) error {
	if fp.session.outputFFmpeg == nil || fp.session.outputFFmpeg.stdinPipe == nil {
		return fmt.Errorf("output pipe not available")
	}

	rawBytes := mat.ToBytes()
	_, err := fp.session.outputFFmpeg.stdinPipe.Write(rawBytes)

	return err
}

func (fp *FrameProcessor) updateMetrics(detections []models.FaceDetection) {
	fp.manager.IncrementFrameCount(1)

	if fp.session.perfMonitor != nil {
		// Tracking would happen here
	}

	// Periodic health check
	if fp.frameCounter%100 == 0 && fp.session.perfMonitor != nil {
		if isHealthy, msg := fp.session.perfMonitor.CheckPerformance(); !isHealthy {
			utils.GetLogger().Warnf("[Camera %s] Performance issue: %s",
				fp.session.CameraID, msg)
		}
	}
}

func (fp *FrameProcessor) ShouldStop(err error) bool {
	if err == io.EOF {
		utils.GetLogger().Warnf("[Camera %s] Stream ended", fp.session.CameraID)
		return true
	}

	if fp.consecutiveErrors >= maxConsecutiveErrors {
		utils.GetLogger().Errorf("[Camera %s] Too many errors (%d)",
			fp.session.CameraID, fp.consecutiveErrors)
		return true
	}

	return false
}

func (fp *FrameProcessor) Cleanup() {
	// Cleanup resources if needed
}

// ==================== STATUS & STATISTICS ====================

func (sm *StreamManager) GetAllStreams() map[string]*StreamSession {
	sm.sessionsMutex.RLock()
	defer sm.sessionsMutex.RUnlock()

	result := make(map[string]*StreamSession, len(sm.sessions))
	for k, v := range sm.sessions {
		result[k] = v
	}
	return result
}

func (sm *StreamManager) GetStreamStatus(cameraID string) (*models.StreamStatusResponse, error) {
	session, err := sm.getSession(cameraID)
	if err != nil {
		return nil, err
	}

	uptime := time.Since(session.StartTime).Milliseconds()
	mediaPath := fmt.Sprintf("camera_%s", cameraID)

	resp := &models.StreamStatusResponse{
		CameraID:   cameraID,
		Status:     session.Status,
		IsActive:   session.Status == models.StreamStatusStreaming,
		UptimeMs:   uptime,
		FrameCount: session.FrameCount,
		ErrorCount: session.ErrorCount,
		WebRTCUrl:  fmt.Sprintf("http://localhost:%d/%s", mediaMTXWebRTCPort, mediaPath),
		HLSUrl:     fmt.Sprintf("http://localhost:%d/%s/index.m3u8", mediaMTXHLSPort, mediaPath),
		RTSPUrl:    fmt.Sprintf("rtsp://localhost:%d/%s", mediaMTXRTSPPort, mediaPath),
		RTMPUrl:    fmt.Sprintf("rtmp://localhost:%d/%s", mediaMTXRTMPPort, mediaPath),
	}

	if session.LastError != nil {
		resp.LastError = session.LastError.Error()
	}

	return resp, nil
}

func (sm *StreamManager) GetHealthStatus() *models.HealthCheckResponse {
	sm.sessionsMutex.RLock()
	activeCount := len(sm.sessions)
	streamStatuses := make(map[string]models.StreamStatus, len(sm.sessions))
	for cameraID, session := range sm.sessions {
		streamStatuses[cameraID] = session.Status
	}
	sm.sessionsMutex.RUnlock()

	uptime := time.Since(sm.startTime).Seconds()
	totalFrames := sm.GetTotalProcessedFrames()

	return &models.HealthCheckResponse{
		Status:               "healthy",
		Timestamp:            time.Now().Format(time.RFC3339),
		Service:              "VisionGuard Worker Service",
		Version:              "2.0.0",
		ActiveStreams:        activeCount,
		MaxConcurrentStreams: sm.maxConcurrentStreams,
		TotalProcessedFrames: totalFrames,
		UptimeSeconds:        int64(uptime),
		StreamSessions:       streamStatuses,
	}
}

func (sm *StreamManager) GetStreamStats(cameraID string) (map[string]interface{}, error) {
	session, err := sm.getSession(cameraID)
	if err != nil {
		return nil, err
	}

	uptime := int64(time.Since(session.StartTime).Seconds())
	currentFPS := sm.calculateFPS(session.FrameCount, uptime)

	stats := map[string]interface{}{
		"cameraId":             cameraID,
		"status":               string(session.Status),
		"uptimeSeconds":        uptime,
		"framesProcessed":      session.FrameCount,
		"currentFps":           currentFPS,
		"faceDetectionEnabled": session.faceDetectionEnabled,
		"errorCount":           session.ErrorCount,
	}

	// Add performance metrics if available
	if session.perfMonitor != nil {
		stats["processingFps"] = session.perfMonitor.GetProcessingFPS()
		stats["averageProcessingTimeMs"] = float64(session.perfMonitor.GetAverageProcessingTime())
	}

	// Add face detection metrics if available
	if session.frameDecoder != nil {
		metrics := session.frameDecoder.GetMetrics()
		stats["facesDetected"] = metrics.FacesDetected
		stats["detectionRate"] = metrics.DetectionRate
	}

	return stats, nil
}

func (sm *StreamManager) calculateFPS(frameCount, uptimeSeconds int64) float64 {
	if uptimeSeconds <= 0 {
		return 0.0
	}
	return float64(frameCount) / float64(uptimeSeconds)
}

// ==================== CONFIGURATION ====================

func (sm *StreamManager) ToggleFaceDetection(cameraID string, enabled bool) error {
	logger := utils.GetLogger()

	session, err := sm.getSession(cameraID)
	if err != nil {
		return err
	}

	logger.Infof("Toggling face detection for camera %s to %v", cameraID, enabled)

	session.faceDetectionEnabled = enabled

	if session.frameDecoder != nil {
		session.frameDecoder.SetFaceDetectionEnabled(enabled)
	}

	return nil
}

func (sm *StreamManager) UpdateFrameSkipInterval(cameraID string, interval int) error {
	logger := utils.GetLogger()

	session, err := sm.getSession(cameraID)
	if err != nil {
		return err
	}

	if interval < 1 {
		return fmt.Errorf("invalid frame skip interval: %d (must be >= 1)", interval)
	}

	logger.Infof("Updating frame skip interval for camera %s to %d", cameraID, interval)

	if session.frameDecoder != nil {
		session.frameDecoder.SetFrameSkipInterval(interval)
	}

	if session.perfMonitor != nil {
		return session.perfMonitor.SetFrameSkipInterval(interval)
	}

	return nil
}

// ==================== METRICS ====================

func (sm *StreamManager) GetTotalProcessedFrames() int64 {
	sm.statsMutex.Lock()
	defer sm.statsMutex.Unlock()
	return sm.totalProcessedFrames
}

func (sm *StreamManager) IncrementFrameCount(amount int64) {
	sm.statsMutex.Lock()
	sm.totalProcessedFrames += amount
	sm.statsMutex.Unlock()
}

func (sm *StreamManager) IncrementFaceCount(amount int64) {
	sm.statsMutex.Lock()
	sm.totalDetectedFaces += amount
	sm.statsMutex.Unlock()
}
