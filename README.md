# Autonomous Content-to-Action Agent (#AISeekho2026)

This project is an entry for the **#AISeekho 2026 Google Antigravity Hackathon**. Our agentic system ingests multi-source financial and operational data, analyzes it for contradictions, and executes simulated multi-step action chains.

## Key Features
- **Intelligent Ingestion:** Processes 5 distinct data sources (JSON reports, news, inventory CSVs, forecast tables, and mock live feeds).
- **Dynamic Reasoning Engine:** Uses Gemini LLM to process data streams, detect contradictions, and generate reasoning traces.
- **Robustness & Recovery:** Handles partial failures and missing data with automated recovery plans.
- **Action Chain Simulation:** Executes interconnected 3-5 step action chains (e.g., Inventory Update -> Stakeholder Notification -> Compliance Logging) based on constraint evaluation.
- **Mobile-Ready (PWA):** Built as a Progressive Web App, installable on mobile devices.
- **Traceable Logging:** Implements detailed agent traces (Workplan, Tasks, Decision Flow) as required for transparency.

## Tech Stack
- **Orchestration:** Google Antigravity
- **Backend:** Node.js (Express)
- **Frontend:** PWA (HTML/CSS/JS)

## How to Run
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Set your environment variables (Gemini API keys).
4. Start the server: `node server.js` (for local dev).

## Compliance with Challenge 1
- **Antigravity Usage:** Core orchestrator for all agent decisions.
- **Agentic Workflow:** Proven by multi-step reasoning traces.
- **Visualization:** Real-time feedback for Before/After system states.
- **Robustness:** Built-in error handling and recovery for data streams.
