# Autonomous Supply Chain Guardian Agent (#AISeekho2026)

This project is a high-impact Agentic AI System built for the **#AISeekho 2026 Google Antigravity Hackathon**. It transforms unstructured content into actionable supply chain outcomes using autonomous reasoning.

## 🏛 System Architecture Overview
The system follows a three-tier agentic architecture:
1.  **Ingestion Tier:** Ingests 5+ sources (PDF, Web, CSV, JSON, Live Feeds) into a unified context window.
2.  **Reasoning Tier (Orchestrated via Google Antigravity):** A multi-agent reasoning pipeline (Coordinator & Analyst) identifies contradictions, performs temporal analysis, and conducts implication mapping.
3.  **Execution Tier:** Evaluates and simulates 3-5 step interconnected action chains against Budget, Time, and API constraints.

## 🚀 How Google Antigravity is Used
Google Antigravity serves as the **Core Development Platform** for:
-   **Orchestration:** Managing the flow from data ingestion to final action simulation.
-   **Reasoning & Planning:** Driving the "Thinking" process and formulating multi-step workplans.
-   **Tool Integration:** Orchestrating mock API calls and system state updates.
-   **Execution Handling:** Managing the lifecycle of action chains and outcome visualization.

## 🛠 Tools & APIs Used
-   **Core Engine:** Google Antigravity
-   **LLM Model:** Google Gemini-1.5-Flash
-   **Backend:** Node.js / Express
-   **Frontend:** PWA (HTML5, CSS3, Vanilla JS)
-   **Deployment:** Vercel

## ⚖️ Assumptions & Limitations
-   **Assumptions:** All data sources in the `/data` folder represent current operational snapshots.
-   **Limitations:** Real-world API integrations are simulated using deterministic mock responses. The system requires a valid Gemini API key for reasoning.

## ✅ Compliance with Challenge 1
-   **Content Understanding:** Processes multi-format unstructured input.
-   **Insight Extraction:** Identifies non-trivial patterns and resolves contradictions.
-   **Impact Analysis:** Connects insights to real-world consequences (revenue, risk).
-   **Action Simulation:** Executes multi-step chains (Inventory -> CRM -> Logs).
-   **Outcome Visualization:** Shows Before/After states and comprehensive agent traces.
-   **Evidence of Autonomy:** Features an autonomous self-correction loop for data anomalies.

---
*Developed for the Google Antigravity Hackathon 2026.*
