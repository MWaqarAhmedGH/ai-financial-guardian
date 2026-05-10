const express = require('express');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const open = require('open');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ===============================
// Middleware
// ===============================
app.use(express.json({ limit: '10mb' }));

// Serve static files from the 'public' directory with absolute path
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// ===============================
// Homepage Route
// ===============================
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ===============================
// Load Multiple API Keys
// ===============================
const apiKeys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3
].filter(Boolean);

console.log(`Loaded ${apiKeys.length} API keys.`);

let currentKeyIndex = 0;

function rotateKey() {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  console.log(`Switched to API Key index: ${currentKeyIndex}`);
}

// ===============================
// AI System Prompt
// ===============================
const SYSTEM_PROMPT = `
You are a premium, Google-level AI Financial Assistant for Pakistani users.

RULES:
1. Use Simple English + Urdu (Hinglish).
2. Be concise, smart, and professional.
3. Only show Scam Risk Score when user shares suspicious content.
4. Redirect unrelated entertainment questions politely.
5. Focus on:
   - Scam Detection
   - Financial Safety
   - Budget Planning
   - Pakistani Financial Guidance
6. Maximum response length: 8-12 lines.
`;

// ===============================
// Chat History
// ===============================
let chatHistory = [];

// ===============================
// Chat Endpoint
// ===============================
app.post('/chat', async (req, res) => {
  const { message, image } = req.body;

  if (!message && !image) {
    return res.status(400).json({
      error: 'Message or image is required.'
    });
  }

  // Clear History Command
  if (message && message.toLowerCase() === '___clear_history___') {
    chatHistory = [];
    return res.json({
      reply: 'Chat history cleared successfully.'
    });
  }

  console.log(`--- New Request Received ---`);

  // Try all API keys one-by-one
  for (let attempts = 0; attempts < apiKeys.length; attempts++) {

    const currentKey = apiKeys[currentKeyIndex];

    console.log(`Using API Key #${currentKeyIndex + 1}`);

    try {

      const genAI = new GoogleGenerativeAI(currentKey);

      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
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

      // ===============================
      // IMAGE + TEXT SUPPORT
      // ===============================
      if (image) {

        const matches = image.match(/^data:(.+);base64,(.+)$/);

        if (!matches) {
          throw new Error('Invalid image format.');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        result = await chat.sendMessage([
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          message || 'Analyze this screenshot for scams.'
        ]);

      } else {

        result = await chat.sendMessage(message);

      }

      const response = await result.response;
      const text = response.text();

      // ===============================
      // Save Chat History
      // ===============================
      chatHistory.push({
        role: 'user',
        parts: [{ text: message || '[Image Uploaded]' }]
      });

      chatHistory.push({
        role: 'model',
        parts: [{ text }]
      });

      // Keep history limited
      if (chatHistory.length > 20) {
        chatHistory = chatHistory.slice(-20);
      }

      console.log('Response generated successfully.');

      return res.json({
        reply: text
      });

    } catch (error) {

      console.error(`API Key Failed: ${error.message}`);

      // Safety Filter Handling
      if (
        error.response &&
        error.response.promptFeedback &&
        error.response.promptFeedback.blockReason
      ) {
        return res.json({
          reply:
            'Maaf kijiyega, yeh request hamare safety filters ki wajah se block ho gayi hai.'
        });
      }

      // Rotate API Key
      rotateKey();
    }
  }

  // ===============================
  // All Keys Failed
  // ===============================
  return res.status(500).json({
    error:
      'Nakam hogaye! Saare AI servers busy hain. Thori dair baad dobara koshish karein.'
  });
});

// ===============================
// Start Server
// ===============================
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}`);
    // Automatically open the browser locally
    try {
      await open(`http://localhost:${port}`);
    } catch (err) {
      console.error('Failed to open browser automatically:', err);
    }
  });
}

// Export for Vercel
module.exports = app;