const express = require('express');
const amqp = require('amqplib');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// 1. Database Connection (For GET requests/reading)
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'feedback_db',
  port: process.env.DB_PORT || 5432,
});

// 2. RabbitMQ Connection (For POST requests/writing)
let channel;
async function connectRabbit() {
  try {
    // Kubernetes internal DNS: amqp://service-name.namespace
    const connection = await amqp.connect('amqp://rabbitmq.feedback-dev.svc.cluster.local:5672');
    channel = await connection.createChannel();
    await channel.assertQueue('feedback_queue', { durable: true });
    console.log("✅ Backend connected to RabbitMQ");
  } catch (err) {
    console.error("❌ RabbitMQ Connection Failed, retrying in 5s...", err.message);
    setTimeout(connectRabbit, 5000);
  }
}
connectRabbit();

// HEALTH CHECK: Important for Kubernetes Liveness probes
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is healthy' });
});

// ENTERPRISE POST ROUTE: Sends feedback to RabbitMQ
// Removed '/api' because Ingress strips it before reaching here
app.post('/feedback', async (req, res) => {
  const { user, message } = req.body;
  const feedback = { user, message, date: new Date() };

  try {
    if (!channel) {
        throw new Error("RabbitMQ channel not initialized");
    }
    // Send to Queue
    channel.sendToQueue('feedback_queue', Buffer.from(JSON.stringify(feedback)), {
      persistent: true
    });
    
    // Return 202 Accepted
    res.status(202).json({ status: 'Accepted', message: 'Feedback queued for processing' });
  } catch (err) {
    console.error("Queue Error:", err.message);
    res.status(500).json({ error: 'Failed to queue feedback' });
  }
});

// GET ROUTE: Reads directly from Postgres
// Removed '/api' because Ingress strips it before reaching here
app.get('/feedback', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM feedback ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(8080, () => console.log('🚀 Backend V3 (Enterprise) running on 8080'));
