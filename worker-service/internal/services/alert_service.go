package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
	"worker-service/internal/config"
	"worker-service/internal/models"
	"worker-service/internal/utils"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"gocv.io/x/gocv"
)

// AlertService handles alert creation and snapshot storage
type AlertService struct {
	cfg              *config.Config
	httpClient       *http.Client
	cloudinaryClient *cloudinary.Cloudinary
}

// NewAlertService creates a new alert service
func NewAlertService(cfg *config.Config) *AlertService {
	// 🆕 Initialize Cloudinary
	var cld *cloudinary.Cloudinary
	if cfg.CloudinaryCloudName != "" && cfg.CloudinaryAPIKey != "" && cfg.CloudinaryAPISecret != "" {
		var err error
		cld, err = cloudinary.NewFromParams(
			cfg.CloudinaryCloudName,
			cfg.CloudinaryAPIKey,
			cfg.CloudinaryAPISecret,
		)
		if err != nil {
			utils.GetLogger().Warnf("Failed to initialize Cloudinary: %v", err)
		} else {
			utils.GetLogger().Info("✓ Cloudinary initialized successfully")
		}
	} else {
		utils.GetLogger().Warn("⚠️ Cloudinary credentials not configured - snapshots disabled")
	}

	return &AlertService{
		cfg:              cfg,
		cloudinaryClient: cld,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// CreateAlertPayload represents the alert payload sent to backend
type CreateAlertPayload struct {
	CameraID    string                 `json:"cameraId"`
	FaceCount   int                    `json:"faceCount"`
	Confidence  float64                `json:"confidence"`
	SnapshotUrl *string                `json:"snapshotUrl,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// ProcessDetectionAlert processes face detections and creates alerts
func (as *AlertService) ProcessDetectionAlert(
	cameraID string,
	cameraName string,
	detections []models.FaceDetection,
	frame *gocv.Mat,
) error {
	if len(detections) == 0 {
		return nil
	}

	// Calculate average confidence
	totalConfidence := float32(0)
	for _, detection := range detections {
		totalConfidence += detection.Confidence
	}
	avgConfidence := float64(totalConfidence) / float64(len(detections))

	// 🆕 Save snapshot to Cloudinary if frame is provided
	var snapshotUrl *string
	if frame != nil && !frame.Empty() {
		url, err := as.saveSnapshot(cameraID, frame)
		if err != nil {
			utils.GetLogger().Warnf("Failed to save snapshot for camera %s: %v", cameraID, err)
		} else {
			snapshotUrl = &url
		}
	}

	// Build alert payload
	payload := CreateAlertPayload{
		CameraID:    cameraID,
		FaceCount:   len(detections),
		Confidence:  avgConfidence,
		SnapshotUrl: snapshotUrl,
		Metadata: map[string]interface{}{
			"cameraName":  cameraName,
			"detections":  detections,
			"processedAt": time.Now().UTC().Format(time.RFC3339),
		},
	}

	// Send alert to backend
	if err := as.sendAlertToBackend(payload); err != nil {
		return fmt.Errorf("failed to send alert to backend: %w", err)
	}

	utils.GetLogger().Infof("Alert created successfully for camera %s: %d faces detected (avg confidence: %.2f)",
		cameraID, len(detections), avgConfidence)

	return nil
}

// 🆕 REPLACED - saveSnapshot uploads to Cloudinary
func (as *AlertService) saveSnapshot(cameraID string, frame *gocv.Mat) (string, error) {
	if as.cloudinaryClient == nil {
		return "", fmt.Errorf("cloudinary not configured")
	}

	// Encode frame to JPEG in memory
	buf, err := gocv.IMEncode(".jpg", *frame)
	if err != nil {
		return "", fmt.Errorf("failed to encode frame: %w", err)
	}
	defer buf.Close()

	// Generate unique public ID
	timestamp := time.Now().Format("20060102_150405")
	publicID := fmt.Sprintf("%s/%s_%s", as.cfg.CloudinaryFolder, cameraID, timestamp)

	// 🔧 FIX: Convert []byte to io.Reader using bytes.NewReader
	imageBytes := buf.GetBytes()
	reader := bytes.NewReader(imageBytes)

	// Upload to Cloudinary
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	uploadResult, err := as.cloudinaryClient.Upload.Upload(
		ctx,
		reader, // ✅ Pass io.Reader instead of []byte
		uploader.UploadParams{
			PublicID:       publicID,
			ResourceType:   "image",
			Format:         "jpg",
			Transformation: "q_auto:low,f_auto", // Auto quality & format optimization
		},
	)

	if err != nil {
		return "", fmt.Errorf("cloudinary upload failed: %w", err)
	}

	utils.GetLogger().Infof("📸 Snapshot uploaded to Cloudinary: %s (size: %d bytes)",
		uploadResult.SecureURL, len(imageBytes))

	// Return HTTPS URL
	return uploadResult.SecureURL, nil
}

// sendAlertToBackend sends the alert payload to the backend service
func (as *AlertService) sendAlertToBackend(payload CreateAlertPayload) error {
	url := fmt.Sprintf("%s/api/v1/alerts/create-alert", as.cfg.BackendServiceURL)

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Backend-Worker-API-Key", as.cfg.BackendWorkerAPIKey)

	resp, err := as.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("backend returned status %d: %s", resp.StatusCode, string(body))
	}

	utils.GetLogger().Debugf("Alert sent to backend successfully: %s", url)

	return nil
}

// 🗑️ REMOVED - These functions are no longer needed:
// - CleanupOldSnapshots (Cloudinary handles retention)
// - StartCleanupTask (not needed)
// - GetSnapshotPath (not needed)
// - ResizeFrame (Cloudinary handles optimization)
