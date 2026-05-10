const express = require('express');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const open = require('open');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware - Increased limit for base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Load multiple API keys
const apiKeys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3
].filter(Boolean);

console.log(`Loaded ${apiKeys.length} API keys.`);

let currentKeyIndex = 0;

function getGenAI() {
  return new GoogleGenerativeAI(apiKeys[currentKeyIndex]);
}

function rotateKey() {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  console.log(`Switched to API Key index: ${currentKeyIndex}`);
}

const SYSTEM_PROMPT = `You are a premium, Google-level AI Financial Assistant for Pakistani users.

BEHAVIOR RULES:
1. LANGUAGES: Mix of Simple English + Urdu (Hinglish).
2. REDIRECTION: If asked unrelated questions (jokes, entertainment), politely redirect.
3. SCAM ANALYSIS: ONLY show "⚠️ Scam Risk Score: X%" if the user shares a suspicious message, link, SMS, or screenshot. For greetings (Hi, Salam) or general financial advice, do NOT show the risk score.
4. TONE: Professional, smart, and ultra-concise (Max 8-12 lines).`;

// Initialize chat history
let chatHistory = [];

// Chat Endpoint
app.post('/chat', async (req, res) => {
  const { message, image } = req.body;

  if (!message && !image) {
    return res.status(400).json({ error: 'Message or Image is required' });
  }

  if (message && message.toLowerCase() === '___clear_history___') {
    chatHistory = [];
    return res.json({ reply: "History cleared." });
  }

  console.log(`--- New Request: ${message ? message.substring(0, 20) : "Image Only"} ---`);

  // Try available keys one by one
  for (let attempts = 0; attempts < apiKeys.length; attempts++) {
    const currentKey = apiKeys[currentKeyIndex];
    console.log(`Attempt ${attempts + 1}: Using Key #${currentKeyIndex + 1}`);

    try {
      const tempGenAI = new GoogleGenerativeAI(currentKey);
      const tempModel = tempGenAI.getGenerativeModel({ 
        model: "gemini-flash-latest",
        systemInstruction: SYSTEM_PROMPT
      });

      const chat = tempModel.startChat({
        history: chatHistory,
        generationConfig: { maxOutputTokens: 2048 },
      });

      let result;
      if (image) {
        // Extract base64 and mime type
        const matches = image.match(/^data:(.+);base64,(.+)$/);
        if (!matches) throw new Error("Invalid image format");
        
        const mimeType = matches[1];
        const base64Data = matches[2];

        result = await chat.sendMessage([
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          message || "Analyze this screenshot for scams."
        ]);
      } else {
        result = await chat.sendMessage(message);
      }

      const response = await result.response;
      const text = response.text();

      // If successful, save text history
      chatHistory.push({ role: "user", parts: [{ text: message || "[Sent an Image]" }] });
      chatHistory.push({ role: "model", parts: [{ text: text }] });
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

      console.log(`Attempt ${attempts + 1} SUCCESS!`);
      return res.json({ reply: text });

    } catch (error) {
      console.error(`Attempt ${attempts + 1} FAILED:`, error.message);

      if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
        return res.json({ reply: "Maaf kijiyega, yeh paighamaat hamare safety filters ki wajah se block hogaya hai." });
      }

      rotateKey();
    }
  }

  res.status(500).json({ error: 'Nakam hogaye! Hamare saare servers masroof hain. Thori dair baad koshish karein.' });
});

// Start Server
app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}`);
  try {
    await open(`http://localhost:${port}`);
  } catch (err) {
    console.error('Failed to open browser automatically:', err);
  }
});
