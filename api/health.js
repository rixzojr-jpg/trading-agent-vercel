// api/health.js — Health check
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  res.status(200).json({
    status:    "OK",
    agent:     "TRADING AGENT — Institutional Decision Engine v2",
    framework: "1D EMA13/21 → 4H EMA20/50 + Structure → 1H Execution",
    model:     "nousresearch/hermes-3-llama-3.1-405b via OpenRouter",
    scoring:   "95-100=Exceptional | 90-94=VeryHigh | 85-89=High | 75-84=Tradable | <75=NO TRADE",
    timestamp: new Date().toISOString(),
    keys: {
      openrouter:  process.env.OPENROUTER_API_KEY  ? "✅ CONFIGURED" : "❌ MISSING",
      supabase:    process.env.SUPABASE_URL         ? "✅ CONFIGURED" : "⚠️  OPTIONAL",
    },
    runtime: process.version,
  });
}
