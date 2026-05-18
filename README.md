# AI Financial Guardian
### #AISeekho2026 — Google Antigravity Hackathon | Challenge 1

Pakistan's autonomous financial intelligence system — multi-source data ingestion, 5-agent reasoning pipeline, real-time scam detection, and simulated action execution.

**Live Demo:** https://ai-financial-guardian-two.vercel.app/
**GitHub:** https://github.com/MWaqarAhmedGH/ai-financial-guardian

---

## What It Does

A user pastes a financial situation — a suspicious WhatsApp message, a market report, a business inventory question — and the system autonomously:

1. **Ingests** it alongside 5 real data sources (CSV, JSON feeds, reports)
2. **Reasons** across all sources to find insights and contradictions
3. **Assesses** real-world impact for Pakistani users and businesses
4. **Recommends** prioritized actions with rationale
5. **Executes** a simulation — showing before/after system state, email drafts, and execution logs

All 5 steps are handled by separate AI agents in a sequential pipeline, with full traceability.

---

## Challenge 1 Requirements — Coverage

| Requirement | Weight | Implementation |
|---|---|---|
| Google Antigravity Integration | 25% | Vertex AI `gemini-flash-lite-latest` — 5-agent orchestration pipeline via SSE streaming |
| Agentic Reasoning | 20% | Sequential agents: Ingest → Insight → Impact → Action → Execute |
| Content Ingestion (≥5 sources) | 20% | `inventory.csv`, `news.json`, `feed.json`, `report.json`, `table.json` |
| Action Simulation | 15% | Before/After state, email draft, execution log with timestamps |
| Traceability / Logging | 10% | Full agent trace JSON — workplan, reasoning, decision flow, timings |
| UI / Visualization | 10% | Real-time pipeline dashboard with progress tracker and structured result cards |

---

## 5-Agent Pipeline

```
User Input
    │
    ▼
┌─────────────────┐
│  IngestionAgent  │  Extracts entities, signals, amounts, urgency
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  InsightAgent    │  Cross-references sources, detects contradictions, scam probability
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│  ImpactAnalystAgent   │  Assesses consequences for Pakistan (24h, 1-4 weeks, sectors)
└────────┬─────────────┘
         │
         ▼
┌────────────────────────────┐
│  ActionRecommenderAgent     │  3-5 prioritized actions with rationale and timeframes
└────────┬───────────────────┘
         │
         ▼
┌──────────────────┐
│  ExecutionAgent   │  Simulates execution — state change, email draft, audit log
└──────────────────┘
```

---

## Project Structure

```
ai-financial-guardian/
│
├── server.js              # Express server + 5-agent pipeline + API routes
├── .env                   # API keys (not committed)
├── package.json
│
├── data/                  # Multi-source data (Challenge 1 ingestion)
│   ├── inventory.csv      # Pakistani business inventory (SKU levels, locations)
│   ├── news.json          # Market news feed
│   ├── feed.json          # Live signals feed
│   ├── report.json        # Financial report data
│   └── table.json         # Forecast/trends table
│
└── public/                # Frontend SPA
    ├── index.html         # Dashboard — 4 tabs, pipeline view, result cards
    ├── style.css          # Pure White Minimal design (Apple/Figma aesthetic)
    ├── script.js          # SSE pipeline runner, tab logic, result rendering
    ├── sw.js              # Service Worker (PWA, cache-first)
    └── manifest.json      # PWA manifest (installable on mobile)
```

---

## 4 Tools / Tabs

| Tab | Function |
|---|---|
| **Guardian** | Main 5-agent pipeline — paste any financial situation |
| **Scam Shield** | Dedicated scam detection — checks against Pakistani scam patterns |
| **Budget Doctor** | 50/30/20 budget analyzer with AI tip in Hinglish |
| **Report Summarizer** | Paste a financial report — get key numbers, risks, opportunities |

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Serve dashboard |
| `/chat` | POST | Standard Gemini chat (Guardian standard mode) |
| `/api/pipeline` | POST + SSE | 5-agent Antigravity pipeline (streaming) |
| `/api/antigravity-status` | GET | Check Vertex AI config status |
| `/api-status` | GET | Health check |

---

## Tech Stack

- **AI:** Google Gemini via `@google/generative-ai` + Vertex AI (`@google-cloud/vertexai`)
- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JS (no framework — zero build step)
- **Streaming:** Server-Sent Events (SSE) over `fetch` + `ReadableStream`
- **PWA:** Service Worker with cache-first strategy
- **Speech:** Web Speech API — Urdu voice input (`ur-PK`) + TTS

---

## Local Setup

```bash
# 1. Clone
git clone https://github.com/MWaqarAhmedGH/ai-financial-guardian.git
cd ai-financial-guardian

# 2. Install dependencies
npm install

# 3. Create .env file
GEMINI_API_KEY_1=your_key_here
# Optional: add GEMINI_API_KEY_2, GEMINI_API_KEY_3 for key rotation
# Optional: for Google Antigravity (Vertex AI)
# GOOGLE_CLOUD_PROJECT=your_gcp_project_id
# GOOGLE_CLOUD_LOCATION=us-central1

# 4. Run
node server.js

# Open http://localhost:3000
```

---

## Demo Prompts

**Scam Detection**
```
Mujhe WhatsApp par message aya hai: "Congratulations! Aapki 50,000 ki lottery lagi hai.
Prize claim karne ke liye abhi 2,000 ka processing fee bhejein."
```

**Business Intelligence (uses inventory + news data)**
```
Analyze current stock levels for Lahore and cross-reference with latest market news.
```

**Market Analysis**
```
Pakistan mein dollar rate barh raha hai aur import costs increase ho rahe hain.
Hamara retail business Karachi mein hai — kya karna chahiye?
```

**Report Analysis**
```
Q3 mein hamari net profit 12% giri, operating costs 18% badhe.
Current cash runway 4 months hai. Kya strategy honi chahiye?
```

---

## Key Features for Judges

- **Real Autonomy:** Agent decomposes user input into a full workplan without manual prompting
- **Multi-Source Reasoning:** Contradictions detected by cross-referencing 5 live data sources
- **Full Traceability:** Export Agent Trace JSON button on every run — complete audit log
- **Before/After Visualization:** System state change shown explicitly after each simulation
- **Pakistani Context:** Hinglish responses, Rs currency, local scam patterns (BISP, JazzCash), FIA complaint drafts
- **Real-time Streaming:** Agents stream results as they complete — no waiting for full pipeline

---

## Team

Built for **#AISeekho2026 Google Antigravity Hackathon**
Submission deadline: May 20, 2026
