package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"

    "github.com/streadway/amqp"
)

type Feedback struct {
    User    string `json:"user"`
    Email   string `json:"email"`
    Phone   string `json:"phone"`
    Message string `json:"message"`
}

func main() {
    // API Routes
    http.HandleFunc("/api/feedback", feedbackHandler)
    
    // --- ADDED FOR KUBERNETES PROBES ---
    http.HandleFunc("/healthz", healthHandler) 
    // -----------------------------------

    port := "8080"
    fmt.Printf("🚀 Backend API is starting on port %s...\n", port)
    
    log.Fatal(http.ListenAndServe(":"+port, nil))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

// ... rest of your feedbackHandler and sendToQueue functions stay exactly the same ...