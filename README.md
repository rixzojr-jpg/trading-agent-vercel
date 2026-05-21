# TRADING AGENT — MA × VMC × S&R × SMART MONEY AI

### Powered by NousResearch Hermes-3 via OpenRouter

Institutional-grade AI crypto futures analysis.
**Data:** BingX API · **AI:** NousResearch Hermes-3-405B · **Deploy:** Vercel

-----

## 🗂 File Structure

```
trading-agent-vercel/
├── api/
│   ├── _lib.js       ← indicators + BingX fetcher + prompt builder
│   ├── analyze.js    ← SSE stream: Hermes-3 analysis (main endpoint)
│   ├── market.js     ← raw computed indicators JSON
│   ├── pairs.js      ← available trading pairs
│   └── health.js     ← health check + key status
├── index.html        ← frontend UI
├── package.json
├── vercel.json       ← function timeouts config
└── .env.example      ← template env variables
```

-----

## 🔑 Step 1 — Daftar OpenRouter & Dapatkan API Key

1. Buka **<https://openrouter.ai>**
1. Klik **Sign In** → daftar dengan Google/GitHub
1. Masuk ke **Dashboard → Keys**
1. Klik **+ Create Key** → beri nama → copy key
1. Simpan key-nya: `sk-or-v1-xxxxxxxxxxxxxxx`

> OpenRouter gratis untuk model tertentu. Hermes-3-405B berbayar per token
> (sangat murah, sekitar $0.80/1M token input).
> Top up minimal $5 di **<https://openrouter.ai/credits>**

-----

## 🚀 Step 2 — Deploy ke Vercel

### A. Push ke GitHub

```bash
git init
git add .
git commit -m "trading agent — hermes-3 via openrouter"
git remote add origin https://github.com/USERNAME/trading-agent.git
git push -u origin main
```

### B. Import di Vercel

1. Buka **<https://vercel.com/new>**
1. Klik **Import Git Repository**
1. Pilih repo `trading-agent`
1. Klik **Import**

### C. Set Environment Variable

Di halaman konfigurasi Vercel sebelum deploy:

|Key                 |Value                     |
|--------------------|--------------------------|
|`OPENROUTER_API_KEY`|`sk-or-v1-xxxxxxxxxxxxxxx`|

Environment: centang **Production + Preview + Development**

### D. Deploy

Klik **Deploy** → tunggu ~1 menit ✅

-----

## ✅ Step 3 — Verifikasi

Test endpoint health:

```
https://your-app.vercel.app/api/health
```

Response sukses:

```json
{
  "status": "OK",
  "aiEngine": "NousResearch Hermes-3 via OpenRouter",
  "model": "nousresearch/hermes-3-llama-3.1-405b",
  "openrouterKey": "CONFIGURED (sk-or-...xxxx)"
}
```

-----

## 🔄 Ganti Model Hermes

Edit baris `HERMES_MODEL` di `api/analyze.js`:

```js
// Flagship — paling cerdas
const HERMES_MODEL = "nousresearch/hermes-3-llama-3.1-405b";

// Cepat & hemat
const HERMES_MODEL = "nousresearch/hermes-3-llama-3.1-70b";

// Ultra cepat (gratis di OpenRouter)
const HERMES_MODEL = "nousresearch/hermes-3-llama-3.2-3b-preview";
```

Setelah edit → `git push` → Vercel auto re-deploy.

-----

## 🔌 API Endpoints

|Endpoint                          |Keterangan                  |
|----------------------------------|----------------------------|
|`GET /api/health`                 |Status server + validasi key|
|`GET /api/pairs`                  |Daftar trading pair         |
|`GET /api/market?symbol=BTC-USDT` |Data indikator JSON         |
|`GET /api/analyze?symbol=BTC-USDT`|SSE stream analisis AI      |

-----

## ⚠️ Disclaimer

For educational purposes only. Not financial advice. Trade at your own risk.