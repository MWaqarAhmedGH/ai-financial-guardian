/* ═══════════════════════════════════════════════════
   AI FINANCIAL GUARDIAN — Dashboard Script
   ═══════════════════════════════════════════════════ */

'use strict';

// ── PWA Service Worker ────────────────────────────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}

// ── Dark / Light Theme Toggle ─────────────────────
(function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);

    const btn = document.getElementById('theme-toggle-btn');
    function applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('theme', t);
        if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
        document.querySelector('meta[name="theme-color"]')
            ?.setAttribute('content', t === 'dark' ? '#0D0F14' : '#0066FF');
    }
    applyTheme(theme);
    if (btn) btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });
})();

// ── Speech Recognition ────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'ur-PK';
    recognition.interimResults = false;
}

function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[🛑✅⚠️]/g, '');
    const utt   = new SpeechSynthesisUtterance(clean);
    utt.lang    = 'ur-PK';
    const voices = window.speechSynthesis.getVoices();
    const urdu   = voices.find(v => v.lang.includes('ur'));
    if (urdu) utt.voice = urdu;
    window.speechSynthesis.speak(utt);
}

function formatMessage(text) {
    if (!text) return '';
    return text
        .replace(/\\n/g, '<br>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^\*/gm, '•');
}

// ── Shared helpers ────────────────────────────────
async function callAI(prompt) {
    const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

function setLoading(btnId, loadingText, originalText, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.textContent = loading ? loadingText : originalText;
    btn.disabled    = loading;
}

// ── Tab Navigation (header + mobile bottom nav) ──────
function switchTab(target) {
    document.querySelectorAll('.nav-tab, .mob-tab').forEach(b => {
        const isTarget = b.dataset.tab === target;
        b.classList.toggle('active', isTarget);
        b.setAttribute('aria-selected', String(isTarget));
    });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`tab-${target}`);
    if (panel) {
        panel.classList.add('active');
        panel.querySelector('.page-scroll')?.scrollTo(0, 0);
    }
}

document.querySelectorAll('.nav-tab, .mob-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── Budget Modal ──────────────────────────────────
const budgetBtn   = document.getElementById('budget-btn');
const budgetModal = document.getElementById('budget-modal');
const closeModal  = document.querySelector('.close-modal');
const incomeInput = document.getElementById('income-input');

if (budgetBtn)   budgetBtn.onclick = () => { budgetModal.style.display = 'block'; };
if (closeModal)  closeModal.onclick = () => { budgetModal.style.display = 'none'; };
window.addEventListener('click', e => { if (e.target === budgetModal) budgetModal.style.display = 'none'; });

const budgetTips = [
    "Zabardast! Is income ke sath aap ₨{savings} bacha sakte hain. Emergency fund zaroor banayein.",
    "Behtareen! 50/30/20 rule aapko financial azadi de sakta hai.",
    "Achi aamdani! Pehle bachat karein phir kharch — pay yourself first.",
    "Smart planning! Kya aapne gold ya National Savings mein invest karne ka socha hai?"
];

if (incomeInput) {
    incomeInput.addEventListener('input', () => {
        const income = parseFloat(incomeInput.value);
        const resultsEl = document.getElementById('budget-results');
        const tipEl     = document.getElementById('ai-budget-tip');
        if (income > 0) {
            resultsEl.style.display = 'block';
            if (tipEl) tipEl.style.display = 'block';
            const needs   = income * 0.5;
            const wants   = income * 0.3;
            const savings = income * 0.2;
            document.getElementById('val-needs').innerText   = `₨${needs.toLocaleString()}`;
            document.getElementById('val-wants').innerText   = `₨${wants.toLocaleString()}`;
            document.getElementById('val-savings').innerText = `₨${savings.toLocaleString()}`;
            document.getElementById('bar-needs').style.width   = '50%';
            document.getElementById('bar-wants').style.width   = '30%';
            document.getElementById('bar-savings').style.width = '20%';
            if (tipEl) {
                const tip = budgetTips[Math.floor(Math.random() * budgetTips.length)];
                tipEl.innerText = `🤖 AI Tip: ${tip.replace('{savings}', savings.toLocaleString())}`;
            }
        } else {
            resultsEl.style.display = 'none';
            if (tipEl) tipEl.style.display = 'none';
        }
    });
}

// ══════════════════════════════════════════════════
// GUARDIAN TAB — 5-Agent Pipeline Dashboard
// ══════════════════════════════════════════════════

const AGENT_META = [
    { name: 'IngestionAgent',         desc: 'Extracting entities & signals',     icon: '📥' },
    { name: 'InsightAgent',           desc: 'Generating financial intelligence',  icon: '🧠' },
    { name: 'ImpactAnalystAgent',     desc: 'Assessing market consequences',      icon: '📊' },
    { name: 'ActionRecommenderAgent', desc: 'Formulating action strategy',        icon: '⚡' },
    { name: 'ExecutionAgent',         desc: 'Simulating action execution',        icon: '🚀' }
];

const DEMO_TEXT =
`State Bank of Pakistan has raised the key interest rate by 150 basis points to 22.5% in an emergency monetary policy meeting, citing persistent core inflation at 29.8% and pressure on foreign exchange reserves. The decision came after the IMF review board flagged concerns about fiscal slippage. The Pakistani Rupee fell 2.3% against the dollar immediately following the announcement, trading at PKR 302. Textile and banking sector stocks on the PSX fell 4.1% and 3.7% respectively. Analysts at Topline Securities warn of a potential credit crunch affecting SME financing in Q3 2026.`;

// DOM refs
const guardianInput      = document.getElementById('guardian-input');
const guardianAnalyzeBtn = document.getElementById('guardian-analyze-btn');
const guardianDemoBtn    = document.getElementById('guardian-demo-btn');
const guardianMicBtn     = document.getElementById('guardian-mic-btn');
const guardianUploadBtn  = document.getElementById('guardian-upload-btn');
const guardianImageInput = document.getElementById('guardian-image-input');
const modeToggleBtn      = document.getElementById('mode-toggle-btn');

let antigravityMode = false;

if (modeToggleBtn) {
    modeToggleBtn.addEventListener('click', () => {
        antigravityMode = !antigravityMode;
        modeToggleBtn.textContent = antigravityMode ? '⚡ Antigravity' : '💬 Standard';
        modeToggleBtn.classList.toggle('antigravity-active', antigravityMode);
        if (antigravityMode) {
            fetch('/api/antigravity-status').then(r => r.json()).then(s => {
                if (!s.configured) {
                    modeToggleBtn.title = 'Antigravity (Vertex AI) not configured — using Gemini pipeline';
                }
            }).catch(() => {});
        }
    });
}

// Pre-render agent rows
function initAgentRows() {
    const container = document.getElementById('g-agents-list');
    if (!container) return;
    container.innerHTML = AGENT_META.map((a, i) => `
        <div class="g-agent-row waiting" data-idx="${i}">
            <div class="g-agent-icon-wrap"><span class="g-agent-icon">○</span></div>
            <div>
                <div class="g-agent-name">${a.icon} ${a.name}</div>
                <div class="g-agent-desc">${a.desc}</div>
            </div>
            <div class="g-agent-timing">—</div>
        </div>`).join('');
}
initAgentRows();

// Demo button
if (guardianDemoBtn) {
    guardianDemoBtn.addEventListener('click', () => {
        if (guardianInput) guardianInput.value = DEMO_TEXT;
        guardianInput?.focus();
    });
}

// Voice
if (guardianMicBtn && recognition) {
    guardianMicBtn.addEventListener('click', () => {
        guardianMicBtn.classList.add('recording');
        recognition.onresult = (e) => {
            if (guardianInput) guardianInput.value = e.results[0][0].transcript;
            guardianMicBtn.classList.remove('recording');
        };
        recognition.onerror = recognition.onend = () => guardianMicBtn.classList.remove('recording');
        recognition.start();
    });
}

// Image upload
if (guardianUploadBtn) guardianUploadBtn.addEventListener('click', () => guardianImageInput?.click());
if (guardianImageInput) {
    guardianImageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            await runGuardianPipeline(guardianInput?.value || 'Analyze this financial content.', ev.target.result);
        };
        reader.readAsDataURL(file);
        guardianImageInput.value = '';
    });
}

// Analyze button & Enter shortcut
if (guardianAnalyzeBtn) {
    guardianAnalyzeBtn.addEventListener('click', () => {
        const text = guardianInput?.value?.trim();
        if (!text) { guardianInput?.focus(); return; }
        runGuardianPipeline(text, null);
    });
}
if (guardianInput) {
    guardianInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            const text = guardianInput.value.trim();
            if (text) runGuardianPipeline(text, null);
        }
    });
}

// ── Pipeline runner ───────────────────────────────
async function runGuardianPipeline(message, imageData) {
    const pipelineEl  = document.getElementById('guardian-pipeline');
    const resultsEl   = document.getElementById('guardian-results');

    // Reset
    initAgentRows();
    if (resultsEl)  resultsEl.style.display  = 'none';
    if (pipelineEl) pipelineEl.style.display = 'block';

    const pipelineIdEl = document.getElementById('g-pipeline-id');
    if (pipelineIdEl) pipelineIdEl.textContent = 'Initializing…';

    // Reset progress dots
    document.querySelectorAll('.g-progress-step').forEach(s => {
        s.classList.remove('running', 'done', 'failed');
    });

    if (guardianAnalyzeBtn) {
        guardianAnalyzeBtn.disabled   = true;
        guardianAnalyzeBtn.textContent = '⏳ Analyzing…';
    }

    // Scroll pipeline into view
    pipelineEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const traceStore = { data: null };

    try {
        const response = await fetch('/api/pipeline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, image: imageData })
        });
        if (!response.ok) {
            const e = await response.json().catch(() => ({}));
            throw new Error(e.error || `HTTP ${response.status}`);
        }

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer    = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer      = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const event = JSON.parse(line.slice(6));
                    handleGuardianEvent(event, traceStore);
                } catch {}
            }
        }
    } catch (err) {
        if (pipelineIdEl) pipelineIdEl.textContent = `Error: ${err.message}`;
        // Mark any waiting agents as failed
        document.querySelectorAll('.g-agent-row.waiting, .g-agent-row.running').forEach(row => {
            row.className = 'g-agent-row failed';
            const icon = row.querySelector('.g-agent-icon');
            if (icon) icon.textContent = '✕';
        });
    } finally {
        if (guardianAnalyzeBtn) {
            guardianAnalyzeBtn.disabled    = false;
            guardianAnalyzeBtn.textContent = '⚡ ANALYZE';
        }
    }
}

function getGuardianAgentRow(idx) {
    return document.querySelector(`#g-agents-list .g-agent-row[data-idx="${idx}"]`);
}
function getProgressStep(idx) {
    return document.querySelector(`.g-progress-step[data-idx="${idx}"]`);
}

function handleGuardianEvent(event, traceStore) {
    const { type } = event;

    if (type === 'pipeline_start') {
        const el = document.getElementById('g-pipeline-id');
        if (el) el.textContent = `ID: ${event.pipeline_id.substring(0, 8)}… · 5 Agents`;
        return;
    }

    if (type === 'agent_start') {
        const row  = getGuardianAgentRow(event.index);
        const step = getProgressStep(event.index);
        if (row) {
            row.className = 'g-agent-row running';
            const icon = row.querySelector('.g-agent-icon');
            if (icon) icon.innerHTML = '<span class="g-spinner">⟳</span>';
        }
        if (step) step.classList.add('running');
    }

    if (type === 'agent_complete') {
        const row  = getGuardianAgentRow(event.index);
        const step = getProgressStep(event.index);
        const ok   = event.trace?.status === 'completed';
        if (row) {
            row.className = `g-agent-row ${ok ? 'completed' : 'failed'}`;
            const icon   = row.querySelector('.g-agent-icon');
            const timing = row.querySelector('.g-agent-timing');
            if (icon)   icon.textContent   = ok ? '✓' : '✕';
            if (timing) timing.textContent = `${event.trace?.duration_ms ?? 0}ms`;
        }
        if (step) {
            step.classList.remove('running');
            step.classList.add(ok ? 'done' : 'failed');
        }
    }

    if (type === 'pipeline_complete') {
        traceStore.data = event;
        renderGuardianResults(event);

        // Export button
        const exportBtn = document.getElementById('g-export-btn');
        if (exportBtn) {
            exportBtn.onclick = () => {
                const blob = new Blob([JSON.stringify(event, null, 2)], { type: 'application/json' });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href = url;
                a.download = `pipeline-${event.pipeline_id.substring(0, 8)}.json`;
                a.click();
                URL.revokeObjectURL(url);
            };
        }

        const totalEl = document.getElementById('g-total-time');
        if (totalEl) totalEl.textContent = `Total: ${event.total_duration_ms}ms · ${event.agents?.length ?? 5} agents`;

        // Update dashboard risk stat
        const sevMap = { Critical: '#ff4757', High: '#ff4757', Medium: '#ffd32a', Low: '#00d4aa' };
        const sev    = event.results?.insight?.severity || 'Medium';
        const riskEl = document.getElementById('stat-risk');
        if (riskEl) { riskEl.textContent = sev; riskEl.style.color = sevMap[sev] || '#00d4aa'; }
    }

    if (type === 'pipeline_error') {
        const el = document.getElementById('g-pipeline-id');
        if (el) el.textContent = `Pipeline error: ${event.error}`;
    }
}

function renderGuardianResults(data) {
    const { results } = data;
    if (!results) return;

    const section = document.getElementById('guardian-results');
    if (!section) return;
    section.style.display = 'flex';

    const sevColors = { Critical: '#ff4757', High: '#ff4757', Medium: '#ffd32a', Low: '#00d4aa' };
    const sevBg     = { Critical: 'rgba(255,71,87,.1)', High: 'rgba(255,71,87,.1)', Medium: 'rgba(255,211,42,.1)', Low: 'rgba(0,212,170,.1)' };
    const priColors = { Critical: '#ff4757', High: '#ff4757', Medium: '#ffd32a', Low: '#00d4aa' };
    const priBg     = { Critical: 'rgba(255,71,87,.07)', High: 'rgba(255,71,87,.07)', Medium: 'rgba(255,211,42,.07)', Low: 'rgba(0,212,170,.07)' };

    // ── Row 1: Insight + Severity ───────────────────
    const insightRow = document.getElementById('g-insight-row');
    if (insightRow && results.insight) {
        const sc  = sevColors[results.insight.severity] || '#00d4aa';
        const sb  = sevBg[results.insight.severity]     || 'rgba(0,212,170,.1)';
        const conf = results.insight.confidence_score;
        const confPct = conf != null ? Math.round(conf <= 1 ? conf * 100 : conf) : null;
        insightRow.innerHTML = `
            <div class="g-insight-main g-card">
                <div class="g-card-label">💡 PRIMARY INSIGHT</div>
                <div class="g-insight-text">${results.insight.primary_insight || '—'}</div>
                ${results.insight.affected_parties?.length ? `<div class="g-affected-chips">
                    ${results.insight.affected_parties.map(p => `<span class="g-chip">${p}</span>`).join('')}
                </div>` : ''}
            </div>
            <div class="g-severity-box" style="background:${sb};border:1px solid ${sc}20">
                <div class="g-sev-label">SEVERITY</div>
                <div class="g-sev-value" style="color:${sc}">${results.insight.severity || '—'}</div>
                ${results.insight.trend_direction ? `<div class="g-sev-trend">${results.insight.trend_direction}</div>` : ''}
                ${confPct != null ? `<div class="g-sev-conf">Confidence: ${confPct}%</div>` : ''}
            </div>`;
    }

    // ── Row 2: Impact Grid ──────────────────────────
    const impactGrid = document.getElementById('g-impact-grid');
    if (impactGrid && results.impact) {
        const r  = results.impact;
        const oc = r.opportunity_or_threat === 'Opportunity' ? '#00d4aa' : r.opportunity_or_threat === 'Mixed' ? '#ffd32a' : '#ff4757';
        const rc = sevColors[r.risk_level] || '#ffd32a';
        impactGrid.innerHTML = `
            <div class="g-card g-impact-card">
                <div class="g-card-label">⚡ IMMEDIATE (24–48h)</div>
                <div class="g-impact-text">${r.immediate_impact || '—'}</div>
            </div>
            <div class="g-card g-impact-card">
                <div class="g-card-label">📅 MEDIUM TERM (1–4 wks)</div>
                <div class="g-impact-text">${r.medium_term_impact || '—'}</div>
                ${r.affected_sectors?.length ? `<div class="g-sector-list">${r.affected_sectors.slice(0,4).map(s => `<span class="g-chip">${s}</span>`).join('')}</div>` : ''}
            </div>
            <div class="g-card g-impact-card">
                <div class="g-card-label">🏦 MARKETS</div>
                ${r.pkr_impact ? `<div class="g-market-row"><span class="g-market-lbl">PKR:</span><span class="g-market-val">${r.pkr_impact}</span></div>` : ''}
                ${r.psx_impact ? `<div class="g-market-row"><span class="g-market-lbl">PSX:</span><span class="g-market-val">${r.psx_impact}</span></div>` : ''}
                <div style="display:flex;flex-direction:column;gap:5px;margin-top:8px">
                    <div class="g-ot-badge"   style="color:${oc};border-color:${oc}30;background:${oc}10">${r.opportunity_or_threat || '—'}</div>
                    <div class="g-risk-badge" style="color:${rc};border-color:${rc}30;background:${rc}10">Risk: ${r.risk_level || '—'}</div>
                </div>
            </div>`;
    }

    // ── Row 3: Action Cards ─────────────────────────
    const actionsSection = document.getElementById('g-actions-section');
    if (actionsSection && results.actions?.actions?.length) {
        actionsSection.innerHTML = `
            <div class="g-section-label-row"><div class="g-card-label" style="padding:0">⚡ ACTION PLAN</div></div>
            <div class="g-action-cards">
                ${results.actions.actions.map(a => {
                    const pc = priColors[a.priority] || '#8892a4';
                    const pb = priBg[a.priority]     || 'rgba(136,146,164,.05)';
                    return `<div class="g-action-card" style="background:${pb};border-color:${pc}20">
                        <div class="g-action-header">
                            <span class="g-action-badge" style="color:${pc};border-color:${pc}30;background:${pc}10">${a.priority || ''} — ${a.timeframe || ''}</span>
                        </div>
                        <div class="g-action-title">${a.title || ''}</div>
                        <div class="g-action-rationale">${a.rationale || ''}</div>
                        <div class="g-action-outcome">→ ${a.expected_outcome || ''}</div>
                    </div>`;
                }).join('')}
            </div>`;
    }

    // ── Row 4: Execution Report ─────────────────────
    const execSection = document.getElementById('g-execution-section');
    if (execSection && results.execution) {
        const ex = results.execution;
        execSection.innerHTML = `
            <div class="g-card g-exec-card">
                <div class="g-card-label">🚀 EXECUTION REPORT</div>
                ${ex.system_state_before && ex.system_state_after ? `
                <div class="g-state-row">
                    <div class="g-state-box">
                        <div class="g-state-lbl">BEFORE</div>
                        <div class="g-state-num" style="color:#ff4757">${ex.system_state_before.portfolio_risk_score}</div>
                        <div class="g-state-sub">${ex.system_state_before.alert_status || ''}</div>
                    </div>
                    <div class="g-state-arrow">→</div>
                    <div class="g-state-box">
                        <div class="g-state-lbl">AFTER</div>
                        <div class="g-state-num" style="color:#00d4aa">${ex.system_state_after.portfolio_risk_score}</div>
                        <div class="g-state-sub">${ex.system_state_after.alert_status || ''}</div>
                    </div>
                </div>` : ''}
                ${ex.email_draft ? `
                <div class="g-email-card">
                    <div class="g-email-header">📧 EMAIL DRAFT GENERATED</div>
                    <div class="g-email-meta">To: ${ex.email_draft.to || ''}</div>
                    <div class="g-email-subject">Subject: ${ex.email_draft.subject || ''}</div>
                    <div class="g-email-body">${(ex.email_draft.body || '').substring(0, 380)}${(ex.email_draft.body || '').length > 380 ? '…' : ''}</div>
                </div>` : ''}
                ${ex.execution_log?.length ? `
                <div class="g-exec-log">
                    <div class="g-exec-log-title">EXECUTION LOG</div>
                    ${ex.execution_log.map(s => `
                        <div class="g-exec-row">
                            <span class="g-exec-check">✅</span>
                            <span class="g-exec-time">${s.timestamp ? new Date(s.timestamp).toLocaleTimeString() : ''}</span>
                            <span class="g-exec-step-text">${s.step || s}</span>
                        </div>`).join('')}
                </div>` : ''}
            </div>`;
    }

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ══════════════════════════════════════════════════
// TAB 2 — SCAM SHIELD
// ══════════════════════════════════════════════════

document.getElementById('scam-analyze-btn')?.addEventListener('click', analyzeScam);

async function analyzeScam() {
    const text = document.getElementById('scam-input')?.value?.trim();
    if (!text) { alert('Please paste a message or offer to analyze.'); return; }

    setLoading('scam-analyze-btn', '⏳ Analyzing…', '🔍 SCAN FOR SCAM', true);
    document.getElementById('scam-results')?.setAttribute('style', 'display:none');
    const banner = document.getElementById('scam-warning-banner');
    if (banner) banner.style.display = 'none';

    const prompt = `You are Pakistan's top financial fraud detection expert. Analyze this content for scam patterns:

"${text}"

Check specifically for these Pakistan-specific scam types:
- Fake prize / lucky draw (lottery, prize money)
- Ponzi / MLM schemes (Aitkaf, fake crypto, dubious investment)
- Advance fee fraud (processing fees, membership fees, activation charges)
- Fake government schemes (fake BISP, FBR tax refund, Ehsaas fraud)
- WhatsApp / phone impersonation fraud
- Fake job offers requiring upfront payment

Respond in our standard JSON format:
- display_text: 6-8 Hinglish bullet points — state if it IS or IS NOT a scam, name specific red flags found, explain the scam type, and tell exactly what the user should do
- scam_score: 0-100 (0=safe, 100=confirmed scam)
- insight: name of the scam type detected (or "No scam detected")
- impact: estimated financial risk in PKR or "None"
- recommended_actions: 3 concrete steps (block, report, verify)`;

    try {
        const data = await callAI(prompt);
        renderScamResults(data);
    } catch {
        alert('Analysis failed. Check your connection and try again.');
    } finally {
        setLoading('scam-analyze-btn', '', '🔍 SCAN FOR SCAM', false);
    }
}

function renderScamResults(data) {
    const score = typeof data.scam_score === 'number' ? data.scam_score : 0;

    // Banner
    const banner = document.getElementById('scam-warning-banner');
    const bannerText = document.getElementById('scam-banner-text');
    if (banner) {
        if (score > 60) {
            banner.style.display = 'flex';
            banner.className = 'scam-banner scam-banner-danger';
            if (bannerText) bannerText.textContent = `HIGH SCAM RISK: ${score}/100 — DO NOT PROCEED`;
        } else if (score > 30) {
            banner.style.display = 'flex';
            banner.className = 'scam-banner scam-banner-warning';
            if (bannerText) bannerText.textContent = `SUSPICIOUS CONTENT: ${score}/100 — Proceed with caution`;
        } else {
            banner.style.display = 'flex';
            banner.className = 'scam-banner scam-banner-safe';
            if (bannerText) bannerText.textContent = `APPEARS SAFE: ${score}/100 — No obvious scam patterns detected`;
        }
    }

    // Score circle
    const circle = document.getElementById('scam-score-circle');
    if (circle) circle.className = 'score-circle ' + (score > 60 ? 'score-danger' : score > 30 ? 'score-warning' : 'score-safe');
    const numEl = document.getElementById('scam-score-num');
    if (numEl) numEl.textContent = score;
    const lblEl = document.getElementById('scam-score-label');
    if (lblEl) lblEl.textContent = score > 60 ? 'HIGH RISK' : score > 30 ? 'SUSPICIOUS' : 'APPEARS SAFE';
    const subEl = document.getElementById('scam-insight-label');
    if (subEl) subEl.textContent = data.insight || '';

    // Analysis
    const analysisEl = document.getElementById('scam-analysis');
    if (analysisEl) analysisEl.innerHTML = formatMessage(data.display_text || '');

    // Actions
    const actionsEl = document.getElementById('scam-actions');
    if (actionsEl && data.recommended_actions?.length) {
        actionsEl.style.display = 'block';
        actionsEl.innerHTML = '<strong>📋 What To Do:</strong><ul>' +
            data.recommended_actions.map(a => `<li>${a.label || a.title || a}</li>`).join('') + '</ul>';
    }

    const resultsEl = document.getElementById('scam-results');
    if (resultsEl) {
        resultsEl.style.display = 'flex';
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ══════════════════════════════════════════════════
// TAB 3 — BUDGET DOCTOR
// ══════════════════════════════════════════════════

document.getElementById('budget-doctor-btn')?.addEventListener('click', analyzeBudget);

async function analyzeBudget() {
    const income    = parseFloat(document.getElementById('bd-income')?.value)    || 0;
    const rent      = parseFloat(document.getElementById('bd-rent')?.value)      || 0;
    const food      = parseFloat(document.getElementById('bd-food')?.value)      || 0;
    const transport = parseFloat(document.getElementById('bd-transport')?.value) || 0;
    const utilities = parseFloat(document.getElementById('bd-utilities')?.value) || 0;
    const other     = parseFloat(document.getElementById('bd-other')?.value)     || 0;

    if (!income) { alert('Please enter your monthly income.'); return; }

    const totalExp = rent + food + transport + utilities + other;
    const savings  = income - totalExp;
    const nums     = { income, rent, food, transport, utilities, other, savings };
    const pct      = v => income > 0 ? (v / income * 100).toFixed(1) : 0;

    setLoading('budget-doctor-btn', '⏳ Diagnosing…', '💊 DIAGNOSE MY BUDGET', true);
    document.getElementById('budget-doctor-results')?.setAttribute('style', 'display:none');

    const prompt = `You are a certified Pakistani financial advisor. Diagnose this monthly household budget:

Monthly Income  : ₨${income.toLocaleString()}
Rent / Housing  : ₨${rent.toLocaleString()} (${pct(rent)}% of income)
Food & Groceries: ₨${food.toLocaleString()} (${pct(food)}% of income)
Transport       : ₨${transport.toLocaleString()} (${pct(transport)}% of income)
Utilities       : ₨${utilities.toLocaleString()} (${pct(utilities)}% of income)
Other Expenses  : ₨${other.toLocaleString()} (${pct(other)}% of income)
Total Expenses  : ₨${totalExp.toLocaleString()}
Monthly Savings : ₨${savings.toLocaleString()} (${pct(savings)}% savings rate)

Pakistan healthy benchmarks: Rent ≤30%, Food ≤20%, Transport ≤10%, Utilities ≤8%, Savings ≥20%.
Pakistan inflation 2026: ~25%. Emergency fund target: 3-6 months = ₨${(totalExp*3).toLocaleString()} to ₨${(totalExp*6).toLocaleString()}.

Respond in our standard JSON format:
- display_text: 6-8 Hinglish bullet points covering health score, over/under budget categories, 3 Pakistan-specific saving tips, emergency fund status
- scam_score: Financial Health Score 0-100 (higher=healthier)
- insight: one-line diagnosis (e.g. "Over-spending on rent, under-saving")
- impact: single biggest financial risk this person faces`;

    try {
        const data = await callAI(prompt);
        renderBudgetResults(data, nums);
    } catch {
        alert('Analysis failed. Check your connection and try again.');
    } finally {
        setLoading('budget-doctor-btn', '', '💊 DIAGNOSE MY BUDGET', false);
    }
}

function drawBudgetChart(nums) {
    const { income, rent, food, transport, utilities, other, savings } = nums;
    const chart = document.getElementById('bd-chart');
    if (!chart) return;
    chart.innerHTML = '';

    const cats = [
        { label: 'Rent / Housing',   value: rent,      color: '#ff4757' },
        { label: 'Food & Groceries', value: food,      color: '#ffd32a' },
        { label: 'Transport',        value: transport, color: '#4ea8de' },
        { label: 'Utilities',        value: utilities, color: '#a78bfa' },
        { label: 'Other',            value: other,     color: '#6b7280' },
        { label: 'Savings',          value: Math.max(savings, 0), color: '#00d4aa' }
    ];

    cats.forEach(cat => {
        if (cat.value <= 0) return;
        const pct = income > 0 ? Math.min((cat.value / income) * 100, 100).toFixed(1) : 0;
        const row = document.createElement('div');
        row.className = 'bd-bar-row';
        row.innerHTML = `
            <div class="bd-bar-label">${cat.label}</div>
            <div class="bd-bar-track"><div class="bd-bar-fill" style="width:${pct}%;background:${cat.color}"></div></div>
            <div class="bd-bar-value">₨${cat.value.toLocaleString()} <span class="bd-pct">${pct}%</span></div>`;
        chart.appendChild(row);
    });
}

function renderBudgetResults(data, nums) {
    const health = typeof data.scam_score === 'number' ? data.scam_score : 50;

    const circle = document.getElementById('health-score-circle');
    if (circle) circle.className = 'score-circle ' + (health >= 70 ? 'score-safe' : health >= 40 ? 'score-warning' : 'score-danger');
    const numEl = document.getElementById('health-score-num');
    if (numEl) numEl.textContent = health;
    const lblEl = document.getElementById('health-score-label');
    if (lblEl) lblEl.textContent = health >= 70 ? 'Financially Healthy' : health >= 40 ? 'Needs Attention' : 'Critical';
    const subEl = document.getElementById('health-insight-label');
    if (subEl) subEl.textContent = data.insight || '';

    drawBudgetChart(nums);

    const analysisEl = document.getElementById('bd-analysis');
    if (analysisEl) analysisEl.innerHTML = formatMessage(data.display_text || '');

    const results = document.getElementById('budget-doctor-results');
    if (results) {
        results.style.display = 'flex';
        results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ══════════════════════════════════════════════════
// TAB 4 — REPORT SUMMARIZER
// ══════════════════════════════════════════════════

document.getElementById('report-summarize-btn')?.addEventListener('click', summarizeReport);

async function summarizeReport() {
    const text = document.getElementById('report-input')?.value?.trim();
    if (!text)          { alert('Please paste a document to summarize.'); return; }
    if (text.length < 100) { alert('Document is too short. Please paste a full report or article.'); return; }

    setLoading('report-summarize-btn', '⏳ Summarizing…', '⚡ SUMMARIZE IN 10 SECONDS', true);
    document.getElementById('report-results')?.setAttribute('style', 'display:none');

    const prompt = `You are an executive assistant for a busy Pakistani CEO. Summarize this document concisely:

---
${text.substring(0, 8000)}
---

Respond in our standard JSON format:
- display_text: EXACTLY 5 bullet points using • symbol. Each one crisp English sentence covering the 5 most important takeaways.
- insight: The 3-5 most important numbers/metrics. Format: "Key Figures: [fig1], [fig2], [fig3]"
- impact: The single biggest RISK in this document. One sharp sentence.
- recommended_actions: Exactly 2 actions:
    1. id: "opportunity", label: "Opportunity: [biggest opportunity in one line]"
    2. id: "action",      label: "Action Required: [most urgent action]"
- scam_score: 0`;

    try {
        const data = await callAI(prompt);
        renderReportResults(data);
    } catch {
        alert('Summarization failed. Check your connection and try again.');
    } finally {
        setLoading('report-summarize-btn', '', '⚡ SUMMARIZE IN 10 SECONDS', false);
    }
}

function renderReportResults(data) {
    const summaryDiv = document.getElementById('report-summary');
    if (summaryDiv) {
        summaryDiv.innerHTML = '<div class="report-section-title">📋 Executive Summary</div>' +
            '<div class="report-bullets">' + formatMessage(data.display_text || '') + '</div>';
    }

    const metaDiv = document.getElementById('report-meta');
    if (metaDiv) {
        let html = '';
        if (data.insight) html += `<div class="report-stat-card numbers-card"><span class="report-stat-icon">🔢</span><div><div class="report-stat-title">Key Figures</div><div class="report-stat-body">${data.insight}</div></div></div>`;
        if (data.impact)  html += `<div class="report-stat-card risk-card"><span class="report-stat-icon">⚠️</span><div><div class="report-stat-title">Main Risk</div><div class="report-stat-body">${data.impact}</div></div></div>`;
        if (data.recommended_actions?.[0]) html += `<div class="report-stat-card opp-card"><span class="report-stat-icon">🚀</span><div><div class="report-stat-title">Main Opportunity</div><div class="report-stat-body">${(data.recommended_actions[0].label || '').replace('Opportunity: ', '')}</div></div></div>`;
        if (data.recommended_actions?.[1]) html += `<div class="report-stat-card action-card"><span class="report-stat-icon">✅</span><div><div class="report-stat-title">Action Required</div><div class="report-stat-body">${(data.recommended_actions[1].label || '').replace('Action Required: ', '')}</div></div></div>`;
        metaDiv.innerHTML = html;
    }

    const results = document.getElementById('report-results');
    if (results) {
        results.style.display = 'flex';
        results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
