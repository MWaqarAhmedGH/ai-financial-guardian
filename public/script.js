document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const logDiv = document.getElementById('logs');
    logDiv.innerHTML = "<h3>Autonomous Orchestration in Progress...</h3>";
    
    const response = await fetch('/analyze');
    const result = await response.json();
    
    if (result.status === 'analyzed') {
        const { analysis } = result;
        
        // Multi-Agent Trace Visualization (PDF Page 4 requirement)
        document.getElementById('insight').innerHTML = `
            <div class="trace-container">
                <h3>Agentic Reasoning Pipeline:</h3>
                <div class="log-box coordinator">
                    <p><strong>Coordinator Workplan:</strong> ${analysis.coordinator_workplan}</p>
                </div>
                <div class="log-box analyst">
                    <p><strong>Analyst Reasoning:</strong> ${analysis.analyst_reasoning}</p>
                    <p><strong>Implication:</strong> ${analysis.implication_analysis}</p>
                </div>
                <div class="state-box">
                    <p><strong>Tasks:</strong> ${analysis.tasks_plan.join(' → ')}</p>
                    <p><strong>State Change:</strong> ${analysis.before_state} ➔ ${analysis.after_state}</p>
                </div>
            </div>
        `;

        const actionsDiv = document.getElementById('actions');
        actionsDiv.innerHTML = "<h3>Recommended Actions:</h3>";
        analysis.recommended_actions.forEach(act => {
            const btn = document.createElement('button');
            btn.innerText = `${act.action} (Cost: $${act.cost})`;
            btn.onclick = () => executeAction(act.id, analysis.after_state);
            actionsDiv.appendChild(btn);
        });
    }
});

async function executeAction(id, afterState) {
    const res = await fetch('/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: id, constraints: { budget: 500, api_limit: 15 } })
    });
    const result = await res.json();
    
    const actionsDiv = document.getElementById('actions');
    if (result.status === 'error') {
        actionsDiv.innerHTML += `<div class="error-box" style="color:red; border:1px solid red; padding:10px;"><h3>Action Rejected:</h3><p>${result.message}</p></div>`;
    } else {
        const visual = result.actionSimulation.visual_output;
        actionsDiv.innerHTML += `
            <div class="result-box" style="background:#e1f5fe; border:1px solid #01579b; padding:15px; margin-top:10px;">
                <h3>Simulation Outcome:</h3>
                <p><strong>Status:</strong> ${result.actionSimulation.outcome}</p>
                <div class="visual-assets">
                    <p><strong>📱 SMS Drafted:</strong> <em>"${visual.sms_draft}"</em></p>
                    <div style="background:white; padding:10px; border:1px dashed #ccc;">
                        <p><strong>📧 Email Body:</strong></p>
                        <p>${visual.email_body}</p>
                    </div>
                    <p><strong>⚙️ System Change:</strong> ${visual.system_change}</p>
                </div>
            </div>
        `;
    }
}