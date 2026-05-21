// ═══════════════════════════════════════════════════════════════
//  api/analyze.js — SSE Streaming Analysis Endpoint
//  AI Engine: NousResearch Hermes-3 via OpenRouter
// ═══════════════════════════════════════════════════════════════

import {
  fetchAllMarketData,
  computeIndicators,
  buildPrompt,
  SYSTEM_PROMPT,
  sseHeaders,
  sseEvent,
} from "./_lib.js";

export const config = { maxDuration: 300 };

// ── OpenRouter config ─────────────────────────────────────────
const OPENROUTER_URL  = "https://openrouter.ai/api/v1/chat/completions";

// NousResearch Hermes models available on OpenRouter:
// "nousresearch/hermes-3-llama-3.1-405b"       ← flagship, most capable
// "nousresearch/hermes-3-llama-3.1-70b"         ← fast + cheap
// "nousresearch/hermes-3-llama-3.2-3b-preview"  ← ultra fast (lightweight)
const HERMES_MODEL    = "nousresearch/hermes-3-llama-3.1-405b";

export default async function handler(req, res) {
  // ── CORS preflight ────────────────────────────────────────
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    return res.status(200).end();
  }

  // ── Validate API key ──────────────────────────────────────
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: "OPENROUTER_API_KEY is not set. Add it in Vercel → Settings → Environment Variables.",
    });
  }

  const symbol   = ((req.query?.symbol) || "BTC-USDT").toUpperCase();
  const appUrl   = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://trading-agent.vercel.app";

  // ── Setup SSE ─────────────────────────────────────────────
  const headers = sseHeaders();
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  res.flushHeaders();

  const send = (event, data) => sseEvent(res, event, data);

  try {
    // ── STEP 1: Fetch BingX live market data ─────────────
    send("status", { message: `📡 Fetching live BingX data for ${symbol}...` });
    const raw = await fetchAllMarketData(symbol);

    // ── STEP 2: Compute all 10 analysis engines ──────────
    send("status", { message: "⚙️  Running 10 analysis engines..." });
    const ind = computeIndicators(raw, symbol);

    // ── STEP 3: Push metrics to frontend ─────────────────
    send("metrics", {
      price:     ind.curPrice,
      change24h: ind.change24h,
      ema: {
        daily: { ...ind.ema.daily, trend: ind.emaTrend(ind.ema.daily) },
        h4:    { ...ind.ema.h4,    trend: ind.emaTrend(ind.ema.h4)    },
        h1:    { ...ind.ema.h1,    trend: ind.emaTrend(ind.ema.h1)    },
      },
      wavetrend: {
        h4:  ind.wtZone(ind.wt.h4),
        h1:  ind.wtZone(ind.wt.h1),
        m15: ind.wtZone(ind.wt.m15),
      },
      moneyFlow: {
        h4: ind.mfLabel(ind.mf.h4),
        h1: ind.mfLabel(ind.mf.h1),
      },
      volatility: {
        h4ATR:  ind.vol.h4.atr?.toFixed(4),
        h1ATR:  ind.vol.h1.atr?.toFixed(4),
        h4BBW:  ind.vol.h4.bb?.width,
        regime: ind.volRegime(ind.vol.h4.bb),
      },
      rsi:         ind.rsi,
      derivatives: ind.derivatives,
      btcContext:  ind.btcData,
    });

    // ── STEP 4: Build prompt & call Hermes via OpenRouter ─
    send("status", { message: `🤖 Streaming Hermes-3 analysis via OpenRouter...` });

    const prompt = buildPrompt(ind);

    const aiRes = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
        // OpenRouter required headers
        "HTTP-Referer":  appUrl,
        "X-Title":       "Trading Agent — MA × VMC × S&R × Smart Money AI",
      },
      body: JSON.stringify({
        model:  HERMES_MODEL,
        stream: true,
        max_tokens: 2048,
        temperature: 0.3,      // lower = more precise / deterministic output
        top_p: 0.9,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      throw new Error(`OpenRouter ${aiRes.status}: ${errBody}`);
    }

    // ── STEP 5: Stream OpenAI-format SSE → client ────────
    const reader  = aiRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") break;

        try {
          const json = JSON.parse(raw);
          // OpenRouter / OpenAI streaming format
          const text = json.choices?.[0]?.delta?.content;
          if (text) send("token", { text });
        } catch {}
      }
    }

    send("done", { message: `Analysis complete — powered by ${HERMES_MODEL}` });
    res.end();

  } catch (err) {
    console.error("[analyze]", err.message);
    send("error", { message: err.message });
    res.end();
  }
}
