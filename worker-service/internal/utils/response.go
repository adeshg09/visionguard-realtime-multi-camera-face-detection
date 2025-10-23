package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response represents a standard API response
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// SendOK sends a successful response
func SendOK(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// SendCreated sends a created response
func SendCreated(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusCreated, Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// SendBadRequest sends a bad request error response
func SendBadRequest(c *gin.Context, err error) {
	c.JSON(http.StatusBadRequest, Response{
		Success: false,
		Error:   err.Error(),
	})
}

// SendNotFound sends a not found error response
func SendNotFound(c *gin.Context, err error) {
	c.JSON(http.StatusNotFound, Response{
		Success: false,
		Error:   err.Error(),
	})
}

// SendInternalError sends an internal server error response
func SendInternalError(c *gin.Context, err error) {
	c.JSON(http.StatusInternalServerError, Response{
		Success: false,
		Error:   err.Error(),
	})
}

// SendUnauthorized sends an unauthorized error response
func SendUnauthorized(c *gin.Context, message string) {
	c.JSON(http.StatusUnauthorized, Response{
		Success: false,
		Error:   message,
	})
}