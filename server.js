const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

const app = express();

// ===============================
// Data Ingestion (Challenge 1)
// ===============================
let inventoryData = "";
let newsData = "";
let feedData = "";
let reportData = "";
let forecastData = "";

try {
  inventoryData = fs.readFileSync(path.join(__dirname, 'data', 'inventory.csv'), 'utf8');
  newsData = fs.readFileSync(path.join(__dirname, 'data', 'news.json'), 'utf8');
  feedData = fs.readFileSync(path.join(__dirname, 'data', 'feed.json'), 'utf8');
  reportData = fs.readFileSync(path.join(__dirname, 'data', 'report.json'), 'utf8');
  forecastData = fs.readFileSync(path.join(__dirname, 'data', 'table.json'), 'utf8');
} catch (err) {
  console.error("Error reading data files:", err.message);
}

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
// AI System Prompt (Challenge 1)
// ===============================
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
--- INVENTORY DATA (CSV) ---
${inventoryData}
--- MARKET NEWS (JSON) ---
${newsData}
--- LIVE FEED (JSON) ---
${feedData}
--- FINANCIAL REPORT (JSON) ---
${reportData}
--- FORECAST DATA (JSON) ---
${forecastData}

CRITICAL: You MUST respond in valid JSON format ONLY.
JSON Structure:
{
  "display_text": "Hinglish response (8-12 lines, bullet points, professional)",
  "scam_score": number (0-100),
  "insight": "Key fact extracted (e.g. from a PDF report or News)",
  "impact": "Real-world consequence",
  "recommended_actions": [
    {"id": "string", "label": "string", "type": "draft|simulation|message"}
  ],
  "agent_trace": {
    "workplan": "[Coordinator] Initializing mission... [Invoking Analyst to parse unstructured content]",
    "tasks": [
      "[Coordinator] Task 1: Analyze user input type (Text/URL/Image)",
      "[Analyst] Task 2: Use [Antigravity Web/PDF Parser] to extract signals",
      "[Analyst] Task 3: Cross-reference with [Market Intelligence Engine]",
      "[Executor] Task 4: Simulate actions and update [System State Manager]"
    ],
    "reasoning": "[Analyst] Extracted 'X' from input. Cross-referenced with Inventory: Stock is 'Y'. Contradiction found: 'Z'.",
    "decision_flow": "Input -> [Parser] -> [Analyst] -> [Coordinator] -> [Executor]",
    "action_execution": "[Executor] Triggering [System State Manager]... [Simulated Action: Done]"
  },
  "system_state_change": {
    "before": "Current state",
    "after": "Updated state",
    "metrics_update": {"stock": "number|string", "risk": "number", "budget": "string"}
  },
  "fia_complaint_draft": "FIA draft if scam_score > 30"
}

Guidelines:
- Language: Hinglish.
- Content Understanding: If a user provides a URL or mentions a "report", use the [Antigravity Web/PDF Parser] persona to "extract" insights.
- Autonomy: Show clear tool usage in the tasks and reasoning.
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
