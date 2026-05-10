const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();

// ===============================
// Middleware
// ===============================
app.use(express.json({ limit: '10mb' }));

// Serve static files from the 'public' directory
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// ===============================
// Load API Keys
// ===============================
const apiKeys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3
].filter(Boolean);

let currentKeyIndex = 0;

function rotateKey() {
  if (apiKeys.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    console.log(`Switched to API Key index: ${currentKeyIndex}`);
  }
}

// ===============================
// AI System Prompt
// ===============================
const SYSTEM_PROMPT = `
You are a premium, Google-level AI Financial Assistant for Pakistani users.
Respond in Simple English + Urdu mix. Be concise (8-12 lines).
Focus on Scam Detection, Financial Safety, and Budgeting.
`;

// Initialize chat history (Note: This resets on every Vercel cold start)
let chatHistory = [];

// ===============================
// Routes
// ===============================

app.get('/api-status', (req, res) => {
  res.json({
    status: "online",
    keys_found: apiKeys.length,
    environment: process.env.NODE_ENV || 'production'
  });
});

app.post('/chat', async (req, res) => {
  const { message, image } = req.body;

  if (!message && !image) {
    return res.status(400).json({ error: 'Message or image is required.' });
  }

  if (message && message.toLowerCase() === '___clear_history___') {
    chatHistory = [];
    return res.json({ reply: 'Chat history cleared.' });
  }

  if (apiKeys.length === 0) {
    return res.status(500).json({ error: "No API keys configured on server." });
  }

  // Attempt loop
  for (let attempts = 0; attempts < apiKeys.length; attempts++) {
    const currentKey = apiKeys[currentKeyIndex];
    try {
      const genAI = new GoogleGenerativeAI(currentKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_PROMPT
      });

      const chat = model.startChat({
        history: chatHistory,
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
      });

      let result;
      if (image) {
        const matches = image.match(/^data:(.+);base64,(.+)$/);
        if (!matches) throw new Error('Invalid image format.');
        result = await chat.sendMessage([{ inlineData: { data: matches[2], mimeType: matches[1] } }, message || 'Analyze this.']);
      } else {
        result = await chat.sendMessage(message);
      }

      const response = await result.response;
      const text = response.text();

      chatHistory.push({ role: 'user', parts: [{ text: message || '[Image]' }] });
      chatHistory.push({ role: 'model', parts: [{ text }] });
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

      return res.json({ reply: text });

    } catch (error) {
      console.error(`Key #${currentKeyIndex + 1} Failed:`, error.message);
      if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
        return res.json({ reply: 'Maaf kijiyega, yeh request safety filters ki wajah se block ho gayi hai.' });
      }
      rotateKey();
    }
  }

  return res.status(500).json({ 
    error: `Nakam hogaye! AI connection fail ho gayi hai. (Keys: ${apiKeys.length}). Baraye meherbani /api-status check karein ya thori dair baad koshish karein.` 
  });
});

// For local testing
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Local server: http://localhost:${port}`));
}

module.exports = app;
