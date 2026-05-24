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

async function sbGet(table, params) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
    headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
    signal: AbortSignal.timeout(4000),
  });
  return r.ok ? await r.json() : [];
}

async function sbPost(table, data) {
  return fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST", headers: hdrs(),
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(4000),
  });
}

async function sbPatch(table, filter, data) {
  return fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH", headers: hdrs(),
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(4000),
  });
}

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

    const now = new Date().toISOString();
    const useId = id || `manual-${Date.now()}`;
    const isManual = !id || id.startsWith("manual-");

    let analysis = null;

    if (!isManual) {
      // Cari analisis yang ada
      const rows = await sbGet("analyses", `id=eq.${useId}`);
      analysis = rows?.[0] || null;
    }

    if (analysis) {
      // Update outcome di analisis yang ada
      await sbPatch("analyses", `id=eq.${useId}`, {
        outcome,
        pnl: pnl || null,
        recorded_at: now,
      });
    } else {
      // Buat record baru untuk manual entry
      await sbPost("analyses", {
        id: useId,
        symbol: symbol || "MANUAL",
        signal: signal || null,
        confidence: confidence ? parseInt(confidence) : null,
        entry: entry || null,
        outcome,
        pnl: pnl || null,
        recorded_at: now,
        created_at: now,
      });
    }

    // Simpan ke memory untuk AI learning
    await sbPost("memory", {
      symbol:      analysis?.symbol || symbol || "MANUAL",
      signal:      analysis?.signal || signal || null,
      confidence:  analysis?.confidence || (confidence ? parseInt(confidence) : null),
      entry:       analysis?.entry || entry || null,
      stop_loss:   analysis?.stop_loss || null,
      take_profit: analysis?.take_profit || null,
      outcome,
      pnl:         pnl || null,
      market_snapshot: analysis?.market_snapshot || null,
      created_at:  now,
    });

    return res.status(200).json({
      success: true,
      message: `✅ Outcome "${outcome}" saved to AI memory`,
      id: useId,
      outcome,
      symbol: analysis?.symbol || symbol || "MANUAL",
    });

  } catch (err) {
    console.error("[feedback]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
