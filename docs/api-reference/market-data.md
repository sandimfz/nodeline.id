# Market Data API

Endpoint publik untuk mengakses data pasar real-time (forex, saham, crypto).

**Base URL:** `/api/v1/market`

**Auth:** API Key via header `Authorization: Bearer <api_key>`

**Rate Limit:** Bervariasi per endpoint (lihat detail di bawah)

---

## Authentication

Semua endpoint market data memerlukan API key yang dikirim melalui header:

```http
Authorization: Bearer nl_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Atau via custom header:

```http
X-Api-Key: nl_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **Peringatan:** API key bersifat rahasia. Jangan pernah menyimpan atau mengirimkan API key di kode frontend yang publik. Gunakan server-side proxy untuk melindungi key Anda.

### Mendapatkan API Key

1. Login ke dashboard Nodeline
2. Buka menu **API Keys**
3. Klik **Buat Key**, beri nama, dan salin full key yang muncul — hanya ditampilkan sekali!

---

## Endpoints

### GET /market/price/:symbol — Harga Terakhir

Mengembalikan snapshot harga terbaru untuk symbol yang diminta.

**Rate limit:** 60 request/menit

**Parameter path:**

| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `symbol` | string | Kode symbol (lihat daftar symbol di bawah) |

**Response (200):**

```json
{
  "symbol": "FOREXCOM:XAUUSD",
  "price": 4046.80,
  "change": -2.92,
  "changePercent": -0.07,
  "high": 4050.12,
  "low": 4042.50,
  "timestamp": 1717152000123,
  "staleMs": 340
}
```

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `symbol` | string | Kode symbol |
| `price` | number | Harga terakhir |
| `change` | number | Perubahan harga |
| `changePercent` | number | Persentase perubahan |
| `high` | number | Harga tertinggi hari ini |
| `low` | number | Harga terendah hari ini |
| `timestamp` | number | Unix timestamp (ms) data diterima |
| `staleMs` | number | Usia data dalam milidetik |

**Error (404):**
```json
{
  "statusCode": 404,
  "message": "Data harga untuk FOREXCOM:XAUUSD tidak tersedia saat ini",
  "error": "Not Found"
}
```

---

### GET /market/price/:symbol/stream — SSE Realtime Stream

Server-Sent Events stream untuk harga real-time.

**Rate limit:** Sama dengan price snapshot (60 request/menit)

**Response:** SSE dengan event `data:`

```
data: {"symbol":"FOREXCOM:XAUUSD","price":4046.80,"change":-2.92,"changePercent":-0.07,"timestamp":1717152000123}

data: {"symbol":"FOREXCOM:XAUUSD","price":4047.10,"change":-2.62,"changePercent":-0.06,"timestamp":1717152001123}
```

**Catatan implementasi:**

Gunakan `fetch` + `ReadableStream` di server-side Anda (bukan `EventSource` dari browser) untuk menjaga kerahasiaan API key:

```typescript
// Contoh: server-side consumption
const response = await fetch("https://api.nodeline.id/api/v1/market/price/FOREXCOM:XAUUSD/stream", {
  headers: { Authorization: "Bearer nl_live_..." },
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  // Parse SSE data: text dimulai dengan "data: "
  const lines = text.split("\n").filter(l => l.startsWith("data: "));
  for (const line of lines) {
    const data = JSON.parse(line.slice(6));
    console.log("Harga:", data.price);
  }
}
```

---

### GET /market/candles/:symbol — Histori Candle

Mengembalikan data OHLC (Open, High, Low, Close) untuk symbol.

**Rate limit:** 60 request/menit

**Parameter path:**

| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `symbol` | string | Kode symbol |

**Query parameters:**

| Parameter | Tipe | Default | Deskripsi |
|-----------|------|---------|-----------|
| `interval` | string | `1m` | Interval: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d` |
| `limit` | integer | `100` | Jumlah candle (max 1000) |

**Response (200):**

```json
{
  "symbol": "FOREXCOM:XAUUSD",
  "interval": "1m",
  "candles": [
    {
      "timestamp": 1717152000000,
      "open": 4045.50,
      "high": 4047.80,
      "low": 4045.10,
      "close": 4046.80,
      "volume": 1234
    }
  ]
}
```

---

### GET /market/price/:symbol/candle — Aggregasi OHLC per Interval

Mengembalikan candle yang sedang aktif (in-progress) untuk symbol. Data di-aggregasi dari tick real-time.

**Rate limit:** 60 request/menit

**Parameter path:**

| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `symbol` | string | Kode symbol |

**Query parameters:**

| Parameter | Tipe | Default | Deskripsi |
|-----------|------|---------|-----------|
| `interval` | string | `1m` | Interval candle: `1m`, `5m`, `15m`, `1h` |

**Response (200):**

```json
{
  "symbol": "FOREXCOM:XAUUSD",
  "interval": "5m",
  "open": 4045.50,
  "high": 4049.80,
  "low": 4044.10,
  "close": 4048.30,
  "volume": 423,
  "timestamp": 1717152000000
}
```

**Contoh curl:**
```bash
curl -H "Authorization: Bearer nl_live_xxx" \
  "https://api.nodeline.id/api/v1/market/price/FOREXCOM:XAUUSD/candle?interval=5m"
```

---

### GET /market/indicators/:symbol — Indikator Teknikal

Mengembalikan indikator teknikal untuk symbol (RSI, MACD, EMA, dll).

**Rate limit:** 30 request/menit

**Parameter path:**

| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `symbol` | string | Kode symbol |

**Query parameters:**

| Parameter | Tipe | Default | Deskripsi |
|-----------|------|---------|-----------|
| `timeframe` | integer | `1` | Timeframe dalam menit (`1`, `5`, `15`, `30`, `60`, `240`, `1440`) |

**Response (200):**

```json
{
  "symbol": "FOREXCOM:XAUUSD",
  "timeframe": 1,
  "indicators": {
    "close": 4046.80,
    "change": -2.92,
    "changePercent": -0.07,
    "recommendation": 0.5,
    "rsi": 45.2,
    "rsiPrev": 46.1,
    "stochK": 35.8,
    "stochD": 38.2,
    "momentum": -5.3,
    "momentumPrev": -3.1,
    "macd": -1.2,
    "macdSignal": -0.8,
    "ema5": 4047.5,
    "ema10": 4048.2,
    "ema20": 4049.1,
    "sma20": 4050.0,
    "sma50": 4055.3,
    "sma200": 4060.0,
    "bbUpper": 4065.0,
    "bbLower": 4035.0,
    "adx": 22.5,
    "adxPlusDI": 18.3,
    "adxMinusDI": 15.7,
    "ao": 2.1,
    "aoPrev": 1.5,
    "atr": 12.5,
    "high": 4050.12,
    "low": 4042.50
  }
}
```

---

## Daftar Symbol

Berikut adalah symbol yang didukung:

### Forex
| Symbol | Deskripsi |
|--------|-----------|
| `FOREXCOM:XAUUSD` | Gold / XAUUSD |
| `FOREXCOM:XAGUSD` | Silver / XAGUSD |
| `FOREXCOM:GBPUSD` | British Pound / US Dollar |
| `FOREXCOM:EURUSD` | Euro / US Dollar |
| `FOREXCOM:USDJPY` | US Dollar / Japanese Yen |
| `FOREXCOM:USDCAD` | US Dollar / Canadian Dollar |
| `FOREXCOM:USDCHF` | US Dollar / Swiss Franc |
| `FOREXCOM:AUDUSD` | Australian Dollar / US Dollar |
| `FOREXCOM:NZDUSD` | New Zealand Dollar / US Dollar |

### Saham
| Symbol | Deskripsi |
|--------|-----------|
| `NASDAQ:AAPL` | Apple Inc. |
| `NASDAQ:GOOGL` | Alphabet Inc. |
| `NASDAQ:MSFT` | Microsoft Corporation |
| `NASDAQ:TSLA` | Tesla Inc. |
| `NASDAQ:AMZN` | Amazon.com Inc. |
| `NASDAQ:META` | Meta Platforms Inc. |

### Crypto
| Symbol | Deskripsi |
|--------|-----------|
| `CRYPTOCAP:BTC` | Bitcoin |
| `CRYPTOCAP:ETH` | Ethereum |

---

## Contoh Curl

```bash
# Price snapshot
curl -H "Authorization: Bearer nl_live_xxxxxxxx" \
  https://api.nodeline.id/api/v1/market/price/FOREXCOM:XAUUSD

# Aggregasi candle (1m, 5m, 15m, 1h)
curl -H "Authorization: Bearer nl_live_xxxxxxxx" \
  "https://api.nodeline.id/api/v1/market/price/FOREXCOM:XAUUSD/candle?interval=5m"

# Candle history
curl -H "Authorization: Bearer nl_live_xxxxxxxx" \
  "https://api.nodeline.id/api/v1/market/candles/FOREXCOM:XAUUSD?interval=5m&limit=50"

# Indicators
curl -H "Authorization: Bearer nl_live_xxxxxxxx" \
  "https://api.nodeline.id/api/v1/market/indicators/FOREXCOM:XAUUSD?timeframe=15"

# SSE stream
curl -N -H "Authorization: Bearer nl_live_xxxxxxxx" \
  https://api.nodeline.id/api/v1/market/price/FOREXCOM:XAUUSD/stream
```

## Rate Limit & Plan

### Per-Menit (per API Key)

| Plan | Rate Limit |
|------|-----------|
| FREE | 60 request/menit |
| PRO | 300 request/menit |
| ENTERPRISE | 600 request/menit |

### Per-Hari (per User)

Setiap user dibatasi **50 request/hari** — dihitung dari total request semua API key milik user yang sama.

Ketika daily limit terlampaui:
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Daily request limit exceeded. Max 50 requests per day per user."
}
```

Ketika per-minute limit terlampaui:
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Max 60 requests per minute.",
  "retryAfter": 45
}
```

## Error Handling

| Status Code | Deskripsi |
|-------------|-----------|
| 200 | Sukses |
| 401 | API key tidak valid atau tidak ada |
| 403 | API key tidak memiliki akses ke symbol ini |
| 404 | Data tidak tersedia atau symbol tidak didukung |
| 429 | Rate limit terlampaui |
| 500 | Internal server error |
