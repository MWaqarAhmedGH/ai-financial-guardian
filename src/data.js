// ════════════════════════════════════════════════════
// src/data.js — Multi-source data loader + shared utils
// ════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');

// ── Data loading ──────────────────────────────────────
function loadFile(filename) {
    try { return fs.readFileSync(path.join(__dirname, '..', 'data', filename), 'utf8'); }
    catch { return ''; }
}

const inventoryData = loadFile('inventory.csv');
const newsData      = loadFile('news.json');
const feedData      = loadFile('feed.json');
const reportData    = loadFile('report.json');
const forecastData  = loadFile('table.json');

// Pre-built context string for pipeline agents
const DATA_CTX = [
    `=== MARKET NEWS ===\n${newsData}`,
    `=== FINANCIAL REPORT ===\n${reportData}`,
    `=== INVENTORY (first 8 rows) ===\n${inventoryData.split('\n').slice(0, 8).join('\n')}`,
    `=== LIVE FEED ===\n${feedData}`
].join('\n\n');

// Full context for standard chat
const FULL_DATA_CTX = {
    inventoryData,
    newsData,
    feedData,
    reportData,
    forecastData
};

// ── API key pool ──────────────────────────────────────
const apiKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
].filter(Boolean);

let keyIndex = 0;
function rotateKey()  { if (apiKeys.length > 1) keyIndex = (keyIndex + 1) % apiKeys.length; }
function currentKey() { return apiKeys[keyIndex]; }

// ── JSON parse helper ─────────────────────────────────
function parseJSON(text) {
    try { return JSON.parse(text); } catch {}
    const block = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (block) { try { return JSON.parse(block[1]); } catch {} }
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a !== -1 && b !== -1) { try { return JSON.parse(text.substring(a, b + 1)); } catch {} }
    return null;
}

module.exports = {
    inventoryData, newsData, feedData, reportData, forecastData,
    DATA_CTX, FULL_DATA_CTX,
    apiKeys, rotateKey, currentKey,
    parseJSON
};
