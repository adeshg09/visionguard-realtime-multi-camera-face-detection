package main

// ----------------------------------------------------------------------

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"worker-service/internal/config"
	"worker-service/internal/handlers"
	"worker-service/internal/middleware"
	"worker-service/internal/services"
	"worker-service/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// ----------------------------------------------------------------------

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Printf("Fatal: Failed to load configuration: %v", err)
		os.Exit(1)
	}

	// ----------------------------------------------------------------------

	// Initialize logger
	utils.InitLogger(cfg.LogLevel)
	logger := utils.GetLogger()

	logger.Info("🚀 VisionGuard Worker Service starting...")
	logger.Infof("📊 Configuration: Port=%d | Gin Mode=%s | Optimal Stream Capacity=%d",
		cfg.Port, cfg.GinMode, cfg.OptimalStreamCapacity)

	// ----------------------------------------------------------------------

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// ----------------------------------------------------------------------

	// Initialize services
	mediamtxClient := services.NewMediaMTXClient(cfg.MediaMTXAPIURL)
	alertService := services.NewAlertService(cfg)
	streamManager := services.NewStreamManager(cfg, mediamtxClient, alertService)

	// ----------------------------------------------------------------------

	// Check MediaMTX connectivity
	if healthy, msg := mediamtxClient.IsHealthy(); !healthy {
		logger.Warnf("⚠️ MediaMTX not healthy: %s", msg)
	} else {
		logger.Info("✅ MediaMTX connectivity verified")
	}

	// ----------------------------------------------------------------------

	// Initialize handlers
	cameraHandler := handlers.NewCameraHandler(streamManager)

	// ----------------------------------------------------------------------

	// Setup HTTP server
	server := setupServer(cfg, cameraHandler)

	// Setup graceful shutdown
	setupGracefulShutdown(server, streamManager, logger)

	// Start server
	addr := fmt.Sprintf(":%d", cfg.Port)
	logger.Infof("🌐 Server listening on %s", addr)
	logger.Infof("📡 Ready to accept camera stream requests")

	if err := server.Run(addr); err != nil {
		logger.Fatalf("Failed to start server: %v", err)
	}
}

// ----------------------------------------------------------------------

// setupServer configures the Gin engine with routes and middleware
func setupServer(cfg *config.Config, cameraHandler *handlers.CameraHandler) *gin.Engine {
	engine := gin.New()

	// Global middleware
	engine.Use(gin.Logger(), gin.Recovery())

	// Public routes
	engine.GET("/health", cameraHandler.HealthCheck)
	engine.GET("/api/v1/health", cameraHandler.HealthCheck)

	// ----------------------------------------------------------------------

	// Protected API routes
	api := engine.Group("/api/v1")
	api.Use(middleware.AuthMiddleware(cfg))
	{
		api.POST("/cameras/start-stream", cameraHandler.StartStream)
		api.POST("/cameras/stop-stream", cameraHandler.StopStream)
		api.GET("/cameras/:id/status", cameraHandler.GetStreamStatus)
		api.POST("/cameras/:id/toggle-face-detection", cameraHandler.ToggleFaceDetection)
		api.POST("/cameras/:id/update-fps", cameraHandler.UpdateFPS)
	}

	return engine
}

// ----------------------------------------------------------------------

// setupGracefulShutdown handles OS signals for graceful shutdown
func setupGracefulShutdown(server *gin.Engine, streamManager *services.StreamManager, logger *logrus.Logger) {
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		logger.Info("🛑 Shutdown signal received, closing streams...")

		// Stop all active streams
		streams := streamManager.GetAllStreams()
		stoppedCount := 0
		for cameraID := range streams {
			if _, err := streamManager.StopStream(cameraID); err != nil {
				logger.Errorf("❌ Error stopping stream %s: %v", cameraID, err)
			} else {
				stoppedCount++
				logger.Infof("✅ Stopped stream: %s", cameraID)
			}
		}

		logger.Infof("✅ All streams stopped (%d total). Exiting...", stoppedCount)
		os.Exit(0)
	}()
}
