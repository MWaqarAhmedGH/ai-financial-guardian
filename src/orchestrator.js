// ════════════════════════════════════════════════════
// src/orchestrator.js — PipelineOrchestrator
// Classifies input, builds agent plan, controls flow
// ════════════════════════════════════════════════════

const ALL_AGENTS = [
    'IngestionAgent',
    'InsightAgent',
    'ImpactAnalystAgent',
    'ActionRecommenderAgent',
    'ExecutionAgent'
];

const CRITICAL_AGENTS = ['IngestionAgent', 'InsightAgent'];

class PipelineOrchestrator {
    constructor() {
        this.log = [];
    }

    // Step 1: classify input — NO API call, pure keyword matching
    classify(input) {
        const t = input.toLowerCase();

        const SCAM_WORDS = [
            'lottery','prize','winner','otp','processing fee','bisp','fia','police',
            'arrest','blocked','suspicious','fraud','scam','fake','click this link',
            'verify your account','lagi hai','mubarak ho','jeet','lucky draw',
            'winning','congratulations','easy money','guarantee'
        ];
        const URGENT_WORDS = [
            'critical','emergency','urgent','immediately','crash','collapse',
            'breach','hack','stolen','lost all'
        ];
        const BUSINESS_WORDS = [
            'inventory','stock','supply','shipment','restock','warehouse',
            'sku','production','delivery','vendor','supplier'
        ];
        const MARKET_WORDS = [
            'sbp','interest rate','dollar','inflation','psx','karachi stock',
            'budget','imf','gdp','rupee','exchange rate','rate cut','policy'
        ];

        const scamHits   = SCAM_WORDS.filter(k => t.includes(k)).length;
        const isUrgent   = URGENT_WORDS.some(k => t.includes(k));
        const isBusiness = BUSINESS_WORDS.some(k => t.includes(k));
        const isMarket   = MARKET_WORDS.some(k => t.includes(k));

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

    // Step 2: build execution plan — which agents run, which are skipped
    buildPlan(classification) {
        const agents = ALL_AGENTS.filter(a => !classification.skipAgents.includes(a));
        const plan = {
            agents,
            skipped:    classification.skipAgents,
            totalSteps: agents.length
        };
        this.log.push({ step: 'plan', timestamp: new Date().toISOString(), ...plan });
        return plan;
    }

    // Step 3: after each agent, decide whether pipeline should continue
    shouldContinue(agentName, result) {
        if (result.status === 'completed') return true;

        if (CRITICAL_AGENTS.includes(agentName)) {
            this.log.push({
                step:      'abort',
                reason:    `Critical agent ${agentName} failed after retries`,
                timestamp: new Date().toISOString()
            });
            return false;
        }

        // Non-critical failure — continue with partial data
        this.log.push({
            step:      'continue_partial',
            reason:    `${agentName} failed but is non-critical — continuing`,
            timestamp: new Date().toISOString()
        });
        return true;
    }

    // Step 4: adjust ExecutionAgent prompt when scam fast-track is active
    adjustPromptForFastTrack(agentName, classification, input) {
        if (classification.fastTrack && agentName === 'ExecutionAgent') {
            return `SCAM FAST-TRACK MODE — focus only on immediate user protection.\n${input}\nGenerate: FIA complaint draft, bank alert message, and 3 immediate safety steps.`;
        }
        return input;
    }
}

module.exports = { PipelineOrchestrator, ALL_AGENTS };
