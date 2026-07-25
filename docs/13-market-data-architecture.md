# 13. Market Data Architecture — TradingView Integration

Dokumen ini menjelaskan arsitektur dan alur data di balik sistem Market Data API Nodeline. Sistem ini mengambil data pasar real-time (forex, saham, crypto) dari TradingView melalui koneksi WebSocket unofficial, lalu menyediakannya ke customer melalui REST API dan SSE streaming.

---

## 1. Arsitektur Keseluruhan

```
                         ┌─────────────────────────────────────┐
                         │        TradingView Server           │
                         │  wss://data.tradingview.com/        │
                         │  https://scanner.tradingview.com/   │
                         └──────────────┬──────────────────────┘
                            WebSocket   │      REST (Scanner)
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
    ┌──────────────────────────────┐    ┌──────────────────────────┐
    │ TradingViewSocketService     │    │ TradingViewScannerService │
    │ • WS connection management   │    │ • REST API scanner       │
    │ • Ping/pong keepalive        │    │ • Technical indicators   │
    │ • Protocol parsing (~m~)     │    │ • Cache 10s TTL          │
    │ • Quote session mgmt         │    └──────────┬───────────────┘
    │ • Symbol subscription        │               │
    │ • Tick ring-buffer           │               │
    └──────────────┬───────────────┘               │
                   │                               │
                   │ Event: tradingview.tick        │
                   ▼                               │
    ┌──────────────────────────────┐               │
    │ CandleBuilderService         │               │
    │ • OHLC aggregation           │               │
    │ • 7 intervals (1m - 1d)      │               │
    │ • Active candle in-memory    │               │
    │ • Closed candle ring-buffer  │               │
    └──────────────┬───────────────┘               │
                   │                               │
                   │ Event: candle.closed           │
                   ▼                               │
    ┌──────────────────────────────┐               │
    │ CandleRepository             │               │
    │ • Persist to PostgreSQL      │               │
    │ • ON CONFLICT upsert         │               │
    │ • Historical query           │               │
    └──────────────────────────────┘               │
                   │                               │
                   ▼                               ▼
    ┌──────────────────────────────────────────────────┐
    │            PublicApiController                    │
    │  /market/price/:symbol                           │
    │  /market/price/:symbol/candle                    │
    │  /market/price/:symbol/stream (SSE)              │
    │  /market/candles/:symbol                         │
    │  /market/indicators/:symbol                      │
    └──────────────────────┬───────────────────────────┘
                           │
                           ▼
              ┌──────────────────────┐
              │    Customer API      │
              │   (API Key Auth)     │
              └──────────────────────┘
```

### Komponen Utama

| Service | File | Fungsi |
|---------|------|--------|
| `TradingViewSocketService` | `tradingview/tradingview-socket.service.ts` | WebSocket client ke TradingView |
| `SymbolSubscriptionManager` | `tradingview/symbol-subscription.manager.ts` | Reference-counted subscription tracker |
| `CandleBuilderService` | `candles/candle-builder.service.ts` | OHLC aggregation dari ticks |
| `CandleRepository` | `candles/candle.repository.ts` | Persist candle ke PostgreSQL |
| `TradingViewScannerService` | `scanner/tradingview-scanner.service.ts` | REST client untuk indikator teknikal |
| `PublicApiController` | `public-api/public-api.controller.ts` | REST endpoints untuk customer |

### Data Flow

```
Tick dari TradingView (WS)
  │
  ├──► TradingViewSocketService.handleQuoteUpdate()
  │      ├── Update latestTicks map (snapshot untuk /price)
  │      ├── Push ke tickHistory ring-buffer (3600 ticks max)
  │      └── Emit event 'tradingview.tick'
  │
  ├──► CandleBuilderService.handleTick()
  │      ├── Update active candle untuk 7 interval
  │      ├── Jika interval baru → close candle lama, emit 'candle.closed'
  │      └── Simpan candle aktif di Map<string, Candle>
  │
  └──► CandleRepository.saveCandle()
         ├── INSERT INTO candles ON CONFLICT upsert
         └── Simpan ke PostgreSQL untuk query historis
```

---

## 2. TradingView WebSocket Protocol

### 2.1. Connection

Koneksi ke endpoint unofficial TradingView:

```
wss://data.tradingview.com/socket.io/websocket
```

**Headers:**
```http
Origin: https://data.tradingview.com
```

### 2.2. Message Framing

TradingView menggunakan format multiplexed `~m~`:

```
~m~{length}~m~{json_payload}
```

Contoh:
```
~m~42~m~{"m":"qsd","p":["qs_abc123",{"n":"FOREXCOM:XAUUSD","v":{"lp":4046.80}}]}
```

### 2.3. Handshake Sequence

Setelah WebSocket terbuka, urutan pesan yang dikirim:

```
1. → {"m":"set_auth_token","p":["unauthorized_user_token"]}
2. → {"m":"quote_create_session","p":["qs_{random_hex}"]}
3. → {"m":"quote_add_symbols","p":["qs_xxx","FOREXCOM:XAUUSD"]}
4. → {"m":"quote_set_fields","p":["qs_xxx","lp","ch","chp","high_price","low_price"]}
```

**PENTING:** `quote_add_symbols` harus dikirim SEBELUM `quote_set_fields` (urutan ini berdasarkan implementasi Python yang sudah berfungsi).

### 2.4. Keepalive (Ping/Pong)

TradingView mengirim pesan `~h~{angka}` secara periodik. Server harus mengirim balik pesan yang sama persis:

```
← ~h~42
→ ~h~42
```

### 2.5. Quote Update

Data harga real-time diterima dalam format:

```json
{
  "m": "qsd",
  "p": [
    "qs_session_id",
    {
      "n": "FOREXCOM:XAUUSD",
      "v": {
        "lp": 4046.80,        // Last price
        "ch": -2.92,          // Change
        "chp": -0.07,         // Change percent
        "high_price": 4050.12,
        "low_price": 4042.50
      }
    }
  ]
}
```

### 2.6. Reconnection

Jika koneksi terputus (error, timeout, atau server menutup koneksi), sistem akan mencoba reconnect dengan **exponential backoff**:

- Base delay: 1.000 ms
- Formula: `min(1000 * 2^attempt + random(0-1000), 60000)` ms
- Maksimal delay: 60.000 ms (1 menit)
- Counter reset saat koneksi berhasil

---

## 3. Symbol Subscription Manager

### 3.1. Reference Counting

`SymbolSubscriptionManager` menggunakan **reference counting** untuk menghindari subscribe/ unsubscribe yang tidak perlu ke WebSocket.

```typescript
subscribe(symbol: string): boolean
  // Return: true jika perlu kirim ke WS (first subscriber)
  //         false jika sudah ada subscriber lain

unsubscribe(symbol: string): boolean
  // Return: true jika perlu kirim remove ke WS (last unsubscriber)
  //         false jika masih ada subscriber lain
```

### 3.2. Contoh Skenario

```
Consumer A subscribe("XAUUSD") → refCount=1 → kirim ke WS ✅
Consumer B subscribe("XAUUSD") → refCount=2 → skip (already on wire)
Consumer A unsubscribe("XAUUSD") → refCount=1 → skip (B masih pakai)
Consumer B unsubscribe("XAUUSD") → refCount=0 → kirim remove ke WS ✅
```

### 3.3. Default Subscriptions

Saat pertama konek, 3 symbol default langsung di-subscribe:

```
FOREXCOM:XAUUSD
FOREXCOM:XAGUSD
FOREXCOM:EURUSD
```

Symbol tambahan di-subscribe otomatis ketika customer memanggil endpoint yang membutuhkan data symbol tersebut.

---

## 4. Candle Builder (OHLC Aggregation)

### 4.1. Interval yang Didukung

| Interval | Label | Implementasi |
|----------|-------|-------------|
| 1 menit | `1m` | `setUTCSeconds(0, 0)` |
| 5 menit | `5m` | `floor(minutes/5) * 5` |
| 15 menit | `15m` | `floor(minutes/15) * 15` |
| 30 menit | `30m` | `floor(minutes/30) * 30` |
| 1 jam | `1h` | `setUTCMinutes(0, 0, 0)` |
| 4 jam | `4h` | `floor(hours/4) * 4` |
| 1 hari | `1d` | `setUTCHours(0, 0, 0, 0)` |

### 4.2. Logic Pembentukan Candle

Setiap kali tick masuk dari TradingView, candle builder memproses untuk semua 7 interval:

```
processTick(tick):
  for each interval in [1m, 5m, 15m, 30m, 1h, 4h, 1d]:
    key = symbol + ":" + interval
    candleStart = roundDown(tick.timestamp, interval)
    
    if no active candle OR candleStart > activeCandle.timestamp:
        close old candle (emit 'candle.closed')
        create new candle:
            open = tick.price
            high = tick.price
            low = tick.price
            close = tick.price
            timestamp = candleStart
    
    else (same interval bucket):
        update existing candle:
            high = max(high, tick.price)
            low = min(low, tick.price)
            close = tick.price
            volume += tick.volume
```

### 4.3. Candle Lifecycle

```
Timeline:
                    ┌───────────────── Candle 1m ────────────────┐
Tick:     T1──T2──T3──T4──T5──T6──T7──T8──T9──T10──T11──T12──→
                 ↑                           ↑
            Candle bucket 1              Candle bucket 2
            (10:00:00 - 10:00:59)       (10:01:00 - 10:01:59)

State:
  - Active candle (in memory): candle yang sedang dibangun
  - Closed candle: ketika tick baru melewati interval boundary:
      → emit 'candle.closed' event
      → pindah ke closedCandles ring-buffer (max 5000)
      → di-persist ke PostgreSQL oleh CandleRepository
```

### 4.4. In-Memory Storage

| Storage | Struktur | Kapasitas | Tujuan |
|---------|----------|-----------|--------|
| `activeCandles` | `Map<symbol:interval, Candle>` | Per symbol × 7 interval | Endpoint /price/:symbol/candle |
| `closedCandles` | `Candle[]` ring-buffer | 5.000 candle | Endpoint /candles/:symbol (fallback jika DB kosong) |

---

## 5. Candle Persistence (PostgreSQL)

### 5.1. Tabel

```sql
CREATE TABLE "candles" (
    "symbol" varchar(50) NOT NULL,
    "interval" varchar(5) NOT NULL,
    "open" double precision NOT NULL,
    "high" double precision NOT NULL,
    "low" double precision NOT NULL,
    "close" double precision NOT NULL,
    "volume" double precision DEFAULT 0 NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    "closed_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "candles_pkey" PRIMARY KEY ("symbol", "interval", "timestamp")
);
```

### 5.2. Upsert Strategy

`CandleRepository` menggunakan **ON CONFLICT upsert** karena candle yang sama bisa mendapat update dari tick lanjutan:

```sql
INSERT INTO "candles" (symbol, interval, open, high, low, "close", volume, timestamp)
VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8 / 1000))
ON CONFLICT (symbol, interval, timestamp) DO UPDATE SET
    high = GREATEST("candles".high, $9),
    low = LEAST("candles".low, $10),
    "close" = $11,
    volume = $12
```

### 5.3. Query Flow (Candle History)

Saat customer meminta candle history (`/candles/:symbol`):

```
1. Coba ambil dari PostgreSQL dulu (persisted candles)
2. Jika ada → return dari DB (data komplit)
3. Jika kosong → fallback ke in-memory CandleBuilderService
```

---

## 6. TradingView Scanner (Technical Indicators)

### 6.1. REST Endpoint

Menggunakan endpoint scanner TradingView yang tidak terdokumentasi:

```
POST https://scanner.tradingview.com/{market}/scan
```

### 6.2. Symbol Mapping

Symbol format TradingView di-scanner berbeda dengan format quote:

| Quote Symbol | Scanner Symbol |
|-------------|----------------|
| `FOREXCOM:XAUUSD` | `FX:XAUUSD` |
| `FOREXCOM:EURUSD` | `FX:EURUSD` |
| `NASDAQ:AAPL` | `NASDAQ:AAPL` (sama) |

Mapping dilakukan di `TradingViewScannerService.toScannerSymbol()`:

```typescript
if (symbol.startsWith('FOREXCOM:')) {
  return `FX:${symbol.slice(9)}`;
}
return symbol;
```

### 6.3. Columns yang Diminta

Scanner diminta untuk mengembalikan kolom-kolom berikut:

```
name, description, close, change, change_abs,
Recommend.All, RSI, RSI[1], Stoch.K, Stoch.D,
Mom, Mom[1], MACD.macd, MACD.signal,
EMA5, EMA10, EMA20, SMA20, SMA50, SMA200,
BB.upper, BB.lower, ADX, ADX+DI, ADX-DI,
AO, AO[1], ATR, high, low
```

### 6.4. Caching

Hasil scanner di-cache in-memory dengan **TTL 10 detik** untuk menghindari request berulang ke TradingView.

---

## 7. Public API Controller

### 7.1. Endpoint Mapping

| HTTP Method | Path | Sumber Data |
|-------------|------|-------------|
| `GET` | `/market/price/:symbol` | `TradingViewSocketService.getSnapshot()` |
| `GET` | `/market/price/:symbol/candle` | `CandleBuilderService.getActiveCandle()` |
| `GET` | `/market/price/:symbol/stream` | SSE — `EventEmitter.on('tradingview.tick')` |
| `GET` | `/market/candles/:symbol` | `CandleRepository.queryCandles()` + fallback |
| `GET` | `/market/indicators/:symbol` | `TradingViewScannerService.getIndicators()` |

### 7.2. Auto-Subscribe

Setiap endpoint otomatis memanggil `tradingView.subscribe(symbol)` untuk memastikan symbol yang diminta sedang di-subscribe di WebSocket. Ini menggunakan reference counting — jika sudah ada subscriber lain, tidak akan mengirim duplikat ke WS.

### 7.3. SSE Streaming

Endpoint `/price/:symbol/stream` menggunakan **Server-Sent Events**:

```
Response headers:
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive
  X-Accel-Buffering: no

Format:
  data: {"symbol":"FOREXCOM:XAUUSD","price":4046.80,...}

Lifecycle:
  1. Kirim snapshot harga terbaru saat koneksi terbuka
  2. Subscribe ke event 'tradingview.tick'
  3. Filter tick berdasarkan symbol yang diminta
  4. Kirim tick sebagai SSE data event
  5. Saat client disconnect → cleanup listener
```

### 7.4. Symbol Validation

Semua endpoint memvalidasi symbol terhadap `SUPPORTED_SYMBOLS` Set:

```typescript
const SUPPORTED_SYMBOLS = new Set([
  'FOREXCOM:XAUUSD', 'FOREXCOM:XAGUSD', 'FOREXCOM:GBPUSD',
  'FOREXCOM:EURUSD', 'FOREXCOM:USDJPY', 'FOREXCOM:USDCAD',
  'FOREXCOM:USDCHF', 'FOREXCOM:AUDUSD', 'FOREXCOM:NZDUSD',
  'NASDAQ:AAPL', 'NASDAQ:GOOGL', 'NASDAQ:MSFT', 'NASDAQ:TSLA',
  'NASDAQ:AMZN', 'NASDAQ:META',
  'CRYPTOCAP:BTC', 'CRYPTOCAP:ETH',
]);
```

### 7.5. Guard Stack

Setiap endpoint melewati rangkaian guards:

```
ApiKeyGuard → RateLimitGuard → UserDailyLimitGuard
     │              │                  │
     │        Per-minute limit    Per-user daily limit
     │        (60-600/menit)      (50 request/hari)
     │
  Validasi API key
  Set request.apiKey
```

---

## 8. Rate Limiting

| Layer | Cakupan | Limit | Guard |
|-------|---------|-------|-------|
| Per-minute | Per API Key | 60-600/menit (tergantung plan) | `RateLimitGuard` (NestJS Throttler) |
| Per-day | Per User | 50 request/hari | `UserDailyLimitGuard` (in-memory counter) |

`UserDailyLimitGuard` menggunakan in-memory Map dengan key `{userId}:{YYYY-MM-DD}`. Entry stale dibersihkan setiap 10 menit.

---

## 9. Error States

| Kondisi | HTTP Code | Pesan |
|---------|-----------|-------|
| Symbol tidak didukung | 404 | `Symbol ${symbol} tidak didukung` |
| Data belum tersedia | 404 | `Data harga untuk ${symbol} tidak tersedia saat ini` |
| API key tidak punya akses | 403 | `API key tidak memiliki akses ke symbol ${symbol}` |
| Interval tidak valid | 404 | `Interval ${interval} tidak valid. Gunakan: 1m, 5m, ...` |
| Daily limit exceeded | 429 | `Daily request limit exceeded. Max 50 requests per day per user.` |
| WS not connected | 503 (implisit) | Snapshot/candle tidak tersedia jika WS belum connect |

---

## 10. Dependencies

| Package | Versi | Penggunaan |
|---------|-------|------------|
| `ws` | ^8.21.1 | WebSocket client |
| `@nestjs/event-emitter` | ^3.1.0 | Event bus untuk tick → candle → persist |
| `drizzle-orm` | ^0.45.2 | Database query via raw SQL |
| `pg` | ^8.22.0 | PostgreSQL driver |

---

## 11. Catatan Penting

1. **Unofficial API**: Endpoint `data.tradingview.com` dan `scanner.tradingview.com` tidak terdokumentasi secara publik. Risiko: bisa berubah atau diblokir kapan saja.

2. **Single Instance**: WebSocket client adalah singleton. Tidak bisa di-scale ke multiple instance tanpa Redis pub/sub untuk menyebarkan tick.

3. **In-Memory State**: Tick history, candle aktif, dan subscription state semuanya in-memory. Jika server restart, data akan hilang (kecuali candle yang sudah di-persist ke PostgreSQL).

4. **Data Latency**: Data memiliki field `staleMs` yang menunjukkan usia data dalam milidetik. Data dianggap segar jika `staleMs < 5000` (5 detik).

5. **Scanner Caching**: Indicator di-cache 10 detik. Untuk data real-time, gunakan endpoint price atau SSE stream.
