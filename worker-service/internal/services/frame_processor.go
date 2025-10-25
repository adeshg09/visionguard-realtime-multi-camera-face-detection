package services

// ----------------------------------------------------------------------

import (
	"fmt"
	"io"
	"time"
	"worker-service/internal/models"
	"worker-service/internal/utils"

	"gocv.io/x/gocv"
)

// ----------------------------------------------------------------------

type FrameProcessor struct {
	session *StreamSession
}

func NewFrameProcessor(session *StreamSession) *FrameProcessor {
	return &FrameProcessor{session: session}
}

// ----------------------------------------------------------------------

func (fp *FrameProcessor) ProcessFrames() {
	logger := utils.GetLogger()
	logger.Infof("Starting frame processing for camera %s (resolution: %dx%d, target FPS: %d)",
		fp.session.CameraID, fp.session.detectedWidth, fp.session.detectedHeight, fp.session.targetFPS)

	frameSize := fp.session.detectedWidth * fp.session.detectedHeight * defaultBytesPerPixel
	frameBuffer := make([]byte, frameSize)
	consecutiveErrors := 0
	frameCounter := 0

	skipRatio := fp.calculateSkipRatio()

	logger.Infof("FPS control: %d/%d fps → skip ratio: %d (process every %d frames)",
		fp.session.targetFPS, fp.session.detectedMaxFPS, skipRatio, skipRatio)

	for {
		select {
		case <-fp.session.Stop:
			logger.Infof("Frame processing stopped for camera %s", fp.session.CameraID)
			return

		default:
			if err := fp.processSingleFrame(frameBuffer, &consecutiveErrors, &frameCounter, skipRatio); err != nil {
				if err == io.EOF {
					return
				}
				continue
			}
		}
	}
}

func (fp *FrameProcessor) calculateSkipRatio() int {
	if fp.session.targetFPS > 0 && fp.session.detectedMaxFPS > fp.session.targetFPS {
		skipRatio := fp.session.detectedMaxFPS / fp.session.targetFPS
		if skipRatio < 1 {
			return 1
		}
		return skipRatio
	}
	return 1
}

func (fp *FrameProcessor) processSingleFrame(frameBuffer []byte, consecutiveErrors *int, frameCounter *int, skipRatio int) error {
	n, err := io.ReadFull(fp.session.inputFFmpeg.stdoutPipe, frameBuffer)
	if err != nil {
		return fp.handleReadError(err, consecutiveErrors)
	}

	if n != len(frameBuffer) {
		return fmt.Errorf("incomplete frame read")
	}

	*consecutiveErrors = 0

	// Frame skipping based on FPS
	*frameCounter++
	if *frameCounter%skipRatio != 0 {
		return nil // Skip this frame
	}

	return fp.processFrameData(frameBuffer)
}

func (fp *FrameProcessor) processFrameData(frameBuffer []byte) error {
	mat, err := gocv.NewMatFromBytes(fp.session.detectedHeight, fp.session.detectedWidth, gocv.MatTypeCV8UC3, frameBuffer)
	if err != nil || mat.Empty() {
		if !mat.Empty() {
			mat.Close()
		}
		return err
	}
	defer mat.Close()

	detections := fp.detectFaces(mat)
	fp.applyOverlay(mat, detections)
	fp.handleAlerts(detections, mat)

	return fp.writeOutputFrame(mat)
}

func (fp *FrameProcessor) detectFaces(mat gocv.Mat) []models.FaceDetection {
	if !fp.session.faceDetectionEnabled || fp.session.faceDetector == nil {
		return nil
	}

	detections, _ := fp.session.faceDetector.DetectFaces(mat)
	return detections
}

func (fp *FrameProcessor) applyOverlay(mat gocv.Mat, detections []models.FaceDetection) {
	if fp.session.overlay == nil || !fp.session.overlay.IsEnabled() {
		return
	}

	fp.session.overlay.RenderDetections(
		&mat,
		detections,
		fp.session.Camera.Name,
		fp.session.Camera.Location,
		0, 0,
	)
}

func (fp *FrameProcessor) handleAlerts(detections []models.FaceDetection, mat gocv.Mat) {
	if len(detections) > 0 && fp.session.alertService != nil {
		now := time.Now()
		if now.Sub(fp.session.lastAlertTime) >= fp.session.alertCooldown {
			go fp.createAlertAsync(detections, mat.Clone())
			fp.session.lastAlertTime = now
		}
	}
}

func (fp *FrameProcessor) createAlertAsync(detections []models.FaceDetection, frameCopy gocv.Mat) {
	defer frameCopy.Close()

	if err := fp.session.alertService.ProcessDetectionAlert(
		fp.session.CameraID,
		fp.session.Camera.Name,
		detections,
		&frameCopy,
	); err != nil {
		utils.GetLogger().Errorf("Failed to process alert for camera %s: %v", fp.session.CameraID, err)
	}
}

func (fp *FrameProcessor) writeOutputFrame(mat gocv.Mat) error {
	if fp.session.outputFFmpeg == nil || fp.session.outputFFmpeg.stdinPipe == nil {
		return nil
	}

	rawBytes := mat.ToBytes()
	_, err := fp.session.outputFFmpeg.stdinPipe.Write(rawBytes)
	return err
}

func (fp *FrameProcessor) handleReadError(err error, consecutiveErrors *int) error {
	*consecutiveErrors++

	if err == io.EOF {
		utils.GetLogger().Warnf("Stream ended for camera %s", fp.session.CameraID)
		return err
	}

	if *consecutiveErrors >= maxConsecutiveErrors {
		utils.GetLogger().Errorf("Too many errors for camera %s", fp.session.CameraID)
		fp.session.Status = models.StreamStatusError
		return err
	}

	return err
}
