require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

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
    model: 'gemini-flash-lite-latest'
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
        model: 'gemini-flash-lite-latest',
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

// ===============================
// Vertex AI (Google Antigravity)
// ===============================
let vertexAI = null;
try {
    const { VertexAI } = require('@google-cloud/vertexai');
    if (process.env.GOOGLE_CLOUD_PROJECT) {
        vertexAI = new VertexAI({
            project: process.env.GOOGLE_CLOUD_PROJECT,
            location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
        });
        console.log(`[Antigravity] Vertex AI ready → ${process.env.GOOGLE_CLOUD_PROJECT} / ${process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'}`);
    } else {
        console.warn('[Antigravity] GOOGLE_CLOUD_PROJECT not set — Antigravity mode disabled.');
    }
} catch (err) {
    console.warn('[Antigravity] SDK unavailable:', err.message);
}

async function runVertexAgent(agentName, systemInstruction, userPrompt) {
    const startTime = Date.now();

    const model = vertexAI.getGenerativeModel({
        model: 'gemini-flash-lite-latest',
        systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024, responseMimeType: 'application/json' }
    });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }]
    });

    const endTime = Date.now();
    const rawText = result.response.candidates[0].content.parts[0].text;

    let parsed;
    try {
        parsed = JSON.parse(rawText);
    } catch {
        const block = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (block) { try { parsed = JSON.parse(block[1]); } catch {} }
        if (!parsed) {
            const a = rawText.indexOf('{'), b = rawText.lastIndexOf('}');
            if (a !== -1 && b !== -1) { try { parsed = JSON.parse(rawText.substring(a, b + 1)); } catch {} }
        }
        if (!parsed) parsed = { raw_response: rawText.substring(0, 500) };
    }

    const outputStr = JSON.stringify(parsed);
    return {
        agent_name: agentName,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration_ms: endTime - startTime,
        input_summary: userPrompt.substring(0, 300) + (userPrompt.length > 300 ? '…' : ''),
        output_summary: outputStr.substring(0, 300) + (outputStr.length > 300 ? '…' : ''),
        output: parsed
    };
}

function buildDisplayText(insight, impact, actions) {
    const lines = [];
    if (insight?.primary_insight)      lines.push(`🔍 **Insight:** ${insight.primary_insight}`);
    if (insight?.severity)             lines.push(`⚠️ **Severity:** ${insight.severity} | Confidence: ${insight.confidence_score}%`);
    if (insight?.trend_direction)      lines.push(`📈 **Trend:** ${insight.trend_direction}`);
    if (impact?.immediate_impact)      lines.push(`💥 **Immediate Impact:** ${impact.immediate_impact}`);
    if (impact?.opportunity_or_threat) lines.push(`🎯 **Assessment:** ${impact.opportunity_or_threat}`);
    if (actions?.overall_recommendation) lines.push(`✅ **Recommendation:** ${actions.overall_recommendation}`);
    return lines.join('\n\n') || 'Analysis complete.';
}

// Antigravity Status
app.get('/api/antigravity-status', (req, res) => {
    res.json({
        configured: !!vertexAI,
        project: process.env.GOOGLE_CLOUD_PROJECT || null,
        location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
        model: 'gemini-flash-lite-latest'
    });
});

// ===============================
// POST /api/antigravity-analyze
// Google Antigravity 5-Agent Pipeline
// ===============================
app.post('/api/antigravity-analyze', async (req, res) => {
    const { message, image } = req.body;

    if (!message && !image) {
        return res.status(400).json({ error: 'Message or image required.' });
    }
    if (!vertexAI) {
        return res.status(503).json({
            error: 'Google Antigravity (Vertex AI) not configured. Add GOOGLE_CLOUD_PROJECT to .env and run: gcloud auth application-default login',
            fallback_available: true
        });
    }

    const pipelineId = randomUUID();
    const pipelineStart = Date.now();
    const agentTraces = [];

    const dataContext = [
        `=== INVENTORY DATA (CSV) ===\n${inventoryData}`,
        `=== MARKET NEWS (JSON) ===\n${newsData}`,
        `=== LIVE FEED (JSON) ===\n${feedData}`,
        `=== FINANCIAL REPORT (JSON) ===\n${reportData}`,
        `=== FORECAST TABLE (JSON) ===\n${forecastData}`
    ].join('\n\n');

    const userInput = message || '[Image analysis request]';

    try {
        // ── Agent 1: IngestionAgent ──────────────────────────────────
        const agent1 = await runVertexAgent(
            'IngestionAgent',
            `You are the IngestionAgent in the Google Antigravity multi-agent pipeline for AI Financial Guardian — a Pakistani financial safety system.
Parse and extract structured signals from raw user input and the provided data sources.
Return ONLY valid JSON with this exact structure:
{
  "document_type": "fraud_report|market_signal|inventory_query|financial_inquiry|scam_alert|general",
  "entities": ["named entities: people, companies, products, locations"],
  "key_signals": ["most important signals or keywords"],
  "amounts": ["monetary values or quantities found"],
  "dates": ["dates or time references found"],
  "language": "detected language",
  "urgency": "Critical|High|Medium|Low"
}`,
            `USER INPUT: "${userInput}"\n\nDATA SOURCES:\n${dataContext}`
        );
        agentTraces.push(agent1);

        // ── Agent 2: InsightAgent ────────────────────────────────────
        const agent2 = await runVertexAgent(
            'InsightAgent',
            `You are the InsightAgent in the Google Antigravity multi-agent pipeline.
Generate high-quality financial intelligence insights for Pakistani users based on ingested signals.
Cross-reference signals with known Pakistani scam patterns, market data, and inventory levels.
Return ONLY valid JSON with this exact structure:
{
  "primary_insight": "The single most important insight in 1-2 sentences",
  "supporting_details": ["2-3 points supporting the primary insight"],
  "trend_direction": "Bullish|Bearish|Neutral|Volatile",
  "severity": "Critical|High|Medium|Low",
  "confidence_score": 0,
  "scam_probability": 0,
  "contradictions_detected": ["any conflicting signals found across data sources"]
}`,
            `INGESTION OUTPUT:\n${JSON.stringify(agent1.output, null, 2)}\n\nORIGINAL INPUT: "${userInput}"`
        );
        agentTraces.push(agent2);

        // ── Agent 3: ImpactAnalystAgent ──────────────────────────────
        const agent3 = await runVertexAgent(
            'ImpactAnalystAgent',
            `You are the ImpactAnalystAgent in the Google Antigravity multi-agent pipeline.
Assess real-world consequences of the detected insight specifically for Pakistani users, businesses, and the economy.
Return ONLY valid JSON with this exact structure:
{
  "immediate_impact": "Impact in the next 24-48 hours",
  "medium_term_impact": "Impact over the next 1-4 weeks",
  "affected_sectors": ["sectors affected: Retail, Banking, Logistics, Consumers, Government, etc."],
  "risk_level": "Critical|High|Medium|Low",
  "opportunity_or_threat": "Opportunity|Threat|Mixed",
  "financial_exposure_estimate": "estimated PKR amount at risk or potential gain",
  "population_affected": "description of who in Pakistan is affected"
}`,
            `INSIGHT:\n${JSON.stringify(agent2.output, null, 2)}\n\nINGESTION SIGNALS:\n${JSON.stringify(agent1.output, null, 2)}`
        );
        agentTraces.push(agent3);

        // ── Agent 4: ActionRecommenderAgent ─────────────────────────
        const agent4 = await runVertexAgent(
            'ActionRecommenderAgent',
            `You are the ActionRecommenderAgent in the Google Antigravity multi-agent pipeline.
Generate 3-5 prioritized, concrete actions for Pakistani users based on the impact analysis.
Each action must be realistic and actionable within Pakistan's financial and regulatory context.
Return ONLY valid JSON with this exact structure:
{
  "actions": [
    {
      "id": "unique_snake_case_id",
      "title": "Short action title",
      "rationale": "Why this action is needed",
      "expected_outcome": "What will happen if taken",
      "priority": "Critical|High|Medium|Low",
      "timeframe": "Immediate|24h|1 week|1 month",
      "type": "alert|block|report|restock|reroute|notify|investigate"
    }
  ],
  "top_action_id": "id of the single most critical action",
  "overall_recommendation": "1-2 sentence summary of recommended course of action"
}`,
            `IMPACT ANALYSIS:\n${JSON.stringify(agent3.output, null, 2)}\n\nINSIGHT:\n${JSON.stringify(agent2.output, null, 2)}`
        );
        agentTraces.push(agent4);

        // ── Agent 5: ExecutionAgent ──────────────────────────────────
        const topActionId = agent4.output?.top_action_id;
        const topAction = agent4.output?.actions?.find(a => a.id === topActionId) || agent4.output?.actions?.[0];

        const agent5 = await runVertexAgent(
            'ExecutionAgent',
            `You are the ExecutionAgent in the Google Antigravity multi-agent pipeline.
Simulate the execution of the top recommended action and produce a complete execution report.
Return ONLY valid JSON with this exact structure:
{
  "execution_log": [
    "Step 1: [specific action taken]",
    "Step 2: [specific action taken]",
    "Step 3: [specific action taken]",
    "Step 4: [verification check]",
    "Step 5: [completion and status]"
  ],
  "email_draft": "A professional Urdu/English email draft relevant to the action (FIA complaint, supplier notice, bank alert, or other authority)",
  "system_state_before": {
    "status": "pre-execution system state description",
    "risk_level": "string",
    "inventory_status": "string",
    "financial_exposure": "string"
  },
  "system_state_after": {
    "status": "post-execution system state description",
    "risk_level": "string",
    "inventory_status": "string",
    "financial_exposure": "string"
  },
  "artifacts_created": ["list of documents, reports, or records created"],
  "execution_status": "Success|Partial|Failed",
  "next_steps": ["2-3 recommended follow-up actions"]
}`,
            `TOP ACTION TO EXECUTE:\n${JSON.stringify(topAction, null, 2)}\n\nCONTEXT:\nInsight: ${agent2.output?.primary_insight || ''}\nImpact: ${agent3.output?.immediate_impact || ''}\nScam Risk: ${agent2.output?.scam_probability ?? 0}%`
        );
        agentTraces.push(agent5);

        const displayText = buildDisplayText(agent2.output, agent3.output, agent4.output);

        return res.json({
            pipeline_id: pipelineId,
            timestamp: new Date().toISOString(),
            total_duration_ms: Date.now() - pipelineStart,
            agents: agentTraces,
            final_output: {
                display_text: displayText,
                insight: agent2.output?.primary_insight || '',
                severity: agent2.output?.severity || 'Medium',
                scam_score: agent2.output?.scam_probability ?? 0,
                trend: agent2.output?.trend_direction || 'Neutral',
                confidence: agent2.output?.confidence_score ?? 0,
                impact: agent3.output?.immediate_impact || '',
                affected_sectors: agent3.output?.affected_sectors || [],
                actions: agent4.output?.actions || [],
                top_action: topAction || null,
                execution: agent5.output
            }
        });

    } catch (error) {
        console.error('[Antigravity] Pipeline error:', error.message);
        return res.status(500).json({
            error: `Antigravity pipeline failed: ${error.message}`,
            pipeline_id: pipelineId,
            total_duration_ms: Date.now() - pipelineStart,
            partial_traces: agentTraces,
            fallback_available: true
        });
    }
});

// ===============================
// Gemini 5-Agent Pipeline
// ===============================
const PIPELINE_AGENTS = {
    IngestionAgent: `You are a Financial Content Ingestion Agent. Extract from the input: document_type, entities (companies/people/places), key_amounts (all numbers with context), dates, and core_topic in one sentence.
Return ONLY valid JSON with this exact structure:
{"document_type":"string","entities":["array of strings"],"key_amounts":[{"amount":"string","context":"string"}],"dates":["array of strings"],"core_topic":"string"}`,

    InsightAgent: `You are a Financial Insight Agent specialized in Pakistan economy.
Given extracted data, identify the PRIMARY insight (not a summary — the real signal that matters most).
Return ONLY valid JSON with this exact structure:
{"primary_insight":"string","trend_direction":"Bullish|Bearish|Neutral|Volatile","severity":"Critical|High|Medium|Low","confidence_score":0,"affected_parties":["array of strings"]}`,

    ImpactAnalystAgent: `You are a Financial Impact Analyst for Pakistan market.
Given the insight, analyze real consequences for Pakistani businesses, consumers, and markets.
Return ONLY valid JSON with this exact structure:
{"immediate_impact":"string","medium_term_impact":"string","affected_sectors":["array"],"risk_level":"Critical|High|Medium|Low","opportunity_or_threat":"Opportunity|Threat|Mixed","pkr_impact":"string","psx_impact":"string"}`,

    ActionRecommenderAgent: `You are a Financial Action Strategist.
Generate exactly 3 actions: one immediate (24h), one short-term (1 week), one strategic (1 month).
Return ONLY valid JSON with this exact structure:
{"actions":[{"title":"string","rationale":"string","expected_outcome":"string","priority":"Critical|High|Medium","timeframe":"24h|1 week|1 month"}]}`,

    ExecutionAgent: `You are an Action Execution Agent. Simulate executing the top priority action.
Generate a realistic email draft to stakeholders and show system state change.
Return ONLY valid JSON with this exact structure:
{"execution_log":[{"timestamp":"ISO string","step":"string","status":"completed|in_progress"}],"email_draft":{"to":"string","subject":"string","body":"string"},"system_state_before":{"portfolio_risk_score":0,"alert_status":"string","pending_actions":0},"system_state_after":{"portfolio_risk_score":0,"alert_status":"string","pending_actions":0},"artifacts_created":["array of strings"]}`
};

async function runPipelineAgent(agentName, systemPrompt, userInput) {
    const startTime = Date.now();
    const startTimestamp = new Date(startTime).toISOString();

    try {
        const key = apiKeys[currentKeyIndex];
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-lite-latest',
            systemInstruction: systemPrompt,
            generationConfig: { temperature: 0.1, maxOutputTokens: 800, responseMimeType: 'application/json' }
        });

        const result = await model.generateContent(userInput);
        const rawText = result.response.text();

        let parsed;
        try { parsed = JSON.parse(rawText); } catch {
            const block = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (block) { try { parsed = JSON.parse(block[1]); } catch {} }
            if (!parsed) {
                const a = rawText.indexOf('{'), b = rawText.lastIndexOf('}');
                if (a !== -1 && b !== -1) { try { parsed = JSON.parse(rawText.substring(a, b + 1)); } catch {} }
            }
            if (!parsed) parsed = { raw_response: rawText.substring(0, 400) };
        }

        const endTime = Date.now();
        return { agent_name: agentName, start_timestamp: startTimestamp, end_timestamp: new Date(endTime).toISOString(), duration_ms: endTime - startTime, status: 'completed', output: parsed };
    } catch (error) {
        rotateKey();
        const endTime = Date.now();
        return { agent_name: agentName, start_timestamp: startTimestamp, end_timestamp: new Date(endTime).toISOString(), duration_ms: endTime - startTime, status: 'failed', error: error.message, output: null };
    }
}

// ===============================
// POST /api/pipeline — Real 5-Agent Pipeline (SSE streaming)
// ===============================
app.post('/api/pipeline', async (req, res) => {
    const { message, image } = req.body;
    if (!message && !image) return res.status(400).json({ error: 'Message required.' });
    if (apiKeys.length === 0) return res.status(500).json({ error: 'No API keys configured.' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const emit = (type, payload) => {
        try { res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`); } catch {}
    };

    const pipelineId = randomUUID();
    const pipelineStart = Date.now();
    const agentTraces = [];
    const results = {};
    const userInput = message || '[Image analysis request]';
    const dataCtx = `Market context:\n${newsData}\n\nFinancial data:\n${reportData}\n\nInventory:\n${inventoryData.split('\n').slice(0,5).join('\n')}`;

    emit('pipeline_start', { pipeline_id: pipelineId, timestamp: new Date().toISOString() });

    try {
        // ── Agent 1 ────────────────────────────────────────────
        emit('agent_start', { agent_name: 'IngestionAgent', index: 0 });
        const a1 = await runPipelineAgent('IngestionAgent', PIPELINE_AGENTS.IngestionAgent,
            `User input: "${userInput}"\n\n${dataCtx}`);
        agentTraces.push(a1); results.ingestion = a1.output;
        emit('agent_complete', { agent_name: 'IngestionAgent', index: 0, trace: a1 });
        if (a1.status === 'failed') throw new Error('IngestionAgent: ' + a1.error);

        // ── Agent 2 ────────────────────────────────────────────
        emit('agent_start', { agent_name: 'InsightAgent', index: 1 });
        const a2 = await runPipelineAgent('InsightAgent', PIPELINE_AGENTS.InsightAgent,
            `Ingested data:\n${JSON.stringify(a1.output, null, 2)}\n\nOriginal input: "${userInput}"`);
        agentTraces.push(a2); results.insight = a2.output;
        emit('agent_complete', { agent_name: 'InsightAgent', index: 1, trace: a2 });

        // ── Agent 3 ────────────────────────────────────────────
        emit('agent_start', { agent_name: 'ImpactAnalystAgent', index: 2 });
        const a3 = await runPipelineAgent('ImpactAnalystAgent', PIPELINE_AGENTS.ImpactAnalystAgent,
            `Insight:\n${JSON.stringify(a2.output, null, 2)}`);
        agentTraces.push(a3); results.impact = a3.output;
        emit('agent_complete', { agent_name: 'ImpactAnalystAgent', index: 2, trace: a3 });

        // ── Agent 4 ────────────────────────────────────────────
        emit('agent_start', { agent_name: 'ActionRecommenderAgent', index: 3 });
        const a4 = await runPipelineAgent('ActionRecommenderAgent', PIPELINE_AGENTS.ActionRecommenderAgent,
            `Impact analysis:\n${JSON.stringify(a3.output, null, 2)}\nInsight: ${a2.output?.primary_insight || ''}`);
        agentTraces.push(a4); results.actions = a4.output;
        emit('agent_complete', { agent_name: 'ActionRecommenderAgent', index: 3, trace: a4 });

        // ── Agent 5 ────────────────────────────────────────────
        emit('agent_start', { agent_name: 'ExecutionAgent', index: 4 });
        const topAction = a4.output?.actions?.[0] || {};
        const a5 = await runPipelineAgent('ExecutionAgent', PIPELINE_AGENTS.ExecutionAgent,
            `Top action:\n${JSON.stringify(topAction, null, 2)}\n\nContext — Insight: ${a2.output?.primary_insight || ''} | Risk: ${a3.output?.risk_level || ''} | Impact: ${a3.output?.immediate_impact || ''}`);
        agentTraces.push(a5); results.execution = a5.output;
        emit('agent_complete', { agent_name: 'ExecutionAgent', index: 4, trace: a5 });

        emit('pipeline_complete', {
            pipeline_id: pipelineId,
            total_duration_ms: Date.now() - pipelineStart,
            timestamp: new Date().toISOString(),
            agents: agentTraces,
            results
        });
    } catch (err) {
        console.error('[Pipeline] Error:', err.message);
        emit('pipeline_error', { pipeline_id: pipelineId, error: err.message, agents: agentTraces, partial_results: results });
    }

    res.end();
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Local server running: http://localhost:${port}`));
}

module.exports = app;
