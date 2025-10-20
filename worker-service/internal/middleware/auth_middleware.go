package middleware

import (
	"net/http"
	"worker-service/internal/config"
	"worker-service/internal/utils"

	"github.com/gin-gonic/gin"
)

// WorkerAuthMiddleware validates the backend worker API key
func WorkerAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger := utils.GetLogger()

		// Get API key from header
		apiKey := c.GetHeader("X-Backend-Worker-API-Key")

		if apiKey == "" {
			logger.Warn("Missing API key in request")
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Missing API key",
			})
			c.Abort()
			return
		}

		// Validate API key
		if apiKey != cfg.BackendWorkerAPIKey {
			logger.Warn("Invalid API key in request")
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Invalid API key",
			})
			c.Abort()
			return
		}

		// Set context values for later use
		c.Set("userID", c.GetHeader("X-User-Id"))
		c.Set("userRole", c.GetHeader("X-User-Role"))

		c.Next()
	}
}
