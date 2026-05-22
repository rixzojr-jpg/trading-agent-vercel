// api/pairs.js — standalone
export const config = { maxDuration: 30 };
const DEFAULT = ["BTC-USDT","ETH-USDT","SOL-USDT","BNB-USDT","XRP-USDT","DOGE-USDT","AVAX-USDT","MATIC-USDT","LINK-USDT","ARB-USDT","OP-USDT","SUI-USDT","APT-USDT","INJ-USDT","TIA-USDT"];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Cache-Control","s-maxage=300");
  if (req.method==="OPTIONS") return res.status(200).end();
  try {
    const r = await fetch("https://open-api.bingx.com/openApi/swap/v2/quote/contracts",{signal:AbortSignal.timeout(5000)});
    const j = await r.json();
    const pairs = j.code===0&&j.data?.length
      ? j.data.filter(c=>c.symbol?.endsWith("-USDT")).map(c=>c.symbol).slice(0,30)
      : DEFAULT;
    res.status(200).json({success:true, pairs: pairs.length?pairs:DEFAULT});
  } catch {
    res.status(200).json({success:true, pairs:DEFAULT});
  }
}
