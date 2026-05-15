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

// Explicit Root Route
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

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
You are an Agentic AI Financial Guardian for Pakistani users, powered by Google Antigravity.
Your goal is to transform unstructured financial content (text/images) into ACTIONABLE outcomes.

CRITICAL: You MUST respond in valid JSON format ONLY. Do not include markdown blocks or extra text.
JSON Structure:
{
  "display_text": "Hinglish response (8-12 lines, bullet points, professional)",
  "scam_score": number (0-100),
  "insight": "Key fact extracted from input",
  "impact": "Real-world consequence of this situation",
  "recommended_actions": [
    {"id": "fia_report", "label": "Generate FIA Complaint", "type": "draft"},
    {"id": "bank_block", "label": "Simulate Bank Protection", "type": "simulation"},
    {"id": "family_alert", "label": "Draft Family Alert", "type": "message"}
  ],
  "agent_trace": [
    "Step 1: Ingesting unstructured data...",
    "Step 2: Identifying Pakistani fraud patterns...",
    "Step 3: Calculating Risk Score (0-100)...",
    "Step 4: Mapping autonomous defense plan..."
  ],
  "fia_complaint_draft": "Detailed FIA Cybercrime complaint draft. MUST be provided if scam_score > 30."
}

Guidelines:
- Language: Simple English + Urdu mix (Hinglish).
- Scam Score: Always start with "⚠️ Scam Risk Score: X%".
- Tone: Professional and protective.
- Proactiveness: If you detect even a slight risk (scam_score > 30), you MUST provide a full fia_complaint_draft.
- If it's a budget query, focus on the 50/30/20 rule and set scam_score to 0.
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
    return res.status(500).json({ error: "API Keys not configured. Check Environment Variables." });
  }

  let lastError = "Unknown error";

  for (let attempts = 0; attempts < apiKeys.length; attempts++) {
    const currentKey = apiKeys[currentKeyIndex];
    
    try {
      const genAI = new GoogleGenerativeAI(currentKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-flash-latest',
        systemInstruction: SYSTEM_PROMPT
      });

      const chat = model.startChat({
        history: chatHistory,
        generationConfig: { 
          maxOutputTokens: 2048, 
          temperature: 0.1, // Lower temperature for more reliable JSON
          responseMimeType: "application/json" // Force JSON output
        }
      });

      let result;
      if (image) {
        const matches = image.match(/^data:(.+);base64,(.+)$/);
        if (!matches) throw new Error('Invalid image format.');
        
        result = await chat.sendMessage([
          { inlineData: { data: matches[2], mimeType: matches[1] } },
          message || 'Analyze this content and provide an agentic response.'
        ]);
      } else {
        result = await chat.sendMessage(message);
      }

      const response = await result.response;
      let rawText = response.text();
      
      // IMPROVED CLEANING LOGIC: Extract JSON if it's wrapped in text or markdown
      let structuredResponse;
      try {
        // Try direct parse first
        structuredResponse = JSON.parse(rawText);
      } catch (e) {
        // Try extracting JSON from markdown blocks
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            structuredResponse = JSON.parse(jsonMatch[1]);
          } catch (e2) {
            // Last resort: find first { and last }
            const firstBrace = rawText.indexOf('{');
            const lastBrace = rawText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
              try {
                structuredResponse = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
              } catch (e3) {
                console.error("Failed to parse extracted JSON:", e3);
              }
            }
          }
        }
      }

      if (!structuredResponse) {
        console.error("JSON Parse Error. Raw text was:", rawText);
        structuredResponse = {
          display_text: rawText.substring(0, 500),
          scam_score: 0,
          insight: "Data processing error",
          impact: "Technical issue",
          recommended_actions: [],
          agent_trace: ["Error parsing structured output"]
        };
      }

      // Update history
      // We store the display_text for the model to keep context, but we keep the system instructions in mind
      chatHistory.push({ role: 'user', parts: [{ text: message || '[Image]' }] });
      chatHistory.push({ role: 'model', parts: [{ text: JSON.stringify(structuredResponse) }] });
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

      // Add 'reply' field for backward compatibility
      structuredResponse.reply = structuredResponse.display_text;

      return res.json(structuredResponse);

    } catch (error) {
      lastError = error.message;
      console.error(`Attempt ${attempts + 1} Failed:`, lastError);
      rotateKey();
    }
  }

  return res.status(500).json({ 
    error: `AI processing failed. Last Error: ${lastError}` 
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Local server running: http://localhost:${port}`));
}

module.exports = app;
