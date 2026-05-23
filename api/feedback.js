// api/feedback.js — Record trade outcome to Supabase
export const config = { maxDuration: 10 };

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;
const SB_OK  = !!(SB_URL && SB_KEY);

const headers = () => ({
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
    const { id, outcome, pnl } = req.body || {};
    if (!id)      return res.status(400).json({ error: "Missing id" });
    if (!outcome) return res.status(400).json({ error: "Missing outcome" });
    if (!["profit", "loss", "breakeven"].includes(outcome))
      return res.status(400).json({ error: "outcome must be: profit | loss | breakeven" });

    // Get existing analysis
    const r = await fetch(`${SB_URL}/rest/v1/analyses?id=eq.${id}`, {
      headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
      signal: AbortSignal.timeout(4000),
    });
    const rows = await r.json();
    if (!rows.length) return res.status(404).json({ error: `Analysis ${id} not found` });

    const analysis = rows[0];

    // Update outcome in analyses table
    await fetch(`${SB_URL}/rest/v1/analyses?id=eq.${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ outcome, pnl: pnl || null, recorded_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(4000),
    });

    // Insert into memory table for AI learning
    await fetch(`${SB_URL}/rest/v1/memory`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        symbol:          analysis.symbol,
        signal:          analysis.signal,
        confidence:      analysis.confidence,
        entry:           analysis.entry,
        stop_loss:       analysis.stop_loss,
        take_profit:     analysis.take_profit,
        outcome,
        pnl:             pnl || null,
        market_snapshot: analysis.market_snapshot,
        created_at:      new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(4000),
    });

    return res.status(200).json({
      success: true,
      message: `✅ Outcome "${outcome}" saved to AI memory for ${analysis.symbol}`,
      id, outcome, symbol: analysis.symbol,
    });

  } catch (err) {
    console.error("[feedback]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
