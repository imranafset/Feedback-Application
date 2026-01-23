const express = require('express');
const path = require('path');
const app = express();

const BACKEND_URL = process.env.BACKEND_URL || 'https://feedback-dev.example.com/api';

// --- ADDED FOR KUBERNETES PROBES ---
app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});
// -----------------------------------

app.use(express.static('public'));

app.get('/config', (req, res) => {
    res.json ({ backendUrl: BACKEND_URL });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => console.log('🌐 Frontend running on port 3000'));