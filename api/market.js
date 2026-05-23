// api/market.js — standalone, no _lib.js import
export const config = { maxDuration: 60 };
const BINGX = "https://open-api.bingx.com";

async function bx(path, params={}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BINGX}${path}${qs?"?"+qs:""}`, {
    headers:{Accept:"application/json"},
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`BingX ${res.status}`);
  const j = await res.json();
  if (j.code !== 0) throw new Error(j.msg);
  return j.data;
}

async function candles(symbol, interval, limit=100) {
  const raw = await bx("/openApi/swap/v3/quote/klines",{symbol,interval,limit});
  return (raw||[]).map(c=>Array.isArray(c)?c:[c.time,c.open,c.high,c.low,c.close,c.volume]);
}

function ema(arr, p) {
  if(!arr||arr.length<p) return null;
  const k=2/(p+1); let e=arr.slice(0,p).reduce((a,b)=>a+b,0)/p;
  for(let i=p;i<arr.length;i++) e=arr[i]*k+e*(1-k);
  return e;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  if (req.method==="OPTIONS") return res.status(200).end();
  const symbol = ((req.query?.symbol)||"BTC-USDT").toUpperCase();
  try {
    const [dC,h4C,ticker] = await Promise.all([
      candles(symbol,"1d",200), candles(symbol,"4h",100),
      bx("/openApi/swap/v2/quote/ticker",{symbol}),
    ]);
    const cl=c=>c.map(x=>+x[4]);
    const dCl=cl(dC), h4Cl=cl(h4C);
    res.status(200).json({
      success:true, symbol,
      price: +(ticker?.lastPrice||0),
      change24h: +(ticker?.priceChangePercent||0),
      ema:{
        daily:{ema20:ema(dCl,20),ema50:ema(dCl,50),ema200:ema(dCl,200)},
        h4:{ema20:ema(h4Cl,20),ema50:ema(h4Cl,50),ema200:ema(h4Cl,200)},
      },
    });
  } catch(e) {
    res.status(500).json({success:false,error:e.message});
  }
}
