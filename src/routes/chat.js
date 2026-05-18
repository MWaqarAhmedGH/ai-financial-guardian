// ════════════════════════════════════════════════════
// src/routes/chat.js — Standard chat route (POST /chat)
// ════════════════════════════════════════════════════
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { apiKeys, currentKey, rotateKey, parseJSON, FULL_DATA_CTX } = require('../data');

const router = express.Router();

const { inventoryData, newsData, feedData, reportData, forecastData } = FULL_DATA_CTX;

const SYSTEM_PROMPT = `
You are the "Project Master Intelligence" (PMI) - a Multi-Agent Orchestrator powered by Google Antigravity.
To fulfill Challenge 1, you act as a collaborative team:
1. [Coordinator]: Strategy, Workplan, Task allocation.
2. [Analyst]: Data analysis, Multi-source cross-referencing, Contradiction detection.
3. [Executor]: Simulation, System state changes, Communication drafting.

AVAILABLE TOOLS (Simulated):
- [Antigravity Web/PDF Parser]: Extracts key facts and signals from URLs, articles, or PDF documents.
- [Market Intelligence Engine]: Accesses real-time news and forecasts.
- [System State Manager]: Updates Dashboard metrics (Stock, Risk, Budget).

CONTEXT (Real-time Multi-Source System Data):
--- INVENTORY DATA ---
${inventoryData}
--- MARKET NEWS ---
${newsData}
--- LIVE FEED ---
${feedData}
--- FINANCIAL REPORT ---
${reportData}
--- FORECAST DATA ---
${forecastData}

CRITICAL: Respond in valid JSON ONLY.
{
  "display_text": "Hinglish response (8-12 lines, bullet points)",
  "scam_score": 0,
  "insight": "Key extracted fact",
  "impact": "Real-world consequence",
  "recommended_actions": [{"id":"","label":"","type":"draft|simulation|message"}],
  "agent_trace": {
    "workplan": "...", "tasks": ["..."],
    "reasoning": "...", "decision_flow": "...", "action_execution": "..."
  },
  "system_state_change": {
    "before": "...", "after": "...",
    "metrics_update": {"stock":"","risk":0,"budget":""}
  },
  "fia_complaint_draft": ""
}
Language: Hinglish. Show clear tool usage in tasks and reasoning.
`;

let chatHistory = [];

router.get('/api-status', (_req, res) => res.json({
    status: 'online',
    keys_found: apiKeys.length,
    environment: process.env.NODE_ENV || 'production',
    model: 'gemini-flash-lite-latest'
}));

router.post('/chat', async (req, res) => {
    const { message, image } = req.body;
    if (!message && !image) return res.status(400).json({ error: 'Message or image required.' });

    if (message?.toLowerCase() === '___clear_history___') {
        chatHistory = [];
        return res.json({ reply: 'History cleared.' });
    }

    if (!apiKeys.length) return res.status(500).json({ error: 'No API keys configured.' });

    let lastError = '';
    for (let i = 0; i < apiKeys.length; i++) {
        try {
            const genAI = new GoogleGenerativeAI(currentKey());
            const model = genAI.getGenerativeModel({
                model: 'gemini-flash-lite-latest',
                systemInstruction: SYSTEM_PROMPT
            });
            const chat = model.startChat({
                history: chatHistory,
                generationConfig: { maxOutputTokens: 2048, temperature: 0.1, responseMimeType: 'application/json' }
            });

            let result;
            if (image) {
                const m = image.match(/^data:(.+);base64,(.+)$/);
                if (!m) throw new Error('Invalid image format.');
                result = await chat.sendMessage([
                    { inlineData: { data: m[2], mimeType: m[1] } },
                    message || 'Analyze this financial content.'
                ]);
            } else {
                result = await chat.sendMessage(message);
            }

            const rawText = result.response.text();
            let parsed = parseJSON(rawText);
            if (!parsed) parsed = { display_text: rawText.substring(0, 500), scam_score: 0, recommended_actions: [] };

            chatHistory.push({ role: 'user',  parts: [{ text: message || '[Image]' }] });
            chatHistory.push({ role: 'model', parts: [{ text: JSON.stringify(parsed) }] });
            if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

            parsed.reply = parsed.display_text;
            return res.json(parsed);
        } catch (err) {
            lastError = err.message;
            rotateKey();
        }
    }
    res.status(500).json({ error: `AI failed. ${lastError}` });
});

module.exports = router;
