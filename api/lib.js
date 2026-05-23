// ═══════════════════════════════════════════════════════════════
//  _lib.js — Shared Library
//  Indicators · BingX API · Prompt Builder · System Prompt
//  Files starting with _ are NOT treated as Vercel API routes
// ═══════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
//  SYSTEM PROMPT
// ════════════════════════════════════════════════════════════════

export const SYSTEM_PROMPT = `You are an advanced institutional-grade AI crypto futures trading agent.

Your name: TRADING AGENT — MA × VMC × S&R × SMART MONEY AI

Your objective: Generate high probability LONG / SHORT crypto futures decisions using live BingX market data with institutional-style analysis.

You are NOT a retail indicator bot. Think like a proprietary trading desk, hedge fund analyst, institutional futures trader, and smart money liquidity hunter.

PRIMARY MISSION:
1. Detect trend direction using EMA structure
2. Detect smart money behavior (BOS, CHOCH, order blocks, FVG)
3. Detect liquidity traps (stop hunts, equal highs/lows, inducements)
4. Detect volatility expansion using ATR and Bollinger Band Width
5. Detect momentum shifts via WaveTrend and Money Flow
6. Avoid low probability trades — never force entries
7. Deliver clean RR 1:3 setups minimum
8. Prioritize capital preservation above all

ANALYSIS ENGINES:
1. MARKET STRUCTURE    — Higher highs/lows, BOS, CHOCH, order blocks
2. EMA TREND ENGINE    — EMA20/50/200 alignment and momentum
3. VUMANCHU CIPHER     — WaveTrend oscillator (OB>+53, OS<-53, extreme>±60)
4. MONEY FLOW ENGINE   — CMF buyer/seller dominance
5. SMART MONEY ENGINE  — liquidity hunts, FVG, inducement patterns
6. LIQUIDITY ENGINE    — resting liquidity, cluster zones, squeeze setups
7. VOLATILITY ENGINE   — ATR regime, BB Width expansion/contraction
8. DERIVATIVES ENGINE  — OI trend, funding bias, L/S ratio crowding
9. MULTI TF ENGINE     — Daily bias → 4H swing → 1H execution → 15m timing
10. MARKET CONTEXT     — BTC dominance, altcoin rotation, risk-on/off

EMA CLASSIFICATION:
STRONG BULLISH:        EMA20 > EMA50 > EMA200
STRONG BEARISH:        EMA20 < EMA50 < EMA200
TRANSITIONING BULLISH: EMA20 > EMA50, EMA50 < EMA200
TRANSITIONING BEARISH: EMA20 < EMA50, EMA50 > EMA200

DERIVATIVES:
Rising OI + Rising Price  → bullish continuation
Rising OI + Falling Price → aggressive short positioning
Falling OI               → position unwinding / trend exhaustion
Positive funding crowded → long squeeze risk
Negative funding crowded → short squeeze risk

ENTRY CONDITIONS — ALL must be satisfied:
✓ Multi-timeframe alignment
✓ Valid trend structure (no conflicting bias)
✓ Confirmed liquidity setup
✓ Momentum confirmation
✓ Volatility expansion present
✓ Minimum RR 1:3

NO TRADE if ANY of the following:
✗ Sideways chop / range compression
✗ Low volatility / BB Width contracting < 2%
✗ Conflicting timeframe signals
✗ Fake momentum / no volume confirmation
✗ Weak derivative confirmation

CONFIDENCE SCORING:
90–100 → Exceptional institutional setup
75–89  → High probability — standard size
60–74  → Moderate — reduced size or skip
< 60   → Do not trade

Return EXACTLY this format — no deviation, no extra text:

PAIR:
CURRENT PRICE:

━━━━━━━━━━━━━━━━━━
MARKET CONTEXT
━━━━━━━━━━━━━━━━━━

BTC TREND:
BTC DOMINANCE:
MARKET CONDITION:

━━━━━━━━━━━━━━━━━━
DAILY BIAS
━━━━━━━━━━━━━━━━━━

STATUS:
TREND:
STRUCTURE:

━━━━━━━━━━━━━━━━━━
4H SWING ANALYSIS
━━━━━━━━━━━━━━━━━━

EMA STATUS:
VMC STATUS:
MONEY FLOW:
VOLATILITY:
SMART MONEY:

━━━━━━━━━━━━━━━━━━
1H EXECUTION ANALYSIS
━━━━━━━━━━━━━━━━━━

TREND:
MOMENTUM:
LIQUIDITY:
OI/FUNDING:
ENTRY QUALITY:

━━━━━━━━━━━━━━━━━━
15M ENTRY TIMING
━━━━━━━━━━━━━━━━━━

ENTRY SIGNAL:
CONFIRMATION:
RISK LEVEL:

━━━━━━━━━━━━━━━━━━
TRADE DECISION
━━━━━━━━━━━━━━━━━━

LONG / SHORT / NO TRADE

CONFIDENCE SCORE:
ENTRY:
STOP LOSS:
TAKE PROFIT:
RR:
HOLD DURATION:

━━━━━━━━━━━━━━━━━━
INVALIDATION
━━━━━━━━━━━━━━━━━━

[Specific price levels and conditions that cancel the setup]

Language: precise, probabilistic, objective, professional. Zero hype. Zero emotion.`;

// ════════════════════════════════════════════════════════════════
//  TECHNICAL INDICATORS
// ════════════════════════════════════════════════════════════════

export function calcEMA(closes, period) {
  if (!closes || closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return ema;
}

export function calcATR(candles, period = 14) {
  if (!candles || candles.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = +candles[i][2], l = +candles[i][3], pc = +candles[i - 1][4];
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export function calcBollingerBands(closes, period = 20) {
  if (!closes || closes.length < period) return null;
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
  return {
    upper:  mean + 2 * std,
    middle: mean,
    lower:  mean - 2 * std,
    width:  ((4 * std) / mean * 100).toFixed(3),
    std,
  };
}

export function calcCMF(candles, period = 20) {
  if (!candles || candles.length < period) return null;
  const slice = candles.slice(-period);
  let mfv = 0, totalVol = 0;
  for (const c of slice) {
    const h = +c[2], l = +c[3], cl = +c[4], v = +c[5];
    const mfm = h !== l ? ((cl - l) - (h - cl)) / (h - l) : 0;
    mfv += mfm * v;
    totalVol += v;
  }
  return totalVol ? mfv / totalVol : 0;
}

export function calcWaveTrend(candles, n1 = 10, n2 = 21) {
  if (!candles || candles.length < n2 + 5) return null;
  const hlc3 = candles.map(c => (+c[2] + +c[3] + +c[4]) / 3);
  const k1 = 2 / (n1 + 1);
  let esa = hlc3[0];
  const esas = hlc3.map((v, i) => { if (i > 0) esa = v * k1 + esa * (1 - k1); return esa; });
  const d = hlc3.map((v, i) => Math.abs(v - esas[i]));
  let de = d[0];
  const des = d.map((v, i) => { if (i > 0) de = v * k1 + de * (1 - k1); return de; });
  const ci = hlc3.map((v, i) => des[i] ? (v - esas[i]) / (0.015 * des[i]) : 0);
  const k2 = 2 / (n2 + 1);
  let wt = ci[0];
  ci.forEach((v, i) => { if (i > 0) wt = v * k2 + wt * (1 - k2); });
  return parseFloat(wt.toFixed(2));
}

export function calcRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let ag = gains / period, al = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
  }
  return parseFloat((100 - 100 / (1 + (al === 0 ? Infinity : ag / al))).toFixed(2));
}

export function detectSwings(candles, lookback = 5) {
  const highs = candles.map(c => +c[2]);
  const lows  = candles.map(c => +c[3]);
  const swingHighs = [], swingLows = [];
  for (let i = lookback; i < highs.length - lookback; i++) {
    if (highs[i] === Math.max(...highs.slice(i - lookback, i + lookback + 1)))
      swingHighs.push({ i, price: highs[i] });
    if (lows[i] === Math.min(...lows.slice(i - lookback, i + lookback + 1)))
      swingLows.push({ i, price: lows[i] });
  }
  return { swingHighs: swingHighs.slice(-6), swingLows: swingLows.slice(-6) };
}

export function detectStructure(candles) {
  const { swingHighs, swingLows } = detectSwings(candles.slice(-80));
  let bos = "NONE", choch = "NONE", trend = "NEUTRAL";

  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const [pH, cH] = [swingHighs.at(-2).price, swingHighs.at(-1).price];
    const [pL, cL] = [swingLows.at(-2).price, swingLows.at(-1).price];
    if (cH > pH && cL > pL)      { trend = "BULLISH"; bos = "BULLISH BOS — Higher High confirmed"; }
    else if (cH < pH && cL < pL) { trend = "BEARISH"; bos = "BEARISH BOS — Lower Low confirmed";  }
    else if (cH < pH && cL > pL) { choch = "POTENTIAL CHOCH — Bearish momentum weakening"; }
    else if (cH > pH && cL < pL) { choch = "POTENTIAL CHOCH — Bullish momentum weakening"; }
  }

  const closes = candles.map(c => +c[4]);
  const last = closes.at(-1);
  const slice20 = candles.slice(-20);
  const recentHigh = Math.max(...slice20.map(c => +c[2]));
  const recentLow  = Math.min(...slice20.map(c => +c[3]));

  return {
    trend, bos, choch,
    recentHigh: recentHigh.toFixed(6),
    recentLow:  recentLow.toFixed(6),
    pricePos: ((last - recentLow) / (recentHigh - recentLow) * 100).toFixed(1) + "%",
    swingHighs: swingHighs.map(s => s.price.toFixed(6)),
    swingLows:  swingLows.map(s => s.price.toFixed(6)),
  };
}

export function detectFVG(candles) {
  const fvgs = [];
  for (let i = 2; i < candles.length; i++) {
    const pH = +candles[i - 2][2], pL = +candles[i - 2][3];
    const cH = +candles[i][2],    cL = +candles[i][3];
    if (cL > pH) fvgs.push({ type: "BULLISH FVG", low: pH.toFixed(6), high: cL.toFixed(6) });
    if (cH < pL) fvgs.push({ type: "BEARISH FVG", low: cH.toFixed(6), high: pL.toFixed(6) });
  }
  return fvgs.slice(-3);
}

export function detectEqualLevels(candles, tol = 0.002) {
  const highs = candles.slice(-30).map(c => +c[2]);
  const lows  = candles.slice(-30).map(c => +c[3]);
  const eqH = new Set(), eqL = new Set();
  for (let i = 0; i < highs.length - 1; i++)
    for (let j = i + 1; j < highs.length; j++)
      if (Math.abs(highs[i] - highs[j]) / highs[i] < tol)
        eqH.add(((highs[i] + highs[j]) / 2).toFixed(6));
  for (let i = 0; i < lows.length - 1; i++)
    for (let j = i + 1; j < lows.length; j++)
      if (Math.abs(lows[i] - lows[j]) / lows[i] < tol)
        eqL.add(((lows[i] + lows[j]) / 2).toFixed(6));
  return { equalHighs: [...eqH].slice(-3), equalLows: [...eqL].slice(-3) };
}

export function calcVolumeProfile(candles) {
  const vols = candles.slice(-20).map(c => +c[5]);
  const avg = vols.slice(0, -1).reduce((a, b) => a + b, 0) / (vols.length - 1);
  const last = vols.at(-1);
  const ratio = avg ? last / avg : 1;
  let buy = 0, sell = 0;
  candles.slice(-5).forEach(c => {
    const v = +c[5];
    (+c[4] > +c[1] ? buy : sell) + v; // rough buy/sell
    if (+c[4] > +c[1]) buy += v; else sell += v;
  });
  return {
    ratio: ratio.toFixed(2), avgVol: avg.toFixed(0), lastVol: last.toFixed(0),
    buyPressure: buy > sell ? "DOMINANT" : "WEAK",
    sellPressure: sell > buy ? "DOMINANT" : "WEAK",
    expansion: ratio > 1.5 ? "HIGH" : ratio > 1.0 ? "MODERATE" : "LOW",
  };
}

// ════════════════════════════════════════════════════════════════
//  BINGX API
// ════════════════════════════════════════════════════════════════

const BINGX = "https://open-api.bingx.com";

async function bingxGet(path, params = {}) {
  const qs  = new URLSearchParams(params).toString();
  const url = `${BINGX}${path}${qs ? "?" + qs : ""}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "TradingAgent/1.0" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`BingX HTTP ${res.status} ${path}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(`BingX: ${json.msg || JSON.stringify(json)}`);
  return json.data;
}

async function fetchCandles(symbol, interval, limit = 200) {
  const raw = await bingxGet("/openApi/swap/v3/quote/klines", { symbol, interval, limit });
  return (raw || []).map(c =>
    Array.isArray(c) ? c : [c.time, c.open, c.high, c.low, c.close, c.volume]
  );
}

export async function fetchAllMarketData(symbol) {
  const [dailyC, h4C, h1C, m15C, ticker] = await Promise.all([
    fetchCandles(symbol, "1d", 200),
    fetchCandles(symbol, "4h", 200),
    fetchCandles(symbol, "1h", 100),
    fetchCandles(symbol, "15m", 100),
    bingxGet("/openApi/swap/v2/quote/ticker", { symbol }),
  ]);

  const [oi, funding, lsRatio] = await Promise.allSettled([
    bingxGet("/openApi/swap/v2/quote/openInterest", { symbol }),
    bingxGet("/openApi/swap/v2/quote/fundingRate", { symbol }),
    bingxGet("/openApi/swap/v2/quote/longShortRatio", { symbol, period: "1h", limit: 3 }),
  ]);

  let btcTicker = null;
  if (symbol !== "BTC-USDT") {
    try { btcTicker = await bingxGet("/openApi/swap/v2/quote/ticker", { symbol: "BTC-USDT" }); } catch {}
  }

  return {
    dailyC, h4C, h1C, m15C, ticker,
    oi:      oi.status      === "fulfilled" ? oi.value      : null,
    funding: funding.status === "fulfilled" ? funding.value : null,
    lsRatio: lsRatio.status === "fulfilled" ? lsRatio.value : null,
    btcTicker,
  };
}

// ════════════════════════════════════════════════════════════════
//  INDICATOR COMPUTATION
// ════════════════════════════════════════════════════════════════

export function computeIndicators(data, symbol) {
  const { dailyC, h4C, h1C, m15C, ticker, oi, funding, lsRatio, btcTicker } = data;
  const cl = tf => tf.map(c => +c[4]);
  const dC = cl(dailyC), h4_ = cl(h4C), h1_ = cl(h1C), m15_ = cl(m15C);
  const curPrice = +(ticker?.lastPrice || ticker?.price || dC.at(-1));

  const ema = {
    daily: { ema20: calcEMA(dC, 20),  ema50: calcEMA(dC, 50),  ema200: calcEMA(dC, 200) },
    h4:    { ema20: calcEMA(h4_, 20), ema50: calcEMA(h4_, 50), ema200: calcEMA(h4_, 200) },
    h1:    { ema20: calcEMA(h1_, 20), ema50: calcEMA(h1_, 50), ema200: calcEMA(h1_, 200) },
    m15:   { ema20: calcEMA(m15_, 20),ema50: calcEMA(m15_, 50) },
  };

  const emaTrend = e => {
    if (!e.ema20 || !e.ema50) return "INSUFFICIENT DATA";
    if (e.ema200) {
      if (e.ema20 > e.ema50 && e.ema50 > e.ema200) return "STRONG BULLISH";
      if (e.ema20 < e.ema50 && e.ema50 < e.ema200) return "STRONG BEARISH";
      if (e.ema20 > e.ema50 && e.ema50 < e.ema200) return "TRANSITIONING BULLISH";
      if (e.ema20 < e.ema50 && e.ema50 > e.ema200) return "TRANSITIONING BEARISH";
    }
    return e.ema20 > e.ema50 ? "BULLISH BIAS" : "BEARISH BIAS";
  };

  const wt = {
    daily: calcWaveTrend(dailyC), h4: calcWaveTrend(h4C),
    h1:   calcWaveTrend(h1C),  m15: calcWaveTrend(m15C),
  };

  const wtZone = v => {
    if (v === null) return "N/A";
    if (v > 60)  return `EXTREME OVERBOUGHT (${v})`;
    if (v > 53)  return `OVERBOUGHT (${v})`;
    if (v < -60) return `EXTREME OVERSOLD (${v})`;
    if (v < -53) return `OVERSOLD (${v})`;
    return `NEUTRAL (${v})`;
  };

  const mf = {
    daily: calcCMF(dailyC, 20), h4: calcCMF(h4C, 20),
    h1:   calcCMF(h1C, 20),   m15: calcCMF(m15C, 14),
  };

  const mfLabel = v => {
    if (v === null) return "N/A";
    if (v > 0.10) return `STRONG BULLISH (${v.toFixed(4)})`;
    if (v > 0)    return `MILD BULLISH (${v.toFixed(4)})`;
    if (v < -0.10)return `STRONG BEARISH (${v.toFixed(4)})`;
    return `MILD BEARISH (${v.toFixed(4)})`;
  };

  const vol = {
    daily: { atr: calcATR(dailyC, 14), bb: calcBollingerBands(dC, 20) },
    h4:    { atr: calcATR(h4C, 14),   bb: calcBollingerBands(h4_, 20) },
    h1:    { atr: calcATR(h1C, 14),   bb: calcBollingerBands(h1_, 20) },
    m15:   { atr: calcATR(m15C, 14),  bb: calcBollingerBands(m15_, 20) },
  };

  const volRegime = bb => {
    if (!bb) return "N/A";
    const w = +bb.width;
    if (w > 8) return `EXTREME (BBW ${bb.width}%)`;
    if (w > 4) return `EXPANSION (BBW ${bb.width}%)`;
    return `COMPRESSION (BBW ${bb.width}%)`;
  };

  const rsi = {
    daily: calcRSI(dC, 14), h4: calcRSI(h4_, 14),
    h1:   calcRSI(h1_, 14), m15: calcRSI(m15_, 14),
  };

  const structure = {
    daily: detectStructure(dailyC),
    h4:   detectStructure(h4C),
    h1:   detectStructure(h1C),
  };

  const fvg = {
    h4: detectFVG(h4C.slice(-30)),
    h1: detectFVG(h1C.slice(-20)),
  };

  const eqLevels = {
    h4: detectEqualLevels(h4C),
    h1: detectEqualLevels(h1C),
  };

  const volumeProfile = {
    daily: calcVolumeProfile(dailyC),
    h4:   calcVolumeProfile(h4C),
    h1:   calcVolumeProfile(h1C),
  };

  const derivatives = {
    oi:          oi ? { value: (+oi.openInterest).toFixed(2), timestamp: oi.time } : null,
    fundingRate: funding ? ((+funding.lastFundingRate) * 100).toFixed(4) + "%" : "N/A",
    lsRatio:     lsRatio?.[0]
      ? {
          longRatio:  (+lsRatio[0].longAccount  * 100).toFixed(2) + "%",
          shortRatio: (+lsRatio[0].shortAccount * 100).toFixed(2) + "%",
          dominance:  lsRatio[0].longAccount > lsRatio[0].shortAccount ? "LONG DOMINATED" : "SHORT DOMINATED",
        }
      : null,
  };

  const btcData = btcTicker
    ? {
        price:    (+btcTicker.lastPrice).toFixed(2),
        change24h:  (+btcTicker.priceChangePercent).toFixed(2) + "%",
        trend: +btcTicker.priceChangePercent > 1 ? "BULLISH"
               : +btcTicker.priceChangePercent < -1 ? "BEARISH" : "SIDEWAYS",
      }
    : { price: curPrice.toFixed(2), change24h: "N/A", trend: "SELF (analyzing BTC)" };

  return {
    symbol, curPrice,
    change24h: (+( ticker?.priceChangePercent || 0)).toFixed(2),
    ema, emaTrend, wt, wtZone, mf, mfLabel,
    vol, volRegime, rsi, structure, fvg, eqLevels,
    volumeProfile, derivatives, btcData,
  };
}

// ════════════════════════════════════════════════════════════════
//  PROMPT BUILDER
// ════════════════════════════════════════════════════════════════

export function buildPrompt(ind) {
  const {
    symbol, curPrice, change24h,
    ema, emaTrend, wt, wtZone, mf, mfLabel,
    vol, volRegime, rsi, structure, fvg, eqLevels,
    volumeProfile, derivatives, btcData,
  } = ind;

  const f = (v, d = 4) => v != null ? parseFloat(v).toFixed(d) : "N/A";

  return `Analyze ${symbol} and generate the complete institutional futures report.

═══════════════════════════════════════════════
LIVE BINGX DATA — ${symbol}
═══════════════════════════════════════════════
PRICE: ${curPrice}  |  24H: ${change24h}%

━━━ EMA STRUCTURE ━━━
Daily  EMA20: ${f(ema.daily.ema20)} | EMA50: ${f(ema.daily.ema50)} | EMA200: ${f(ema.daily.ema200)} → ${emaTrend(ema.daily)}
4H     EMA20: ${f(ema.h4.ema20)}   | EMA50: ${f(ema.h4.ema50)}   | EMA200: ${f(ema.h4.ema200)}   → ${emaTrend(ema.h4)}
1H     EMA20: ${f(ema.h1.ema20)}   | EMA50: ${f(ema.h1.ema50)}   | EMA200: ${f(ema.h1.ema200)}   → ${emaTrend(ema.h1)}
15M    EMA20: ${f(ema.m15.ema20)}  | EMA50: ${f(ema.m15.ema50)}  → ${emaTrend({ ...ema.m15, ema200: null })}

━━━ VUMANCHU WAVETREND ━━━
Daily: ${wtZone(wt.daily)}
4H:    ${wtZone(wt.h4)}
1H:    ${wtZone(wt.h1)}
15M:   ${wtZone(wt.m15)}

━━━ MONEY FLOW (CMF-20) ━━━
Daily: ${mfLabel(mf.daily)} | 4H: ${mfLabel(mf.h4)} | 1H: ${mfLabel(mf.h1)} | 15M: ${mfLabel(mf.m15)}

━━━ RSI-14 ━━━
Daily: ${rsi.daily} | 4H: ${rsi.h4} | 1H: ${rsi.h1} | 15M: ${rsi.m15}

━━━ VOLATILITY ━━━
Daily ATR: ${f(vol.daily.atr)} → ${volRegime(vol.daily.bb)}
4H    ATR: ${f(vol.h4.atr)}   → ${volRegime(vol.h4.bb)}
1H    ATR: ${f(vol.h1.atr)}   → ${volRegime(vol.h1.bb)}
15M   ATR: ${f(vol.m15.atr)}  → ${volRegime(vol.m15.bb)}

━━━ MARKET STRUCTURE ━━━
DAILY → Trend: ${structure.daily.trend} | BOS: ${structure.daily.bos} | CHOCH: ${structure.daily.choch}
  High: ${structure.daily.recentHigh} | Low: ${structure.daily.recentLow} | Position: ${structure.daily.pricePos}
4H    → Trend: ${structure.h4.trend} | BOS: ${structure.h4.bos} | CHOCH: ${structure.h4.choch}
  Swing Highs: ${structure.h4.swingHighs.join(", ")}
  Swing Lows:  ${structure.h4.swingLows.join(", ")}
1H    → Trend: ${structure.h1.trend} | BOS: ${structure.h1.bos}

━━━ FAIR VALUE GAPS ━━━
4H: ${fvg.h4.length ? fvg.h4.map(g => `${g.type} [${g.low}–${g.high}]`).join(" | ") : "None"}
1H: ${fvg.h1.length ? fvg.h1.map(g => `${g.type} [${g.low}–${g.high}]`).join(" | ") : "None"}

━━━ EQUAL LEVELS (LIQUIDITY) ━━━
4H Equal Highs (BSL): ${eqLevels.h4.equalHighs.join(", ") || "None"}
4H Equal Lows  (SSL): ${eqLevels.h4.equalLows.join(", ") || "None"}
1H Equal Highs:       ${eqLevels.h1.equalHighs.join(", ") || "None"}
1H Equal Lows:        ${eqLevels.h1.equalLows.join(", ") || "None"}

━━━ VOLUME ━━━
Daily: ${volumeProfile.daily.expansion} (${volumeProfile.daily.ratio}x avg) | Buy: ${volumeProfile.daily.buyPressure} | Sell: ${volumeProfile.daily.sellPressure}
4H:    ${volumeProfile.h4.expansion}    (${volumeProfile.h4.ratio}x avg)    | Buy: ${volumeProfile.h4.buyPressure}    | Sell: ${volumeProfile.h4.sellPressure}

━━━ DERIVATIVES ━━━
OI:          ${derivatives.oi ? `${derivatives.oi.value}` : "N/A"}
Funding:     ${derivatives.fundingRate}
L/S Ratio:   ${derivatives.lsRatio ? `${derivatives.lsRatio.longRatio} Long | ${derivatives.lsRatio.shortRatio} Short | ${derivatives.lsRatio.dominance}` : "N/A"}

━━━ BTC MACRO CONTEXT ━━━
Price: ${btcData.price} | 24H: ${btcData.change24h} | Trend: ${btcData.trend}

═══════════════════════════════════════════════
Generate the complete institutional analysis report.
Use EXACT price levels from this data for ENTRY, SL, TP.
Calculate RR based on ATR multiples.
Be specific with invalidation price levels.
═══════════════════════════════════════════════`;
}

// ════════════════════════════════════════════════════════════════
//  SSE HELPERS
// ════════════════════════════════════════════════════════════════

export function sseHeaders() {
  return {
    "Content-Type":  "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection":    "keep-alive",
    "X-Accel-Buffering": "no",
    "Access-Control-Allow-Origin": "*",
  };
}

export function sseEvent(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  if (typeof res.flush === "function") res.flush();
}
