const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const uploadBtn = document.getElementById('upload-btn');
const micBtn = document.getElementById('mic-btn');
const imageInput = document.getElementById('image-input');
const budgetBtn = document.getElementById('budget-btn');
const budgetModal = document.getElementById('budget-modal');
const closeModal = document.querySelector('.close-modal');
const incomeInput = document.getElementById('income-input');
const budgetResults = document.getElementById('budget-results');
const aiLogo = document.querySelector('.ai-logo');
const aiBudgetTip = document.getElementById('ai-budget-tip');

// Agent Trace Elements
const toggleTraceBtn = document.getElementById('toggle-trace');
const traceContainer = document.getElementById('agent-trace-container');
const closeTraceBtn = document.getElementById('close-trace');
const traceLogs = document.getElementById('trace-logs');

let isVoiceMode = false;
let currentAgentTrace = null;
let antigravityMode = false;

const modeToggleBtn = document.getElementById('mode-toggle-btn');

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Failed', err));
    });
}

// Agent Trace Toggle
toggleTraceBtn.onclick = () => {
    traceContainer.style.display = traceContainer.style.display === 'none' ? 'flex' : 'none';
    if (traceContainer.style.display === 'flex') {
        renderTrace();
    }
};
closeTraceBtn.onclick = () => traceContainer.style.display = 'none';

modeToggleBtn.addEventListener('click', () => {
    antigravityMode = !antigravityMode;
    modeToggleBtn.textContent = antigravityMode ? '⚡ Antigravity' : '💬 Standard';
    modeToggleBtn.classList.toggle('antigravity-active', antigravityMode);
    document.querySelector('header p').textContent = antigravityMode
        ? '⚡ Google Antigravity Active'
        : 'Pakistani Financial Safety Assistant';
    // Check status when switching to Antigravity mode
    if (antigravityMode) {
        fetch('/api/antigravity-status').then(r => r.json()).then(s => {
            if (!s.configured) {
                const warn = document.createElement('div');
                warn.classList.add('message', 'ai-message');
                warn.innerHTML = `⚠️ <strong>Antigravity Mode:</strong> GOOGLE_CLOUD_PROJECT not set in environment. Requests will return a configuration error. Add it to your .env file.`;
                document.getElementById('chat-window').appendChild(warn);
            }
        }).catch(() => {});
    }
});

function renderTrace() {
    if (!currentAgentTrace) {
        traceLogs.innerHTML = '<div class="trace-step">No trace data available.</div>';
        return;
    }

    let html = '';
    if (typeof currentAgentTrace === 'object' && !Array.isArray(currentAgentTrace)) {
        html += `<div class="trace-section"><strong>🎯 Workplan:</strong> ${currentAgentTrace.workplan}</div>`;
        html += `<div class="trace-section"><strong>📋 Tasks:</strong><ul>${currentAgentTrace.tasks.map(t => `<li>${t}</li>`).join('')}</ul></div>`;
        html += `<div class="trace-section"><strong>🤔 Reasoning:</strong> ${currentAgentTrace.reasoning}</div>`;
        html += `<div class="trace-section"><strong>🔀 Decision Flow:</strong> ${currentAgentTrace.decision_flow}</div>`;
        html += `<div class="trace-section"><strong>⚡ Action Execution:</strong> ${currentAgentTrace.action_execution}</div>`;
    } else if (Array.isArray(currentAgentTrace)) {
        html = currentAgentTrace.map(step => `<div class="trace-step">${step}</div>`).join('');
    }
    traceLogs.innerHTML = html;
}

// Load History on Startup
window.onload = () => {
    const savedHistory = JSON.parse(localStorage.getItem('chat_history') || '[]');
    if (savedHistory.length > 0) {
        chatWindow.innerHTML = '';
        savedHistory.forEach(msg => {
            appendMessage(msg.text, msg.sender, msg.isImage, false, false, msg.structuredData);
        });
    }
};

function saveToLocal(text, sender, isImage = false, structuredData = null) {
    const history = JSON.parse(localStorage.getItem('chat_history') || '[]');
    history.push({ text, sender, isImage, structuredData });
    localStorage.setItem('chat_history', JSON.stringify(history));
}

// Budget Planner Logic
budgetBtn.onclick = () => budgetModal.style.display = "block";
closeModal.onclick = () => budgetModal.style.display = "none";
window.onclick = (event) => { if (event.target == budgetModal) budgetModal.style.display = "none"; };

const budgetTips = [
    "Zabardast! Is income ke sath aap mahana Rs. {savings} bacha sakte hain. Aik emergency fund zaroor banayein.",
    "Behtareen! 50/30/20 rule aapko financial azadi de sakta hai. Kharchon par nazar rakhein.",
    "Achi aamdani hai! Yaad rakhein, pehle bachat (saving) karein phir kharch.",
    "Smart planning! Kya aapne gold ya kisi aur scheme mein invest karne ka socha hai?"
];

incomeInput.oninput = () => {
    const income = parseFloat(incomeInput.value);
    if (income > 0) {
        budgetResults.style.display = "block";
        aiBudgetTip.style.display = "block";
        const needs = income * 0.5;
        const wants = income * 0.3;
        const savings = income * 0.2;
        
        document.getElementById('val-needs').innerText = `Rs. ${needs.toLocaleString()}`;
        document.getElementById('val-wants').innerText = `Rs. ${wants.toLocaleString()}`;
        document.getElementById('val-savings').innerText = `Rs. ${savings.toLocaleString()}`;
        
        document.getElementById('bar-needs').style.width = "50%";
        document.getElementById('bar-wants').style.width = "30%";
        document.getElementById('bar-savings').style.width = "20%";

        const randomTip = budgetTips[Math.floor(Math.random() * budgetTips.length)];
        aiBudgetTip.innerText = `🤖 AI Tip: ${randomTip.replace('{savings}', savings.toLocaleString())}`;
    } else {
        budgetResults.style.display = "none";
        aiBudgetTip.style.display = "none";
    }
};

// Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'ur-PK';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        micBtn.classList.remove('recording');
        isVoiceMode = true;
        sendMessage();
    };
    recognition.onerror = () => micBtn.classList.remove('recording');
    recognition.onend = () => micBtn.classList.remove('recording');
}

function formatMessage(text) {
    if (!text) return '';
    // Replace double newlines first, then single newlines with <br>
    // Also handle literal "\n" strings that might come from JSON
    let formatted = text
        .replace(/\\n/g, '<br>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/•/g, '•') // Ensure bullet remains
        .replace(/^\*/gm, '•'); // Convert markdown bullets to dots
    return formatted;
}

function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/🛑|✅|⚠️/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ur-PK';
    utterance.onstart = () => aiLogo.classList.add('speaking');
    utterance.onend = () => aiLogo.classList.remove('speaking');
    const voices = window.speechSynthesis.getVoices();
    const urduVoice = voices.find(v => v.lang.includes('ur'));
    if (urduVoice) utterance.voice = urduVoice;
    window.speechSynthesis.speak(utterance);
}

function appendMessage(text, sender, isImage = false, shouldSpeak = false, shouldSave = true, structuredData = null) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
    
    if (isImage) {
        const img = document.createElement('img');
        img.src = text;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '10px';
        img.style.marginTop = '10px';
        msgDiv.appendChild(img);
    } else if (sender === 'ai') {
        msgDiv.innerHTML = formatMessage(text);

        // Scam Score Badge
        if (structuredData && typeof structuredData.scam_score === 'number') {
            const score = structuredData.scam_score;
            const badge = document.createElement('div');
            badge.classList.add('scam-badge');
            if (score <= 30) {
                badge.classList.add('scam-safe');
                badge.innerHTML = `🛡️ Scam Risk: <strong>${score}%</strong> — Safe`;
            } else if (score <= 60) {
                badge.classList.add('scam-warning');
                badge.innerHTML = `⚠️ Scam Risk: <strong>${score}%</strong> — Suspicious`;
            } else {
                badge.classList.add('scam-danger');
                badge.innerHTML = `🚨 Scam Risk: <strong>${score}%</strong> — HIGH DANGER`;
            }
            msgDiv.appendChild(badge);
        }

        // Insight & Impact Panel
        if (structuredData && (structuredData.insight || structuredData.impact)) {
            const infoPanel = document.createElement('div');
            infoPanel.classList.add('insight-panel');
            if (structuredData.insight) {
                infoPanel.innerHTML += `<div class="insight-row"><span class="insight-label">🔍 Insight</span><span class="insight-value">${structuredData.insight}</span></div>`;
            }
            if (structuredData.impact) {
                infoPanel.innerHTML += `<div class="insight-row"><span class="insight-label">💥 Impact</span><span class="insight-value">${structuredData.impact}</span></div>`;
            }
            msgDiv.appendChild(infoPanel);
        }

        const listenBtn = document.createElement('button');
        listenBtn.innerHTML = '🔊 Suniye';
        listenBtn.classList.add('listen-btn');
        listenBtn.onclick = () => speakText(text);
        msgDiv.appendChild(listenBtn);

        // System State Change Visualization
        if (structuredData && structuredData.system_state_change) {
            const stateDiv = document.createElement('div');
            stateDiv.classList.add('system-state');
            stateDiv.innerHTML = `
                <div class="state-box">
                    <strong>Before:</strong> <span>${structuredData.system_state_change.before}</span>
                </div>
                <div class="state-arrow">⬇️</div>
                <div class="state-box">
                    <strong>After:</strong> <span>${structuredData.system_state_change.after}</span>
                </div>
            `;
            msgDiv.appendChild(stateDiv);
        }

        // Action Center for Challenge 1
        if (structuredData && structuredData.recommended_actions && structuredData.recommended_actions.length > 0) {
            const actionCenter = document.createElement('div');
            actionCenter.classList.add('action-center');
            
            structuredData.recommended_actions.forEach(action => {
                const btn = document.createElement('div');
                btn.classList.add('action-chip');
                btn.innerHTML = `<span>⚡</span> ${action.label}`;
                btn.onclick = () => handleActionSimulation(action, structuredData, btn);
                actionCenter.appendChild(btn);
            });
            msgDiv.appendChild(actionCenter);
        }

        if (shouldSpeak) speakText(text);
    } else {
        msgDiv.innerText = text;
    }
    
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    if (shouldSave) saveToLocal(text, sender, isImage, structuredData);
}

async function handleActionSimulation(action, data, btnElement) {
    if (btnElement.classList.contains('success')) return;

    btnElement.classList.add('executing');
    btnElement.innerHTML = `<span>⏳</span> Simulating...`;

    // Artificial delay for realism
    await new Promise(r => setTimeout(r, 1500));

    btnElement.classList.remove('executing');
    btnElement.classList.add('success');
    btnElement.innerHTML = `<span>✅</span> ${action.label} Done`;

    const outcomeDiv = document.createElement('div');
    outcomeDiv.classList.add('outcome-log');

    if (action.id === 'fia_report' && data.fia_complaint_draft) {
        outcomeDiv.innerHTML = `<strong>OFFICIAL FIA COMPLAINT DRAFT:</strong><br><br>${data.fia_complaint_draft}`;
    } else if (action.id === 'bank_block') {
        outcomeDiv.innerHTML = `<strong>SIMULATION:</strong> Request sent to Bank API. Account is now PROTECTED and transactions are paused.`;
    } else if (action.id === 'family_alert') {
        const alertText = `🚨 Alert: ${data.insight}. Humne AI Guardian use kiya hai financial safety ke liye.`;
        outcomeDiv.innerHTML = `<strong>SIMULATION:</strong> WhatsApp Alert ready. <a href="https://wa.me/?text=${encodeURIComponent(alertText)}" target="_blank">Click to send</a>`;
    } else if (action.id === 'restock_order') {
        outcomeDiv.innerHTML = `<strong>SIMULATION:</strong> Purchase Order SKU-101 generated. Supplier notified via EDI. Inventory will update in 24h.`;
    } else if (action.id === 'logistics_reroute') {
        outcomeDiv.innerHTML = `<strong>SIMULATION:</strong> Logistics route changed to Alternate Highway 5. Estimated delay reduced by 4 hours.`;
    } else {
        outcomeDiv.innerHTML = `<strong>SIMULATION:</strong> ${action.label} executed successfully in mock environment.`;
    }
    
    btnElement.parentElement.parentElement.appendChild(outcomeDiv);
}

async function sendMessage(text = null, imageData = null) {
    const message = text || userInput.value.trim();
    if (!message && !imageData) return;
    
    if (imageData) {
        appendMessage(imageData, 'user', true);
        appendMessage(message || "Analyze this content for scams.", 'user');
    } else {
        appendMessage(message, 'user');
    }
    
    userInput.value = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('loading');
    loadingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatWindow.appendChild(loadingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        if (antigravityMode) {
            // ── Real 5-Agent Gemini Pipeline (SSE streaming) ──
            chatWindow.removeChild(loadingDiv);
            await runPipeline(message, imageData);
        } else {
            // ── Standard Gemini Mode ──
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message || "Analyze this content.", image: imageData }),
            });

            const data = await response.json();
            chatWindow.removeChild(loadingDiv);

            if (data.display_text) {
                currentAgentTrace = data.agent_trace || [];
                appendMessage(data.display_text, 'ai', false, isVoiceMode, true, data);

                if (data.system_state_change && data.system_state_change.metrics_update) {
                    const metrics = data.system_state_change.metrics_update;
                    if (metrics.stock) document.getElementById('stat-stock').innerText = metrics.stock;
                    if (metrics.risk) {
                        const riskElem = document.getElementById('stat-risk');
                        riskElem.innerText = metrics.risk > 70 ? 'High' : metrics.risk > 30 ? 'Medium' : 'Low';
                        riskElem.style.color = metrics.risk > 70 ? '#FF4D6D' : metrics.risk > 30 ? '#FFC107' : '#00E5FF';
                    }
                    if (metrics.budget) document.getElementById('stat-budget').innerText = metrics.budget;
                }

                if (currentAgentTrace.length > 0) {
                    toggleTraceBtn.classList.add('pulse');
                }
            } else if (data.error) {
                appendMessage(data.error, 'ai');
            }
        }
    } catch (error) {
        if (chatWindow.contains(loadingDiv)) chatWindow.removeChild(loadingDiv);
        appendMessage('AI connection error. Check your API keys.', 'ai');
    } finally {
        isVoiceMode = false;
    }
}

async function clearChat() {
    try {
        window.speechSynthesis.cancel();
        localStorage.removeItem('chat_history');
        await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '___clear_history___' }),
        });
        location.reload();
    } catch (error) {
        console.error('Error clearing chat:', error);
    }
}

function renderAntigravityResponse(data) {
    const final = data.final_output;
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', 'ai-message', 'ag-response');

    // ── Pipeline Header ──────────────────────────────────────
    const header = document.createElement('div');
    header.classList.add('ag-header');
    header.innerHTML = `
        <span class="ag-badge">⚡ Google Antigravity</span>
        <span class="ag-meta">ID: ${data.pipeline_id.substring(0, 8)}… · ${data.total_duration_ms}ms · 5 Agents</span>
    `;
    msgDiv.appendChild(header);

    // ── Agent Timeline ───────────────────────────────────────
    const agentColors = ['#00d4aa', '#00b8ff', '#a78bfa', '#f59e0b', '#f43f5e'];
    const timeline = document.createElement('div');
    timeline.classList.add('ag-timeline');
    data.agents.forEach((agent, i) => {
        const card = document.createElement('div');
        card.classList.add('ag-agent-card');
        card.style.borderColor = agentColors[i] || '#00E5FF';
        card.innerHTML = `
            <div class="ag-agent-name" style="color:${agentColors[i]}">${agent.agent_name}</div>
            <div class="ag-agent-duration">${agent.duration_ms}ms</div>
        `;
        card.title = agent.output_summary;
        timeline.appendChild(card);
    });
    msgDiv.appendChild(timeline);

    // ── Main Analysis Text ───────────────────────────────────
    if (final.display_text) {
        const textDiv = document.createElement('div');
        textDiv.classList.add('ag-main-text');
        textDiv.innerHTML = formatMessage(final.display_text);
        msgDiv.appendChild(textDiv);
    }

    // ── Scam Risk Badge ──────────────────────────────────────
    if (typeof final.scam_score === 'number') {
        const score = final.scam_score;
        const badge = document.createElement('div');
        badge.classList.add('scam-badge');
        if (score <= 30) {
            badge.classList.add('scam-safe');
            badge.innerHTML = `🛡️ Scam Risk: <strong>${score}%</strong> — Safe`;
        } else if (score <= 60) {
            badge.classList.add('scam-warning');
            badge.innerHTML = `⚠️ Scam Risk: <strong>${score}%</strong> — Suspicious`;
        } else {
            badge.classList.add('scam-danger');
            badge.innerHTML = `🚨 Scam Risk: <strong>${score}%</strong> — HIGH DANGER`;
        }
        msgDiv.appendChild(badge);
    }

    // ── Insight / Impact / Sectors Panel ────────────────────
    if (final.insight || final.impact || final.affected_sectors?.length) {
        const panel = document.createElement('div');
        panel.classList.add('insight-panel');
        if (final.insight) panel.innerHTML += `<div class="insight-row"><span class="insight-label">🔍 Insight</span><span class="insight-value">${final.insight}</span></div>`;
        if (final.impact)  panel.innerHTML += `<div class="insight-row"><span class="insight-label">💥 Impact</span><span class="insight-value">${final.impact}</span></div>`;
        if (final.affected_sectors?.length) panel.innerHTML += `<div class="insight-row"><span class="insight-label">📊 Sectors</span><span class="insight-value">${final.affected_sectors.join(', ')}</span></div>`;
        msgDiv.appendChild(panel);
    }

    // ── Action Chips ─────────────────────────────────────────
    if (final.actions?.length) {
        const actionCenter = document.createElement('div');
        actionCenter.classList.add('action-center');
        final.actions.slice(0, 4).forEach(action => {
            const chip = document.createElement('div');
            chip.classList.add('action-chip');
            chip.innerHTML = `<span>⚡</span> ${action.title}`;
            chip.title = `${action.rationale} | Outcome: ${action.expected_outcome}`;
            chip.onclick = () => {
                if (chip.classList.contains('success')) return;
                chip.classList.add('success');
                chip.innerHTML = `<span>✅</span> ${action.title}`;
                const log = document.createElement('div');
                log.classList.add('outcome-log');
                log.innerHTML = `<strong>${action.title}</strong><br>Expected: ${action.expected_outcome}<br>Priority: ${action.priority} · Timeframe: ${action.timeframe}`;
                chip.parentElement.parentElement.appendChild(log);
            };
            actionCenter.appendChild(chip);
        });
        msgDiv.appendChild(actionCenter);
    }

    // ── Execution Log ────────────────────────────────────────
    if (final.execution?.execution_log?.length) {
        const execDiv = document.createElement('div');
        execDiv.classList.add('ag-execution');
        const execHeader = document.createElement('div');
        execHeader.classList.add('ag-exec-header');
        execHeader.textContent = `⚡ ExecutionAgent — ${final.execution.execution_status || 'Simulated'}`;
        execDiv.appendChild(execHeader);
        final.execution.execution_log.forEach(step => {
            const s = document.createElement('div');
            s.classList.add('ag-exec-step');
            s.textContent = step;
            execDiv.appendChild(s);
        });
        // State change visualization
        if (final.execution.system_state_before && final.execution.system_state_after) {
            const stateDiv = document.createElement('div');
            stateDiv.classList.add('system-state');
            stateDiv.innerHTML = `
                <div class="state-box"><strong>Before</strong><span>${final.execution.system_state_before.status}</span></div>
                <div class="state-arrow">⬇️</div>
                <div class="state-box"><strong>After</strong><span>${final.execution.system_state_after.status}</span></div>
            `;
            execDiv.appendChild(stateDiv);
        }
        msgDiv.appendChild(execDiv);
    }

    // ── Listen Button ────────────────────────────────────────
    const listenBtn = document.createElement('button');
    listenBtn.innerHTML = '🔊 Suniye';
    listenBtn.classList.add('listen-btn');
    listenBtn.onclick = () => speakText(final.display_text || final.insight || '');
    msgDiv.appendChild(listenBtn);

    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    saveToLocal(final.display_text || final.insight, 'ai', false, data);

    // Update dashboard
    const scam = final.scam_score ?? 0;
    const riskElem = document.getElementById('stat-risk');
    riskElem.innerText = scam > 70 ? 'High' : scam > 30 ? 'Medium' : 'Low';
    riskElem.style.color = scam > 70 ? '#FF4D6D' : scam > 30 ? '#FFC107' : '#00d4aa';

    // Wire up Agent Trace panel to show pipeline details
    currentAgentTrace = {
        workplan: `[Google Antigravity] 5-Agent pipeline executed. Pipeline ID: ${data.pipeline_id}`,
        tasks: data.agents.map(a => `[${a.agent_name}] ${a.output_summary.substring(0, 120)} (${a.duration_ms}ms)`),
        reasoning: data.agents[1]?.output?.primary_insight || data.agents[1]?.output_summary || '',
        decision_flow: 'Input → IngestionAgent → InsightAgent → ImpactAnalystAgent → ActionRecommenderAgent → ExecutionAgent',
        action_execution: data.agents[4]?.output_summary || ''
    };
    toggleTraceBtn.classList.add('pulse');
}

micBtn.addEventListener('click', () => {
    if (!recognition) {
        alert("Voice not supported.");
        return;
    }
    micBtn.classList.add('recording');
    recognition.start();
});

uploadBtn.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        await sendMessage(null, event.target.result);
    };
    reader.readAsDataURL(file);
    imageInput.value = '';
});

sendBtn.addEventListener('click', () => { isVoiceMode = false; sendMessage(); });
clearBtn.addEventListener('click', clearChat);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { isVoiceMode = false; sendMessage(); } });

// =========================================================
// PIPELINE — Real 5-Agent Sequential Pipeline
// =========================================================
const AGENT_META = [
    { name: 'IngestionAgent',         desc: 'Extracting entities & signals',     icon: '📥' },
    { name: 'InsightAgent',           desc: 'Generating financial intelligence',  icon: '🧠' },
    { name: 'ImpactAnalystAgent',     desc: 'Assessing market consequences',      icon: '📊' },
    { name: 'ActionRecommenderAgent', desc: 'Formulating action strategy',        icon: '⚡' },
    { name: 'ExecutionAgent',         desc: 'Simulating action execution',        icon: '🚀' }
];

let pipelineKeyCounter = 0;

function createPipelineMessage() {
    const k = ++pipelineKeyCounter;
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', 'ai-message', 'pipeline-message');
    msgDiv.dataset.pk = k;

    msgDiv.innerHTML = `
        <div class="pipeline-header">
            <span class="ag-badge">⚡ Google Antigravity Pipeline</span>
            <span class="ag-meta pipeline-id-label">Initializing…</span>
        </div>
        <div class="pipeline-agents-list">
            ${AGENT_META.map((a, i) => `
                <div class="pipeline-agent-row waiting" data-pk="${k}" data-idx="${i}">
                    <div class="pa-icon">○</div>
                    <div class="pa-info">
                        <div class="pa-name">${a.icon} ${a.name}</div>
                        <div class="pa-desc">${a.desc}</div>
                    </div>
                    <div class="pa-timing">—</div>
                </div>`).join('')}
        </div>
        <div class="pipeline-results" style="display:none"></div>
        <div class="pipeline-footer" style="display:none">
            <button class="export-trace-btn">📥 Export Trace JSON</button>
            <span class="pipeline-total-time">—</span>
        </div>`;

    return { msgDiv, k };
}

function agentRow(msgDiv, idx)    { return msgDiv.querySelector(`.pipeline-agent-row[data-idx="${idx}"]`); }
function agentIcon(msgDiv, idx)   { return agentRow(msgDiv, idx)?.querySelector('.pa-icon'); }
function agentTiming(msgDiv, idx) { return agentRow(msgDiv, idx)?.querySelector('.pa-timing'); }

function handlePipelineEvent(event, msgDiv, traceStore) {
    const { type } = event;

    if (type === 'pipeline_start') {
        const label = msgDiv.querySelector('.pipeline-id-label');
        if (label) label.textContent = `ID: ${event.pipeline_id.substring(0, 8)}… | 5 Agents`;
        return;
    }

    if (type === 'agent_start') {
        const row  = agentRow(msgDiv, event.index);
        const icon = agentIcon(msgDiv, event.index);
        if (row)  row.className  = 'pipeline-agent-row running';
        if (icon) icon.innerHTML = '<span class="pa-spinner">⟳</span>';
    }

    if (type === 'agent_complete') {
        const row    = agentRow(msgDiv, event.index);
        const icon   = agentIcon(msgDiv, event.index);
        const timing = agentTiming(msgDiv, event.index);
        const ok     = event.trace?.status === 'completed';
        if (row)    row.className   = `pipeline-agent-row ${ok ? 'completed' : 'failed'}`;
        if (icon)   icon.textContent = ok ? '✓' : '✕';
        if (timing) timing.textContent = `${event.trace?.duration_ms ?? 0}ms`;
    }

    if (type === 'pipeline_complete') {
        traceStore.data = event;

        // Total time
        const totalEl = msgDiv.querySelector('.pipeline-total-time');
        if (totalEl) totalEl.textContent = `Total: ${event.total_duration_ms}ms`;

        // Results
        const resultsEl = msgDiv.querySelector('.pipeline-results');
        if (resultsEl) {
            resultsEl.style.display = 'flex';
            resultsEl.innerHTML = buildPipelineResultsHTML(event.results);
        }

        // Footer
        const footer = msgDiv.querySelector('.pipeline-footer');
        if (footer) {
            footer.style.display = 'flex';
            footer.querySelector('.export-trace-btn').addEventListener('click', () => {
                const blob = new Blob([JSON.stringify(event, null, 2)], { type: 'application/json' });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href = url; a.download = `pipeline-${event.pipeline_id.substring(0, 8)}.json`;
                a.click(); URL.revokeObjectURL(url);
            });
        }

        // Update dashboard risk
        const sevMap = { Critical: '#FF4D6D', High: '#FF4D6D', Medium: '#FFC107', Low: '#00d4aa' };
        const sev = event.results?.insight?.severity || 'Medium';
        const riskEl = document.getElementById('stat-risk');
        riskEl.innerText = sev; riskEl.style.color = sevMap[sev] || '#00E5FF';

        // Wire trace panel
        currentAgentTrace = {
            workplan: `[Antigravity Pipeline] ID: ${event.pipeline_id} | ${event.total_duration_ms}ms`,
            tasks: (event.agents || []).map(a => `[${a.agent_name}] ${a.status} — ${a.duration_ms}ms`),
            reasoning: event.results?.insight?.primary_insight || '',
            decision_flow: 'Input → IngestionAgent → InsightAgent → ImpactAnalystAgent → ActionRecommenderAgent → ExecutionAgent',
            action_execution: JSON.stringify(event.results?.execution?.execution_log || [])
        };
        toggleTraceBtn.classList.add('pulse');

        saveToLocal(event.results?.insight?.primary_insight || 'Pipeline complete', 'ai', false, event);
    }

    if (type === 'pipeline_error') {
        const footer = msgDiv.querySelector('.pipeline-footer');
        if (footer) {
            footer.style.display = 'flex';
            footer.innerHTML = `<span class="pipeline-error-msg">⚠️ Pipeline error: ${event.error}</span>`;
        }
        AGENT_META.forEach((_, i) => {
            const row  = agentRow(msgDiv, i);
            const icon = agentIcon(msgDiv, i);
            if (row && row.classList.contains('waiting')) {
                row.className = 'pipeline-agent-row failed';
                if (icon) icon.textContent = '—';
            }
        });
    }
}

function buildPipelineResultsHTML(r) {
    if (!r) return '';
    let html = '';
    const sevColor = { Critical: '#FF4D6D', High: '#FF4D6D', Medium: '#FFC107', Low: '#00d4aa' };
    const priColor = { Critical: '#FF4D6D', High: '#f59e0b', Medium: '#3b82f6' };

    // ── Insight card ─────────────────────────────────────────
    if (r.insight) {
        const sc = sevColor[r.insight.severity] || '#00E5FF';
        html += `<div class="pr-card">
            <div class="pr-card-title" style="color:${sc}">🧠 Intelligence Report</div>
            <div class="pr-insight-text">${r.insight.primary_insight || ''}</div>
            <div class="pr-tags">
                ${r.insight.severity     ? `<span class="pr-tag" style="border-color:${sc};color:${sc}">${r.insight.severity}</span>` : ''}
                ${r.insight.trend_direction ? `<span class="pr-tag">${r.insight.trend_direction}</span>` : ''}
                ${r.insight.confidence_score != null ? `<span class="pr-tag">Confidence: ${r.insight.confidence_score}%</span>` : ''}
            </div>
            ${r.insight.affected_parties?.length ? `<div class="pr-meta">Affected: ${r.insight.affected_parties.join(', ')}</div>` : ''}
        </div>`;
    }

    // ── Impact card ──────────────────────────────────────────
    if (r.impact) {
        const tc = r.impact.opportunity_or_threat === 'Opportunity' ? '#00d4aa' : r.impact.opportunity_or_threat === 'Mixed' ? '#FFC107' : '#FF4D6D';
        html += `<div class="pr-card">
            <div class="pr-card-title" style="color:#f59e0b">📊 Impact Analysis</div>
            <div class="pr-impact-grid">
                <div class="pr-impact-item"><div class="pr-impact-label">Immediate (24-48h)</div><div class="pr-impact-val">${r.impact.immediate_impact || '—'}</div></div>
                <div class="pr-impact-item"><div class="pr-impact-label">Medium Term (1-4 wks)</div><div class="pr-impact-val">${r.impact.medium_term_impact || '—'}</div></div>
            </div>
            <div class="pr-tags">
                ${r.impact.opportunity_or_threat ? `<span class="pr-tag" style="border-color:${tc};color:${tc}">${r.impact.opportunity_or_threat}</span>` : ''}
                ${r.impact.pkr_impact ? `<span class="pr-tag">PKR: ${r.impact.pkr_impact}</span>` : ''}
                ${r.impact.psx_impact ? `<span class="pr-tag">PSX: ${r.impact.psx_impact}</span>` : ''}
            </div>
            ${r.impact.affected_sectors?.length ? `<div class="pr-meta">Sectors: ${r.impact.affected_sectors.join(' · ')}</div>` : ''}
        </div>`;
    }

    // ── Actions card ─────────────────────────────────────────
    if (r.actions?.actions?.length) {
        html += `<div class="pr-card">
            <div class="pr-card-title" style="color:#a78bfa">⚡ Action Plan (3 Steps)</div>
            <div class="pr-actions-list">
                ${r.actions.actions.map((a, i) => `
                    <div class="pr-action-item">
                        <div class="pr-action-hdr">
                            <span class="pr-action-num">${i + 1}</span>
                            <span class="pr-action-title">${a.title}</span>
                            <span class="pr-tag" style="border-color:${priColor[a.priority]||'#6b7280'};color:${priColor[a.priority]||'#6b7280'}">${a.timeframe}</span>
                        </div>
                        <div class="pr-action-rationale">${a.rationale}</div>
                        <div class="pr-action-outcome">→ ${a.expected_outcome}</div>
                    </div>`).join('')}
            </div>
        </div>`;
    }

    // ── Execution card ───────────────────────────────────────
    if (r.execution) {
        const ex = r.execution;
        html += `<div class="pr-card">
            <div class="pr-card-title" style="color:#00d4aa">🚀 Execution Report</div>
            ${ex.execution_log?.length ? `<div class="pr-exec-log">${ex.execution_log.map(s =>
                `<div class="pr-exec-step"><span class="pr-exec-check">✓</span> ${s.step || s} ${s.status ? `<span class="pr-exec-status">[${s.status}]</span>` : ''}</div>`
            ).join('')}</div>` : ''}
            ${ex.system_state_before && ex.system_state_after ? `
                <div class="pr-state-row">
                    <div class="pr-state-box">
                        <div class="pr-state-lbl">Before</div>
                        <div class="pr-state-risk-num" style="color:#FF4D6D">${ex.system_state_before.portfolio_risk_score}</div>
                        <div class="pr-state-status-txt">${ex.system_state_before.alert_status || ''}</div>
                    </div>
                    <div class="pr-state-arr">→</div>
                    <div class="pr-state-box">
                        <div class="pr-state-lbl">After</div>
                        <div class="pr-state-risk-num" style="color:#00d4aa">${ex.system_state_after.portfolio_risk_score}</div>
                        <div class="pr-state-status-txt">${ex.system_state_after.alert_status || ''}</div>
                    </div>
                </div>` : ''}
            ${ex.email_draft ? `
                <div class="pr-email">
                    <div class="pr-email-header">📧 Stakeholder Email Draft</div>
                    <div class="pr-email-to">To: ${ex.email_draft.to || ''}</div>
                    <div class="pr-email-subj">Subject: ${ex.email_draft.subject || ''}</div>
                    <div class="pr-email-body">${(ex.email_draft.body || '').substring(0, 400)}${(ex.email_draft.body || '').length > 400 ? '…' : ''}</div>
                </div>` : ''}
        </div>`;
    }

    return html;
}

async function runPipeline(message, imageData) {
    const { msgDiv, k } = createPipelineMessage();
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    const traceStore = { data: null };

    try {
        const response = await fetch('/api/pipeline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message || 'Analyze this.', image: imageData })
        });

        if (!response.ok) {
            const e = await response.json().catch(() => ({}));
            throw new Error(e.error || `HTTP ${response.status}`);
        }

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const event = JSON.parse(line.slice(6));
                    handlePipelineEvent(event, msgDiv, traceStore);
                    chatWindow.scrollTop = chatWindow.scrollHeight;
                } catch { /* skip malformed */ }
            }
        }
    } catch (err) {
        handlePipelineEvent({ type: 'pipeline_error', error: err.message, agents: [] }, msgDiv, traceStore);
    }
}

// =========================================================
// TAB NAVIGATION
// =========================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${target}`).classList.add('active');
    });
});

// =========================================================
// SHARED HELPER: call /chat with a prompt, return parsed data
// =========================================================
async function callAI(prompt) {
    const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

function setLoading(btnId, loadingText, originalText, loading) {
    const btn = document.getElementById(btnId);
    btn.textContent = loading ? loadingText : originalText;
    btn.disabled = loading;
}

// =========================================================
// TAB 2: SCAM SHIELD
// =========================================================
document.getElementById('scam-analyze-btn').addEventListener('click', analyzeScam);

async function analyzeScam() {
    const text = document.getElementById('scam-input').value.trim();
    if (!text) { alert('Please paste a message or offer to analyze.'); return; }

    setLoading('scam-analyze-btn', '⏳ Analyzing...', '🔍 Analyze for Scams', true);
    document.getElementById('scam-results').style.display = 'none';
    document.getElementById('scam-warning-banner').style.display = 'none';

    const prompt = `You are Pakistan's top financial fraud detection expert. Analyze this content for scam patterns:

"${text}"

Check specifically for these Pakistan-specific scam types:
- Fake prize / lucky draw scams (lottery, prize money)
- Ponzi / MLM schemes (Aitkaf, fake crypto, dubious investment)
- Advance fee fraud (processing fees, membership fees, activation charges)
- Fake government schemes (fake BISP, FBR tax refund, Ehsaas fraud)
- WhatsApp / phone impersonation fraud
- Fake job offers requiring upfront payment

Respond in our standard JSON format:
- display_text: 6-8 Hinglish bullet points — state if it IS or IS NOT a scam, name specific red flags found, explain the scam type if detected, and tell exactly what the user should do
- scam_score: 0-100 (0 = definitely safe, 100 = confirmed scam)
- insight: name of the scam type detected (or "No scam detected")
- impact: estimated financial risk in PKR or "None"
- recommended_actions: 3 concrete steps the user should take (block, report, verify, etc.)`;

    try {
        const data = await callAI(prompt);
        renderScamResults(data);
    } catch (e) {
        alert('Analysis failed. Check your connection and try again.');
    } finally {
        setLoading('scam-analyze-btn', '', '🔍 Analyze for Scams', false);
    }
}

function renderScamResults(data) {
    const score = typeof data.scam_score === 'number' ? data.scam_score : 0;

    // Warning banner
    const banner = document.getElementById('scam-warning-banner');
    if (score > 60) {
        banner.style.display = 'flex';
        banner.textContent = `🚨 HIGH SCAM RISK: ${score}/100 — DO NOT PROCEED`;
    } else {
        banner.style.display = 'none';
    }

    // Score circle
    const circle = document.getElementById('scam-score-circle');
    document.getElementById('scam-score-num').textContent = score;
    circle.className = 'score-circle ' + (score > 60 ? 'score-danger' : score > 30 ? 'score-warning' : 'score-safe');
    document.getElementById('scam-score-label').textContent = score > 60 ? 'HIGH RISK' : score > 30 ? 'SUSPICIOUS' : 'APPEARS SAFE';
    document.getElementById('scam-insight-label').textContent = data.insight || '';

    // Analysis text
    document.getElementById('scam-analysis').innerHTML = formatMessage(data.display_text || '');

    // Action list
    const actionsDiv = document.getElementById('scam-actions');
    if (data.recommended_actions?.length) {
        actionsDiv.style.display = 'block';
        actionsDiv.innerHTML = '<strong>📋 What To Do:</strong><ul>' +
            data.recommended_actions.map(a => `<li>${a.label || a.title || a}</li>`).join('') + '</ul>';
    }

    document.getElementById('scam-results').style.display = 'block';
    document.getElementById('scam-results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =========================================================
// TAB 3: BUDGET DOCTOR
// =========================================================
document.getElementById('budget-doctor-btn').addEventListener('click', analyzeBudget);

async function analyzeBudget() {
    const income     = parseFloat(document.getElementById('bd-income').value)    || 0;
    const rent       = parseFloat(document.getElementById('bd-rent').value)      || 0;
    const food       = parseFloat(document.getElementById('bd-food').value)      || 0;
    const transport  = parseFloat(document.getElementById('bd-transport').value) || 0;
    const utilities  = parseFloat(document.getElementById('bd-utilities').value) || 0;
    const other      = parseFloat(document.getElementById('bd-other').value)     || 0;

    if (!income) { alert('Please enter your monthly income.'); return; }

    const totalExp = rent + food + transport + utilities + other;
    const savings  = income - totalExp;
    const nums     = { income, rent, food, transport, utilities, other, savings };

    setLoading('budget-doctor-btn', '⏳ Diagnosing...', '💊 Diagnose My Budget', true);
    document.getElementById('budget-doctor-results').style.display = 'none';

    const pct = v => income > 0 ? (v / income * 100).toFixed(1) : 0;

    const prompt = `You are a certified Pakistani financial advisor. Diagnose this monthly household budget:

Monthly Income  : PKR ${income.toLocaleString()}
Rent / Housing  : PKR ${rent.toLocaleString()} (${pct(rent)}% of income)
Food & Groceries: PKR ${food.toLocaleString()} (${pct(food)}% of income)
Transport       : PKR ${transport.toLocaleString()} (${pct(transport)}% of income)
Utilities       : PKR ${utilities.toLocaleString()} (${pct(utilities)}% of income)
Other Expenses  : PKR ${other.toLocaleString()} (${pct(other)}% of income)
Total Expenses  : PKR ${totalExp.toLocaleString()}
Monthly Savings : PKR ${savings.toLocaleString()} (${pct(savings)}% savings rate)

Pakistan healthy benchmarks: Rent ≤30%, Food ≤20%, Transport ≤10%, Utilities ≤8%, Savings ≥20%.
Pakistan inflation 2026: ~25%. Emergency fund target: 3-6 months of expenses = PKR ${(totalExp * 3).toLocaleString()} to ${(totalExp * 6).toLocaleString()}.

Respond in our standard JSON format:
- display_text: 6-8 Hinglish bullet points — (1) overall health score statement, (2-4) which categories are over/under budget with specific percentages, (5-7) exactly 3 saving tips specific to Pakistan economy in 2026, (8) emergency fund status and how many months to save it at current rate
- scam_score: use this field for the Financial Health Score 0-100 (higher = healthier finances)
- insight: one-line financial diagnosis (e.g. "Over-spending on rent, under-saving")
- impact: the single biggest financial risk this person faces`;

    try {
        const data = await callAI(prompt);
        renderBudgetResults(data, nums);
    } catch (e) {
        alert('Analysis failed. Check your connection and try again.');
    } finally {
        setLoading('budget-doctor-btn', '', '💊 Diagnose My Budget', false);
    }
}

function drawBudgetChart(nums) {
    const { income, rent, food, transport, utilities, other, savings } = nums;
    const chart = document.getElementById('bd-chart');
    chart.innerHTML = '';

    const cats = [
        { label: 'Rent / Housing',   value: rent,       color: '#f43f5e' },
        { label: 'Food & Groceries', value: food,       color: '#f59e0b' },
        { label: 'Transport',        value: transport,  color: '#3b82f6' },
        { label: 'Utilities',        value: utilities,  color: '#8b5cf6' },
        { label: 'Other',            value: other,      color: '#6b7280' },
        { label: 'Savings',          value: Math.max(savings, 0), color: '#00d4aa' }
    ];

    cats.forEach(cat => {
        if (cat.value <= 0) return;
        const pct = income > 0 ? Math.min((cat.value / income) * 100, 100).toFixed(1) : 0;
        const row = document.createElement('div');
        row.classList.add('bd-bar-row');
        row.innerHTML = `
            <div class="bd-bar-label">${cat.label}</div>
            <div class="bd-bar-track">
                <div class="bd-bar-fill" style="width:${pct}%;background:${cat.color}"></div>
            </div>
            <div class="bd-bar-value">PKR ${cat.value.toLocaleString()} <span class="bd-pct">${pct}%</span></div>
        `;
        chart.appendChild(row);
    });
}

function renderBudgetResults(data, nums) {
    const health = typeof data.scam_score === 'number' ? data.scam_score : 50;

    // Score circle
    const circle = document.getElementById('health-score-circle');
    document.getElementById('health-score-num').textContent = health;
    circle.className = 'score-circle ' + (health >= 70 ? 'score-safe' : health >= 40 ? 'score-warning' : 'score-danger');
    document.getElementById('health-score-label').textContent = health >= 70 ? 'Financially Healthy' : health >= 40 ? 'Needs Attention' : 'Critical';
    document.getElementById('health-insight-label').textContent = data.insight || '';

    // Bar chart
    drawBudgetChart(nums);

    // AI analysis
    document.getElementById('bd-analysis').innerHTML = formatMessage(data.display_text || '');

    const results = document.getElementById('budget-doctor-results');
    results.style.display = 'block';
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =========================================================
// TAB 4: REPORT SUMMARIZER
// =========================================================
document.getElementById('report-summarize-btn').addEventListener('click', summarizeReport);

async function summarizeReport() {
    const text = document.getElementById('report-input').value.trim();
    if (!text)         { alert('Please paste a document to summarize.'); return; }
    if (text.length < 100) { alert('Document is too short. Please paste a full report or article.'); return; }

    setLoading('report-summarize-btn', '⏳ Summarizing...', '⚡ Summarize in 10 Seconds', true);
    document.getElementById('report-results').style.display = 'none';

    const prompt = `You are an executive assistant for a busy Pakistani CEO. Summarize this document concisely and professionally:

---
${text.substring(0, 8000)}
---

Respond in our standard JSON format:
- display_text: EXACTLY 5 bullet points using • symbol. Each point is one complete, crisp English sentence covering the 5 most important takeaways. Make each point standalone and actionable.
- insight: Extract the 3-5 most important numbers/metrics/figures from the document. Format: "Key Figures: [figure 1], [figure 2], [figure 3]"
- impact: The single biggest RISK mentioned or implied in this document. One sharp sentence.
- recommended_actions: Exactly 2 actions:
    1. id: "opportunity", label: "Opportunity: [the biggest opportunity from this document in one line]"
    2. id: "action", label: "Action Required: [the most urgent thing to do based on this document]"
- scam_score: 0 (not applicable here, set to 0)`;

    try {
        const data = await callAI(prompt);
        renderReportResults(data);
    } catch (e) {
        alert('Summarization failed. Check your connection and try again.');
    } finally {
        setLoading('report-summarize-btn', '', '⚡ Summarize in 10 Seconds', false);
    }
}

function renderReportResults(data) {
    // 5-bullet summary
    const summaryDiv = document.getElementById('report-summary');
    summaryDiv.innerHTML = '<div class="report-section-title">📋 Executive Summary</div>' +
        '<div class="report-bullets">' + formatMessage(data.display_text || '') + '</div>';

    // Key figures + risk + opportunity
    const metaDiv = document.getElementById('report-meta');
    let html = '';

    if (data.insight) {
        html += `<div class="report-stat-card numbers-card">
            <span class="report-stat-icon">🔢</span>
            <div><div class="report-stat-title">Key Figures</div><div class="report-stat-body">${data.insight}</div></div>
        </div>`;
    }
    if (data.impact) {
        html += `<div class="report-stat-card risk-card">
            <span class="report-stat-icon">⚠️</span>
            <div><div class="report-stat-title">Main Risk</div><div class="report-stat-body">${data.impact}</div></div>
        </div>`;
    }
    if (data.recommended_actions?.length >= 1) {
        html += `<div class="report-stat-card opp-card">
            <span class="report-stat-icon">🚀</span>
            <div><div class="report-stat-title">Main Opportunity</div><div class="report-stat-body">${(data.recommended_actions[0].label || '').replace('Opportunity: ', '')}</div></div>
        </div>`;
    }
    if (data.recommended_actions?.length >= 2) {
        html += `<div class="report-stat-card action-card">
            <span class="report-stat-icon">✅</span>
            <div><div class="report-stat-title">Action Required</div><div class="report-stat-body">${(data.recommended_actions[1].label || '').replace('Action Required: ', '')}</div></div>
        </div>`;
    }
    metaDiv.innerHTML = html;

    const results = document.getElementById('report-results');
    results.style.display = 'block';
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
