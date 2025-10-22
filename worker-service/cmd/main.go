package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"worker-service/internal/config"
	"worker-service/internal/handlers"
	"worker-service/internal/middleware"
	"worker-service/internal/services"
	"worker-service/internal/utils"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	utils.InitLogger(cfg.LogLevel)
	logger := utils.GetLogger()

	logger.Infof("🚀 VisionGuard Worker Service Starting...")
	logger.Infof("Port: %d | Gin Mode: %s | Max Streams: %d", cfg.Port, cfg.GinMode, cfg.MaxConcurrentStreams)

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// Initialize services
	mediamtxClient := services.NewMediaMTXClient(cfg.MediaMTXAPIURL)
	streamManager := services.NewStreamManager(cfg.MaxConcurrentStreams, mediamtxClient)

	// Check MediaMTX connectivity
	healthy, msg := mediamtxClient.IsHealthy()
	if !healthy {
		logger.Warnf("⚠️ MediaMTX not healthy: %s", msg)
	} else {
		logger.Infof("✓ MediaMTX healthy: %s", msg)
	}

	// Initialize handlers
	cameraHandler := handlers.NewCameraHandler(streamManager)

	// Create Gin engine
	engine := gin.New()

	// Global middleware
	engine.Use(gin.Logger())
	engine.Use(gin.Recovery())

	// Health check (public endpoint)
	engine.GET("/health", cameraHandler.HealthCheck)
	engine.GET("/api/v1/health", cameraHandler.HealthCheck)

	// Protected API routes
	api := engine.Group("/api/v1")
	api.Use(middleware.WorkerAuthMiddleware(cfg))
	{
		// Camera stream management
		api.POST("/cameras/start-stream", cameraHandler.StartStream)
		api.POST("/cameras/stop-stream", cameraHandler.StopStream)
		api.GET("/cameras/:id/status", cameraHandler.GetStreamStatus)
		api.GET("/cameras/streams/all", cameraHandler.GetAllStreams)

		api.GET("/cameras/:id/stats", cameraHandler.GetStreamStats)
		api.POST("/cameras/:id/toggle-face-detection", cameraHandler.ToggleFaceDetection)
		api.POST("/cameras/:id/frame-skip-interval", cameraHandler.UpdateFrameSkipInterval)
		api.GET("/cameras/:id/metrics", cameraHandler.GetCameraMetrics)
		api.GET("/metrics", cameraHandler.GetAllMetrics)
		api.GET("/performance", cameraHandler.GetPerformanceStats)

	}

	// Handle graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		logger.Infof("Shutdown signal received, closing streams...")

		// Stop all streams
		streams := streamManager.GetAllStreams()
		for cameraID := range streams {
			if _, err := streamManager.StopStream(cameraID); err != nil {
				logger.Errorf("Error stopping stream %s: %v", cameraID, err)
			}
		}

		logger.Infof("All streams stopped. Exiting...")
		os.Exit(0)
	}()

	// Start server
	addr := fmt.Sprintf(":%d", cfg.Port)
	logger.Infof("✓ Worker service listening on %s", addr)

	if err := engine.Run(addr); err != nil {
		logger.Fatalf("Failed to start server: %v", err)
	}
}
