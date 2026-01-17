const express = require('express');
const path = require('path');
const app = express();

// The Frontend needs to know where the Backend is
// In Kubernetes, we will use the Backend's Service name

const BACKEND_URL = process.env.BACKEND_URL || 'http//feedback-backend:8080';

app.use(express.static('public'));

app.get('/config', (req, res) => {
    res.json ({ backendUrl: BACKEND_URL });

});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => console.log('🌐 Frontend running on port 3000'));