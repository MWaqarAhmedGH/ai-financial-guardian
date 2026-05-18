require('dotenv').config();
const express    = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path       = require('path');
const fs         = require('fs');
const { randomUUID } = require('crypto');

const app = express();

// ════════════════════════════════════════════════════
// Multi-Source Data Ingestion (Challenge 1)
// ════════════════════════════════════════════════════
function loadData(filename) {
    try { return fs.readFileSync(path.join(__dirname, 'data', filename), 'utf8'); }
    catch { return ''; }
}
const inventoryData = loadData('inventory.csv');
const newsData      = loadData('news.json');
const feedData      = loadData('feed.json');
const reportData    = loadData('report.json');
const forecastData  = loadData('table.json');

// ════════════════════════════════════════════════════
// Middleware & Static Files
// ════════════════════════════════════════════════════
app.use(express.json({ limit: '10mb' }));
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get('/', (_req, res) => res.sendFile(path.join(publicPath, 'index.html')));

// ════════════════════════════════════════════════════
// API Key Pool (up to 3 keys with rotation)
// ════════════════════════════════════════════════════
const apiKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
].filter(Boolean);

let keyIndex = 0;
function rotateKey() { if (apiKeys.length > 1) keyIndex = (keyIndex + 1) % apiKeys.length; }
function currentKey() { return apiKeys[keyIndex]; }

// ════════════════════════════════════════════════════
// Standard Chat — POST /chat
// ════════════════════════════════════════════════════
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
    "workplan": "...",
    "tasks": ["..."],
    "reasoning": "...",
    "decision_flow": "...",
    "action_execution": "..."
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

app.get('/api-status', (_req, res) => res.json({
    status: 'online', keys_found: apiKeys.length,
    environment: process.env.NODE_ENV || 'production',
    model: 'gemini-flash-lite-latest'
}));

app.post('/chat', async (req, res) => {
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

// ════════════════════════════════════════════════════
// JSON Parse Helper
// ════════════════════════════════════════════════════
function parseJSON(text) {
    try { return JSON.parse(text); } catch {}
    const block = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (block) { try { return JSON.parse(block[1]); } catch {} }
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a !== -1 && b !== -1) { try { return JSON.parse(text.substring(a, b + 1)); } catch {} }
    return null;
}

// ════════════════════════════════════════════════════
// ORCHESTRATOR — classifies input & builds agent plan
// ════════════════════════════════════════════════════
class PipelineOrchestrator {
    constructor() {
        this.log = [];
    }

    // Step 1: classify input WITHOUT any API call (pure regex + keywords)
    classify(input) {
        const t = input.toLowerCase();

        const SCAM_WORDS  = ['lottery','prize','winner','otp','processing fee','bisp','fia','police',
                             'arrest','blocked','suspicious','fraud','scam','fake','click this link',
                             'verify your account','lagi hai','mubarak ho','jeet','lucky draw',
                             'winning','congratulations','paisa','easy money','guarantee'];
        const URGENT_WORDS = ['critical','emergency','urgent','immediately','crash','collapse',
                              'breach','hack','stolen','lost all'];
        const BUSINESS_WORDS = ['inventory','stock','supply','shipment','restock','warehouse',
                                'sku','production','delivery','vendor','supplier'];
        const MARKET_WORDS = ['sbp','interest rate','dollar','inflation','psx','karachi stock',
                              'budget','imf','gdp','rupee','exchange rate','rate cut','policy'];

        const scamHits    = SCAM_WORDS.filter(k => t.includes(k)).length;
        const isUrgent    = URGENT_WORDS.some(k => t.includes(k));
        const isBusiness  = BUSINESS_WORDS.some(k => t.includes(k));
        const isMarket    = MARKET_WORDS.some(k => t.includes(k));

        let type, urgency, fastTrack, skipAgents, reason;

        if (scamHits >= 2) {
            type = 'scam'; urgency = 'Critical'; fastTrack = true;
            skipAgents = ['ImpactAnalystAgent', 'ActionRecommenderAgent'];
            reason = `Scam keywords detected (${scamHits} hits) → fast-track to execution`;
        } else if (scamHits === 1) {
            type = 'scam_possible'; urgency = 'High'; fastTrack = false;
            skipAgents = [];
            reason = 'Possible scam — running full pipeline for thorough analysis';
        } else if (isUrgent) {
            type = 'urgent'; urgency = 'Critical'; fastTrack = false;
            skipAgents = [];
            reason = 'Urgent situation — full pipeline with priority execution';
        } else if (isBusiness) {
            type = 'business'; urgency = 'Medium'; fastTrack = false;
            skipAgents = [];
            reason = 'Business/inventory query — full pipeline';
        } else if (isMarket) {
            type = 'market'; urgency = 'Medium'; fastTrack = false;
            skipAgents = [];
            reason = 'Market analysis query — full pipeline';
        } else {
            type = 'general'; urgency = 'Low'; fastTrack = false;
            skipAgents = [];
            reason = 'General financial query — standard pipeline';
        }

        const decision = { type, urgency, fastTrack, skipAgents, reason, scamHits };
        this.log.push({ step: 'classify', timestamp: new Date().toISOString(), ...decision });
        return decision;
    }

    // Step 2: build execution plan based on classification
    buildPlan(classification) {
        const ALL_AGENTS = [
            'IngestionAgent',
            'InsightAgent',
            'ImpactAnalystAgent',
            'ActionRecommenderAgent',
            'ExecutionAgent'
        ];

        const agents = ALL_AGENTS.filter(a => !classification.skipAgents.includes(a));
        const plan = { agents, skipped: classification.skipAgents, totalSteps: agents.length };
        this.log.push({ step: 'plan', timestamp: new Date().toISOString(), ...plan });
        return plan;
    }

    // Step 3: decide if we should continue after a failed agent
    shouldContinue(agentName, result, classification) {
        if (result.status === 'completed') return true;

        // Critical agents — abort pipeline if they fail
        const CRITICAL = ['IngestionAgent', 'InsightAgent'];
        if (CRITICAL.includes(agentName)) {
            this.log.push({ step: 'abort', reason: `Critical agent ${agentName} failed`, timestamp: new Date().toISOString() });
            return false;
        }

        // Non-critical — continue with partial data and log
        this.log.push({ step: 'continue_partial', reason: `${agentName} failed but is non-critical`, timestamp: new Date().toISOString() });
        return true;
    }

    // Step 4: adjust prompt for scam fast-track ExecutionAgent
    adjustPromptForFastTrack(agentName, classification, context) {
        if (classification.fastTrack && agentName === 'ExecutionAgent') {
            return `SCAM FAST-TRACK MODE. Skip normal execution steps.
Focus ONLY on immediate user protection.
${context}
Generate: FIA complaint draft, bank alert message, and 3 immediate safety steps.`;
        }
        return context;
    }
}

// ════════════════════════════════════════════════════
// Agent Definitions (system prompts per agent)
// ════════════════════════════════════════════════════
const AGENT_PROMPTS = {
    IngestionAgent: `You are a Financial Content Ingestion Agent for Pakistan.
Extract structured signals from user input and data sources.
Return ONLY valid JSON:
{"document_type":"fraud_report|market_signal|inventory_query|financial_inquiry|scam_alert|general","entities":["strings"],"key_amounts":[{"amount":"","context":""}],"dates":["strings"],"core_topic":"string","urgency":"Critical|High|Medium|Low"}`,

    InsightAgent: `You are a Financial Insight Agent specialized in Pakistan economy.
Identify the PRIMARY signal that matters most — not a summary.
Return ONLY valid JSON:
{"primary_insight":"string","supporting_details":["strings"],"trend_direction":"Bullish|Bearish|Neutral|Volatile","severity":"Critical|High|Medium|Low","confidence_score":0,"scam_probability":0,"affected_parties":["strings"],"contradictions_detected":["strings"]}`,

    ImpactAnalystAgent: `You are a Financial Impact Analyst for Pakistan market.
Assess real-world consequences for Pakistani businesses, consumers, and economy.
Return ONLY valid JSON:
{"immediate_impact":"string","medium_term_impact":"string","affected_sectors":["strings"],"risk_level":"Critical|High|Medium|Low","opportunity_or_threat":"Opportunity|Threat|Mixed","pkr_impact":"string","psx_impact":"string","population_affected":"string"}`,

    ActionRecommenderAgent: `You are a Financial Action Strategist for Pakistan.
Generate exactly 3 prioritized actions: immediate (24h), short-term (1 week), strategic (1 month).
Return ONLY valid JSON:
{"actions":[{"title":"","rationale":"","expected_outcome":"","priority":"Critical|High|Medium","timeframe":"24h|1 week|1 month","type":"alert|block|report|restock|notify|investigate"}],"top_action_id":"0","overall_recommendation":"string"}`,

    ExecutionAgent: `You are an Action Execution Agent for Pakistan financial safety.
Simulate executing the top priority action with full traceability.
Return ONLY valid JSON:
{"execution_log":[{"timestamp":"ISO","step":"string","status":"completed|in_progress"}],"email_draft":{"to":"string","subject":"string","body":"string"},"system_state_before":{"portfolio_risk_score":0,"alert_status":"string","pending_actions":0},"system_state_after":{"portfolio_risk_score":0,"alert_status":"string","pending_actions":0},"artifacts_created":["strings"],"execution_status":"Success|Partial|Failed","next_steps":["strings"]}`
};

// ════════════════════════════════════════════════════
// Run single agent with retry (max 2 attempts)
// ════════════════════════════════════════════════════
async function runAgent(agentName, agentInput, retries = 2) {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const genAI = new GoogleGenerativeAI(currentKey());
            const model = genAI.getGenerativeModel({
                model: 'gemini-flash-lite-latest',
                systemInstruction: AGENT_PROMPTS[agentName],
                generationConfig: { temperature: 0.1, maxOutputTokens: 900, responseMimeType: 'application/json' }
            });

            const result  = await model.generateContent(agentInput);
            const rawText = result.response.text();
            const parsed  = parseJSON(rawText) || { raw_response: rawText.substring(0, 400) };
            const endTime = Date.now();

            return {
                agent_name:      agentName,
                attempt,
                start_timestamp: new Date(startTime).toISOString(),
                end_timestamp:   new Date(endTime).toISOString(),
                duration_ms:     endTime - startTime,
                status:          'completed',
                output:          parsed
            };
        } catch (err) {
            rotateKey();
            if (attempt === retries) {
                const endTime = Date.now();
                return {
                    agent_name:      agentName,
                    attempt,
                    start_timestamp: new Date(startTime).toISOString(),
                    end_timestamp:   new Date(endTime).toISOString(),
                    duration_ms:     endTime - startTime,
                    status:          'failed',
                    error:           err.message,
                    output:          null
                };
            }
            await new Promise(r => setTimeout(r, 400));
        }
    }
}

// ════════════════════════════════════════════════════
// POST /api/pipeline — Orchestrator-driven SSE pipeline
// ════════════════════════════════════════════════════
const DATA_CTX = [
    `=== MARKET NEWS ===\n${newsData}`,
    `=== FINANCIAL REPORT ===\n${reportData}`,
    `=== INVENTORY (first 8 rows) ===\n${inventoryData.split('\n').slice(0, 8).join('\n')}`,
    `=== LIVE FEED ===\n${feedData}`
].join('\n\n');

app.post('/api/pipeline', async (req, res) => {
    const { message, image } = req.body;
    if (!message && !image) return res.status(400).json({ error: 'Message required.' });
    if (!apiKeys.length)    return res.status(500).json({ error: 'No API keys configured.' });

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const emit = (type, payload) => {
        try { res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`); } catch {}
    };

    const pipelineId    = randomUUID();
    const pipelineStart = Date.now();
    const agentTraces   = [];
    const results       = {};
    const userInput     = message || '[Image analysis request]';

    // ── Step 1: Orchestrator classifies & plans ──────────────
    const orchestrator   = new PipelineOrchestrator();
    const classification = orchestrator.classify(userInput);
    const plan           = orchestrator.buildPlan(classification);

    emit('pipeline_start', {
        pipeline_id:    pipelineId,
        timestamp:      new Date().toISOString(),
        classification,
        plan,
        orchestrator_log: orchestrator.log
    });

    // Emit skipped agents immediately
    plan.skipped.forEach((name, i) => {
        const idx = ['IngestionAgent','InsightAgent','ImpactAnalystAgent','ActionRecommenderAgent','ExecutionAgent'].indexOf(name);
        emit('agent_skipped', { agent_name: name, index: idx, reason: classification.reason });
    });

    // ── Step 2: Run planned agents in sequence ───────────────
    try {
        for (const agentName of plan.agents) {
            const agentIndex = ['IngestionAgent','InsightAgent','ImpactAnalystAgent','ActionRecommenderAgent','ExecutionAgent'].indexOf(agentName);

            emit('agent_start', { agent_name: agentName, index: agentIndex });

            // Build agent-specific input, then let orchestrator adjust if needed
            let agentInput = buildAgentInput(agentName, userInput, results, classification);
            agentInput = orchestrator.adjustPromptForFastTrack(agentName, classification, agentInput);

            const trace = await runAgent(agentName, agentInput);

            agentTraces.push(trace);
            results[agentName] = trace.output;

            // Orchestrator decides whether to continue after failure
            if (!orchestrator.shouldContinue(agentName, trace, classification)) {
                emit('agent_complete', { agent_name: agentName, index: agentIndex, trace });
                emit('pipeline_error', {
                    pipeline_id:      pipelineId,
                    error:            `Critical agent ${agentName} failed after retries`,
                    agents:           agentTraces,
                    orchestrator_log: orchestrator.log
                });
                return res.end();
            }

            emit('agent_complete', { agent_name: agentName, index: agentIndex, trace });
        }

        // ── Step 3: Assemble final output ────────────────────
        const insight  = results['InsightAgent']           || {};
        const impact   = results['ImpactAnalystAgent']     || {};
        const actions  = results['ActionRecommenderAgent'] || {};
        const exec     = results['ExecutionAgent']         || {};

        emit('pipeline_complete', {
            pipeline_id:      pipelineId,
            total_duration_ms: Date.now() - pipelineStart,
            timestamp:        new Date().toISOString(),
            classification,
            plan,
            orchestrator_log: orchestrator.log,
            agents:           agentTraces,
            results: {
                ingestion: results['IngestionAgent'] || null,
                insight:   insight,
                impact:    impact,
                actions:   actions,
                execution: exec
            }
        });

    } catch (err) {
        console.error('[Pipeline] Unexpected error:', err.message);
        emit('pipeline_error', {
            pipeline_id:      pipelineId,
            error:            err.message,
            agents:           agentTraces,
            partial_results:  results,
            orchestrator_log: orchestrator.log
        });
    }

    res.end();
});

// Build the input string for each agent based on prior outputs
function buildAgentInput(agentName, userInput, results, classification) {
    switch (agentName) {
        case 'IngestionAgent':
            return `USER INPUT: "${userInput}"\n\n${DATA_CTX}`;

        case 'InsightAgent':
            return `INGESTION OUTPUT:\n${JSON.stringify(results['IngestionAgent'] || {}, null, 2)}\n\nORIGINAL INPUT: "${userInput}"`;

        case 'ImpactAnalystAgent':
            return `INSIGHT:\n${JSON.stringify(results['InsightAgent'] || {}, null, 2)}\n\nINGESTION SIGNALS:\n${JSON.stringify(results['IngestionAgent'] || {}, null, 2)}`;

        case 'ActionRecommenderAgent':
            return `IMPACT ANALYSIS:\n${JSON.stringify(results['ImpactAnalystAgent'] || {}, null, 2)}\n\nINSIGHT: ${results['InsightAgent']?.primary_insight || ''}\nSEVERITY: ${results['InsightAgent']?.severity || ''}`;

        case 'ExecutionAgent': {
            const topAction = results['ActionRecommenderAgent']?.actions?.[0] || {};
            return `TOP ACTION:\n${JSON.stringify(topAction, null, 2)}\n\nCONTEXT:\nInsight: ${results['InsightAgent']?.primary_insight || ''}\nImpact: ${results['ImpactAnalystAgent']?.immediate_impact || ''}\nScam Risk: ${results['InsightAgent']?.scam_probability ?? 0}%\nUrgency: ${classification.urgency}`;
        }
        default:
            return `USER INPUT: "${userInput}"`;
    }
}

// ════════════════════════════════════════════════════
// Antigravity status (for UI mode toggle)
// ════════════════════════════════════════════════════
app.get('/api/antigravity-status', (_req, res) => {
    res.json({
        configured: false,
        message:    'Running on Gemini API with Orchestrator pipeline',
        model:      'gemini-flash-lite-latest'
    });
});

// ════════════════════════════════════════════════════
// Start server (local dev only)
// ════════════════════════════════════════════════════
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`\n  Local: http://localhost:${port}\n`));
}

module.exports = app;
