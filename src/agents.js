// ════════════════════════════════════════════════════
// src/agents.js — Agent prompts + runner + input builder
// ════════════════════════════════════════════════════
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { currentKey, rotateKey, parseJSON, DATA_CTX } = require('./data');

// ── System prompt per agent ───────────────────────────
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

// ── Run one agent with retry (max 2 attempts) ─────────
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

// ── Build input for each agent from prior outputs ─────
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

module.exports = { AGENT_PROMPTS, runAgent, buildAgentInput };
