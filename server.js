require('dotenv').config();
const express = require('express');
const path    = require('path');

const chatRouter     = require('./src/routes/chat');
const pipelineRouter = require('./src/routes/pipeline');

const app = express();

// ── Middleware ────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── Frontend (static files) ───────────────────────────
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get('/', (_req, res) => res.sendFile(path.join(publicPath, 'index.html')));

// ── Backend routes ────────────────────────────────────
app.use(chatRouter);
app.use(pipelineRouter);

// ── Start (local dev only) ────────────────────────────
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`\n  Local: http://localhost:${port}\n`));
}

module.exports = app;
