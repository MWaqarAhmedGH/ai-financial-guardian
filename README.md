# AI Financial Guardian
### #AISeekho2026 — Google Antigravity Hackathon | Challenge 1

Pakistan's autonomous financial intelligence system — multi-source data ingestion, orchestrator-driven 5-agent reasoning pipeline, real-time scam detection, and simulated action execution.

**Live Demo:** https://ai-financial-guardian-two.vercel.app/
**GitHub:** https://github.com/MWaqarAhmedGH/ai-financial-guardian

---

## What It Does

A user pastes a financial situation — a suspicious WhatsApp message, a market report, a business inventory question — and the system autonomously:

1. **Classifies** the input type instantly (no API call) — scam, market, business, urgent, general
2. **Plans** which agents to run based on classification — fast-tracks scams, skips unnecessary agents
3. **Ingests** alongside 5 real data sources (CSV + JSON feeds)
4. **Reasons** across sources to find insights and contradictions
5. **Assesses** real-world impact for Pakistani users and businesses
6. **Recommends** prioritized actions with rationale
7. **Executes** a simulation — before/after state, email draft, execution log

All steps are orchestrated by a `PipelineOrchestrator` that makes routing decisions dynamically.

---

## Challenge 1 Requirements — Coverage

| Requirement | Weight | Implementation |
|---|---|---|
| Google Antigravity Integration | 25% | `gemini-flash-lite-latest` — 5-agent orchestration pipeline via SSE streaming |
| Agentic Reasoning | 20% | Orchestrator → Ingest → Insight → Impact → Action → Execute |
| Content Ingestion (≥5 sources) | 20% | `inventory.csv`, `news.json`, `feed.json`, `report.json`, `table.json` |
| Action Simulation | 15% | Before/After state, email draft, timestamped execution log |
| Traceability / Logging | 10% | Full orchestrator log + agent trace JSON export on every run |
| UI / Visualization | 10% | Real-time SSE dashboard — pipeline progress, result cards, dark/light mode |

---

## Architecture — Orchestrator + 5-Agent Pipeline

```
User Input
    │
    ▼
┌──────────────────────────────────────────┐
│           PipelineOrchestrator            │
│                                          │
│  classify()  → type: scam / market /     │
│                 business / urgent /      │
│                 general                  │
│                                          │
│  buildPlan() → which agents to run       │
│                which agents to skip      │
│                                          │
│  shouldContinue() → abort on critical    │
│                     agent failure        │
│                                          │
│  adjustPrompt() → scam fast-track mode   │
└──────────┬───────────────────────────────┘
           │
     ┌─────┴──────────────────────────────┐
     │  SCAM FAST-TRACK (≥2 scam keywords) │
     │  Skips ImpactAnalyst + ActionAgent  │
     │  Goes direct to ExecutionAgent      │
     └─────┬──────────────────────────────┘
           │ (normal path)
           ▼
    ┌─────────────────┐
    │  IngestionAgent  │  Entities, amounts, dates, urgency
    └────────┬────────┘  (CRITICAL — pipeline aborts if fails)
             ▼
    ┌─────────────────┐
    │  InsightAgent    │  Primary insight, scam %, contradictions
    └────────┬────────┘  (CRITICAL — pipeline aborts if fails)
             ▼
    ┌──────────────────────┐
    │  ImpactAnalystAgent   │  24h + 4-week impact, sectors, PKR exposure
    └────────┬─────────────┘  (non-critical — continues on failure)
             ▼
    ┌────────────────────────────┐
    │  ActionRecommenderAgent     │  3 actions: 24h / 1 week / 1 month
    └────────┬───────────────────┘  (non-critical — continues on failure)
             ▼
    ┌──────────────────┐
    │  ExecutionAgent   │  State change, email draft, audit log
    └──────────────────┘  (non-critical — continues on failure)
```

Each agent retries once on failure (400ms delay) before the orchestrator decides to continue or abort.

---

## Project Structure

```
ai-financial-guardian/
│
├── server.js                  # Entry point only (22 lines)
├── package.json
├── vercel.json                # Vercel deployment config
├── .env                       # API keys (not committed)
├── README.md
│
├── src/                       # Backend logic
│   ├── data.js                # Data loader, API key pool, parseJSON util
│   ├── orchestrator.js        # PipelineOrchestrator class
│   ├── agents.js              # Agent prompts, runAgent(), buildAgentInput()
│   └── routes/
│       ├── chat.js            # POST /chat  — standard Gemini chat
│       └── pipeline.js        # POST /api/pipeline — orchestrated SSE pipeline
│
├── data/                      # Multi-source data (Challenge 1)
│   ├── inventory.csv          # Pakistani business inventory (SKU, locations)
│   ├── news.json              # Market news feed
│   ├── feed.json              # Live signals feed
│   ├── report.json            # Financial report data
│   └── table.json             # Forecast/trends table
│
└── public/                    # Frontend SPA
    ├── index.html             # Dashboard — 4 tabs, pipeline view, result cards
    ├── style.css              # Pure White + Dark mode (Apple/Figma aesthetic)
    ├── script.js              # SSE pipeline runner, theme toggle, tab nav
    ├── sw.js                  # Service Worker (PWA, cache-first)
    └── manifest.json          # PWA manifest (installable on mobile/desktop)
```

---

## 4 Tools / Tabs

| Tab | Function |
|---|---|
| **Guardian** | Main orchestrated 5-agent pipeline — paste any financial situation |
| **Scam Shield** | Dedicated scam detection — checks against Pakistani scam patterns |
| **Budget Doctor** | 50/30/20 budget analyzer with AI tip in Hinglish |
| **Report Summarizer** | Paste any report — get key numbers, risks, opportunities |

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Serve frontend dashboard |
| `/chat` | POST | Standard Gemini chat (Guardian standard mode) |
| `/api/pipeline` | POST + SSE | Orchestrated 5-agent pipeline (real-time streaming) |
| `/api/antigravity-status` | GET | Pipeline config status |
| `/api-status` | GET | Health check |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI** | Google Gemini `gemini-flash-lite-latest` via `@google/generative-ai` |
| **Orchestration** | Custom `PipelineOrchestrator` class — keyword classification, dynamic routing |
| **Backend** | Node.js + Express (modular `src/` structure) |
| **Frontend** | Vanilla HTML/CSS/JS — no framework, no build step |
| **Streaming** | Server-Sent Events (SSE) over `fetch` + `ReadableStream` |
| **PWA** | Service Worker — cache-first, offline support, installable |
| **Speech** | Web Speech API — Urdu voice input (`ur-PK`) + TTS |
| **Theme** | Dark/Light mode with `localStorage` persistence + system preference detection |
| **Mobile** | Fully responsive — iOS-style bottom nav bar, safe-area insets |

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
# Optional: GEMINI_API_KEY_2, GEMINI_API_KEY_3 for key rotation

# 4. Run
node server.js

# Open http://localhost:3000
```

---

## Demo Prompts

**Scam Fast-Track** — triggers orchestrator to skip 2 agents
```
Mujhe WhatsApp par message aya hai: "Mubarak ho! Aapki 50,000 ki lottery lagi hai.
Prize claim karne ke liye abhi 2,000 ka processing fee bhejein. OTP share karein."
```

**Business Intelligence** — uses inventory.csv + news.json
```
Analyze current stock levels for Lahore and cross-reference with latest market news.
```

**Market Analysis** — full 5-agent pipeline
```
Pakistan mein dollar rate barh raha hai aur import costs increase ho rahe hain.
Hamara retail business Karachi mein hai — kya karna chahiye?
```

**Financial Report**
```
Q3 mein hamari net profit 12% giri, operating costs 18% badhe.
Current cash runway 4 months hai. Kya strategy honi chahiye?
```

---

## Key Features for Judges

- **Real Orchestrator:** `PipelineOrchestrator` classifies input and builds dynamic execution plan — no hardcoded sequences
- **Scam Fast-Track:** 2+ scam keywords → ImpactAnalyst and ActionRecommender skipped → immediate protection response
- **Retry Logic:** Each agent retries once on failure; critical agents abort pipeline, non-critical continue with partial data
- **Multi-Source Reasoning:** 5 data sources cross-referenced; contradictions detected and logged
- **Full Traceability:** Orchestrator log + per-agent trace exported as JSON — complete audit trail
- **Real-time Streaming:** SSE pipeline — each agent result streams to UI as it completes
- **Before/After Visualization:** System state change shown explicitly after every run
- **Pakistani Context:** Hinglish responses, Rs currency, local scam patterns (BISP, JazzCash, FIA), FIA complaint drafts
- **Dark/Light Mode:** Theme toggle with system preference detection and localStorage persistence
- **Mobile-First PWA:** Bottom nav bar, touch-friendly, installable on Android/iOS

---

## Built For

**#AISeekho2026 Google Antigravity Hackathon** — Challenge 1: Autonomous Content-to-Action Agent
Submission deadline: May 20, 2026
