document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const logDiv = document.getElementById('logs');
    logDiv.innerHTML = "<h3>Agent Processing (Trace)...</h3>";
    
    const response = await fetch('/analyze');
    const result = await response.json();
    
    if (result.status === 'analyzed') {
        const { analysis } = result;
        
        // Visualize the compliant trace with Implication & Self-Correction
        document.getElementById('insight').innerHTML = `
            <h3>Agent Trace (Autonomous Evidence):</h3>
            <div class="log-box">
                <p><strong>Workplan:</strong> ${analysis.workplan}</p>
                <p><strong>Tasks:</strong> ${analysis.tasks_plan.join(', ')}</p>
                <p><strong>Self-Correction Trace:</strong> ${analysis.self_correction_trace}</p>
                <p><strong>Reasoning:</strong> ${analysis.reasoning}</p>
                <p><strong>Implication:</strong> ${analysis.implication_analysis}</p>
                <p><strong>Decision Flow:</strong> ${analysis.decision_flow}</p>
            </div>
            <div class="state-box">
                <p><strong>Before Action State:</strong> ${analysis.before_state}</p>
                <p><strong>Expected After State:</strong> ${analysis.after_state}</p>
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
        body: JSON.stringify({ actionId: id, constraints: { budget: 500 } })
    });
    const result = await res.json();
    
    const actionsDiv = document.getElementById('actions');
    if (result.status === 'error') {
        actionsDiv.innerHTML += `<div class="error-box"><h3>Action Rejected:</h3><p>${result.message}</p></div>`;
    } else {
        actionsDiv.innerHTML += `
            <div class="result-box">
                <h3>Result:</h3>
                <p><strong>Status:</strong> ${result.actionSimulation.outcome}</p>
                <p><strong>Final System State:</strong> ${afterState}</p>
            </div>
        `;
    }
}