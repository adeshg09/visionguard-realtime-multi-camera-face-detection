package services

import (
	"fmt"
	"sync"
	"time"
	"worker-service/internal/utils"
)

// PerformanceOptimizer monitors and optimizes stream processing performance
type PerformanceOptimizer struct {
	cameraID              string
	frameSkipInterval     int
	targetFrameRate       int
	maxProcessingTime     int64 // milliseconds
	averageProcessingTime int64
	frameCount            int64
	totalProcessingTime   int64
	lastUpdateTime        time.Time
	mutex                 sync.RWMutex
	startTime             time.Time
	frameDropCount        int64
	adaptiveMode          bool
}

// NewPerformanceOptimizer creates a new performance optimizer
func NewPerformanceOptimizer(cameraID string, targetFrameRate int, maxProcessingTime int64) *PerformanceOptimizer {
	return &PerformanceOptimizer{
		cameraID:              cameraID,
		frameSkipInterval:     2, // Process every 2nd frame by default
		targetFrameRate:       targetFrameRate,
		maxProcessingTime:     maxProcessingTime,
		averageProcessingTime: 0,
		frameCount:            0,
		totalProcessingTime:   0,
		lastUpdateTime:        time.Now(),
		startTime:             time.Now(),
		frameDropCount:        0,
		adaptiveMode:          false,
	}
}

// RecordFrameProcessing records processing time for a frame
func (po *PerformanceOptimizer) RecordFrameProcessing(processingTime int64) {
	po.mutex.Lock()
	defer po.mutex.Unlock()

	po.frameCount++
	po.totalProcessingTime += processingTime

	// Calculate running average
	if po.frameCount > 0 {
		po.averageProcessingTime = po.totalProcessingTime / po.frameCount
	}

	// Adaptive frame skipping
	if po.adaptiveMode {
		po.adjustFrameSkipping()
	}
}

// RecordFrameDrop records a dropped frame
func (po *PerformanceOptimizer) RecordFrameDrop() {
	po.mutex.Lock()
	defer po.mutex.Unlock()
	po.frameDropCount++
}

// adjustFrameSkipping adjusts frame skip interval based on performance
func (po *PerformanceOptimizer) adjustFrameSkipping() {
	// If average processing time exceeds max, increase frame skipping
	if po.averageProcessingTime > po.maxProcessingTime {
		if po.frameSkipInterval < 5 {
			po.frameSkipInterval++
		}
	} else if po.averageProcessingTime < po.maxProcessingTime/2 {
		// If well under budget, decrease frame skipping
		if po.frameSkipInterval > 1 {
			po.frameSkipInterval--
		}
	}
}

// GetFrameSkipInterval returns the current frame skip interval
func (po *PerformanceOptimizer) GetFrameSkipInterval() int {
	po.mutex.RLock()
	defer po.mutex.RUnlock()
	return po.frameSkipInterval
}

// SetFrameSkipInterval sets the frame skip interval manually
func (po *PerformanceOptimizer) SetFrameSkipInterval(interval int) error {
	po.mutex.Lock()
	defer po.mutex.Unlock()

	if interval < 1 || interval > 10 {
		return fmt.Errorf("frame skip interval must be between 1 and 10")
	}

	logger := utils.GetLogger()
	logger.Infof("[PerformanceOptimizer] Frame skip interval changed from %d to %d", po.frameSkipInterval, interval)

	po.frameSkipInterval = interval
	return nil
}

// GetAverageProcessingTime returns average processing time in milliseconds
func (po *PerformanceOptimizer) GetAverageProcessingTime() int64 {
	po.mutex.RLock()
	defer po.mutex.RUnlock()
	return po.averageProcessingTime
}

// GetProcessingFPS returns the effective FPS after frame skipping
func (po *PerformanceOptimizer) GetProcessingFPS() float64 {
	po.mutex.RLock()
	defer po.mutex.RUnlock()

	uptime := time.Since(po.startTime).Seconds()
	if uptime == 0 {
		return 0
	}

	// FPS = frames processed / uptime
	effectiveFPS := float64(po.frameCount) / uptime
	return effectiveFPS
}

// GetMetrics returns comprehensive performance metrics
func (po *PerformanceOptimizer) GetMetrics() map[string]interface{} {
	po.mutex.RLock()
	defer po.mutex.RUnlock()

	uptime := time.Since(po.startTime).Seconds()
	processingFPS := float64(0)
	if uptime > 0 {
		processingFPS = float64(po.frameCount) / uptime
	}

	frameDropRate := float64(0)
	totalFrames := po.frameCount + po.frameDropCount
	if totalFrames > 0 {
		frameDropRate = float64(po.frameDropCount) / float64(totalFrames) * 100
	}

	return map[string]interface{}{
		"cameraID":                po.cameraID,
		"frameSkipInterval":       po.frameSkipInterval,
		"targetFrameRate":         po.targetFrameRate,
		"actualProcessingFPS":     processingFPS,
		"averageProcessingTimeMs": po.averageProcessingTime,
		"maxProcessingTimeMs":     po.maxProcessingTime,
		"totalFramesProcessed":    po.frameCount,
		"totalFramesDropped":      po.frameDropCount,
		"frameDropRate":           frameDropRate,
		"uptimeSeconds":           uptime,
		"adaptiveMode":            po.adaptiveMode,
	}
}

// EnableAdaptiveMode enables automatic frame skip adjustment
func (po *PerformanceOptimizer) EnableAdaptiveMode() {
	po.mutex.Lock()
	defer po.mutex.Unlock()

	logger := utils.GetLogger()
	logger.Infof("[PerformanceOptimizer] Adaptive mode enabled for camera %s", po.cameraID)

	po.adaptiveMode = true
}

// DisableAdaptiveMode disables automatic frame skip adjustment
func (po *PerformanceOptimizer) DisableAdaptiveMode() {
	po.mutex.Lock()
	defer po.mutex.Unlock()

	logger := utils.GetLogger()
	logger.Infof("[PerformanceOptimizer] Adaptive mode disabled for camera %s", po.cameraID)

	po.adaptiveMode = false
}

// IsAdaptiveMode returns if adaptive mode is enabled
func (po *PerformanceOptimizer) IsAdaptiveMode() bool {
	po.mutex.RLock()
	defer po.mutex.RUnlock()
	return po.adaptiveMode
}

// CheckPerformance checks if performance is within acceptable limits
func (po *PerformanceOptimizer) CheckPerformance() (bool, string) {
	po.mutex.RLock()
	defer po.mutex.RUnlock()

	logger := utils.GetLogger()

	// Check processing time
	if po.averageProcessingTime > po.maxProcessingTime {
		msg := fmt.Sprintf("Processing time exceeds maximum: %.0f > %.0f ms",
			float64(po.averageProcessingTime), float64(po.maxProcessingTime))
		logger.Warnf("[PerformanceOptimizer] %s", msg)
		return false, msg
	}

	// Check frame drop rate
	totalFrames := po.frameCount + po.frameDropCount
	if totalFrames > 0 {
		frameDropRate := float64(po.frameDropCount) / float64(totalFrames) * 100
		if frameDropRate > 10 {
			msg := fmt.Sprintf("Frame drop rate too high: %.1f%%", frameDropRate)
			logger.Warnf("[PerformanceOptimizer] %s", msg)
			return false, msg
		}
	}

	return true, "Performance within acceptable limits"
}

// Reset resets all performance metrics
func (po *PerformanceOptimizer) Reset() {
	po.mutex.Lock()
	defer po.mutex.Unlock()

	logger := utils.GetLogger()
	logger.Infof("[PerformanceOptimizer] Resetting metrics for camera %s", po.cameraID)

	po.frameCount = 0
	po.totalProcessingTime = 0
	po.averageProcessingTime = 0
	po.frameDropCount = 0
	po.startTime = time.Now()
}

// GetStatus returns a human-readable status
func (po *PerformanceOptimizer) GetStatus() string {
	po.mutex.RLock()
	defer po.mutex.RUnlock()

	uptime := time.Since(po.startTime).Seconds()
	fps := float64(0)
	if uptime > 0 {
		fps = float64(po.frameCount) / uptime
	}

	dropRate := float64(0)
	totalFrames := po.frameCount + po.frameDropCount
	if totalFrames > 0 {
		dropRate = float64(po.frameDropCount) / float64(totalFrames) * 100
	}

	status := fmt.Sprintf(
		"Camera: %s | FPS: %.1f | Skip: %d | Avg Time: %dms | Drops: %.1f%% | Adaptive: %v",
		po.cameraID, fps, po.frameSkipInterval, po.averageProcessingTime, dropRate, po.adaptiveMode,
	)

	return status
}
