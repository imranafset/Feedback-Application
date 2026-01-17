const ampq = require('amqplib');
const { Pool } = require('pg');

//Connections
const pgpool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    user:process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'admin123',
    database: process.env.DB_NAME || 'feedback_db'

});

async function startWorker() {
    try {
        const connection = await ampq.connect('amqp://rabbitmq.feedback-dev.svc.cluster.local:5672');
        const channel = await connection.createChannel();
        await channel.assertQueue('feedback_queue', { durable: true });

        console.log("👷 Worker waiting for messages...");

        channel.consume('feedback_queue', async (msg) => {
            const content = JSON.parse(msg.content.toString());
            console.log("📩 Received feedback:", content);

            try {
                await pgpool.query(
                    'INSERT INTO feedback (user_name, message) VALUES ($1, $2)',
                    [content.user, content.message]
                );
                console.log("✅ Saved to Database");
                channel.ack(msg);
            } catch(dbErr) {
                console.error("❌ DB Error:", dbErr.message);
            }
        });
    } catch(err) {
        console.error("❌ Worker Connection Error, retrying...", err.message);
        setTimeout(startWorker, 5000);
    }                        
}

startWorker();