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
// Load API Keys from Environment
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
  }
}

// ===============================
// AI System Prompt
// ===============================
const SYSTEM_PROMPT = `
You are a premium, Google-level AI Financial Assistant for Pakistani users.
Respond in Simple English + Urdu mix (Hinglish).
Be concise (Max 8-12 lines). Use bullet points.
Focus on:
1. Scam Detection (BISP, Lottery, Bank Phishing).
2. Financial Safety Advice.
3. Smart Budgeting (50/30/20 rule).
4. Only show Risk Score for suspicious content.
`;

// Initialize chat history (Resets on Vercel cold starts)
let chatHistory = [];

// ===============================
// Routes
// ===============================

// Health Check / Diagnostic Route
app.get('/api-status', (req, res) => {
  res.json({
    status: "online",
    keys_found: apiKeys.length,
    environment: process.env.NODE_ENV || 'production',
    model: 'gemini-flash-latest'
  });
});

// Main Chat Route
app.post('/chat', async (req, res) => {
  const { message, image } = req.body;

  if (!message && !image) {
    return res.status(400).json({ error: 'Message or image is required.' });
  }

  // Handle Manual History Clear
  if (message && message.toLowerCase() === '___clear_history___') {
    chatHistory = [];
    return res.json({ reply: 'History cleared.' });
  }

  if (apiKeys.length === 0) {
    return res.status(500).json({ error: "API Keys not configured on Vercel. Please check Settings > Environment Variables." });
  }

  let lastError = "Unknown error";

  // Retry logic through all available keys
  for (let attempts = 0; attempts < apiKeys.length; attempts++) {
    const currentKey = apiKeys[currentKeyIndex];
    
    try {
      const genAI = new GoogleGenerativeAI(currentKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-flash-latest', // Standard working model name
        systemInstruction: SYSTEM_PROMPT
      });

      const chat = model.startChat({
        history: chatHistory,
        generationConfig: { 
          maxOutputTokens: 2048, 
          temperature: 0.7 
        }
      });

      let result;
      if (image) {
        const matches = image.match(/^data:(.+);base64,(.+)$/);
        if (!matches) throw new Error('Invalid image format.');
        
        result = await chat.sendMessage([
          { inlineData: { data: matches[2], mimeType: matches[1] } },
          message || 'Analyze this screenshot for scams.'
        ]);
      } else {
        result = await chat.sendMessage(message);
      }

      const response = await result.response;
      const text = response.text();

      // Update history only on success
      chatHistory.push({ role: 'user', parts: [{ text: message || '[Image]' }] });
      chatHistory.push({ role: 'model', parts: [{ text }] });
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

      return res.json({ reply: text });

    } catch (error) {
      lastError = error.message;
      console.error(`Attempt ${attempts + 1} Failed:`, lastError);

      // Handle specific safety block
      if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
        return res.json({ reply: 'Maaf kijiyega, yeh request safety filters ki wajah se block ho gayi hai. Baraye meherbani koi aur sawal poochein.' });
      }

      // Rotate to next key for next attempt
      rotateKey();
    }
  }

  // Return specific error details to user if all keys fail
  return res.status(500).json({ 
    error: `Nakam hogaye! AI connection fail ho gayi. (Total Keys: ${apiKeys.length}). Last Error: ${lastError}` 
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Local server running: http://localhost:${port}`));
}

module.exports = app;
