// api/feedback.js — Record trade outcome to Supabase
export const config = { maxDuration: 10 };

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;
const SB_OK  = !!(SB_URL && SB_KEY);

const hdrs = () => ({
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=minimal",
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "POST only" });

  if (!SB_OK) return res.status(200).json({
    success: false,
    error: "Supabase not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel Environment Variables.",
  });

  try {
    const { id, outcome, pnl, symbol, signal, confidence, entry } = req.body || {};

    if (!outcome) return res.status(400).json({ error: "Missing outcome" });
    if (!["profit", "loss", "breakeven"].includes(outcome))
      return res.status(400).json({ error: "outcome must be: profit | loss | breakeven" });

    const useId = id || `manual-${Date.now()}`;
    const isManual = useId.startsWith("manual-");

    let analysis = null;

    if (!isManual) {
      // Try to get existing analysis
      const r = await fetch(`${SB_URL}/rest/v1/analyses?id=eq.${useId}`, {
        headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
        signal: AbortSignal.timeout(4000),
      });
      const rows = await r.json();
      analysis = rows?.[0] || null;
    }

    if (analysis) {
      // Update existing analysis outcome
      await fetch(`${SB_URL}/rest/v1/analyses?id=eq.${useId}`, {
        method: "PATCH",
        headers: hdrs(),
        body: JSON.stringify({
          outcome,
          pnl: pnl || null,
          recorded_at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(4000),
      });
    } else {
      // Insert new record for manual entry
      await fetch(`${SB_URL}/rest/v1/analyses`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({
          id: useId,
          symbol: symbol || "MANUAL",
          signal: signal || null,
          confidence: confidence ? parseInt(confidence) : null,
          entry: entry || null,
          outcome,
          pnl: pnl || null,
          recorded_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(4000),
      });
    }

    // Always insert into memory table for AI learning
    await fetch(`${SB_URL}/rest/v1/memory`, {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({
        symbol:     analysis?.symbol || symbol || "MANUAL",
        signal:     analysis?.signal || signal || null,
        confidence: analysis?.confidence || (confidence ? parseInt(confidence) : null),
        entry:      analysis?.entry || entry || null,
        stop_loss:  analysis?.stop_loss || null,
        take_profit:analysis?.take_profit || null,
        outcome,
        pnl: pnl || null,
        market_snapshot: analysis?.market_snapshot || null,
        created_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(4000),
    });

    return res.status(200).json({
      success: true,
      message: `✅ Outcome "${outcome}" saved to AI memory`,
      id: useId,
      outcome,
      isManual,
    });

  } catch (err) {
    console.error("[feedback]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
