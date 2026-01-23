package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/streadway/amqp"
	"net/http"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/streadway/amqp"
)

// Feedback structure matches the real feedback form UI
type Feedback struct {
	User    string `json:"user"`
	Email   string `json:"email"`
	Phone   string `json:"phone"`
	Message string `json:"message"`
}

func main() {
	// API Routes
	http.HandleFunc("/api/feedback", feedbackHandler)
	
	// --- Added for Kubernetes Probes ---
	http.HandleFunc("/healthz", healthHandler)

	// This expose all default Go metrics at (metrics will be scraped by Prometheus)
    http.Handle("/metrics", promhttp.Handler())

	port := "8080"
	fmt.Printf("🚀 Backend API is starting on port %s...\n", port)
	
	// Start the server
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// healthHandler responds to Kubernetes liveness/readiness probes
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func feedbackHandler(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	var fb Feedback
	err := json.NewDecoder(r.Body).Decode(&fb)
	if err != nil {
		log.Printf("Error decoding JSON: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Send the data to the RabbitMQ Queue
	err = sendToQueue(fb)
	if err != nil {
		log.Printf("RabbitMQ Error: %v", err)
		http.Error(w, "Internal server error: Could not queue feedback", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Feedback queued for user: %s", fb.User)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Feedback received"})
}

func sendToQueue(fb Feedback) error {
	// Get RabbitMQ URL from Env
	rabbitURL := os.Getenv("RABBITMQ_URL")
	if rabbitURL == "" {
		rabbitURL = "amqp://guest:guest@rabbitmq.feedback-dev.svc.cluster.local:5672/"
	}

	conn, err := amqp.Dial(rabbitURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	q, err := ch.QueueDeclare(
		"feedback_queue", // Queue name
		true,             // Durable
		false,            // Delete when unused
		false,            // Exclusive
		false,            // No-wait
		nil,              // Arguments
	)
	if err != nil {
		return err
	}

	body, _ := json.Marshal(fb)
	return ch.Publish(
		"",     // Exchange
		q.Name, // Routing key
		false,  // Mandatory
		false,  // Immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		})
}