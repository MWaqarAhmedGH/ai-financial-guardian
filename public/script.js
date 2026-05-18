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
            // ── Google Antigravity (Vertex AI) 5-Agent Pipeline ──
            const response = await fetch('/api/antigravity-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message || 'Analyze this content.', image: imageData }),
            });
            const data = await response.json();
            chatWindow.removeChild(loadingDiv);

            if (data.final_output) {
                renderAntigravityResponse(data);
            } else if (data.error) {
                appendMessage(`⚡ Antigravity Error: ${data.error}`, 'ai');
                if (data.fallback_available) {
                    appendMessage('ℹ️ Tip: Configure GOOGLE_CLOUD_PROJECT in .env and run gcloud auth application-default login to enable Antigravity mode.', 'ai');
                }
            }
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
