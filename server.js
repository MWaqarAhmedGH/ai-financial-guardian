const express = require('express');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const open = require('open');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-flash-latest",
  systemInstruction: `You are a premium, Google-level AI Financial Assistant for Pakistani users. Focus exclusively on financial safety, scam detection, and smart money guidance.

BEHAVIOR RULES:
1. LANGUAGES: Mix of Simple English + Urdu (Hinglish).
2. REDIRECTION: If asked unrelated questions (tell me a joke, sing a song, entertainment, personal talk, etc.), politely redirect: "I am specifically designed for financial safety, fraud detection, and budgeting guidance."
3. FEATURES: If asked "what can you do" or "help", list: Scam analysis, Risk scoring, Budgeting, and Fraud prevention.
4. SCAM ANALYSIS: Always include "⚠️ Scam Risk Score: X%" at the top, followed by a short "Why" and "Action" points.
5. TONE: Professional, smart, and ultra-concise (Max 8-12 lines). Use bullet points.`
});

// In-memory history (Simple implementation for one user session)
let chatHistory = [];

// Chat Endpoint
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Handle "Clear Chat" intent from frontend
  if (message.toLowerCase() === '___clear_history___') {
    chatHistory = [];
    return res.json({ reply: "History cleared." });
  }

  try {
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // Update history
    chatHistory.push({ role: "user", parts: [{ text: message }] });
    chatHistory.push({ role: "model", parts: [{ text: text }] });

    // Keep history manageable (last 10 messages)
    if (chatHistory.length > 20) {
      chatHistory = chatHistory.slice(-20);
    }

    res.json({ reply: text });
  } catch (error) {
    console.error('Error with Gemini API:', error);
    
    // Check if the error is due to safety filters
    if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
      return res.json({ reply: "Maaf kijiyega, yeh paighamaat hamare safety filters ki wajah se block hogaya hai. Baraye meherbani koi aur sawal poochein." });
    }

    res.status(500).json({ error: 'Nakam hogaye! Phir se koshish karein.' });
  }
});

// Start Server
app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}`);
  // Automatically open the browser
  try {
    await open(`http://localhost:${port}`);
  } catch (err) {
    console.error('Failed to open browser automatically:', err);
  }
});
