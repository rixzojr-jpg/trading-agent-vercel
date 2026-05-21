// api/health.js — Health Check
// AI Engine: NousResearch Hermes-3 via OpenRouter

export default function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  const key = process.env.OPENROUTER_API_KEY;

  return res.status(200).json({
    status:    "OK",
    agent:     "TRADING AGENT — MA × VMC × S&R × SMART MONEY AI",
    version:   "1.0.0",
    aiEngine:  "NousResearch Hermes-3 via OpenRouter",
    model:     "nousresearch/hermes-3-llama-3.1-405b",
    timestamp: new Date().toISOString(),
    openrouterKey: key
      ? `CONFIGURED (sk-or-...${key.slice(-4)})`
      : "MISSING — set OPENROUTER_API_KEY in Vercel → Settings → Environment Variables",
    runtime: process.version,
  });
}
