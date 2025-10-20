package services

import (
	"fmt"
	"sync"
	"time"
	"worker-service/internal/models"
	"worker-service/internal/utils"

	face "github.com/Kagami/go-face"
	"gocv.io/x/gocv"
)

// FaceDetectionEngine handles face detection using go-face library
type FaceDetectionEngine struct {
	recognizer       *face.Recognizer
	cameraID         string
	minConfidence    float32
	modelPath        string
	initialized      bool
	mutex            sync.RWMutex
	detectionCount   int64
	totalProcessTime int64
	lastError        error
}

// NewFaceDetectionEngine creates a new face detection engine
func NewFaceDetectionEngine(cameraID string, modelPath string, minConfidence float32) *FaceDetectionEngine {
	return &FaceDetectionEngine{
		cameraID:         cameraID,
		minConfidence:    minConfidence,
		modelPath:        modelPath,
		initialized:      false,
		detectionCount:   0,
		totalProcessTime: 0,
	}
}

// Initialize loads the face detection model
func (fde *FaceDetectionEngine) Initialize() error {
	fde.mutex.Lock()
	defer fde.mutex.Unlock()

	logger := utils.GetLogger()

	if fde.initialized {
		return nil
	}

	logger.Infof("[FaceDetectionEngine] Loading face detection model from: %s", fde.modelPath)

	// Load the face recognizer with the pre-trained model
	// go-face requires the model directory path containing the .dat files
	rec, err := face.NewRecognizer(fde.modelPath)
	if err != nil {
		logger.Errorf("[FaceDetectionEngine] Failed to load model: %v", err)
		fde.lastError = err
		return fmt.Errorf("failed to load face detection model: %w", err)
	}

	fde.recognizer = rec
	fde.initialized = true

	logger.Infof("[FaceDetectionEngine] Face detection model loaded successfully")

	return nil
}

// DetectFaces detects faces in the provided frame
// Returns a slice of Face objects with Rectangle and Descriptor
func (fde *FaceDetectionEngine) DetectFaces(frame gocv.Mat) ([]models.FaceDetection, error) {
	fde.mutex.RLock()
	defer fde.mutex.RUnlock()

	logger := utils.GetLogger()

	if !fde.initialized {
		return nil, fmt.Errorf("face detection engine not initialized")
	}

	if frame.Empty() {
		return nil, fmt.Errorf("invalid or empty frame")
	}

	startTime := time.Now()

	// Convert OpenCV Mat to JPEG byte array for go-face
	// go-face's Recognize() method accepts []byte of JPEG-encoded image
	buf, err := gocv.IMEncode(gocv.JPEGFileExt, frame)
	if err != nil {
		logger.Errorf("[FaceDetectionEngine] Failed to encode frame: %v", err)
		return nil, fmt.Errorf("failed to encode frame: %w", err)
	}
	defer buf.Close()

	// Get the byte slice from the buffer
	imgData := buf.GetBytes()

	// Detect faces using go-face
	// Recognize() accepts []byte of JPEG-encoded image data
	faces, err := fde.recognizer.Recognize(imgData)
	if err != nil {
		logger.Errorf("[FaceDetectionEngine] Face detection failed: %v", err)
		return nil, fmt.Errorf("face detection failed: %w", err)
	}

	processingTime := time.Since(startTime)
	logger.Debugf("[FaceDetectionEngine] Detected %d faces in %v", len(faces), processingTime)

	// Convert go-face results to our model
	var detections []models.FaceDetection
	for i, f := range faces {
		rect := f.Rectangle
		detection := models.FaceDetection{
			ID:         fmt.Sprintf("face_%d", i),
			X:          int32(rect.Min.X),
			Y:          int32(rect.Min.Y),
			Width:      int32(rect.Max.X - rect.Min.X),
			Height:     int32(rect.Max.Y - rect.Min.Y),
			Confidence: 0.95, // go-face doesn't provide confidence directly
		}

		detections = append(detections, detection)
	}

	// Update statistics
	fde.detectionCount += int64(len(detections))
	fde.totalProcessTime += processingTime.Milliseconds()

	return detections, nil
}

// GetStatistics returns detection statistics
func (fde *FaceDetectionEngine) GetStatistics() map[string]interface{} {
	fde.mutex.RLock()
	defer fde.mutex.RUnlock()

	avgTime := int64(0)
	if fde.detectionCount > 0 {
		avgTime = fde.totalProcessTime / fde.detectionCount
	}

	return map[string]interface{}{
		"cameraID":        fde.cameraID,
		"initialized":     fde.initialized,
		"totalDetections": fde.detectionCount,
		"averageTimeMs":   avgTime,
		"totalTimeMs":     fde.totalProcessTime,
		"minConfidence":   fde.minConfidence,
		"lastError":       fde.lastError,
	}
}

// Close releases resources
func (fde *FaceDetectionEngine) Close() error {
	fde.mutex.Lock()
	defer fde.mutex.Unlock()

	if fde.recognizer != nil {
		fde.recognizer.Close()
		fde.recognizer = nil
	}

	fde.initialized = false
	return nil
}

// IsInitialized returns whether the engine is ready
func (fde *FaceDetectionEngine) IsInitialized() bool {
	fde.mutex.RLock()
	defer fde.mutex.RUnlock()
	return fde.initialized
}

// SetMinConfidence sets the minimum confidence threshold
func (fde *FaceDetectionEngine) SetMinConfidence(confidence float32) {
	fde.mutex.Lock()
	defer fde.mutex.Unlock()
	fde.minConfidence = confidence
}

// GetMinConfidence returns the current confidence threshold
func (fde *FaceDetectionEngine) GetMinConfidence() float32 {
	fde.mutex.RLock()
	defer fde.mutex.RUnlock()
	return fde.minConfidence
}
