// ═══════════════════════════════════════════════════════════════
//  api/analyze.js — STANDALONE (no external imports)
//  AI: NousResearch Hermes-3 via OpenRouter
//  Data: BingX Public API
// ═══════════════════════════════════════════════════════════════

export const config = { maxDuration: 300 };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const HERMES_MODEL   = "nousresearch/hermes-3-llama-3.1-405b";
const BINGX          = "https://open-api.bingx.com";

// ════════════════════════════════════════════════════════════════
//  SYSTEM PROMPT
// ════════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `You are an advanced institutional-grade AI crypto futures trading agent.
Name: TRADING AGENT — MA × VMC × S&R × SMART MONEY AI

Think like: proprietary trading desk, hedge fund analyst, smart money liquidity hunter.

ENGINES: EMA Trend, VuManChu Cipher, Money Flow, Smart Money (BOS/CHOCH/FVG), Liquidity, Volatility (ATR/BB), Derivatives (OI/Funding/LS), Multi-Timeframe (Daily/4H/1H/15m), Market Context (BTC).

EMA: STRONG BULLISH = EMA20>EMA50>EMA200 | STRONG BEARISH = EMA20<EMA50<EMA200
WT: OB>+53, OS<-53, Extreme>±60
Derivatives: Rising OI+Price=bullish | Rising OI+Fall=bearish | Positive funding=long squeeze risk

ENTRY: only if multi-TF aligned + structure valid + liquidity confirmed + volatility expanding + RR≥1:3
NO TRADE if: chop/low-vol/conflicting TF/fake momentum

CONFIDENCE: 90-100=exceptional | 75-89=high | 60-74=moderate | <60=avoid

Return EXACTLY this format, no deviation:

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

[specific price levels that cancel the setup]

Language: precise, probabilistic, objective, professional. Zero hype.`;

// ════════════════════════════════════════════════════════════════
//  INDICATORS
// ════════════════════════════════════════════════════════════════
function calcEMA(arr, p) {
  if (!arr || arr.length < p) return null;
  const k = 2 / (p + 1);
  let e = arr.slice(0, p).reduce((a, b) => a + b, 0) / p;
  for (let i = p; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
  return e;
}

function calcATR(c, p = 14) {
  if (!c || c.length < p + 1) return null;
  const trs = [];
  for (let i = 1; i < c.length; i++) {
    const h = +c[i][2], l = +c[i][3], pc = +c[i-1][4];
    trs.push(Math.max(h-l, Math.abs(h-pc), Math.abs(l-pc)));
  }
  return trs.slice(-p).reduce((a,b) => a+b, 0) / p;
}

function calcBB(arr, p = 20) {
  if (!arr || arr.length < p) return null;
  const s = arr.slice(-p);
  const m = s.reduce((a,b) => a+b, 0) / p;
  const std = Math.sqrt(s.reduce((a,b) => a+(b-m)**2, 0) / p);
  return { width: ((4*std)/m*100).toFixed(2), upper: m+2*std, lower: m-2*std };
}

function calcCMF(c, p = 20) {
  if (!c || c.length < p) return null;
  let mfv = 0, vol = 0;
  c.slice(-p).forEach(x => {
    const h=+x[2],l=+x[3],cl=+x[4],v=+x[5];
    mfv += (h!==l ? ((cl-l)-(h-cl))/(h-l) : 0) * v;
    vol += v;
  });
  return vol ? mfv/vol : 0;
}

function calcWT(c, n1=10, n2=21) {
  if (!c || c.length < n2+5) return null;
  const hlc3 = c.map(x => (+x[2]+ +x[3]+ +x[4])/3);
  const k1 = 2/(n1+1);
  let esa = hlc3[0];
  const esas = hlc3.map((v,i) => { if(i>0) esa=v*k1+esa*(1-k1); return esa; });
  const d = hlc3.map((v,i) => Math.abs(v-esas[i]));
  let de = d[0];
  const des = d.map((v,i) => { if(i>0) de=v*k1+de*(1-k1); return de; });
  const ci = hlc3.map((v,i) => des[i] ? (v-esas[i])/(0.015*des[i]) : 0);
  const k2 = 2/(n2+1); let wt = ci[0];
  ci.forEach((v,i) => { if(i>0) wt=v*k2+wt*(1-k2); });
  return parseFloat(wt.toFixed(2));
}

function calcRSI(arr, p=14) {
  if (!arr || arr.length < p+1) return null;
  let g=0,l=0;
  for(let i=1;i<=p;i++){const d=arr[i]-arr[i-1]; d>0?g+=d:l-=d;}
  let ag=g/p, al=l/p;
  for(let i=p+1;i<arr.length;i++){
    const d=arr[i]-arr[i-1];
    ag=(ag*(p-1)+Math.max(d,0))/p; al=(al*(p-1)+Math.max(-d,0))/p;
  }
  return parseFloat((100-100/(1+(al===0?Infinity:ag/al))).toFixed(2));
}

function detectStruct(c) {
  const highs=c.slice(-20).map(x=>+x[2]), lows=c.slice(-20).map(x=>+x[3]);
  const rH=Math.max(...highs), rL=Math.min(...lows);
  const last=+c[c.length-1][4];
  let trend="NEUTRAL", bos="NONE";
  if(c.length>=40){
    const ph=Math.max(...c.slice(-40,-20).map(x=>+x[2]));
    const pl=Math.min(...c.slice(-40,-20).map(x=>+x[3]));
    if(rH>ph && rL>pl){trend="BULLISH"; bos="BULLISH BOS — Higher High confirmed";}
    else if(rH<ph && rL<pl){trend="BEARISH"; bos="BEARISH BOS — Lower Low confirmed";}
  }
  return { trend, bos, rH: rH.toFixed(4), rL: rL.toFixed(4), pos:((last-rL)/(rH-rL)*100).toFixed(1)+"%" };
}

function detectFVG(c) {
  const fvgs=[];
  for(let i=2;i<c.length;i++){
    const pH=+c[i-2][2],pL=+c[i-2][3],cH=+c[i][2],cL=+c[i][3];
    if(cL>pH) fvgs.push(`BULLISH FVG [${pH.toFixed(4)}–${cL.toFixed(4)}]`);
    if(cH<pL) fvgs.push(`BEARISH FVG [${cH.toFixed(4)}–${pL.toFixed(4)}]`);
  }
  return fvgs.slice(-2).join(" | ") || "None";
}

function eqLevels(c, tol=0.002) {
  const h=c.slice(-20).map(x=>+x[2]), l=c.slice(-20).map(x=>+x[3]);
  const eH=[], eL=[];
  for(let i=0;i<h.length-1;i++) for(let j=i+1;j<h.length;j++)
    if(Math.abs(h[i]-h[j])/h[i]<tol) eH.push(((h[i]+h[j])/2).toFixed(4));
  for(let i=0;i<l.length-1;i++) for(let j=i+1;j<l.length;j++)
    if(Math.abs(l[i]-l[j])/l[i]<tol) eL.push(((l[i]+l[j])/2).toFixed(4));
  return { highs:[...new Set(eH)].slice(-2).join(", ")||"None", lows:[...new Set(eL)].slice(-2).join(", ")||"None" };
}

// ════════════════════════════════════════════════════════════════
//  BINGX FETCHER
// ════════════════════════════════════════════════════════════════
async function bx(path, params={}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BINGX}${path}${qs?"?"+qs:""}`, {
    headers: { Accept: "application/json", "User-Agent": "TradingAgent/1.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`BingX HTTP ${res.status} ${path}`);
  const j = await res.json();
  if (j.code !== 0) throw new Error(`BingX: ${j.msg}`);
  return j.data;
}

async function candles(symbol, interval, limit=150) {
  const raw = await bx("/openApi/swap/v3/quote/klines", { symbol, interval, limit });
  return (raw||[]).map(c => Array.isArray(c)?c:[c.time,c.open,c.high,c.low,c.close,c.volume]);
}

// ════════════════════════════════════════════════════════════════
//  COMPUTE ALL INDICATORS
// ════════════════════════════════════════════════════════════════
async function computeAll(symbol) {
  const [dC,h4C,h1C,m15C,ticker] = await Promise.all([
    candles(symbol,"1d",200), candles(symbol,"4h",200),
    candles(symbol,"1h",100), candles(symbol,"15m",100),
    bx("/openApi/swap/v2/quote/ticker",{symbol}),
  ]);

  const [oi,fund,ls] = await Promise.allSettled([
    bx("/openApi/swap/v2/quote/openInterest",{symbol}),
    bx("/openApi/swap/v2/quote/fundingRate",{symbol}),
    bx("/openApi/swap/v2/quote/longShortRatio",{symbol,period:"1h",limit:1}),
  ]);

  let btc=null;
  if(symbol!=="BTC-USDT") try{ btc=await bx("/openApi/swap/v2/quote/ticker",{symbol:"BTC-USDT"}); }catch{}

  const cl = c => c.map(x=>+x[4]);
  const dCl=cl(dC), h4Cl=cl(h4C), h1Cl=cl(h1C), m15Cl=cl(m15C);
  const price = +(ticker?.lastPrice||ticker?.price||dCl.at(-1));
  const ch24  = (+( ticker?.priceChangePercent||0)).toFixed(2);

  const emaTrend = e => {
    if(!e[0]||!e[1]) return "N/A";
    if(e[2]){ if(e[0]>e[1]&&e[1]>e[2]) return "STRONG BULLISH"; if(e[0]<e[1]&&e[1]<e[2]) return "STRONG BEARISH"; if(e[0]>e[1]&&e[1]<e[2]) return "TRANSITIONING BULLISH"; if(e[0]<e[1]&&e[1]>e[2]) return "TRANSITIONING BEARISH"; }
    return e[0]>e[1]?"BULLISH BIAS":"BEARISH BIAS";
  };
  const wtZone = v => !v?"N/A": v>60?"EXTREME OVERBOUGHT("+v+")":v>53?"OVERBOUGHT("+v+")":v<-60?"EXTREME OVERSOLD("+v+")":v<-53?"OVERSOLD("+v+")":"NEUTRAL("+v+")";
  const mfLbl  = v => !v?"N/A": v>0.1?"STRONG BULLISH("+v.toFixed(3)+")":v>0?"MILD BULLISH("+v.toFixed(3)+")":v<-0.1?"STRONG BEARISH("+v.toFixed(3)+")":"MILD BEARISH("+v.toFixed(3)+")";
  const volReg = bb => !bb?"N/A": +bb.width>8?"EXTREME(BBW "+bb.width+"%)":+bb.width>4?"EXPANSION(BBW "+bb.width+"%)":"COMPRESSION(BBW "+bb.width+"%)";

  const ema = {
    d:  [calcEMA(dCl,20),calcEMA(dCl,50),calcEMA(dCl,200)],
    h4: [calcEMA(h4Cl,20),calcEMA(h4Cl,50),calcEMA(h4Cl,200)],
    h1: [calcEMA(h1Cl,20),calcEMA(h1Cl,50),calcEMA(h1Cl,200)],
    m15:[calcEMA(m15Cl,20),calcEMA(m15Cl,50),null],
  };

  const f=(v,d=4)=>v!=null?parseFloat(v).toFixed(d):"N/A";
  const struct = { d:detectStruct(dC), h4:detectStruct(h4C), h1:detectStruct(h1C) };
  const fundRate = fund.status==="fulfilled"?((+fund.value.lastFundingRate)*100).toFixed(4)+"%":"N/A";
  const oiVal    = oi.status==="fulfilled"?parseFloat(oi.value.openInterest).toFixed(2):"N/A";
  const lsVal    = ls.status==="fulfilled"&&ls.value?.[0]
    ? `${(+ls.value[0].longAccount*100).toFixed(1)}% Long / ${(+ls.value[0].shortAccount*100).toFixed(1)}% Short`
    : "N/A";

  const btcTrend = btc
    ? `${(+btc.priceChangePercent)>1?"BULLISH":(+btc.priceChangePercent)<-1?"BEARISH":"SIDEWAYS"} ($${parseFloat(btc.lastPrice).toFixed(0)}, ${parseFloat(btc.priceChangePercent).toFixed(2)}%)`
    : "SELF (analyzing BTC)";

  // Build metrics object for frontend
  const metrics = {
    price, change24h: ch24,
    ema: {
      daily:{ ema20:f(ema.d[0]), ema50:f(ema.d[1]), ema200:f(ema.d[2]), trend:emaTrend(ema.d) },
      h4:   { ema20:f(ema.h4[0]),ema50:f(ema.h4[1]),ema200:f(ema.h4[2]),trend:emaTrend(ema.h4) },
      h1:   { ema20:f(ema.h1[0]),ema50:f(ema.h1[1]),ema200:f(ema.h1[2]),trend:emaTrend(ema.h1) },
    },
    wavetrend:{ h4:wtZone(calcWT(h4C)), h1:wtZone(calcWT(h1C)), m15:wtZone(calcWT(m15C)) },
    moneyFlow:{ h4:mfLbl(calcCMF(h4C)), h1:mfLbl(calcCMF(h1C)) },
    volatility:{ h4ATR:f(calcATR(h4C)), h1ATR:f(calcATR(h1C)), h4BBW:calcBB(h4Cl)?.width, regime:volReg(calcBB(h4Cl)) },
    rsi:{ daily:calcRSI(dCl), h4:calcRSI(h4Cl), h1:calcRSI(h1Cl), m15:calcRSI(m15Cl) },
    derivatives:{ oi:{ value:oiVal }, fundingRate:fundRate, lsRatio:{ raw:lsVal } },
    btcContext:{ trend:btcTrend },
  };

  // Build AI prompt
  const prompt = `Analyze ${symbol} — generate full institutional report.

PRICE: ${price} | 24H: ${ch24}%

EMA:
Daily  EMA20:${f(ema.d[0])} EMA50:${f(ema.d[1])} EMA200:${f(ema.d[2])} → ${emaTrend(ema.d)}
4H     EMA20:${f(ema.h4[0])} EMA50:${f(ema.h4[1])} EMA200:${f(ema.h4[2])} → ${emaTrend(ema.h4)}
1H     EMA20:${f(ema.h1[0])} EMA50:${f(ema.h1[1])} EMA200:${f(ema.h1[2])} → ${emaTrend(ema.h1)}
15M    EMA20:${f(ema.m15[0])} EMA50:${f(ema.m15[1])} → ${emaTrend(ema.m15)}

WAVETREND: 4H:${wtZone(calcWT(h4C))} | 1H:${wtZone(calcWT(h1C))} | 15M:${wtZone(calcWT(m15C))}
MONEY FLOW: 4H:${mfLbl(calcCMF(h4C))} | 1H:${mfLbl(calcCMF(h1C))}
RSI-14: Daily:${calcRSI(dCl)} | 4H:${calcRSI(h4Cl)} | 1H:${calcRSI(h1Cl)} | 15M:${calcRSI(m15Cl)}

VOLATILITY:
Daily ATR:${f(calcATR(dC))} → ${volReg(calcBB(dCl))}
4H    ATR:${f(calcATR(h4C))} → ${volReg(calcBB(h4Cl))}
1H    ATR:${f(calcATR(h1C))} → ${volReg(calcBB(h1Cl))}

STRUCTURE:
Daily  → Trend:${struct.d.trend} BOS:${struct.d.bos} High:${struct.d.rH} Low:${struct.d.rL} Pos:${struct.d.pos}
4H     → Trend:${struct.h4.trend} BOS:${struct.h4.bos} High:${struct.h4.rH} Low:${struct.h4.rL}
1H     → Trend:${struct.h1.trend} BOS:${struct.h1.bos}

FAIR VALUE GAPS:
4H: ${detectFVG(h4C.slice(-30))}
1H: ${detectFVG(h1C.slice(-20))}

EQUAL LEVELS (Liquidity):
4H EqualHighs(BSL):${eqLevels(h4C).highs} | EqualLows(SSL):${eqLevels(h4C).lows}
1H EqualHighs:${eqLevels(h1C).highs} | EqualLows:${eqLevels(h1C).lows}

DERIVATIVES:
OI: ${oiVal} | Funding: ${fundRate} | L/S: ${lsVal}

BTC CONTEXT: ${btcTrend}

Use EXACT prices from data for ENTRY, SL, TP. Calculate RR from ATR. Be specific on invalidation.`;

  return { metrics, prompt };
}

// ════════════════════════════════════════════════════════════════
//  SSE HELPERS
// ════════════════════════════════════════════════════════════════
function sendSSE(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  if (typeof res.flush === "function") res.flush();
}

// ════════════════════════════════════════════════════════════════
//  HANDLER
// ════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin","*");
    return res.status(200).end();
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY not set in Vercel Environment Variables." });
  }

  const symbol  = ((req.query?.symbol) || "BTC-USDT").toUpperCase();
  const appUrl  = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://trading-agent.vercel.app";

  res.setHeader("Content-Type","text/event-stream");
  res.setHeader("Cache-Control","no-cache, no-transform");
  res.setHeader("Connection","keep-alive");
  res.setHeader("X-Accel-Buffering","no");
  res.setHeader("Access-Control-Allow-Origin","*");
  res.flushHeaders();

  try {
    sendSSE(res,"status",{ message:`📡 Fetching BingX data for ${symbol}...` });
    const { metrics, prompt } = await computeAll(symbol);

    sendSSE(res,"metrics", metrics);
    sendSSE(res,"status",{ message:"🤖 Streaming Hermes-3 via OpenRouter..." });

    const aiRes = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer":  appUrl,
        "X-Title":       "Trading Agent AI",
      },
      body: JSON.stringify({
        model: HERMES_MODEL,
        stream: true,
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          { role:"system", content:SYSTEM_PROMPT },
          { role:"user",   content:prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      throw new Error(`OpenRouter ${aiRes.status}: ${err}`);
    }

    const reader  = aiRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value,{stream:true}).split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") break;
        try {
          const txt = JSON.parse(raw)?.choices?.[0]?.delta?.content;
          if (txt) sendSSE(res,"token",{ text:txt });
        } catch {}
      }
    }

    sendSSE(res,"done",{ message:"Analysis complete." });
    res.end();

  } catch (err) {
    console.error("[analyze error]", err.message);
    sendSSE(res,"error",{ message: err.message });
    res.end();
  }
}
