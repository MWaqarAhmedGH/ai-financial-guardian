// ════════════════════════════════════════════════════
// src/routes/pipeline.js — Orchestrator-driven SSE pipeline
// POST /api/pipeline
// ════════════════════════════════════════════════════
const express  = require('express');
const { randomUUID } = require('crypto');
const { apiKeys } = require('../data');
const { PipelineOrchestrator, ALL_AGENTS } = require('../orchestrator');
const { runAgent, buildAgentInput } = require('../agents');

const router = express.Router();

router.get('/api/antigravity-status', (_req, res) => res.json({
    configured: false,
    message:    'Running on Gemini API with Orchestrator pipeline',
    model:      'gemini-flash-lite-latest'
}));

router.post('/api/pipeline', async (req, res) => {
    const { message, image } = req.body;
    if (!message && !image) return res.status(400).json({ error: 'Message required.' });
    if (!apiKeys.length)    return res.status(500).json({ error: 'No API keys configured.' });

    // SSE setup
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

    // ── Orchestrator: classify → plan ──────────────────
    const orchestrator   = new PipelineOrchestrator();
    const classification = orchestrator.classify(userInput);
    const plan           = orchestrator.buildPlan(classification);

    emit('pipeline_start', {
        pipeline_id:      pipelineId,
        timestamp:        new Date().toISOString(),
        classification,
        plan,
        orchestrator_log: orchestrator.log
    });

    // Immediately mark skipped agents in UI
    plan.skipped.forEach(name => {
        const index = ALL_AGENTS.indexOf(name);
        emit('agent_skipped', { agent_name: name, index, reason: classification.reason });
    });

    // ── Run agents sequentially ────────────────────────
    try {
        for (const agentName of plan.agents) {
            const index = ALL_AGENTS.indexOf(agentName);
            emit('agent_start', { agent_name: agentName, index });

            let agentInput = buildAgentInput(agentName, userInput, results, classification);
            agentInput = orchestrator.adjustPromptForFastTrack(agentName, classification, agentInput);

            const trace = await runAgent(agentName, agentInput);
            agentTraces.push(trace);
            results[agentName] = trace.output;

            // Orchestrator: should we continue?
            if (!orchestrator.shouldContinue(agentName, trace)) {
                emit('agent_complete', { agent_name: agentName, index, trace });
                emit('pipeline_error', {
                    pipeline_id:      pipelineId,
                    error:            `Critical agent ${agentName} failed after retries`,
                    agents:           agentTraces,
                    orchestrator_log: orchestrator.log
                });
                return res.end();
            }

            emit('agent_complete', { agent_name: agentName, index, trace });
        }

        // ── Final output ───────────────────────────────
        emit('pipeline_complete', {
            pipeline_id:       pipelineId,
            total_duration_ms: Date.now() - pipelineStart,
            timestamp:         new Date().toISOString(),
            classification,
            plan,
            orchestrator_log:  orchestrator.log,
            agents:            agentTraces,
            results: {
                ingestion: results['IngestionAgent']           || null,
                insight:   results['InsightAgent']             || {},
                impact:    results['ImpactAnalystAgent']       || {},
                actions:   results['ActionRecommenderAgent']   || {},
                execution: results['ExecutionAgent']           || {}
            }
        });

    } catch (err) {
        console.error('[Pipeline] Error:', err.message);
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

module.exports = router;
