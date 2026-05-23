// api/history.js — Analysis history + AI learning stats from Supabase
export const config = { maxDuration: 30 };

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;
const SB_OK  = !!(SB_URL && SB_KEY);

async function sbQuery(path, params = "") {
  const r = await fetch(`${SB_URL}/rest/v1/${path}?${params}`, {
    headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`,
               "Prefer": "count=exact" },
    signal: AbortSignal.timeout(5000),
  });
  return r.ok ? await r.json() : [];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!SB_OK) return res.status(200).json({
    success: false, sbEnabled: false,
    message: "Supabase not configured.",
    analyses: [], stats: {},
  });

  try {
    const symbol = req.query?.symbol?.toUpperCase() || null;
    const limit  = Math.min(parseInt(req.query?.limit || "20"), 50);
    const symFilter = symbol ? `&symbol=eq.${symbol}` : "";

    // Fetch analyses
    const analyses = await sbQuery(
      "analyses",
      `order=created_at.desc&limit=${limit}${symFilter}&select=id,symbol,signal,confidence,entry,stop_loss,take_profit,rr,hold_duration,outcome,pnl,recorded_at,market_snapshot,created_at`
    );

    // Fetch stats from memory table
    const allMemory  = await sbQuery("memory", `select=outcome${symFilter}`);
    const profit     = allMemory.filter(m => m.outcome === "profit").length;
    const loss       = allMemory.filter(m => m.outcome === "loss").length;
    const breakeven  = allMemory.filter(m => m.outcome === "breakeven").length;
    const total      = profit + loss + breakeven;
    const winRate    = total ? ((profit / total) * 100).toFixed(1) + "%" : "N/A";

    // Count total analyses
    const totalAnalyses = await sbQuery(
      "analyses", `select=id${symFilter}&order=created_at.desc`
    );

    return res.status(200).json({
      success: true, sbEnabled: true,
      symbol: symbol || "ALL",
      count: analyses.length,
      analyses: analyses.map(a => ({
        id:           a.id,
        symbol:       a.symbol,
        timestamp:    a.created_at,
        signal:       a.signal,
        confidence:   a.confidence,
        entry:        a.entry,
        stopLoss:     a.stop_loss,
        takeProfit:   a.take_profit,
        rr:           a.rr,
        holdDuration: a.hold_duration,
        outcome:      a.outcome,
        pnl:          a.pnl,
        recordedAt:   a.recorded_at,
        marketSnapshot: a.market_snapshot,
      })),
      stats: {
        totalAnalyses: totalAnalyses.length,
        withOutcomes:  total,
        profit, loss, breakeven,
        winRate, totalOutcomes: total,
      },
    });

  } catch (err) {
    console.error("[history]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
