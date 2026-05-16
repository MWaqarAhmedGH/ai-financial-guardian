# Project Master Intelligence: Autonomous Content-to-Action Agent (#AISeekho2026)

## 🎯 Project Overview
An autonomous, action-oriented intelligence agent powered by **Google Antigravity**. It meets **Challenge 1** requirements by ingesting multi-source data, identifying contradictions, and executing simulated 3-step action chains with full traceability.

## 🔗 Deployment & Links
- **Vercel URL:** https://ai-financial-guardian-two.vercel.app/
- **Github Repo:** https://github.com/MWaqarAhmedGH/ai-financial-guardian.git

## 🛠 Project Structure & Logic
- **`server.js`**: Core Orchestrator. Manages ingestion of `inventory.csv` & `news.json` and runs the Antigravity Reasoning Loop.
- **`/public`**: Dashboard UI. Features the **Action Center**, **Before/After Visualization**, and **Antigravity Trace Overlay**.
- **`/data`**: Mock data sources for multi-source reasoning.

---

## ⚡ ALL-IN-ONE DEMO PROMPT MASTER LIST

### Category 1: Supply Chain & Business (Challenge 1 Showcase)
- **Prompt:** "Analyze current stock levels for Lahore and cross-reference with market news."
- **Logic:** PMI reads `inventory.csv` (finds SKU-101 Critical) and `news.json` (finds Electronics Demand Spike) -> Identifies "Supply-Demand Gap" -> **Action:** Restock Chain simulation.

### Category 2: Financial Security (Safety First)
- **Prompt:** "Mujhe WhatsApp par message aya hai ke meri 25,000 ki lottery lagi hai."
- **Logic:** PMI detects BISP/Lottery scam pattern -> **Scam Risk: 98%** -> **Action:** FIA Complaint Draft & Bank Protection simulation.

### Category 3: System Guardrails
- **Prompt:** "Execute a shipment with a $5 budget."
- **Expected Response:** "Action Rejected. Violates logistical budget constraints."

---

## 🏗 KEY FEATURES (JUDGES SCORECARD)
1. **Evidence of Autonomy:** The agent decomposes high-level requests into a Workplan and Tasks autonomously.
2. **Traceable Decisions:** The UI exposes the Antigravity thinking process (Reasoning, Decision Flow).
3. **Interconnected Actions:** Simulated actions have real-world implications and status updates.
4. **Before/After Visualization:** Clear demonstration of system state change after simulation.

---

## 📜 AUDIT LOG (FINAL HACKATHON ENHANCEMENTS)
- **Feature (Final):** Integrated Multi-Source Ingestion (CSV/JSON) for Business Intelligence.
- **Feature (Final):** Restructured Agent Trace to match Antigravity Deliverables (Workplan/Tasks).
- **Feature (Final):** Added "Before vs After" System State Visualization in Chat UI.
- **Polish (Final):** Aligned all documentation with Challenge 1 Evaluation Criteria.