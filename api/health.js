// api/health.js — standalone
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  if (req.method==="OPTIONS") return res.status(200).end();
  const key = process.env.OPENROUTER_API_KEY;
  res.status(200).json({
    status:"OK",
    agent:"TRADING AGENT — MA × VMC × S&R × SMART MONEY AI",
    aiEngine:"NousResearch Hermes-3 via OpenRouter",
    model:"nousresearch/hermes-3-llama-3.1-405b",
    timestamp:new Date().toISOString(),
    openrouterKey: key?`CONFIGURED (...${key.slice(-4)})`:"MISSING — set OPENROUTER_API_KEY in Vercel Settings",
    runtime:process.version,
  });
}
