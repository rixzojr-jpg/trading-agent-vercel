// api/market.js
import {
  fetchAllMarketData,
  computeIndicators,
} from "./_lib.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const symbol = ((req.query?.symbol) || "BTC-USDT").toUpperCase();

  try {
    const raw  = await fetchAllMarketData(symbol);
    const ind  = computeIndicators(raw, symbol);

    res.json({
      success: true,
      symbol,
      timestamp: new Date().toISOString(),
      metrics: {
        price:     ind.curPrice,
        change24h: ind.change24h,
        ema: {
          daily: { ...ind.ema.daily, trend: ind.emaTrend(ind.ema.daily) },
          h4:    { ...ind.ema.h4,    trend: ind.emaTrend(ind.ema.h4)    },
          h1:    { ...ind.ema.h1,    trend: ind.emaTrend(ind.ema.h1)    },
        },
        wavetrend: {
          daily: ind.wtZone(ind.wt.daily),
          h4:    ind.wtZone(ind.wt.h4),
          h1:    ind.wtZone(ind.wt.h1),
          m15:   ind.wtZone(ind.wt.m15),
        },
        moneyFlow: {
          h4:  ind.mfLabel(ind.mf.h4),
          h1:  ind.mfLabel(ind.mf.h1),
        },
        rsi:         ind.rsi,
        volatility: {
          daily:  ind.volRegime(ind.vol.daily.bb),
          h4:     ind.volRegime(ind.vol.h4.bb),
          h4ATR:  ind.vol.h4.atr?.toFixed(4),
          h1ATR:  ind.vol.h1.atr?.toFixed(4),
          h4BBW:  ind.vol.h4.bb?.width,
        },
        structure:    { daily: ind.structure.daily, h4: ind.structure.h4 },
        fvg:          ind.fvg,
        eqLevels:     ind.eqLevels,
        volumeProfile:ind.volumeProfile,
        derivatives:  ind.derivatives,
        btcContext:   ind.btcData,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
