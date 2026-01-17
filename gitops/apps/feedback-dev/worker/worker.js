const amqp = require('amqplib');
const { Pool } = require('pg');

const pgPool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'admin123',
    database: process.env.DB_NAME || 'feedback_db'
});

async function startWorker() {
    try {
        const connection = await amqp.connect('amqp://rabbitmq.feedback-dev.svc.cluster.local:5672');
        const channel = await connection.createChannel();
        await channel.assertQueue('feedback_queue', { durable: true });

        console.log("👷 Worker waiting for messages...");

        channel.consume('feedback_queue', async (msg) => {
            const content = JSON.parse(msg.content.toString());
            console.log("📩 Processing:", content);

            try {
                // Ensure your database table has these columns!
                await pgPool.query(
                    'INSERT INTO feedback (user_name, email, phone, message) VALUES ($1, $2, $3, $4)',
                    [content.user, content.email, content.phone, content.message]
                );
                console.log("✅ Saved to Postgres");
                channel.ack(msg);
            } catch (dbErr) {
                console.error("❌ DB Error:", dbErr.message);
            }
        });
    } catch (err) {
        console.error("❌ Connection Error, retrying...", err.message);
        setTimeout(startWorker, 5000);
    }
}
startWorker();