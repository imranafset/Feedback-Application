# Stage 1: Build the Go Binary
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod init feedback-backend || true
RUN go get github.com/streadway/amqp
RUN go build -o main .

# Stage 2: Run the binary
FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
