"""worldmarkets.in API — fetch-and-cache backend.

$0 budget strategy: every external source (Yahoo Finance via yfinance,
CoinGecko public API, AMFI NAV dump, RSS news) is fetched through a single
TTL cache so upstream APIs are hit at most once per TTL window regardless
of how many clients poll /api/markets.
"""

import logging
import os
import threading
import time
from email.utils import parsedate_to_datetime

import requests
import yfinance as yf
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("worldmarkets")

app = FastAPI(title="worldmarkets.in API")

# Comma-separated list, e.g. "https://worldmarkets.in,https://www.worldmarkets.in"
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------- cache ----

QUOTE_TTL = 60          # prices: 60 s
SPARK_TTL = 15 * 60     # intraday sparkline history: 15 min
NEWS_TTL = 5 * 60       # RSS news: 5 min
NAV_TTL = 6 * 60 * 60   # AMFI NAV dump: 6 h (published once daily)

_cache: dict[str, tuple[float, object]] = {}
_locks: dict[str, threading.Lock] = {}
_registry_lock = threading.Lock()


def cached(key: str, ttl: int, fetch_fn):
    """Return cached value for *key*, refreshing via *fetch_fn* when older
    than *ttl* seconds. Serves stale data if the refresh fails."""
    entry = _cache.get(key)
    if entry and time.time() - entry[0] < ttl:
        return entry[1]
    with _registry_lock:
        lock = _locks.setdefault(key, threading.Lock())
    with lock:
        entry = _cache.get(key)
        if entry and time.time() - entry[0] < ttl:
            return entry[1]
        log.info("[FETCH] %s -> hitting external API", key)
        try:
            data = fetch_fn()
        except Exception as exc:  # keep serving stale data on upstream errors
            log.warning("[FETCH-FAIL] %s: %s", key, exc)
            if entry:
                return entry[1]
            return None
        _cache[key] = (time.time(), data)
        return data


# ------------------------------------------------------------- yfinance ----

INDICES = [
    ("^NSEI", "Nifty 50"),
    ("^BSESN", "BSE Sensex"),
    ("NIFTY_MIDCAP_100.NS", "Nifty Midcap 100"),
    ("^CNXSC", "Nifty Smallcap 100"),
    # Yahoo's BSE Smallcap data is unreliable (esp. from datacenter IPs);
    # the card appears whenever Yahoo serves it
    ("BSE-SMLCAP.BO", "BSE Smallcap"),
]

COMMODITIES = [
    ("GC=F", "Gold"),
    ("SI=F", "Silver"),
]

ETFS = [
    ("NIFTYBEES.NS", "Nifty 50 ETF"),
]


def _quote(symbol: str, name: str):
    fi = yf.Ticker(symbol).fast_info  # fast_info only: no slow .info scrape
    price = fi.last_price
    prev = fi.previous_close or fi.open  # some BSE indices lack previous_close
    if price is None or prev in (None, 0):
        return None
    change = price - prev
    return {
        "symbol": symbol,
        "name": name,
        "price": round(price, 2),
        "change": round(change, 2),
        "changePercent": round(change / prev * 100, 2),
        "currency": fi.currency or "INR",
    }


_last_good_quotes: dict[str, dict] = {}


def fetch_quotes(pairs):
    out = []
    for symbol, name in pairs:
        q = None
        try:
            q = _quote(symbol, name)
        except Exception as exc:
            log.warning("quote failed for %s: %s", symbol, exc)
        if q:
            _last_good_quotes[symbol] = q
        else:
            # per-symbol resilience: a transient upstream failure serves the
            # last known quote instead of dropping the card from the UI
            q = _last_good_quotes.get(symbol)
            if q:
                log.info("serving last known quote for %s", symbol)
        if q:
            out.append(q)
    return out


_last_good_sparklines: dict[str, list] = {}


def fetch_sparklines():
    """~30-point intraday close series per index for the card sparklines.

    One history call per symbol per 15 min — the only yfinance use besides
    fast_info, kept on a long TTL to stay far from rate limits.
    """
    out = {}
    for symbol, _ in INDICES:
        closes = []
        try:
            hist = yf.Ticker(symbol).history(period="1d", interval="5m")
            closes = [round(v, 2) for v in hist["Close"].dropna().tolist()]
            if len(closes) > 30:
                step = len(closes) / 30
                closes = [closes[int(i * step)] for i in range(30)]
        except Exception as exc:
            log.warning("sparkline failed for %s: %s", symbol, exc)
        if not closes:
            closes = _last_good_sparklines.get(symbol, [])
        else:
            _last_good_sparklines[symbol] = closes
        out[symbol] = closes
    return out


# ------------------------------------------------------------ coingecko ----

def _crypto_from_coingecko():
    r = requests.get(
        "https://api.coingecko.com/api/v3/simple/price",
        params={
            "ids": "bitcoin,ethereum",
            "vs_currencies": "usd,inr",
            "include_24hr_change": "true",
        },
        # CoinGecko 403s the default python-requests UA from datacenter IPs
        headers={"User-Agent": "Mozilla/5.0 (compatible; worldmarkets.in/1.0)"},
        timeout=15,
    )
    r.raise_for_status()
    data = r.json()
    out = []
    for cid, name, sym in (("bitcoin", "Bitcoin", "BTC"), ("ethereum", "Ethereum", "ETH")):
        d = data.get(cid)
        if not d:
            continue
        out.append({
            "id": cid,
            "name": name,
            "symbol": sym,
            "priceUsd": d.get("usd"),
            "priceInr": d.get("inr"),
            "change24h": round(d.get("usd_24h_change") or 0, 2),
        })
    if not out:
        raise ValueError("CoinGecko returned no usable data")
    return out


def _crypto_from_yahoo():
    out = []
    for ysym, cid, name, sym in (
        ("BTC-USD", "bitcoin", "Bitcoin", "BTC"),
        ("ETH-USD", "ethereum", "Ethereum", "ETH"),
    ):
        fi = yf.Ticker(ysym).fast_info
        price = fi.last_price
        prev = fi.previous_close
        if price is None or prev in (None, 0):
            continue
        out.append({
            "id": cid,
            "name": name,
            "symbol": sym,
            "priceUsd": round(price, 2),
            "priceInr": None,
            "change24h": round((price - prev) / prev * 100, 2),
        })
    return out


def fetch_crypto():
    try:
        return _crypto_from_coingecko()
    except Exception as exc:
        log.warning("CoinGecko failed (%s); falling back to Yahoo BTC-USD/ETH-USD", exc)
        return _crypto_from_yahoo()


# ----------------------------------------------------------------- AMFI ----

FUND_FALLBACK = {
    "name": "Altiva Hybrid Long-Short Fund SIF",
    "nav": 185.32,
    "date": None,
    "source": "static",
}


def fetch_fund_nav():
    """Look up the Altiva Hybrid Long-Short SIF NAV in AMFI's free daily
    NAV dump; falls back to a static value if it isn't listed."""
    r = requests.get("https://www.amfiindia.com/spages/NAVAll.txt", timeout=30)
    r.raise_for_status()
    for line in r.text.splitlines():
        low = line.lower()
        if "altiva" in low and "hybrid" in low and ";" in line:
            parts = line.split(";")
            if len(parts) >= 6:
                try:
                    return {
                        "name": parts[3].strip(),
                        "nav": float(parts[4]),
                        "date": parts[5].strip(),
                        "source": "AMFI",
                    }
                except ValueError:
                    continue
    log.info("Altiva SIF not found in AMFI dump; using static fallback NAV")
    return FUND_FALLBACK


# ----------------------------------------------------------------- news ----

NEWS_FEEDS = [
    ("Moneycontrol", "https://www.moneycontrol.com/rss/MCtopnews.xml"),
    ("Economic Times", "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms"),
]


def fetch_news():
    import xml.etree.ElementTree as ET

    items = []
    for source, url in NEWS_FEEDS:
        try:
            r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
            root = ET.fromstring(r.content)
            for item in root.iter("item"):
                title = (item.findtext("title") or "").strip()
                if not title:
                    continue
                pub = item.findtext("pubDate")
                ts = None
                if pub:
                    try:
                        ts = parsedate_to_datetime(pub).timestamp()
                    except (TypeError, ValueError):
                        pass
                items.append({
                    "title": title,
                    "source": source,
                    "link": (item.findtext("link") or "").strip(),
                    "publishedAt": ts,
                })
        except Exception as exc:
            log.warning("news feed failed for %s: %s", source, exc)
    items.sort(key=lambda x: x["publishedAt"] or 0, reverse=True)
    return items[:12]


# ------------------------------------------------------------- endpoint ----

@app.get("/api/markets")
def markets():
    return {
        "indices": cached("indices", QUOTE_TTL, lambda: fetch_quotes(INDICES)) or [],
        "sparklines": cached("sparklines", SPARK_TTL, fetch_sparklines) or {},
        "crypto": cached("crypto", QUOTE_TTL, fetch_crypto) or [],
        "commodities": cached("commodities", QUOTE_TTL, lambda: fetch_quotes(COMMODITIES)) or [],
        "etfs": cached("etfs", QUOTE_TTL, lambda: fetch_quotes(ETFS)) or [],
        "fund": cached("fund", NAV_TTL, fetch_fund_nav) or FUND_FALLBACK,
        "news": cached("news", NEWS_TTL, fetch_news) or [],
        "updated": time.time(),
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {
        "service": "worldmarkets.in API",
        "endpoints": ["/api/markets", "/api/health"],
        "dashboard": "http://localhost:3000",
        "docs": "/docs",
    }
