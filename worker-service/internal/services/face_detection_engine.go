package services

// ----------------------------------------------------------------------

import (
	"fmt"
	"image"
	"path/filepath"
	"sync"
	"time"
	"worker-service/internal/models"
	"worker-service/internal/utils"

	"gocv.io/x/gocv"
)

// ----------------------------------------------------------------------

// Constants for face detection
const (
	FaceDetectionMinConfidence float32 = 0.85
	FaceDetectionInputSize             = 300
)

// ----------------------------------------------------------------------

// FaceDetectionEngine handles face detection using OpenCV DNN
type FaceDetectionEngine struct {
	net              gocv.Net
	cameraID         string
	minConfidence    float32
	modelPath        string
	prototxtPath     string
	caffeModelPath   string
	initialized      bool
	mutex            sync.RWMutex
	detectionCount   int64
	totalProcessTime int64
	lastError        error
	inputSize        image.Point
}

// NewFaceDetectionEngine creates a new OpenCV DNN-based face detection engine
func NewFaceDetectionEngine(cameraID string, modelPath string) *FaceDetectionEngine {
	return &FaceDetectionEngine{
		cameraID:         cameraID,
		minConfidence:    FaceDetectionMinConfidence,
		modelPath:        modelPath,
		prototxtPath:     filepath.Join(modelPath, "deploy.prototxt"),
		caffeModelPath:   filepath.Join(modelPath, "res10_300x300_ssd_iter_140000.caffemodel"),
		initialized:      false,
		detectionCount:   0,
		totalProcessTime: 0,
		inputSize:        image.Pt(FaceDetectionInputSize, FaceDetectionInputSize),
	}
}

// ----------------------------------------------------------------------

// Initialize loads the OpenCV DNN face detection model
func (fde *FaceDetectionEngine) Initialize() error {
	fde.mutex.Lock()
	defer fde.mutex.Unlock()

	logger := utils.GetLogger()

	if fde.initialized {
		return nil
	}

	logger.Infof("[FaceDetectionEngine] Loading OpenCV DNN model from: %s", fde.modelPath)

	// Load DNN model
	net := gocv.ReadNetFromCaffe(fde.prototxtPath, fde.caffeModelPath)
	if net.Empty() {
		logger.Errorf("[FaceDetectionEngine] Failed to load DNN model")
		fde.lastError = fmt.Errorf("failed to load DNN model from %s", fde.modelPath)
		return fde.lastError
	}

	// Set backend to default (CPU)
	net.SetPreferableBackend(gocv.NetBackendDefault)
	net.SetPreferableTarget(gocv.NetTargetCPU)

	fde.net = net
	fde.initialized = true

	logger.Infof("[FaceDetectionEngine] OpenCV DNN face detection model loaded successfully")
	logger.Infof("[FaceDetectionEngine] Model details - Input size: %v, Min confidence: %.2f",
		fde.inputSize, fde.minConfidence)

	return nil
}

// DetectFaces detects faces in the provided frame using OpenCV DNN
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

	// Get frame dimensions
	frameHeight := frame.Rows()
	frameWidth := frame.Cols()

	// Create blob from image
	// Parameters: image, scaleFactor, size, mean, swapRB, crop
	blob := gocv.BlobFromImage(
		frame,
		1.0,                                    // Scale factor
		fde.inputSize,                          // Size (300x300)
		gocv.NewScalar(104.0, 177.0, 123.0, 0), // Mean subtraction values (OpenCV default)
		false,                                  // swapRB
		false,                                  // crop
	)
	defer blob.Close()

	// Set input blob to the network
	fde.net.SetInput(blob, "")

	// Run forward pass to get detections
	detectionMat := fde.net.Forward("")
	defer detectionMat.Close()

	// Process detections
	detections := fde.ProcessDetections(detectionMat, frameWidth, frameHeight)

	processingTime := time.Since(startTime)
	logger.Debugf("[FaceDetectionEngine] Detected %d faces in %v", len(detections), processingTime)

	// Update statistics
	fde.mutex.RUnlock()
	fde.mutex.Lock()
	fde.detectionCount += int64(len(detections))
	fde.totalProcessTime += processingTime.Milliseconds()
	fde.mutex.Unlock()
	fde.mutex.RLock()

	return detections, nil
}

// ProcessDetections extracts face detections from DNN output
func (fde *FaceDetectionEngine) ProcessDetections(detectionMat gocv.Mat, frameWidth, frameHeight int) []models.FaceDetection {
	var detections []models.FaceDetection

	// Get the detection matrix size
	// Format is typically [1, 1, N, 7]
	sizes := detectionMat.Size()
	if len(sizes) < 3 {
		return detections
	}

	numDetections := sizes[2]

	// Reshape the matrix to access detection data
	// The output is [1, 1, N, 7], we need to reshape to [N, 7] for easier access
	detectionMat = detectionMat.Reshape(1, numDetections)

	for i := 0; i < numDetections; i++ {
		// Get detection data - each row has 7 values:
		// [0: batchId, 1: classId, 2: confidence, 3: left, 4: top, 5: right, 6: bottom]
		confidence := detectionMat.GetFloatAt(i, 2)

		// Filter by confidence threshold
		if confidence < fde.minConfidence {
			continue
		}

		// Get bounding box coordinates (normalized to [0, 1])
		left := detectionMat.GetFloatAt(i, 3)
		top := detectionMat.GetFloatAt(i, 4)
		right := detectionMat.GetFloatAt(i, 5)
		bottom := detectionMat.GetFloatAt(i, 6)

		// Convert to pixel coordinates
		x := int32(left * float32(frameWidth))
		y := int32(top * float32(frameHeight))
		width := int32((right - left) * float32(frameWidth))
		height := int32((bottom - top) * float32(frameHeight))

		// Ensure coordinates are within frame bounds
		if x < 0 {
			x = 0
		}
		if y < 0 {
			y = 0
		}
		if x+width > int32(frameWidth) {
			width = int32(frameWidth) - x
		}
		if y+height > int32(frameHeight) {
			height = int32(frameHeight) - y
		}

		// Skip invalid detections
		if width <= 0 || height <= 0 {
			continue
		}

		detection := models.FaceDetection{
			ID:         fmt.Sprintf("face_%d", i),
			X:          x,
			Y:          y,
			Width:      width,
			Height:     height,
			Confidence: confidence,
		}

		detections = append(detections, detection)
	}

	return detections
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
		"modelType":       "OpenCV DNN (ResNet-10 SSD)",
		"inputSize":       fde.inputSize,
		"lastError":       fde.lastError,
	}
}

// Close releases resources
func (fde *FaceDetectionEngine) Close() error {
	fde.mutex.Lock()
	defer fde.mutex.Unlock()

	if fde.initialized && !fde.net.Empty() {
		if err := fde.net.Close(); err != nil {
			return fmt.Errorf("failed to close DNN network: %w", err)
		}
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

	if confidence < 0.0 {
		confidence = 0.0
	}
	if confidence > 1.0 {
		confidence = 1.0
	}

	fde.minConfidence = confidence
}

// GetMinConfidence returns the current confidence threshold
func (fde *FaceDetectionEngine) GetMinConfidence() float32 {
	fde.mutex.RLock()
	defer fde.mutex.RUnlock()
	return fde.minConfidence
}

// SetInputSize sets the input size for the DNN model
func (fde *FaceDetectionEngine) SetInputSize(width, height int) error {
	fde.mutex.Lock()
	defer fde.mutex.Unlock()

	if width <= 0 || height <= 0 {
		return fmt.Errorf("invalid input size: %dx%d", width, height)
	}

	fde.inputSize = image.Pt(width, height)
	return nil
}

// GetInputSize returns the current input size
func (fde *FaceDetectionEngine) GetInputSize() image.Point {
	fde.mutex.RLock()
	defer fde.mutex.RUnlock()
	return fde.inputSize
}
