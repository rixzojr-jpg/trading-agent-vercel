// api/pairs.js
const DEFAULT_PAIRS = [
  "BTC-USDT","ETH-USDT","SOL-USDT","BNB-USDT","XRP-USDT",
  "DOGE-USDT","AVAX-USDT","MATIC-USDT","LINK-USDT","ARB-USDT",
  "OP-USDT","SUI-USDT","APT-USDT","INJ-USDT","TIA-USDT",
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const response = await fetch(
      "https://open-api.bingx.com/openApi/swap/v2/quote/contracts",
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
    );
    const json = await response.json();
    if (json.code === 0 && json.data?.length) {
      const popular = new Set(DEFAULT_PAIRS);
      const pairs = json.data
        .filter(c => popular.has(c.symbol))
        .map(c => c.symbol);
      return res.json({ success: true, pairs: pairs.length ? pairs : DEFAULT_PAIRS });
    }
  } catch {}
  res.json({ success: true, pairs: DEFAULT_PAIRS });
}
