document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const logDiv = document.getElementById('logs');
    logDiv.innerHTML = "<h3>Agent Processing (Trace)...</h3>";
    
    const response = await fetch('/analyze');
    const result = await response.json();
    
    if (result.status === 'analyzed') {
        // Before state visualization
        document.getElementById('insight').innerHTML = `
            <h3>Analysis Trace:</h3>
            <p><strong>Insight:</strong> ${result.analysis.insight}</p>
            <p><strong>Contradictions:</strong> ${result.analysis.contradictions}</p>
        `;
        
        // Log categorization per PDF requirement
        const traces = result.analysis.agent_trace;
        logDiv.innerHTML += `
            <div class="log-box">
                <p><strong>Workplan:</strong> Ingest & Analyze 5 Sources</p>
                <p><strong>Reasoning:</strong> ${traces[2]}</p>
                <p><strong>Decision Flow:</strong> ${traces[4]}</p>
            </div>
        `;
        
        // Actions
        const actionsDiv = document.getElementById('actions');
        actionsDiv.innerHTML = "<h3>Recommended Actions:</h3>";
        result.analysis.recommended_actions.forEach(act => {
            const btn = document.createElement('button');
            btn.innerText = act.action;
            btn.onclick = () => executeAction(act.id);
            actionsDiv.appendChild(btn);
        });
    }
});

async function executeAction(id) {
    const res = await fetch('/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: id, constraints: { budget: 500 } })
    });
    const result = await res.json();
    
    // Visualize Before/After Result
    const actionsDiv = document.getElementById('actions');
    actionsDiv.innerHTML += `
        <div class="result-box">
            <h3>Result:</h3>
            <p><strong>Status:</strong> ${result.actionSimulation.outcome}</p>
            <p><strong>System Change:</strong> State updated successfully.</p>
        </div>
    `;
}