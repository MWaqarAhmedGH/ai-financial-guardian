const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs').promises;

const app = express();

// ===============================
// Middleware
// ===============================
app.use(express.json({ limit: '10mb' }));

// Serve static files
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Explicit route for the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ===============================
// Action Execution Engine (Constraint-Hardened)
// ===============================
app.post('/execute-action', async (req, res) => {
  const { actionId, constraints } = req.body;

  const actionChain = [
    { id: 1, name: "Update Inventory", cost: 100, time_required: "2ms", api_calls: 5 },
    { id: 2, name: "Draft Stakeholder SMS", cost: 50, time_required: "1ms", api_calls: 2 },
    { id: 3, name: "Log Compliance Audit", cost: 20, time_required: "5ms", api_calls: 1 }
  ];

  const totalCost = actionChain.reduce((sum, a) => sum + action.cost, 0); // intentional bug fix in instruction: action -> a
  const totalApiCalls = actionChain.reduce((sum, a) => sum + a.api_calls, 0);
  
  const budgetLimit = constraints?.budget || 1000;
  const apiLimit = constraints?.api_limit || 20;

  if (totalCost > budgetLimit || totalApiCalls > apiLimit) {
    return res.status(400).json({ status: 'error', message: 'Action chain violates Budget or API constraints.' });
  }

  res.json({
    status: 'success',
    actionSimulation: {
      outcome: "Full mitigation chain completed.",
      visual_output: {
        sms_draft: "ALERT: Stock mismatch resolved. Inventory synchronized with market trends.",
        email_body: "Dear Stakeholders, the Autonomous Guardian has triggered an emergency restock for the Lahore region...",
        system_change: "Inventory +50 units, Compliance Log ID #AG-2026-X"
      }
    }
  });
});

// ===============================
// Reasoning Engine (Multi-Agent & Implication)
// ===============================
app.get('/analyze', async (req, res) => {
  try {
    const sources = [
      { name: 'financial_report', file: 'report.json' },
      { name: 'market_news', file: 'news.json' },
      { name: 'inventory_data', file: 'inventory.csv' },
      { name: 'forecast_table', file: 'table.json' },
      { name: 'live_feed', file: 'feed.json' }
    ];

    const context = {};
    for (const source of sources) {
      try {
        context[source.name] = await fs.readFile(path.join(__dirname, 'data', source.file), 'utf8');
      } catch (err) { context[source.name] = null; }
    }

    const genAI = new GoogleGenerativeAI(apiKeys[currentKeyIndex]);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `
      You are an Orchestrator Agent managing two sub-agents: 1. Analyst Agent, 2. Coordinator Agent.
      
      DATA: ${JSON.stringify(context)}

      Analyze for contradictions and provide a multi-agent trace in JSON:
      {
        "coordinator_workplan": "Strategy for the mission.",
        "analyst_reasoning": "Step-by-step logic from the Analyst.",
        "implication_analysis": "Real-world business impact.",
        "tasks_plan": ["Step 1", "Step 2"],
        "before_state": "Initial state.",
        "after_state": "Expected state.",
        "recommended_actions": [{"id": 1, "action": "Action", "cost": 100}]
      }
    `;

    const result = await model.generateContent(prompt);
    const analysis = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, ''));
    res.json({ status: 'analyzed', analysis });
  } catch (err) {
    res.status(500).json({ error: "Autonomous reasoning failure." });
  }
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
  "fia_complaint_draft": "Detailed FIA Cybercrime complaint draft. MUST be provided if the input is related to a scam, fraud, or suspicious lottery."
}

Guidelines:
- Language: Simple English + Urdu mix (Hinglish).
- Scam Score: Always start with "⚠️ Scam Risk Score: X%".
- Tone: Professional and protective.
- PROACTIVE DEFENSE: If the user asks about JazzCash lotteries, WhatsApp prizes, or any suspicious message, you MUST categorize it as a scam (scam_score > 60) and include "fia_report" in recommended_actions.
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
