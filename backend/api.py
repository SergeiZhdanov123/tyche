from __future__ import annotations

from dotenv import load_dotenv
load_dotenv()
from fastapi import Depends, HTTPException
from pydantic import BaseModel
import time

from db import SessionLocal, engine, Base
from models import APIKey
from auth_keys import generate_api_key

import yfinance as yf

import os
import re
import json
import time
import math
import asyncio
import hashlib
import datetime as dt
from typing import Any, Dict, List, Optional, Tuple, Set, Callable

import httpx
import pandas as pd
from bs4 import BeautifulSoup
from cachetools import TTLCache
from fastapi import FastAPI, HTTPException, Query, Request, Depends
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from apscheduler.schedulers.background import BackgroundScheduler

from sqlalchemy import create_engine, Column, String, Integer, Text
from sqlalchemy.orm import declarative_base, sessionmaker
app = FastAPI(title="Earnings Intelligence API (Mega)", version="0.9")
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ============================================================
# CONFIG
# ============================================================
SEC_TICKER_CIK_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik10}.json"
SEC_COMPANY_FACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik10}.json"
SEC_ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data"

DEFAULT_USER_AGENT = "EarningsIntel/mega (contact: you@example.com)"
SEC_USER_AGENT = os.getenv("SEC_USER_AGENT", DEFAULT_USER_AGENT)

DB_URL = os.getenv("EARNINGS_DB_URL", "sqlite:///./earnings_intel.db")

REQ_DELAY_SEC = float(os.getenv("SEC_REQ_DELAY_SEC", "0.25"))
_last_req_ts = 0.0
_req_lock: Optional[asyncio.Lock] = None

ticker_map_cache = TTLCache(maxsize=1, ttl=60 * 60 * 24)
http_cache = TTLCache(maxsize=2048, ttl=60 * 10)

POLYGON_API_KEY = os.getenv("POLYGON_API_KEY", "").strip()

APP_API_KEYS_RAW = os.getenv("APP_API_KEYS", "").strip()
RATE_STARTER_RPM = int(os.getenv("RATE_STARTER_RPM", "30"))
RATE_PREMIUM_RPM = int(os.getenv("RATE_PREMIUM_RPM", "120"))
RATE_ENTERPRISE_RPM = int(os.getenv("RATE_ENTERPRISE_RPM", "600"))

# ============================================================
# DB (simple JSON cache + tracked tickers table) python3 -m venv venv source venv/bin/activate uvicorn api:app 

# ============================================================
class CreateAPIKeyRequest(BaseModel):
    email: str
    plan: str

@app.post("/auth/create-api-key")
def create_api_key(req: CreateAPIKeyRequest):
    if req.plan not in ("starter", "premium", "enterprise"):
        raise HTTPException(status_code=400, detail="Invalid plan")

    from auth_keys import get_key_prefix as _get_key_prefix
    raw_key, key_hash = generate_api_key()
    key_prefix = _get_key_prefix(raw_key)

    db = SessionLocal()
    db.add(APIKey(
        key_hash=key_hash,
        key_prefix=key_prefix,
        plan=req.plan,
        owner_email=req.email,
        created_at=int(time.time()),
        is_active=1,
        total_requests=0,
    ))
    db.commit()
    db.close()

    return {
        "api_key": raw_key,
        "key_prefix": key_prefix,
        "plan": req.plan,
        "warning": "Save this key now. You will not see it again."
    }


# Import cached models from models.py
from models import CachedJSON, TrackedTicker

# Create all tables (only creates if they don't exist)
Base.metadata.create_all(bind=engine)

def db_get_json(key: str) -> Optional[Dict[str, Any]]:
    with SessionLocal() as db:
        row = db.get(CachedJSON, key)
        if not row:
            return None
        try:
            return json.loads(row.payload)
        except Exception:
            return None

def db_put_json(key: str, payload: Dict[str, Any]) -> None:
    now = int(time.time())
    with SessionLocal() as db:
        row = db.get(CachedJSON, key)
        if row:
            row.updated_at = now
            row.payload = json.dumps(payload)
        else:
            db.add(CachedJSON(key=key, updated_at=now, payload=json.dumps(payload)))
        db.commit()

def db_get_updated_at(key: str) -> Optional[int]:
    with SessionLocal() as db:
        row = db.get(CachedJSON, key)
        return row.updated_at if row else None

# ============================================================
# API KEY + RATE LIMIT (tiered)
# ============================================================
class ApiIdentity(BaseModel):
    api_key: Optional[str] = None
    tier: str = "anonymous"   # anonymous|starter|premium|enterprise
    rpm_limit: int = 10

def parse_api_keys(raw: str) -> Dict[str, str]:
    """
    Legacy: APP_API_KEYS="k1:starter,k2:premium,k3:enterprise"
    """
    out: Dict[str, str] = {}
    if not raw:
        return out
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        if ":" not in part:
            continue
        k, tier = part.split(":", 1)
        out[k.strip()] = tier.strip()
    return out

API_KEYS = parse_api_keys(APP_API_KEYS_RAW)

rate_cache = TTLCache(maxsize=100_000, ttl=60)  # per-minute counters

def tier_rpm(tier: str) -> int:
    if tier == "enterprise":
        return RATE_ENTERPRISE_RPM
    if tier == "premium":
        return RATE_PREMIUM_RPM
    if tier == "starter":
        return RATE_STARTER_RPM
    return 10


from auth_keys import hash_api_key as _hash_api_key


def validate_api_key_from_db(raw_key: str) -> Optional[Tuple[str, str, int]]:
    """
    Validate API key against database.
    Returns (key_hash, plan, key_id) if valid, None if invalid/revoked.
    """
    if not raw_key or not raw_key.startswith("tyche_"):
        return None
    
    key_hash = _hash_api_key(raw_key)
    
    with SessionLocal() as db:
        api_key = db.query(APIKey).filter(
            APIKey.key_hash == key_hash,
            APIKey.is_active == 1
        ).first()
        
        if not api_key:
            return None
        
        return (api_key.key_hash, api_key.plan, api_key.id)


def track_api_request(key_hash: str) -> None:
    """
    Increment request counter and update last_used_at for an API key.
    """
    with SessionLocal() as db:
        api_key = db.query(APIKey).filter(APIKey.key_hash == key_hash).first()
        if api_key:
            api_key.total_requests = (api_key.total_requests or 0) + 1
            api_key.last_used_at = int(time.time())
            db.commit()


async def get_identity(request: Request) -> ApiIdentity:
    """
    Get identity from request, validating against database.
    Supports both legacy env-based keys and new database keys.
    """
    raw_key = request.headers.get("X-API-Key")
    
    if not raw_key:
        return ApiIdentity(api_key=None, tier="anonymous", rpm_limit=10)
    
    # Try legacy env-based keys first
    if raw_key in API_KEYS:
        tier = API_KEYS[raw_key]
        return ApiIdentity(api_key=raw_key, tier=tier, rpm_limit=tier_rpm(tier))
    
    # Try database keys
    result = validate_api_key_from_db(raw_key)
    if result:
        key_hash, plan, key_id = result
        # Track the request
        track_api_request(key_hash)
        return ApiIdentity(api_key=key_hash, tier=plan, rpm_limit=tier_rpm(plan))
    
    # Invalid or revoked key
    raise HTTPException(
        status_code=401,
        detail="Invalid or revoked API key"
    )


def enforce_rate(identity: ApiIdentity) -> None:
    """
    Enforce rate limits per API key per minute.
    """
    minute = int(time.time() // 60)
    key = f"{identity.api_key or 'anon'}:{minute}"
    used = rate_cache.get(key, 0)
    if used >= identity.rpm_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for tier={identity.tier}. Limit={identity.rpm_limit}/min",
        )
    rate_cache[key] = used + 1

# ============================================================
# SEC HELPERS
# ============================================================
def _cik_to_10(cik: int | str) -> str:
    s = str(cik).strip()
    if s.isdigit():
        return s.zfill(10)
    raise ValueError("CIK must be numeric")

async def _get_req_lock() -> asyncio.Lock:
    global _req_lock
    if _req_lock is None:
        _req_lock = asyncio.Lock()
    return _req_lock

async def _sec_get_json(url: str) -> Dict[str, Any]:
    cache_key = f"GET:{url}"
    if cache_key in http_cache:
        return http_cache[cache_key]

    headers = {
        "User-Agent": SEC_USER_AGENT,
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
    }

    global _last_req_ts
    lock = await _get_req_lock()
    async with lock:
        now = time.time()
        wait = (_last_req_ts + REQ_DELAY_SEC) - now
        if wait > 0:
            await asyncio.sleep(wait)
        _last_req_ts = time.time()

    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url, headers=headers)
        if r.status_code == 403:
            raise HTTPException(
                status_code=403,
                detail="SEC 403. Ensure SEC_USER_AGENT in .env is 'Your Name your@email.com' (no brackets)."
            )
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=f"SEC error: {r.text[:400]}")
        data = r.json()

    http_cache[cache_key] = data
    return data

async def _load_ticker_map() -> Dict[str, str]:
    if "ticker_map" in ticker_map_cache:
        return ticker_map_cache["ticker_map"]
    raw = await _sec_get_json(SEC_TICKER_CIK_URL)
    out: Dict[str, str] = {}
    for _, row in raw.items():
        t = str(row.get("ticker", "")).upper().strip()
        cik = row.get("cik_str")
        if t and cik is not None:
            out[t] = _cik_to_10(cik)
    ticker_map_cache["ticker_map"] = out
    return out

async def _ticker_to_cik10(ticker: str) -> str:
    m = await _load_ticker_map()
    t = ticker.upper().strip()
    cik10 = m.get(t)
    if not cik10:
        raise HTTPException(status_code=404, detail=f"Unknown ticker: {ticker}")
    return cik10

async def get_submissions(cik10: str, force: bool = False) -> Dict[str, Any]:
    key = f"submissions:{cik10}"
    if not force:
        cached = db_get_json(key)
        if cached:
            return cached
    data = await _sec_get_json(SEC_SUBMISSIONS_URL.format(cik10=cik10))
    db_put_json(key, data)
    return data

async def get_companyfacts(cik10: str, force: bool = False) -> Dict[str, Any]:
    key = f"facts:{cik10}"
    if not force:
        cached = db_get_json(key)
        if cached:
            return cached
    data = await _sec_get_json(SEC_COMPANY_FACTS_URL.format(cik10=cik10))
    db_put_json(key, data)
    return data

# ============================================================
# FACTS: period-aware selection with fallbacks
# ============================================================
class FactPoint(BaseModel):
    concept: str
    unit: str
    value: Any
    start: Optional[str] = None
    end: Optional[str] = None
    fy: Optional[int] = None
    fp: Optional[str] = None
    filed: Optional[str] = None
    form: Optional[str] = None
    frame: Optional[str] = None
    accn: Optional[str] = None

def _facts_usgaap(facts_json: Dict[str, Any]) -> Dict[str, Any]:
    return facts_json.get("facts", {}).get("us-gaap", {})

def _to_fact_point(concept: str, unit: str, p: Dict[str, Any]) -> FactPoint:
    return FactPoint(
        concept=concept,
        unit=unit,
        value=p.get("val"),
        start=p.get("start"),
        end=p.get("end"),
        fy=p.get("fy"),
        fp=p.get("fp"),
        filed=p.get("filed"),
        form=p.get("form"),
        frame=p.get("frame"),
        accn=p.get("accn"),
    )

def _candidate_points_for_concept(facts_json: Dict[str, Any], concept: str, units: List[str]) -> List[FactPoint]:
    usgaap = _facts_usgaap(facts_json)
    c = usgaap.get(concept)
    if not c:
        return []
    u = c.get("units", {})
    pts: List[FactPoint] = []
    for unit in units:
        for p in u.get(unit, []) or []:
            if "val" not in p:
                continue
            pts.append(_to_fact_point(concept, unit, p))
    return pts

def _filter_points(
    pts: List[FactPoint],
    fy: Optional[int],
    fp: Optional[str],
    form: Optional[str],
    accn: Optional[str],
) -> List[FactPoint]:
    out = pts
    if fy is not None:
        out = [p for p in out if p.fy == fy]
    if fp is not None:
        fp_up = fp.upper()
        out = [p for p in out if (p.fp or "").upper() == fp_up]
    if form is not None:
        form_up = form.upper()
        out = [p for p in out if (p.form or "").upper() == form_up]
    if accn is not None:
        out = [p for p in out if (p.accn or "") == accn]
    return out

def _sort_latest(pts: List[FactPoint]) -> List[FactPoint]:
    def key(p: FactPoint) -> Tuple[str, str]:
        return (p.end or "", p.filed or "")
    return sorted(pts, key=key, reverse=True)

REVENUE_TAGS = [
    "Revenues",
    "SalesRevenueNet",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
]
NET_INCOME_TAGS = ["NetIncomeLoss", "ProfitLoss"]
EPS_BASIC_TAGS = ["EarningsPerShareBasic", "EarningsPerShareBasicAndDiluted"]
EPS_DILUTED_TAGS = ["EarningsPerShareDiluted", "EarningsPerShareBasicAndDiluted"]

USD_UNITS = ["USD"]
EPS_UNITS = ["USD/shares"]

# Extra fundamentals for “health” layer
ASSETS_TAGS = ["Assets"]
LIAB_TAGS = ["Liabilities"]
CASH_TAGS = ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"]
DEBT_TAGS = ["LongTermDebtNoncurrent", "LongTermDebt", "DebtNoncurrent"]
OCF_TAGS = ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"]

def pick_metric(
    facts_json: Dict[str, Any],
    tags: List[str],
    units: List[str],
    fy: Optional[int],
    fp: Optional[str],
    form: Optional[str],
    accn: Optional[str],
    notes: List[str],
) -> Optional[FactPoint]:
    for tag in tags:
        pts = _candidate_points_for_concept(facts_json, tag, units)
        if not pts:
            continue

        filtered = _filter_points(pts, fy=fy, fp=fp, form=form, accn=accn)
        if filtered:
            return _sort_latest(filtered)[0]

        if fy is None and fp is None and form is None and accn is None:
            return _sort_latest(pts)[0]

        notes.append(f"Tag {tag} had data but not for requested filters.")
    return None

def derive_period_end(points: List[Optional[FactPoint]]) -> Optional[str]:
    ends = [p.end for p in points if p and p.end]
    if not ends:
        return None
    return sorted(ends)[-1]

def derive_as_of(points: List[Optional[FactPoint]]) -> Optional[str]:
    filed = [p.filed for p in points if p and p.filed]
    return max(filed) if filed else None

# ============================================================
# EARNINGS EVENTS LAYER
# ============================================================


# Yahoo Finance fallback earnings calendar
async def yahoo_earnings_calendar(ticker: str, limit: int = 1) -> List[EarningsEvent]:
    try:
        yf_ticker = yf.Ticker(ticker.upper())
        cal = yf_ticker.calendar
        if cal is None or cal.empty:
            return []

        # Yahoo usually returns a DatetimeIndex or column-based calendar
        # Normalize to date string
        if "Earnings Date" in cal.index:
            dt_val = cal.loc["Earnings Date"][0]
        elif "Earnings Date" in cal.columns:
            dt_val = cal["Earnings Date"].iloc[0]
        else:
            return []

        event_date = dt_val.date().isoformat() if hasattr(dt_val, "date") else str(dt_val)

        return [
            EarningsEvent(
                ticker=ticker.upper(),
                source="yahoo",
                event_date=event_date,
                event_time=None,
                confidence="medium",
            )
        ]
    except Exception:
        return []

async def resolve_earnings_event(
    ticker: str,
    source: str = "auto",
) -> EarningsEvent:
    t = ticker.upper()
    today = dt.date.today()

    # 1) Polygon — authoritative source
    if source in ("auto", "polygon") and POLYGON_API_KEY:
        events = await polygon_earnings_calendar(t, limit=5)

        if events:
            # Pick the earnings date closest to today (past or future)
            def dist(e: EarningsEvent) -> int:
                try:
                    return abs((dt.date.fromisoformat(e.event_date) - today).days)
                except Exception:
                    return 10**9

            events_sorted = sorted(events, key=dist)
            ev = events_sorted[0]
            ev.confidence = "high"
            return ev

    # 2) Yahoo fallback (calendar only)
    if source in ("auto", "yahoo"):
        events = await yahoo_earnings_calendar(t, limit=1)
        if events:
            ev = events[0]
            ev.confidence = "medium"
            return ev

    # 3) SEC proxy — LAST RESORT ONLY
    events = await sec_proxy_earnings_events(t, limit=1)
    if events:
        ev = events[0]
        ev.confidence = "low"
        return ev

    raise HTTPException(status_code=404, detail="No earnings event found")

class EarningsEvent(BaseModel):
    ticker: str
    source: str  # "sec_proxy" or "polygon"
    event_date: str
    event_time: Optional[str] = None  # "BMO"/"AMC"/None
    fy: Optional[int] = None
    fp: Optional[str] = None
    accn: Optional[str] = None
    filing_date: Optional[str] = None
    form: Optional[str] = None
    confidence: str = "low"  # low/med/high

async def polygon_earnings_calendar(ticker: str, limit: int = 20) -> List[EarningsEvent]:
    """
    Polygon earnings calendar resolver (v3).
    Uses /v3/reference/earnings but MUST fail silently if unreachable.
    """
    if not POLYGON_API_KEY:
        return []

    url = "https://api.polygon.io/v3/reference/earnings"
    params = {
        "ticker": ticker.upper(),
        "limit": limit,
        "apiKey": POLYGON_API_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.get(url, params=params)

        # Polygon may be unavailable on some plans — MUST fail silently
        if r.status_code != 200:
            return []

        data = r.json()

    except Exception:
        # ✅ THIS is the key: swallow DNS/network issues and fall back to Yahoo/SEC proxy
        return []

    results = data.get("results")
    if not isinstance(results, list):
        return []

    out: List[EarningsEvent] = []

    for row in results:
        event_date = (
            row.get("report_date")
            or row.get("earnings_date")
            or row.get("date")
        )
        if not event_date:
            continue

        out.append(
            EarningsEvent(
                ticker=ticker.upper(),
                source="polygon",
                event_date=str(event_date),
                event_time=row.get("time"),
                fy=row.get("fiscal_year"),
                fp=row.get("fiscal_period"),
                accn=None,
                filing_date=None,
                form=None,
                confidence="high",
            )
        )

        if len(out) >= limit:
            break

    return out

async def sec_proxy_earnings_events(ticker: str, limit: int = 20) -> List[EarningsEvent]:
    """
    SEC doesn't give a clean earnings event timestamp. This is a proxy:
    use reportDate from latest 10-Q/10-K filings as “period end”, and filingDate as “when disclosed officially”.
    Confidence is low/medium.
    """
    cik10 = await _ticker_to_cik10(ticker)
    submissions = await get_submissions(cik10)
    recent = submissions.get("filings", {}).get("recent", {}) or {}
    forms = recent.get("form", []) or []
    filing_dates = recent.get("filingDate", []) or []
    report_dates = recent.get("reportDate", []) or []
    accns = recent.get("accessionNumber", []) or []

    out: List[EarningsEvent] = []
    for i in range(min(len(forms), len(accns))):
        form = str(forms[i]).upper()
        if form not in {"10-Q", "10-K"}:
            continue
        rd = report_dates[i] if i < len(report_dates) else None
        fd = filing_dates[i] if i < len(filing_dates) else None
        if not rd and not fd:
            continue
        out.append(EarningsEvent(
            ticker=ticker.upper(),
            source="sec_proxy",
            event_date=str(fd or rd),
            event_time=None,
            fy=None,
            fp=None,
            accn=str(accns[i]),
            filing_date=str(fd) if fd else None,
            form=form,
            confidence="med",
        ))
        if len(out) >= limit:
            break
    return out

# ============================================================
# MARKET DATA LAYER (Polygon recommended)
# ============================================================
class PriceBar(BaseModel):
    t: int
    o: float
    h: float
    l: float
    c: float
    v: float

async def polygon_aggregate_bars(ticker: str, start: str, end: str, timespan: str = "day") -> List[PriceBar]:
    if not POLYGON_API_KEY:
        raise HTTPException(status_code=501, detail="POLYGON_API_KEY not set; market data layer disabled.")
    # Polygon v2 aggregates
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker.upper()}/range/1/{timespan}/{start}/{end}?adjusted=true&sort=asc&limit=50000&apiKey={POLYGON_API_KEY}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Polygon error: {r.text[:250]}")
        data = r.json()
    results = data.get("results") or []
    out: List[PriceBar] = []
    for b in results:
        out.append(PriceBar(
            t=int(b["t"]),
            o=float(b["o"]),
            h=float(b["h"]),
            l=float(b["l"]),
            c=float(b["c"]),
            v=float(b.get("v", 0.0)),
        ))
    return out

# ============================================================
# OPTIONS LAYER (expected move from IV) — via Polygon options chain snapshot
# ============================================================
class ExpectedMove(BaseModel):
    ticker: str
    as_of: str
    horizon_days: int
    implied_move_pct: Optional[float] = None
    notes: List[str] = []

async def polygon_expected_move_simple(ticker: str, horizon_days: int = 1) -> ExpectedMove:
    """
    A pragmatic expected-move estimate:
    - Pull a near-term options snapshot (if available)
    - If IV is available, approximate expected move as: IV * sqrt(days/252)
    Polygon options endpoints vary; this is intentionally defensive.
    """
    if not POLYGON_API_KEY:
        raise HTTPException(status_code=501, detail="POLYGON_API_KEY not set; options layer disabled.")
    notes: List[str] = []
    today = dt.date.today().isoformat()

    # Try to get a single options snapshot (best-effort). If Polygon returns no IV, respond with notes.
    # Endpoint example: /v3/snapshot/options/{underlyingAsset}
    url = f"https://api.polygon.io/v3/snapshot/options/{ticker.upper()}?limit=10&apiKey={POLYGON_API_KEY}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url)
        if r.status_code != 200:
            return ExpectedMove(ticker=ticker.upper(), as_of=today, horizon_days=horizon_days, implied_move_pct=None,
                                notes=[f"Polygon snapshot failed: {r.status_code}"])
        data = r.json()

    results = data.get("results") or []
    ivs: List[float] = []
    for row in results:
        # Polygon structures can differ; attempt common paths
        greeks = row.get("greeks") or {}
        iv = row.get("implied_volatility")
        if isinstance(iv, (int, float)) and iv > 0:
            ivs.append(float(iv))
        elif isinstance(greeks, dict):
            iv2 = greeks.get("iv")
            if isinstance(iv2, (int, float)) and iv2 > 0:
                ivs.append(float(iv2))

    if not ivs:
        notes.append("No implied volatility found in snapshot payload; expected move unavailable.")
        return ExpectedMove(ticker=ticker.upper(), as_of=today, horizon_days=horizon_days, implied_move_pct=None, notes=notes)

    iv = float(sum(ivs) / len(ivs))
    move = iv * math.sqrt(max(horizon_days, 1) / 252.0) * 100.0
    return ExpectedMove(ticker=ticker.upper(), as_of=today, horizon_days=horizon_days, implied_move_pct=move, notes=[f"avg_iv={iv:.4f}"])

# ============================================================
# FILING TEXT LAYER (SEC HTML fetch + basic section extraction)
# ============================================================
class FilingText(BaseModel):
    ticker: str
    cik: str
    accn: str
    url: str
    text_len: int
    extracted_sections: Dict[str, str] = Field(default_factory=dict)

async def sec_fetch_filing_html(cik10: str, accn: str, primary_doc: Optional[str]) -> str:
    """
    Build EDGAR archive URL:
    /Archives/edgar/data/{cik_without_leading_zeros}/{accn_no_dashes}/{primary_doc}
    """
    cik_int = str(int(cik10))  # drop leading zeros
    accn_nodash = accn.replace("-", "")
    if not primary_doc:
        raise HTTPException(status_code=400, detail="primaryDocument required to fetch filing HTML.")
    url = f"{SEC_ARCHIVES_BASE}/{cik_int}/{accn_nodash}/{primary_doc}"

    headers = {
        "User-Agent": SEC_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Encoding": "gzip, deflate",
    }
    # throttle along with SEC lock
    global _last_req_ts
    lock = await _get_req_lock()
    async with lock:
        now = time.time()
        wait = (_last_req_ts + REQ_DELAY_SEC) - now
        if wait > 0:
            await asyncio.sleep(wait)
        _last_req_ts = time.time()

    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url, headers=headers)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"SEC filing fetch failed: {r.status_code}")
        return r.text

def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text("\n")
    # normalize whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()

def extract_sections_10k_10q(text: str) -> Dict[str, str]:
    """
    Basic SEC item section extraction (best-effort).
    Works better on 10-K / 10-Q text after HTML-to-text.
    """
    # common items
    patterns = {
        "item1": r"\bITEM\s+1[\.\:]\s*",
        "item1a": r"\bITEM\s+1A[\.\:]\s*",
        "item7": r"\bITEM\s+7[\.\:]\s*",
        "item7a": r"\bITEM\s+7A[\.\:]\s*",
        "item8": r"\bITEM\s+8[\.\:]\s*",
        "item2": r"\bITEM\s+2[\.\:]\s*",
    }
    idx: List[Tuple[str, int]] = []
    for k, pat in patterns.items():
        m = re.search(pat, text, flags=re.IGNORECASE)
        if m:
            idx.append((k, m.start()))
    idx.sort(key=lambda x: x[1])

    out: Dict[str, str] = {}
    for i, (k, start) in enumerate(idx):
        end = idx[i + 1][1] if i + 1 < len(idx) else min(len(text), start + 120_000)
        chunk = text[start:end].strip()
        # cap very large
        out[k] = chunk[:80_000]
    return out

# ============================================================
# SENTIMENT / QUALITATIVE (simple, extendable)
# ============================================================
class SentimentScore(BaseModel):
    ticker: str
    accn: str
    score: float
    label: str
    cues: Dict[str, int]

POS_WORDS = {"improved", "strong", "growth", "record", "robust", "confident", "opportunity", "accelerate"}
NEG_WORDS = {"decline", "weak", "risk", "uncertain", "headwind", "adverse", "loss", "pressure", "volatile"}

def simple_sentiment(text: str) -> SentimentScore:
    t = text.lower()
    cues = {"pos": 0, "neg": 0}
    for w in POS_WORDS:
        cues["pos"] += len(re.findall(rf"\b{re.escape(w)}\b", t))
    for w in NEG_WORDS:
        cues["neg"] += len(re.findall(rf"\b{re.escape(w)}\b", t))
    score = (cues["pos"] - cues["neg"]) / max((cues["pos"] + cues["neg"]), 1)
    label = "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"
    return SentimentScore(ticker="?", accn="?", score=score, label=label, cues=cues)

# ============================================================
# FINANCIAL HEALTH (derived ratios)
# ============================================================
class FinancialHealth(BaseModel):
    ticker: str
    cik: str
    fy: Optional[int] = None
    fp: Optional[str] = None
    as_of: Optional[str] = None
    period_end: Optional[str] = None

    assets: Optional[FactPoint] = None
    liabilities: Optional[FactPoint] = None
    cash: Optional[FactPoint] = None
    debt: Optional[FactPoint] = None
    ocf: Optional[FactPoint] = None

    current_health: Dict[str, Optional[float]] = Field(default_factory=dict)
    notes: List[str] = []

def safe_div(a: Optional[float], b: Optional[float]) -> Optional[float]:
    if a is None or b is None:
        return None
    if b == 0:
        return None
    return a / b

# ============================================================
# EARNINGS SUMMARY
# ============================================================
class EarningsSummary(BaseModel):
    ticker: str
    cik: str
    mode: str  # latest|period
    requested_fy: Optional[int] = None
    requested_fp: Optional[str] = None
    requested_form: Optional[str] = None
    requested_accn: Optional[str] = None

    revenue: Optional[FactPoint] = None
    net_income: Optional[FactPoint] = None
    eps_basic: Optional[FactPoint] = None
    eps_diluted: Optional[FactPoint] = None

    period_end: Optional[str] = None
    as_of: Optional[str] = None
    notes: List[str] = []

# ============================================================
# COMPANY MODELS
# ============================================================
class CompanyOverview(BaseModel):
    ticker: str
    cik: str
    name: Optional[str] = None
    sic: Optional[str] = None
    sicDescription: Optional[str] = None
    exchanges: Optional[List[str]] = None
    stateOfIncorporation: Optional[str] = None

class FilingItem(BaseModel):
    form: str
    filingDate: str
    reportDate: Optional[str] = None
    accessionNumber: str
    primaryDocument: Optional[str] = None

class PeriodItem(BaseModel):
    fy: int
    fp: str
    end: Optional[str] = None
    filed: Optional[str] = None
    form: Optional[str] = None
    accn: Optional[str] = None

# ============================================================
# POST-EARNINGS REACTION
# ============================================================
class EarningsReaction(BaseModel):
    ticker: str
    event_date: str
    window_days: int
    ref_close: Optional[float] = None
    end_close: Optional[float] = None
    return_pct: Optional[float] = None
    max_drawdown_pct: Optional[float] = None
    max_runup_pct: Optional[float] = None
    volume_sum: Optional[float] = None
    notes: List[str] = []

# ============================================================
# EARNINGS DETAILS MODEL (aggregates event, fundamentals, summary, ratios, reaction, notes)
# ============================================================
class EarningsDetails(BaseModel):
    ticker: str
    event_date: str
    event_time: Optional[str] = None  # BMO / AMC / None
    event_source: str

    fundamentals: FinancialHealth
    summary: EarningsSummary
    reaction: Optional[EarningsReaction] = None

    ratios: Dict[str, Optional[float]] = {}
    analysts: Optional[EarningsAnalystsResponse] = None
    eps_surprise_pct: Optional[float] = None
    notes: List[str] = []

def compute_reaction(bars: List[PriceBar], window_days: int) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[float], Optional[float], Optional[float]]:
    if not bars:
        return (None, None, None, None, None, None)
    df = pd.DataFrame([b.model_dump() for b in bars])
    # close series
    ref_close = float(df["c"].iloc[0])
    end_close = float(df["c"].iloc[min(window_days, len(df) - 1)])
    ret = (end_close / ref_close - 1.0) * 100.0 if ref_close else None
    # drawdown/runup from ref
    min_close = float(df["c"].min())
    max_close = float(df["c"].max())
    max_dd = (min_close / ref_close - 1.0) * 100.0 if ref_close else None
    max_ru = (max_close / ref_close - 1.0) * 100.0 if ref_close else None
    vol_sum = float(df["v"].sum())
    return (ref_close, end_close, ret, max_dd, max_ru, vol_sum)

# ============================================================
# FASTAPI APP
# ============================================================


from fastapi.responses import JSONResponse

@app.middleware("http")
async def auth_and_rate_middleware(request: Request, call_next):
    # ✅ Always allow CORS preflight (OPTIONS) requests through immediately
    if request.method == "OPTIONS":
        return await call_next(request)

    identity = await get_identity(request)

    # ✅ Dev bypass for localhost so your dashboard doesn't instantly rate-limit itself
    client_ip = request.client.host if request.client else ""
    if client_ip in ("127.0.0.1", "::1", "localhost"):
        request.state.identity = identity
        return await call_next(request)

    try:
        enforce_rate(identity)
        request.state.identity = identity
        return await call_next(request)

    except HTTPException as e:
        # ✅ Return a real HTTP response instead of crashing into ExceptionGroup -> 500
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail})


def identity_dep(request: Request) -> ApiIdentity:
    return request.state.identity

@app.on_event("startup")
def startup_jobs():
    # minimal background refresh: warm ticker map, refresh tracked tickers daily
    sched = BackgroundScheduler(daemon=True)

    def warm():
        pass

    async def refresh_tracked():
        # refresh SEC caches for tracked tickers (best-effort)
        with SessionLocal() as db:
            rows = db.query(TrackedTicker).all()
        async def one(row: TrackedTicker):
            try:
                await get_submissions(row.cik10, force=True)
                await get_companyfacts(row.cik10, force=True)
                with SessionLocal() as db:
                    r = db.get(TrackedTicker, row.ticker)
                    if r:
                        r.updated_at = int(time.time())
                        db.commit()
            except Exception:
                return
        # run sequentially to be polite to SEC
        for row in rows:
            try:
                asyncio.run(one(row))
            except Exception:
                continue

    sched.add_job(warm, "interval", hours=12)
    # NOTE: not scheduling refresh_tracked by default because it uses asyncio.run (kept simple here)
    sched.start()

# ============================================================
# ROUTES: SYSTEM
# ============================================================
@app.get("/health")
def health(request: Request, identity: ApiIdentity = Depends(identity_dep)):
    return {
        "ok": True,
        "version": app.version,
        "tier": identity.tier,
        "sec_user_agent_set": bool(SEC_USER_AGENT and "@" in SEC_USER_AGENT),
        "polygon_enabled": bool(POLYGON_API_KEY),
    }

@app.get("/metrics", response_class=PlainTextResponse)
def metrics():
    # minimal text metrics endpoint
    return f"rate_cache_size {len(rate_cache)}\nhttp_cache_size {len(http_cache)}\n"

# ============================================================
# ROUTES: COMPANY / SEC
# ============================================================
@app.post("/track/{ticker}")
async def track_ticker(ticker: str):
    cik10 = await _ticker_to_cik10(ticker)
    with SessionLocal() as db:
        row = db.get(TrackedTicker, ticker.upper())
        if row:
            row.cik10 = cik10
            row.updated_at = int(time.time())
        else:
            db.add(TrackedTicker(ticker=ticker.upper(), cik10=cik10, updated_at=int(time.time())))
        db.commit()
    return {"tracked": ticker.upper(), "cik10": cik10}

@app.get("/company/{ticker}/overview", response_model=CompanyOverview)
async def company_overview(ticker: str, force_refresh: bool = Query(False)):
    cik10 = await _ticker_to_cik10(ticker)
    submissions = await get_submissions(cik10, force=force_refresh)
    return CompanyOverview(
        ticker=ticker.upper(),
        cik=cik10,
        name=submissions.get("name"),
        sic=submissions.get("sic"),
        sicDescription=submissions.get("sicDescription"),
        exchanges=submissions.get("exchanges"),
        stateOfIncorporation=submissions.get("stateOfIncorporation"),
    )

@app.get("/company/{ticker}/filings", response_model=List[FilingItem])
async def company_filings(
    ticker: str,
    forms: str = Query("10-Q,10-K,8-K", description="Comma-separated forms"),
    limit: int = Query(25, ge=1, le=200),
    force_refresh: bool = Query(False),
):
    cik10 = await _ticker_to_cik10(ticker)
    submissions = await get_submissions(cik10, force=force_refresh)
    recent = submissions.get("filings", {}).get("recent", {}) or {}
    allowed = {f.strip().upper() for f in forms.split(",") if f.strip()}
    out: List[FilingItem] = []

    forms_arr = recent.get("form", []) or []
    filing_dates = recent.get("filingDate", []) or []
    report_dates = recent.get("reportDate", []) or []
    accns = recent.get("accessionNumber", []) or []
    primary_docs = recent.get("primaryDocument", []) or []

    for i in range(min(len(forms_arr), len(accns))):
        form = str(forms_arr[i]).upper()
        if allowed and form not in allowed:
            continue
        out.append(FilingItem(
            form=form,
            filingDate=str(filing_dates[i]) if i < len(filing_dates) else "",
            reportDate=str(report_dates[i]) if i < len(report_dates) and report_dates[i] else None,
            accessionNumber=str(accns[i]),
            primaryDocument=str(primary_docs[i]) if i < len(primary_docs) and primary_docs[i] else None,
        ))
        if len(out) >= limit:
            break
    return out

@app.get("/company/{ticker}/periods", response_model=List[PeriodItem])
async def available_periods(
    ticker: str,
    metric: str = Query("revenue", description="revenue|net_income|eps"),
    limit: int = Query(120, ge=1, le=500),
    force_refresh: bool = Query(False),
):
    cik10 = await _ticker_to_cik10(ticker)
    facts = await get_companyfacts(cik10, force=force_refresh)

    if metric == "revenue":
        tags, units = REVENUE_TAGS, USD_UNITS
    elif metric == "net_income":
        tags, units = NET_INCOME_TAGS, USD_UNITS
    else:
        tags, units = EPS_DILUTED_TAGS, EPS_UNITS

    pts: List[FactPoint] = []
    for tag in tags:
        pts.extend(_candidate_points_for_concept(facts, tag, units))
    pts = [p for p in pts if p.fy is not None and p.fp is not None]
    pts = _sort_latest(pts)

    seen: Set[Tuple[int, str]] = set()
    out: List[PeriodItem] = []
    for p in pts:
        key = (int(p.fy), str(p.fp).upper())
        if key in seen:
            continue
        seen.add(key)
        out.append(PeriodItem(fy=int(p.fy), fp=str(p.fp).upper(), end=p.end, filed=p.filed, form=p.form, accn=p.accn))
        if len(out) >= limit:
            break
    return out

class EPSQuarter(BaseModel):
    fy: int
    fp: str
    period_end: Optional[str] = None
    filed: Optional[str] = None
    form: Optional[str] = None
    eps_basic: Optional[float] = None
    eps_diluted: Optional[float] = None
    revenue: Optional[float] = None
    net_income: Optional[float] = None


class EPSHistoryResponse(BaseModel):
    ticker: str
    quarters: List[EPSQuarter]


@app.get("/company/{ticker}/eps-history", response_model=EPSHistoryResponse)
async def eps_history(
    ticker: str,
    limit: int = Query(12, ge=1, le=40),
    force_refresh: bool = Query(False),
):
    """Return historical quarterly EPS and revenue for the last N periods (quarterly only)."""
    cik10 = await _ticker_to_cik10(ticker)
    facts = await get_companyfacts(cik10, force=force_refresh)

    # Get all available quarterly periods (exclude FY to avoid double-counting)
    eps_pts: List[FactPoint] = []
    for tag in EPS_DILUTED_TAGS:
        eps_pts.extend(_candidate_points_for_concept(facts, tag, EPS_UNITS))
    eps_pts = [p for p in eps_pts if p.fy is not None and p.fp is not None and str(p.fp).upper().startswith("Q")]
    eps_pts = _sort_latest(eps_pts)

    # Deduplicate by (fy, fp)
    seen = set()
    unique_periods = []
    for p in eps_pts:
        key = (int(p.fy), str(p.fp).upper())
        if key not in seen:
            seen.add(key)
            unique_periods.append(p)
        if len(unique_periods) >= limit:
            break

    # Now collect data for each period
    quarters: List[EPSQuarter] = []
    for period in unique_periods:
        fy_val = int(period.fy)
        fp_val = str(period.fp).upper()
        notes_tmp: List[str] = []

        rev = pick_metric(facts, REVENUE_TAGS, USD_UNITS, fy_val, fp_val, None, None, notes_tmp)
        ni = pick_metric(facts, NET_INCOME_TAGS, USD_UNITS, fy_val, fp_val, None, None, notes_tmp)
        eps_b = pick_metric(facts, EPS_BASIC_TAGS, EPS_UNITS, fy_val, fp_val, None, None, notes_tmp)
        eps_d = pick_metric(facts, EPS_DILUTED_TAGS, EPS_UNITS, fy_val, fp_val, None, None, notes_tmp)

        quarters.append(EPSQuarter(
            fy=fy_val,
            fp=fp_val,
            period_end=period.end,
            filed=period.filed,
            form=period.form,
            eps_basic=eps_b.value if eps_b else None,
            eps_diluted=eps_d.value if eps_d else None,
            revenue=rev.value if rev else None,
            net_income=ni.value if ni else None,
        ))

    # Reverse to chronological order (oldest first)
    quarters.reverse()

    return EPSHistoryResponse(ticker=ticker.upper(), quarters=quarters)


@app.get("/company/{ticker}/earnings-summary", response_model=EarningsSummary)
async def earnings_summary(
    ticker: str,
    fy: Optional[int] = Query(None),
    fp: Optional[str] = Query(None, description="Q1,Q2,Q3,Q4,FY"),
    form: Optional[str] = Query(None, description="10-Q or 10-K"),
    accn: Optional[str] = Query(None),
    force_refresh: bool = Query(False),
):
    cik10 = await _ticker_to_cik10(ticker)
    facts = await get_companyfacts(cik10, force=force_refresh)

    notes: List[str] = []
    mode = "latest" if (fy is None and fp is None and form is None and accn is None) else "period"

    revenue = pick_metric(facts, REVENUE_TAGS, USD_UNITS, fy, fp, form, accn, notes)
    net_income = pick_metric(facts, NET_INCOME_TAGS, USD_UNITS, fy, fp, form, accn, notes)
    eps_basic = pick_metric(facts, EPS_BASIC_TAGS, EPS_UNITS, fy, fp, form, accn, notes)
    eps_diluted = pick_metric(facts, EPS_DILUTED_TAGS, EPS_UNITS, fy, fp, form, accn, notes)

    if mode == "period" and not any([revenue, net_income, eps_basic, eps_diluted]):
        raise HTTPException(
            status_code=404,
            detail="No facts matched your filters. Use /company/{ticker}/periods to discover valid (fy,fp)."
        )

    period_end = derive_period_end([revenue, net_income, eps_basic, eps_diluted])
    as_of = derive_as_of([revenue, net_income, eps_basic, eps_diluted])

    return EarningsSummary(
        ticker=ticker.upper(),
        cik=cik10,
        mode=mode,
        requested_fy=fy,
        requested_fp=fp.upper() if fp else None,
        requested_form=form.upper() if form else None,
        requested_accn=accn,
        revenue=revenue,
        net_income=net_income,
        eps_basic=eps_basic,
        eps_diluted=eps_diluted,
        period_end=period_end,
        as_of=as_of,
        notes=notes,
    )

# ============================================================
# ROUTES: EARNINGS EVENTS (calendar layer)
# ============================================================
@app.get("/company/{ticker}/earnings-events", response_model=List[EarningsEvent])
async def earnings_events(
    ticker: str,
    source: str = Query("auto", description="auto|polygon|yahoo|sec_proxy"),
    limit: int = Query(20, ge=1, le=200),
):
    t = ticker.upper()
    if source == "polygon":
        events = await polygon_earnings_calendar(t, limit=limit)
        if not events:
            raise HTTPException(status_code=501, detail="Polygon earnings not available (missing key or empty).")
        return events
    if source == "yahoo":
        events = await yahoo_earnings_calendar(t, limit=limit)
        if not events:
            raise HTTPException(status_code=501, detail="Yahoo earnings not available (empty).")
        return events
    if source == "sec_proxy":
        return await sec_proxy_earnings_events(t, limit=limit)

    # auto: prefer polygon, then yahoo, then (optionally) sec proxy
    if POLYGON_API_KEY:
        events = await polygon_earnings_calendar(t, limit=limit)
        if events:
            return events
    events = await yahoo_earnings_calendar(t, limit=limit)
    if events:
        return events

    # SEC proxy only if explicitly requested
    if source == "sec_proxy":
        return await sec_proxy_earnings_events(t, limit=limit)

    return []

# ============================================================
# ROUTES: POST-EARNINGS REACTION (market layer)
# ============================================================
@app.get("/company/{ticker}/earnings-reaction", response_model=EarningsReaction)
async def earnings_reaction(
    ticker: str,
    event_date: Optional[str] = Query(None, description="YYYY-MM-DD. If omitted, uses latest earnings event."),
    window_days: int = Query(5, ge=1, le=60),
    source: str = Query("auto", description="auto|polygon|yahoo|sec_proxy"),
):
    t = ticker.upper()
    notes: List[str] = []

    if not event_date:
        ev = await resolve_earnings_event(t, source=source)
        event_date = ev.event_date
        notes.append(f"event_date resolved from {ev.source}")

    try:
        d0 = dt.date.fromisoformat(event_date)
    except Exception:
        raise HTTPException(status_code=400, detail="event_date must be YYYY-MM-DD")

    # reaction window: from event_date to event_date + window_days
    start = d0.isoformat()
    end = (d0 + dt.timedelta(days=window_days + 2)).isoformat()  # pad for non-trading days

    bars = await polygon_aggregate_bars(t, start=start, end=end, timespan="day")

    if not bars:
        raise HTTPException(status_code=404, detail="No price bars returned for this window.")

    ref_close, end_close, ret, max_dd, max_ru, vol_sum = compute_reaction(bars, window_days=window_days)
    return EarningsReaction(
        ticker=t,
        event_date=event_date,
        window_days=window_days,
        ref_close=ref_close,
        end_close=end_close,
        return_pct=ret,
        max_drawdown_pct=max_dd,
        max_runup_pct=max_ru,
        volume_sum=vol_sum,
        notes=notes,
    )

# ============================================================
# ROUTES: EARNINGS DETAILS (aggregates event, fundamentals, summary, ratios, reaction, notes)
# ============================================================
@app.get("/company/{ticker}/earnings-details", response_model=EarningsDetails)
async def earnings_details(
    ticker: str,
    event_date: Optional[str] = Query(None, description="YYYY-MM-DD. If omitted, uses latest earnings."),
    window_days: int = Query(5, ge=1, le=60),
    source: str = Query("auto", description="auto|polygon|yahoo|sec_proxy"),
):
    t = ticker.upper()
    notes: List[str] = []

    # 1) Resolve earnings event (date + AMC/BMO)
    if event_date:
        ev = EarningsEvent(
            ticker=t,
            source="manual",
            event_date=event_date,
            event_time=None,
            confidence="low",
        )
        notes.append("event_date provided manually")
    else:
        ev = await resolve_earnings_event(t, source=source)
        notes.append(f"event_date resolved from {ev.source}")

    # 2) Parse event date
    try:
        d0 = dt.date.fromisoformat(ev.event_date)
    except Exception:
        raise HTTPException(status_code=400, detail="event_date must be YYYY-MM-DD")

    # 3) Fundamentals + summary (SEC-backed)
    health = await financial_health(
        t,
        fy=None,
        fp=None,
        form=None,
        accn=None,
    )
    summary = await earnings_summary(
        t,
        fy=None,
        fp=None,
        form=None,
        accn=None,
    )

    # 3b) Analyst expectations (Yahoo)
    analysts_data: Optional[EarningsAnalystsResponse] = None
    try:
        analysts_data = await earnings_analysts(t)
    except Exception:
        notes.append("Analyst data unavailable")

    # 4) Key ratios (derived)
    ratios: Dict[str, Optional[float]] = {}
    a = health.assets.value if health.assets else None
    l = health.liabilities.value if health.liabilities else None
    e = (a - l) if isinstance(a, (int, float)) and isinstance(l, (int, float)) else None
    d = health.debt.value if health.debt else None

    ratios["debt_to_equity"] = safe_div(d, e)
    ratios["equity"] = e

    # EPS surprise vs analyst expectations
    eps_surprise_pct: Optional[float] = None

    actual_eps = summary.eps_diluted.value if summary.eps_diluted else None
    est_eps = None

    if analysts_data and analysts_data.earnings_forecast:
        est_eps = analysts_data.earnings_forecast.eps_current_year

    if isinstance(actual_eps, (int, float)) and isinstance(est_eps, (int, float)) and est_eps != 0:
        eps_surprise_pct = (actual_eps - est_eps) / abs(est_eps) * 100.0

    # 5) Post-earnings reaction
    reaction: Optional[EarningsReaction] = None
    try:
        reaction = await earnings_reaction(
            ticker=t,
            event_date=ev.event_date,
            window_days=window_days,
            source=source,
        )
    except Exception as ex:
        notes.append(f"reaction unavailable: {str(ex)[:120]}")

    # 6) AMC / BMO interpretation
    if ev.event_time == "AMC":
        notes.append("Earnings released After Market Close (AMC)")
    elif ev.event_time == "BMO":
        notes.append("Earnings released Before Market Open (BMO)")
    else:
        notes.append("Earnings release time unknown")

    return EarningsDetails(
        ticker=t,
        event_date=ev.event_date,
        event_time=ev.event_time,
        event_source=ev.source,
        fundamentals=health,
        summary=summary,
        reaction=reaction,
        ratios=ratios,
        analysts=analysts_data,
        eps_surprise_pct=eps_surprise_pct,
        notes=notes,
    )

# ============================================================
# ROUTES: OPTIONS EXPECTED MOVE (options layer)
# ============================================================
@app.get("/company/{ticker}/expected-move", response_model=ExpectedMove)
async def expected_move(
    ticker: str,
    horizon_days: int = Query(1, ge=1, le=30),
):
    return await polygon_expected_move_simple(ticker.upper(), horizon_days=horizon_days)

# ============================================================
# ROUTES: FILING TEXT + SECTIONS + SENTIMENT (docs/qual layer)
# ============================================================
@app.get("/company/{ticker}/filing-text", response_model=FilingText)
async def filing_text(
    ticker: str,
    accn: str = Query(..., description="Accession number like 0000320193-25-000079"),
    primary_doc: Optional[str] = Query(None, description="Primary doc filename, e.g. aapl-20250927.htm"),
    force_refresh: bool = Query(False),
):
    cik10 = await _ticker_to_cik10(ticker)
    # If primary_doc not provided, fetch from filings list
    if not primary_doc:
        fl = await company_filings(ticker, forms="10-Q,10-K,8-K", limit=50, force_refresh=force_refresh)
        match = [f for f in fl if f.accessionNumber == accn]
        if not match or not match[0].primaryDocument:
            raise HTTPException(status_code=400, detail="primary_doc not provided and could not be inferred from /filings.")
        primary_doc = match[0].primaryDocument

    html = await sec_fetch_filing_html(cik10, accn, primary_doc)
    text = html_to_text(html)
    sections = extract_sections_10k_10q(text)

    cik_int = str(int(cik10))
    accn_nodash = accn.replace("-", "")
    url = f"{SEC_ARCHIVES_BASE}/{cik_int}/{accn_nodash}/{primary_doc}"

    return FilingText(
        ticker=ticker.upper(),
        cik=cik10,
        accn=accn,
        url=url,
        text_len=len(text),
        extracted_sections=sections,
    )

@app.get("/company/{ticker}/filing-sentiment", response_model=SentimentScore)
async def filing_sentiment(
    ticker: str,
    accn: str = Query(...),
    primary_doc: Optional[str] = Query(None),
):
    ft = await filing_text(ticker, accn=accn, primary_doc=primary_doc)
    # Prefer MD&A (item7) if available
    base_text = ft.extracted_sections.get("item7") or "\n".join(list(ft.extracted_sections.values())[:2]) or ""
    if not base_text:
        raise HTTPException(status_code=404, detail="No extractable text available for sentiment scoring.")
    s = simple_sentiment(base_text)
    return SentimentScore(ticker=ticker.upper(), accn=accn, score=s.score, label=s.label, cues=s.cues)

# ============================================================
# ROUTES: FINANCIAL HEALTH (derived layer)
# ============================================================
@app.get("/company/{ticker}/financial-health", response_model=FinancialHealth)
async def financial_health(
    ticker: str,
    fy: Optional[int] = Query(None),
    fp: Optional[str] = Query(None),
    form: Optional[str] = Query(None),
    accn: Optional[str] = Query(None),
    force_refresh: bool = Query(False),
):
    cik10 = await _ticker_to_cik10(ticker)
    facts = await get_companyfacts(cik10, force=force_refresh)
    notes: List[str] = []

    assets = pick_metric(facts, ASSETS_TAGS, USD_UNITS, fy, fp, form, accn, notes)
    liab = pick_metric(facts, LIAB_TAGS, USD_UNITS, fy, fp, form, accn, notes)
    cash = pick_metric(facts, CASH_TAGS, USD_UNITS, fy, fp, form, accn, notes)
    debt = pick_metric(facts, DEBT_TAGS, USD_UNITS, fy, fp, form, accn, notes)
    ocf = pick_metric(facts, OCF_TAGS, USD_UNITS, fy, fp, form, accn, notes)

    period_end = derive_period_end([assets, liab, cash, debt, ocf])
    as_of = derive_as_of([assets, liab, cash, debt, ocf])

    # Derived ratios
    a = float(assets.value) if assets and isinstance(assets.value, (int, float)) else None
    l = float(liab.value) if liab and isinstance(liab.value, (int, float)) else None
    c = float(cash.value) if cash and isinstance(cash.value, (int, float)) else None
    d = float(debt.value) if debt and isinstance(debt.value, (int, float)) else None
    o = float(ocf.value) if ocf and isinstance(ocf.value, (int, float)) else None

    ratios: Dict[str, Optional[float]] = {}
    ratios["debt_to_assets"] = safe_div(d, a)
    ratios["liabilities_to_assets"] = safe_div(l, a)
    ratios["cash_to_liabilities"] = safe_div(c, l)
    ratios["cash_to_debt"] = safe_div(c, d)
    ratios["ocf_to_debt"] = safe_div(o, d)

    return FinancialHealth(
        ticker=ticker.upper(),
        cik=cik10,
        fy=fy,
        fp=fp.upper() if fp else None,
        as_of=as_of,
        period_end=period_end,
        assets=assets,
        liabilities=liab,
        cash=cash,
        debt=debt,
        ocf=ocf,
        current_health=ratios,
        notes=notes,
    )

# ============================================================
# NEWS API INTEGRATION (APPENDED)
# ============================================================

NEWS_API_KEY = os.getenv("NEWS_API_KEY", "").strip()
NEWS_API_BASE = "https://newsapi.org/v2"


class NewsArticle(BaseModel):
    source: str
    title: str
    description: Optional[str] = None
    url: str
    published_at: str
    sentiment_hint: Optional[str] = None


class NewsResponse(BaseModel):
    ticker: str
    total_results: int
    articles: List[NewsArticle]
    notes: List[str] = []


async def fetch_company_news(
    query: str,
    days_back: int = 7,
    limit: int = 20,
) -> Tuple[List[NewsArticle], List[str]]:
    if not NEWS_API_KEY:
        raise HTTPException(status_code=501, detail="NEWS_API_KEY not set")

    from_date = (dt.date.today() - dt.timedelta(days=days_back)).isoformat()

    params = {
        "q": query,
        "from": from_date,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": min(limit, 100),
        "apiKey": NEWS_API_KEY,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(f"{NEWS_API_BASE}/everything", params=params)

        if r.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"NewsAPI error {r.status_code}: {r.text[:200]}",
            )

        data = r.json()

    articles: List[NewsArticle] = []

    for a in data.get("articles", []):
        title = a.get("title") or ""
        desc = a.get("description") or ""
        combined = (title + " " + desc).lower()

        sentiment = None
        if any(w in combined for w in ["beats", "strong", "record", "growth", "surge", "raises"]):
            sentiment = "positive"
        elif any(w in combined for w in ["misses", "weak", "lawsuit", "decline", "probe", "cut"]):
            sentiment = "negative"

        articles.append(
            NewsArticle(
                source=(a.get("source") or {}).get("name", "unknown"),
                title=title,
                description=desc,
                url=a.get("url"),
                published_at=a.get("publishedAt"),
                sentiment_hint=sentiment,
            )
        )

    notes: List[str] = []
    if not articles:
        notes.append("No recent news articles found")

    return articles, notes


@app.get("/company/{ticker}/news", response_model=NewsResponse)
async def company_news(
    ticker: str,
    days_back: int = Query(7, ge=1, le=30),
    limit: int = Query(20, ge=1, le=100),
):
    query = f"{ticker.upper()} OR {ticker.upper()} earnings OR {ticker.upper()} stock"

    articles, notes = await fetch_company_news(
        query=query,
        days_back=days_back,
        limit=limit,
    )

    return NewsResponse(
        ticker=ticker.upper(),
        total_results=len(articles),
        articles=articles,
        notes=notes,
    )
# ============================================================
# EARNINGS-FOCUSED NEWS (FIXED + DATE-ANCHORED)
# ============================================================

class EarningsNewsBucket(BaseModel):
    phase: str  # before | during | after
    articles: List[NewsArticle]


class EarningsNewsResponse(BaseModel):
    ticker: str
    event_date: str
    window_days: int
    buckets: List[EarningsNewsBucket]
    notes: List[str] = []


def earnings_news_query(ticker: str) -> str:
    t = ticker.upper()
    return (
        f"{t} earnings OR {t} results OR {t} revenue OR {t} EPS "
        f"OR {t} guidance OR {t} outlook"
    )


async def fetch_company_news_window(
    query: str,
    start_date: dt.date,
    end_date: dt.date,
    limit: int = 100,
) -> Tuple[List[NewsArticle], List[str]]:
    if not NEWS_API_KEY:
        raise HTTPException(status_code=501, detail="NEWS_API_KEY not set")

    params = {
        "q": query,
        "from": start_date.isoformat(),
        "to": end_date.isoformat(),
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": min(limit, 100),
        "apiKey": NEWS_API_KEY,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(f"{NEWS_API_BASE}/everything", params=params)

        if r.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"NewsAPI error {r.status_code}: {r.text[:200]}",
            )

        data = r.json()

    articles: List[NewsArticle] = []

    for a in data.get("articles", []):
        title = a.get("title") or ""
        desc = a.get("description") or ""
        combined = (title + " " + desc).lower()

        sentiment = None
        if any(w in combined for w in ["beats", "strong", "record", "growth", "surge", "raises"]):
            sentiment = "positive"
        elif any(w in combined for w in ["misses", "weak", "lawsuit", "decline", "probe", "cut"]):
            sentiment = "negative"

        articles.append(
            NewsArticle(
                source=(a.get("source") or {}).get("name", "unknown"),
                title=title,
                description=desc,
                url=a.get("url"),
                published_at=a.get("publishedAt"),
                sentiment_hint=sentiment,
            )
        )

    notes: List[str] = []
    if not articles:
        notes.append("No earnings-related news found in this date window")

    return articles, notes


@app.get("/company/{ticker}/earnings-news", response_model=EarningsNewsResponse)
async def earnings_news(
    ticker: str,
    window_days: int = Query(3, ge=1, le=7),
    source: str = Query("auto", description="auto|polygon|yahoo|sec_proxy"),
):
    notes: List[str] = []
    t = ticker.upper()

    # 1) Infer earnings date
    ev = await resolve_earnings_event(t, source=source)
    event_date = ev.event_date
    notes.append(f"event_date resolved from {ev.source}")

    if ev.source == "sec_proxy":
        notes.append("WARNING: SEC proxy used — earnings date may be inaccurate")

    d0 = dt.date.fromisoformat(event_date)

    # 2) Build earnings window (NO plan limits)
    start = d0 - dt.timedelta(days=window_days)
    end = d0 + dt.timedelta(days=window_days)

    # 3) Try earnings-specific query
    articles, news_notes = await fetch_company_news_window(
        query=earnings_news_query(t),
        start_date=start,
        end_date=end,
        limit=100,
    )
    notes.extend(news_notes)

    # 4) Fallback to broader company news if needed
    if not articles:
        notes.append("No earnings-specific news found, falling back to general company news")

        articles, fallback_notes = await fetch_company_news_window(
            query=f"{t} stock OR {t} shares OR {t} analyst OR {t} outlook",
            start_date=start,
            end_date=end,
            limit=100,
        )
        notes.extend(fallback_notes)

    before: List[NewsArticle] = []
    during: List[NewsArticle] = []
    after: List[NewsArticle] = []

    for a in articles:
        try:
            pub_date = dt.datetime.fromisoformat(
                a.published_at.replace("Z", "+00:00")
            ).date()
        except Exception:
            continue

        delta = (pub_date - d0).days

        if delta < 0:
            before.append(a)
        elif delta == 0:
            during.append(a)
        elif delta > 0:
            after.append(a)

    return EarningsNewsResponse(
        ticker=t,
        event_date=event_date,
        window_days=window_days,
        buckets=[
            EarningsNewsBucket(phase="before", articles=before),
            EarningsNewsBucket(phase="during", articles=during),
            EarningsNewsBucket(phase="after", articles=after),
        ],
        notes=notes,
    )

# ============================================================
# EARNINGS ANALYSTS (Yahoo Finance)
# ============================================================

class AnalystRatings(BaseModel):
    buy: Optional[int] = None
    hold: Optional[int] = None
    sell: Optional[int] = None
    total: Optional[int] = None
    consensus: Optional[str] = None


class PriceTargets(BaseModel):
    low: Optional[float] = None
    mean: Optional[float] = None
    high: Optional[float] = None
    implied_upside_pct: Optional[float] = None


class EarningsForecast(BaseModel):
    eps_current_year: Optional[float] = None
    eps_next_year: Optional[float] = None
    eps_growth_pct: Optional[float] = None
    revenue_current_year: Optional[float] = None
    revenue_next_year: Optional[float] = None


class EarningsAnalystsResponse(BaseModel):
    ticker: str
    source: str = "yahoo"
    analysts: AnalystRatings
    price_targets: PriceTargets
    earnings_forecast: EarningsForecast
    notes: List[str] = []


# ============================================================
# Yahoo Finance Analyst Data Robust Extraction Helper
# ============================================================

# --- Yahoo quoteSummary helper and recommendationTrend extraction ---
def yahoo_quote_summary(ticker: str, modules: str) -> dict:
    url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ticker}"
    params = {"modules": modules}
    r = httpx.get(url, params=params, timeout=10)
    r.raise_for_status()
    data = r.json()
    result = data.get("quoteSummary", {}).get("result")
    if not result:
        return {}
    return result[0]


def extract_recommendation_trend(qs: dict) -> dict:
    trend = qs.get("recommendationTrend", {}).get("trend", [])
    if not trend:
        return {}

    latest = trend[0]

    buy = (latest.get("strongBuy", 0) or 0) + (latest.get("buy", 0) or 0)
    hold = latest.get("hold", 0) or 0
    sell = (latest.get("sell", 0) or 0) + (latest.get("strongSell", 0) or 0)

    total = buy + hold + sell
    if total == 0:
        return {}

    if buy > max(hold, sell):
        consensus = "buy"
    elif sell > max(buy, hold):
        consensus = "sell"
    else:
        consensus = "hold"

    return {
        "buy": buy,
        "hold": hold,
        "sell": sell,
        "total": total,
        "consensus": consensus,
    }


def _extract_analyst_data(yt: yf.Ticker) -> dict:
    data = {}

    # ---- Recommendations counts ----
    try:
        rec = yt.recommendations
        if rec is not None and not rec.empty:
            latest = rec.tail(50)
            data["buy"] = int((latest["To Grade"].str.contains("Buy", case=False, na=False)).sum())
            data["hold"] = int((latest["To Grade"].str.contains("Hold", case=False, na=False)).sum())
            data["sell"] = int((latest["To Grade"].str.contains("Sell", case=False, na=False)).sum())
    except Exception:
        pass

    # ---- Earnings estimates ----
    try:
        trend = yt.earnings_trend
        if trend is not None and not trend.empty:
            curr = trend.iloc[0]
            data["eps_estimate"] = curr.get("earningsEstimate", {}).get("avg")
    except Exception:
        pass

    # ---- Price targets ----
    try:
        info = yt.info or {}
        data["targetLowPrice"] = info.get("targetLowPrice")
        data["targetMeanPrice"] = info.get("targetMeanPrice")
        data["targetHighPrice"] = info.get("targetHighPrice")
        data["currentPrice"] = info.get("currentPrice")
    except Exception:
        pass

    return data


@app.get(
    "/company/{ticker}/earnings-analysts",
    response_model=EarningsAnalystsResponse,
)
async def earnings_analysts(ticker: str):
    t = ticker.upper()
    notes: List[str] = []

    try:
        yt = yf.Ticker(t)
        info = yt.info or {}
        extra = _extract_analyst_data(yt)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Yahoo Finance fetch failed: {str(e)[:200]}",
        )

    # --------------------------------------------------------
    # Yahoo quoteSummary recommendationTrend (NEW)
    # --------------------------------------------------------
    qs = {}
    try:
        qs = yahoo_quote_summary(t, "recommendationTrend")
    except Exception:
        qs = {}

    # --------------------------------------------------------
    # Analyst ratings
    # --------------------------------------------------------
    rec_from_qs = extract_recommendation_trend(qs)

    if rec_from_qs:
        analysts = AnalystRatings(**rec_from_qs)
    else:
        buy = extra.get("buy") or info.get("recommendationBuy")
        hold = extra.get("hold") or info.get("recommendationHold")
        sell = extra.get("sell") or info.get("recommendationSell")

        total = None
        if any(v is not None for v in [buy, hold, sell]):
            total = sum(v or 0 for v in [buy, hold, sell])

        consensus = None
        if buy is not None and hold is not None and sell is not None:
            if buy > hold and buy > sell:
                consensus = "buy"
            elif sell > buy and sell > hold:
                consensus = "sell"
            else:
                consensus = "hold"

        analysts = AnalystRatings(
            buy=buy,
            hold=hold,
            sell=sell,
            total=total,
            consensus=consensus,
        )

    # --------------------------------------------------------
    # Price targets
    # --------------------------------------------------------
    low = extra.get("targetLowPrice")
    mean = extra.get("targetMeanPrice")
    high = extra.get("targetHighPrice")
    current_price = extra.get("currentPrice")

    implied_upside = None
    if mean and current_price:
        try:
            implied_upside = (mean / current_price - 1.0) * 100.0
        except Exception:
            pass

    price_targets = PriceTargets(
        low=low,
        mean=mean,
        high=high,
        implied_upside_pct=implied_upside,
    )

    # --------------------------------------------------------
    # Earnings forecasts
    # --------------------------------------------------------
    eps_curr = info.get("earningsPerShare")
    eps_fwd = extra.get("eps_estimate") or info.get("forwardEps")

    eps_growth = None
    if eps_curr and eps_fwd:
        try:
            eps_growth = (eps_fwd / eps_curr - 1.0) * 100.0
        except Exception:
            pass

    revenue_curr = info.get("revenueEstimate")
    revenue_fwd = info.get("forwardRevenue")

    earnings_forecast = EarningsForecast(
        eps_current_year=eps_curr,
        eps_next_year=eps_fwd,
        eps_growth_pct=eps_growth,
        revenue_current_year=revenue_curr,
        revenue_next_year=revenue_fwd,
    )

    if not analysts.total:
        notes.append("Analyst recommendation counts unavailable via Yahoo (no recommendationTrend data)")

    if not any([low, mean, high]):
        notes.append("Price target data not available from Yahoo")

    if not any([eps_curr, eps_fwd]):
        notes.append("Earnings forecast data not available from Yahoo")

    return EarningsAnalystsResponse(
        ticker=t,
        analysts=analysts,
        price_targets=price_targets,
        earnings_forecast=earnings_forecast,
        notes=notes,
    )

# ============================================================
# EARNINGS LIVE (CLIENT-POLLED PRESS RELEASE SCRAPER)
# ============================================================

class EarningsLivePolling(BaseModel):
    ticker: str
    event_date: str
    status: str  # pending | released
    source: Optional[str] = None
    published_at: Optional[str] = None
    event_time: Optional[str] = None
    eps_actual: Optional[float] = None
    revenue_actual: Optional[float] = None
    headline: Optional[str] = None
    confidence: Optional[str] = None
    notes: List[str] = []


# -------- REGEX --------

EPS_REGEX = re.compile(
    r"(EPS|earnings per share)[^\d\-]*(-?\$?\d+(\.\d+)?)",
    re.IGNORECASE,
)

REV_REGEX = re.compile(
    r"(revenue|sales)[^\d\$]*\$?\s*([\d\.]+)\s*(billion|million)?",
    re.IGNORECASE,
)


def _normalize_revenue(val: float, unit: Optional[str]) -> float:
    if not unit:
        return val
    u = unit.lower()
    if u == "billion":
        return val * 1_000_000_000
    if u == "million":
        return val * 1_000_000
    return val


def extract_earnings_numbers(text: str) -> Tuple[Optional[float], Optional[float]]:
    eps = None
    revenue = None

    m_eps = EPS_REGEX.search(text)
    if m_eps:
        try:
            eps = float(m_eps.group(2).replace("$", ""))
        except Exception:
            pass

    m_rev = REV_REGEX.search(text)
    if m_rev:
        try:
            revenue = _normalize_revenue(float(m_rev.group(2)), m_rev.group(3))
        except Exception:
            pass

    return eps, revenue


def looks_like_earnings_release(text: str) -> bool:
    t = text.lower()
    return (
        any(k in t for k in ["earnings", "results", "reports"])
        and any(k in t for k in ["eps", "revenue", "sales"])
    )


async def fetch_ir_html(url: str) -> str:
    headers = {
        "User-Agent": SEC_USER_AGENT,
        "Accept": "text/html",
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(url, headers=headers)
        r.raise_for_status()
        return r.text


def guess_ir_urls(ticker: str) -> List[str]:
    t = ticker.lower()
    return [
        f"https://investor.{t}.com/press-releases",
        f"https://ir.{t}.com/press-releases",
        f"https://investors.{t}.com/press-releases",
        f"https://investor.{t}.com/news",
        f"https://ir.{t}.com/news",
    ]


async def scrape_earnings_ir(ticker: str) -> Optional[Dict[str, Any]]:
    for url in guess_ir_urls(ticker):
        try:
            html = await fetch_ir_html(url)
        except Exception:
            continue

        soup = BeautifulSoup(html, "lxml")
        blocks = soup.find_all(["article", "div"], limit=5)

        for b in blocks:
            text = b.get_text(" ", strip=True)
            if not looks_like_earnings_release(text):
                continue

            eps, revenue = extract_earnings_numbers(text)
            if eps is None and revenue is None:
                continue

            return {
                "headline": text[:300],
                "eps": eps,
                "revenue": revenue,
                "confidence": "high" if eps and revenue else "medium",
                "source_url": url,
            }

    return None


# ============================================================
# ROUTE: EARNINGS LIVE (POLLING)
# ============================================================

@app.get(
    "/company/{ticker}/earnings-live",
    response_model=EarningsLivePolling,
)
async def earnings_live(
    ticker: str,
    event_date: str = Query(..., description="YYYY-MM-DD earnings release date"),
):
    t = ticker.upper()

    try:
        target_date = dt.date.fromisoformat(event_date)
    except Exception:
        raise HTTPException(status_code=400, detail="event_date must be YYYY-MM-DD")

    today = dt.date.today()

    # Earnings day not reached yet
    if today < target_date:
        return EarningsLivePolling(
            ticker=t,
            event_date=event_date,
            status="pending",
            notes=["Earnings date has not occurred yet"],
        )

    # Resolve AMC / BMO if possible
    try:
        ev = await resolve_earnings_event(t, source="auto")
        event_time = ev.event_time
    except Exception:
        event_time = None

    data = await scrape_earnings_ir(t)

    if not data:
        return EarningsLivePolling(
            ticker=t,
            event_date=event_date,
            status="pending",
            event_time=event_time,
            notes=["Earnings press release not published yet"],
        )

    return EarningsLivePolling(
        ticker=t,
        event_date=event_date,
        status="released",
        source="press_release",
        published_at=dt.datetime.utcnow().isoformat() + "Z",
        event_time=event_time,
        eps_actual=data["eps"],
        revenue_actual=data["revenue"],
        headline=data["headline"],
        confidence=data["confidence"],
        notes=[f"Scraped from {data['source_url']}"],
    )


# ============================================================
# EARNINGS AI REVIEW (DEEPSEEK)
# ============================================================

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "").strip()
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
DEEPSEEK_MODEL = "deepseek-chat"


class EarningsAIReview(BaseModel):
    ticker: str
    fy: Optional[int]
    fp: Optional[str]
    period_end: Optional[str]
    generated_at: str
    model: str
    analysis_markdown: str
    notes: List[str] = []


async def deepseek_generate(prompt: str) -> str:
    if not DEEPSEEK_API_KEY:
        raise HTTPException(
            status_code=501,
            detail="DEEPSEEK_API_KEY not set",
        )

    url = f"{DEEPSEEK_BASE_URL}/chat/completions"

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a senior equity research analyst. "
                    "Write factual, investor-grade earnings analysis. "
                    "Do not hallucinate numbers."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0.35,
        "max_tokens": 1400,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(url, headers=headers, json=payload)

        if r.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"DeepSeek API error: {r.text[:500]}",
            )

        data = r.json()

    try:
        return data["choices"][0]["message"]["content"]
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Unexpected DeepSeek response format",
        )


def build_earnings_prompt(
    ticker: str,
    summary: EarningsSummary,
    health: FinancialHealth,
    current_price: float = 0.0,
    market_cap: float = 0.0,
) -> str:
    today_str = dt.date.today().isoformat()
    return f"""
You are an expert equity analyst. Today is {today_str}.

Analyze the MOST RECENT COMPLETED quarterly earnings for {ticker}.
Write a detailed, professional, investor-grade review.

Use PROPER MARKDOWN formatting:
- Use ## for section headings
- Use **bold** for key figures and important terms
- Use bullet points (- ) for lists
- Use > blockquotes for key takeaways
- Separate sections with blank lines for readability
- Format dollar amounts with $ and commas (e.g., $1,234,567)
- Format percentages with % sign

STRUCTURE YOUR ANALYSIS WITH THESE EXACT HEADINGS:

## Executive Summary
A 3-4 sentence overview of the quarter. State whether it was strong/weak/mixed.

## Revenue & Earnings Performance
Detail revenue, EPS, and year-over-year comparisons. Mention beats/misses vs estimates if inferrable.

## Profitability & Margins
Discuss gross margins, operating margins, net margins. Highlight trends.

## Balance Sheet & Financial Health
Cover assets, liabilities, cash position, debt levels. Calculate key ratios.

## Earnings Quality & Sustainability
Assess whether earnings are driven by core operations or one-time items.

## Risks & Forward Outlook
Key risks, competitive pressures, and forward guidance implications.

FACTUAL DATA (DO NOT INVENT NUMBERS — only use what's provided):

- **Ticker**: {ticker}
- **Fiscal Year**: {summary.revenue.fy if summary.revenue else "N/A"}
- **Fiscal Period**: {summary.revenue.fp if summary.revenue else "N/A"}
- **Period End**: {summary.period_end}
- **Revenue**: {f"${summary.revenue.value:,.0f}" if summary.revenue and summary.revenue.value else "N/A"}
- **Net Income**: {f"${summary.net_income.value:,.0f}" if summary.net_income and summary.net_income.value else "N/A"}
- **EPS (Diluted)**: {f"${summary.eps_diluted.value:.2f}" if summary.eps_diluted and summary.eps_diluted.value else "N/A"}
- **Total Assets**: {f"${health.assets.value:,.0f}" if health.assets and health.assets.value else "N/A"}
- **Total Liabilities**: {f"${health.liabilities.value:,.0f}" if health.liabilities and health.liabilities.value else "N/A"}
- **Cash & Equivalents**: {f"${health.cash.value:,.0f}" if health.cash and health.cash.value else "N/A"}
- **Total Debt**: {f"${health.debt.value:,.0f}" if health.debt and health.debt.value else "N/A"}
- **Current Stock Price**: {f"${current_price:.2f}" if current_price else "N/A"}
- **Market Cap**: {f"${market_cap:,.0f}" if market_cap else "N/A"}

Rules:
- Do NOT hallucinate or invent numbers not provided above
- If data is missing, explicitly state "Data not available"
- Neutral, analytical tone — no hype, no emojis
- Reference the current stock price context when discussing valuation
- Be specific and data-driven in every section
""".strip()


# ============================================================
# ROUTE: EARNINGS AI REVIEW (DEEPSEEK)
# ============================================================

@app.get(
    "/company/{ticker}/earnings-ai-review",
    response_model=EarningsAIReview,
)
async def earnings_ai_review(
    ticker: str,
):
    t = ticker.upper()

    # Latest completed earnings (SEC-backed)
    summary = await earnings_summary(
        t,
        fy=None,
        fp=None,
        form=None,
        accn=None,
    )

    health = await financial_health(
        t,
        fy=None,
        fp=None,
        form=None,
        accn=None,
    )

    if not summary.period_end:
        raise HTTPException(
            status_code=404,
            detail="No completed earnings period available for AI review",
        )

    # Fetch current market data from yfinance for context
    current_price = 0.0
    market_cap = 0.0
    try:
        loop = asyncio.get_event_loop()
        yf_info = await loop.run_in_executor(
            _yf_executor, lambda: yf.Ticker(t).info or {}
        )
        current_price = float(yf_info.get("currentPrice", 0) or yf_info.get("regularMarketPrice", 0) or 0)
        market_cap = float(yf_info.get("marketCap", 0) or 0)
    except Exception:
        pass

    prompt = build_earnings_prompt(
        ticker=t,
        summary=summary,
        health=health,
        current_price=current_price,
        market_cap=market_cap,
    )

    analysis = await deepseek_generate(prompt)

    return EarningsAIReview(
        ticker=t,
        fy=summary.revenue.fy if summary.revenue else None,
        fp=summary.revenue.fp if summary.revenue else None,
        period_end=summary.period_end,
        generated_at=dt.datetime.utcnow().isoformat() + "Z",
        model=DEEPSEEK_MODEL,
        analysis_markdown=analysis,
        notes=[],
    )

# ============================================================
# MARKET DATA LAYER (Polygon.io)
# ============================================================

class QuoteResponse(BaseModel):
    ticker: str
    price: float
    change: float
    change_pct: float
    open: float
    high: float
    low: float
    close: float
    volume: int
    prev_close: float
    timestamp: str
    market_status: str  # open/closed/pre/post


class TickerInfo(BaseModel):
    ticker: str
    name: str
    market: str
    type: str
    currency: str
    primary_exchange: str


class TickerSearchResponse(BaseModel):
    results: List[TickerInfo]
    count: int


@app.get("/market/quote/{ticker}", response_model=QuoteResponse)
async def market_quote(ticker: str):
    """
    Get real-time quote for a ticker via yfinance (free, no rate limits).
    """
    t = ticker.upper()
    
    try:
        stock = yf.Ticker(t)
        hist = stock.history(period="5d")
        
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No quote data for {t}")
        
        current_row = hist.iloc[-1]
        prev_row = hist.iloc[-2] if len(hist) >= 2 else current_row
        
        price = float(current_row["Close"])
        prev_close = float(prev_row["Close"])
        change = price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0.0
        
        return QuoteResponse(
            ticker=t,
            price=round(price, 2),
            change=round(change, 2),
            change_pct=round(change_pct, 2),
            open=round(float(current_row.get("Open", price)), 2),
            high=round(float(current_row.get("High", price)), 2),
            low=round(float(current_row.get("Low", price)), 2),
            close=round(price, 2),
            volume=int(current_row.get("Volume", 0)),
            prev_close=round(prev_close, 2),
            timestamp=dt.datetime.utcnow().isoformat(),
            market_status="closed",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch quote for {t}: {str(e)}")


@app.get("/market/quotes")
async def market_quotes(tickers: str = Query(..., description="Comma-separated tickers")):
    """
    Get quotes for multiple tickers at once via yfinance.
    Falls back to individual yf.Ticker() if batch download fails.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    
    if len(ticker_list) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 tickers per request")
    
    results = []
    resolved_tickers = set()
    
    # 1) Try batch download first (fast)
    try:
        data = yf.download(ticker_list, period="5d", group_by="ticker", progress=False, threads=True)
        
        if data is not None and not data.empty:
            for t in ticker_list:
                try:
                    if len(ticker_list) == 1:
                        ticker_data = data
                    else:
                        ticker_data = data[t] if t in data.columns.get_level_values(0) else None
                    
                    if ticker_data is None or ticker_data.empty:
                        continue
                    
                    ticker_data = ticker_data.dropna(subset=["Close"])
                    if ticker_data.empty:
                        continue
                        
                    current_row = ticker_data.iloc[-1]
                    prev_row = ticker_data.iloc[-2] if len(ticker_data) >= 2 else current_row
                    
                    price = float(current_row["Close"])
                    prev_close = float(prev_row["Close"])
                    change = price - prev_close
                    change_pct = (change / prev_close * 100) if prev_close else 0.0
                    
                    results.append(QuoteResponse(
                        ticker=t,
                        price=round(price, 2),
                        change=round(change, 2),
                        change_pct=round(change_pct, 2),
                        open=round(float(current_row.get("Open", price)), 2),
                        high=round(float(current_row.get("High", price)), 2),
                        low=round(float(current_row.get("Low", price)), 2),
                        close=round(price, 2),
                        volume=int(current_row.get("Volume", 0)),
                        prev_close=round(prev_close, 2),
                        timestamp=dt.datetime.utcnow().isoformat(),
                        market_status="closed",
                    ))
                    resolved_tickers.add(t)
                except Exception as e:
                    print(f"[WARN] batch quotes: skipping {t}: {e}")
    except Exception as e:
        print(f"[WARN] yf.download batch failed, trying individual: {e}")
    
    # 2) Fallback: individually fetch any tickers that failed in the batch
    missing = [t for t in ticker_list if t not in resolved_tickers]
    for t in missing:
        try:
            tk = yf.Ticker(t)
            hist = tk.history(period="5d")
            if hist is None or hist.empty:
                continue
            hist = hist.dropna(subset=["Close"])
            if hist.empty:
                continue
            current_row = hist.iloc[-1]
            prev_row = hist.iloc[-2] if len(hist) >= 2 else current_row
            price = float(current_row["Close"])
            prev_close = float(prev_row["Close"])
            change = price - prev_close
            change_pct = (change / prev_close * 100) if prev_close else 0.0
            results.append(QuoteResponse(
                ticker=t,
                price=round(price, 2),
                change=round(change, 2),
                change_pct=round(change_pct, 2),
                open=round(float(current_row.get("Open", price)), 2),
                high=round(float(current_row.get("High", price)), 2),
                low=round(float(current_row.get("Low", price)), 2),
                close=round(price, 2),
                volume=int(current_row.get("Volume", 0)),
                prev_close=round(prev_close, 2),
                timestamp=dt.datetime.utcnow().isoformat(),
                market_status="closed",
            ))
        except Exception as e:
            print(f"[WARN] individual quote fallback: skipping {t}: {e}")
    
    return {"quotes": results, "count": len(results)}




@app.get("/market/indices")
async def market_indices():
    """
    Get major market indices: S&P 500, NASDAQ, DOW, VIX.
    Uses yfinance for reliable index data.
    """
    indices = {
        "SPY": {"name": "S&P 500", "symbol": "SPY"},
        "QQQ": {"name": "NASDAQ 100", "symbol": "QQQ"},
        "DIA": {"name": "DOW 30", "symbol": "DIA"},
        "^VIX": {"name": "VIX", "symbol": "VIX"},
    }
    
    results = []
    for yf_symbol, info in indices.items():
        try:
            ticker = yf.Ticker(yf_symbol)
            hist = ticker.history(period="2d")
            if len(hist) >= 1:
                current = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else current
                change = current - prev
                change_pct = (change / prev * 100) if prev else 0
                results.append({
                    "symbol": info["symbol"],
                    "name": info["name"],
                    "price": round(current, 2),
                    "change": round(change, 2),
                    "change_pct": round(change_pct, 2),
                })
        except Exception:
            results.append({
                "symbol": info["symbol"],
                "name": info["name"],
                "price": 0,
                "change": 0,
                "change_pct": 0,
            })
    
    return {"indices": results, "count": len(results)}


@app.get("/market/bars/{ticker}")
async def market_bars(
    ticker: str,
    range: str = Query("1M", description="1D, 5D, 1M, 3M, 6M, 1Y, 5Y"),
    timespan: str = Query("day", description="minute, hour, day, week, month"),
):
    """
    Get historical OHLCV bars for a ticker via yfinance.
    """
    t = ticker.upper()
    
    # Map range to yfinance period format
    period_map = {
        "1D": "1d",
        "5D": "5d",
        "1M": "1mo",
        "3M": "3mo",
        "6M": "6mo",
        "1Y": "1y",
        "5Y": "5y",
    }
    
    # Map timespan to yfinance interval
    interval_map = {
        "minute": "1m",
        "hour": "1h",
        "day": "1d",
        "week": "1wk",
        "month": "1mo",
    }
    
    period = period_map.get(range.upper(), "1mo")
    interval = interval_map.get(timespan.lower(), "1d")
    
    # yfinance has restrictions: 1m data only for last 7 days, 1h for last 730 days
    if interval == "1m" and period not in ("1d", "5d"):
        interval = "1h"
    
    try:
        stock = yf.Ticker(t)
        hist = stock.history(period=period, interval=interval)
        
        if hist.empty:
            return {"ticker": t, "range": range, "timespan": timespan, "bars": [], "count": 0}
        
        bars = []
        for idx, row in hist.iterrows():
            ts = int(idx.timestamp() * 1000) if hasattr(idx, 'timestamp') else 0
            bars.append({
                "t": ts,
                "o": round(float(row.get("Open", 0)), 4),
                "h": round(float(row.get("High", 0)), 4),
                "l": round(float(row.get("Low", 0)), 4),
                "c": round(float(row.get("Close", 0)), 4),
                "v": int(row.get("Volume", 0)),
            })
        
        return {
            "ticker": t,
            "range": range,
            "timespan": timespan,
            "bars": bars,
            "count": len(bars),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch bars for {t}: {str(e)}")



@app.get("/market/search", response_model=TickerSearchResponse)
async def market_search(
    query: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=50),
):
    """
    Search for tickers by name or symbol.
    """
    if not POLYGON_API_KEY:
        raise HTTPException(status_code=501, detail="POLYGON_API_KEY not set")
    
    url = f"https://api.polygon.io/v3/reference/tickers?search={query}&active=true&limit={limit}&apiKey={POLYGON_API_KEY}"
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url)
        
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Polygon search failed: {resp.text[:200]}")
        
        data = resp.json()
    
    results = []
    for r in data.get("results", []):
        results.append(TickerInfo(
            ticker=r.get("ticker", ""),
            name=r.get("name", ""),
            market=r.get("market", ""),
            type=r.get("type", ""),
            currency=r.get("currency_name", "USD"),
            primary_exchange=r.get("primary_exchange", ""),
        ))
    
    return TickerSearchResponse(results=results, count=len(results))


# ============================================================
# EARNINGS CALENDAR (Web Scraped)
# ============================================================

from earnings_scraper import (
    get_earnings_calendar,
    get_upcoming_earnings,
    get_today_earnings,
    get_week_earnings,
    get_earnings_range,
    EarningsEvent as ScrapedEarningsEvent,
)


class CalendarEvent(BaseModel):
    ticker: str
    company_name: str
    earnings_date: str
    earnings_time: Optional[str]
    eps_estimate: Optional[str]
    eps_actual: Optional[str]
    revenue_estimate: Optional[str]
    source: str
    market_cap: Optional[str] = None


class CalendarResponse(BaseModel):
    date: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    events: List[CalendarEvent]
    count: int


def _to_calendar_event(e: ScrapedEarningsEvent) -> CalendarEvent:
    return CalendarEvent(
        ticker=e.ticker,
        company_name=e.company_name,
        earnings_date=e.earnings_date,
        earnings_time=e.earnings_time,
        eps_estimate=e.eps_estimate,
        eps_actual=e.eps_actual,
        revenue_estimate=e.revenue_estimate,
        source=e.source,
        market_cap=e.market_cap,
    )


@app.get("/calendar/today", response_model=CalendarResponse)
async def calendar_today():
    """
    Get today's earnings calendar.
    """
    events = await get_today_earnings()
    
    return CalendarResponse(
        date=dt.date.today().isoformat(),
        events=[_to_calendar_event(e) for e in events],
        count=len(events),
    )


@app.get("/calendar/week", response_model=CalendarResponse)
async def calendar_week():
    """
    Get this week's earnings calendar (Mon-Fri).
    """
    events = await get_week_earnings()
    
    today = dt.date.today()
    monday = today - dt.timedelta(days=today.weekday())
    friday = monday + dt.timedelta(days=4)
    
    return CalendarResponse(
        start_date=monday.isoformat(),
        end_date=friday.isoformat(),
        events=[_to_calendar_event(e) for e in events],
        count=len(events),
    )


@app.get("/calendar/upcoming", response_model=CalendarResponse)
async def calendar_upcoming(
    days: int = Query(7, ge=1, le=30, description="Number of days ahead"),
):
    """
    Get upcoming earnings for the next N days.
    """
    events = await get_upcoming_earnings(days=days)
    
    today = dt.date.today()
    end = today + dt.timedelta(days=days)
    
    return CalendarResponse(
        start_date=today.isoformat(),
        end_date=end.isoformat(),
        events=[_to_calendar_event(e) for e in events],
        count=len(events),
    )


@app.get("/calendar/date/{date_str}", response_model=CalendarResponse)
async def calendar_by_date(date_str: str):
    """
    Get earnings calendar for a specific date.
    
    Args:
        date_str: Date in YYYY-MM-DD format
    """
    try:
        dt.date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    events = await get_earnings_calendar(date_str)
    
    return CalendarResponse(
        date=date_str,
        events=[_to_calendar_event(e) for e in events],
        count=len(events),
    )


# ============================================================
# USER WATCHLIST MANAGEMENT
# ============================================================

from models import UserWatchlist


class WatchlistItem(BaseModel):
    ticker: str
    added_at: str
    notes: Optional[str] = None


class WatchlistResponse(BaseModel):
    email: str
    items: List[WatchlistItem]
    count: int


class AddWatchlistRequest(BaseModel):
    email: str
    ticker: str
    notes: Optional[str] = None


@app.get("/user/watchlist/{email}", response_model=WatchlistResponse)
async def get_watchlist(email: str):
    """
    Get user's watchlist.
    """
    with SessionLocal() as db:
        items = db.query(UserWatchlist).filter(UserWatchlist.user_email == email).all()
    
    return WatchlistResponse(
        email=email,
        items=[
            WatchlistItem(
                ticker=item.ticker,
                added_at=dt.datetime.fromtimestamp(item.added_at).isoformat(),
                notes=item.notes,
            )
            for item in items
        ],
        count=len(items),
    )


@app.post("/user/watchlist/add")
async def add_to_watchlist(req: AddWatchlistRequest):
    """
    Add a ticker to user's watchlist.
    """
    with SessionLocal() as db:
        # Check if already exists
        existing = db.query(UserWatchlist).filter(
            UserWatchlist.user_email == req.email,
            UserWatchlist.ticker == req.ticker.upper(),
        ).first()
        
        if existing:
            return {"status": "exists", "message": f"{req.ticker} already in watchlist"}
        
        db.add(UserWatchlist(
            user_email=req.email,
            ticker=req.ticker.upper(),
            added_at=int(time.time()),
            notes=req.notes,
        ))
        db.commit()
    
    return {"status": "added", "ticker": req.ticker.upper()}


@app.delete("/user/watchlist/{email}/{ticker}")
async def remove_from_watchlist(email: str, ticker: str):
    """
    Remove a ticker from user's watchlist.
    """
    with SessionLocal() as db:
        item = db.query(UserWatchlist).filter(
            UserWatchlist.user_email == email,
            UserWatchlist.ticker == ticker.upper(),
        ).first()
        
        if not item:
            raise HTTPException(status_code=404, detail=f"{ticker} not in watchlist")
        
        db.delete(item)
        db.commit()
    
    return {"status": "removed", "ticker": ticker.upper()}


# ============================================================
# API KEY MANAGEMENT (Extended)
# ============================================================

from auth_keys import hash_api_key, get_key_prefix, mask_api_key, get_tier_features


class APIKeyInfo(BaseModel):
    key_prefix: str
    masked_key: str
    plan: str
    created_at: str
    is_active: bool
    total_requests: int
    name: Optional[str] = None


class ListKeysResponse(BaseModel):
    email: str
    keys: List[APIKeyInfo]
    count: int


@app.get("/auth/list-keys/{email}", response_model=ListKeysResponse)
async def list_api_keys(email: str):
    """
    List all API keys for a user (masked).
    """
    with SessionLocal() as db:
        keys = db.query(APIKey).filter(APIKey.owner_email == email).all()
    
    return ListKeysResponse(
        email=email,
        keys=[
            APIKeyInfo(
                key_prefix=key.key_prefix,
                masked_key=f"tyche_{key.key_prefix}...****",
                plan=key.plan,
                created_at=dt.datetime.fromtimestamp(key.created_at).isoformat(),
                is_active=bool(key.is_active),
                total_requests=key.total_requests,
                name=key.name,
            )
            for key in keys
        ],
        count=len(keys),
    )


class RevokeKeyRequest(BaseModel):
    email: str
    key_prefix: str


@app.post("/auth/revoke-key")
async def revoke_api_key(req: RevokeKeyRequest):
    """
    Revoke an API key by its prefix.
    Once revoked, the key cannot be used for any API requests.
    """
    with SessionLocal() as db:
        key = db.query(APIKey).filter(
            APIKey.owner_email == req.email,
            APIKey.key_prefix == req.key_prefix,
        ).first()
        
        if not key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        if key.is_active == 0:
            return {"status": "already_revoked", "key_prefix": req.key_prefix}
        
        key.is_active = 0
        db.commit()
    
    return {
        "status": "revoked",
        "key_prefix": req.key_prefix,
        "message": "Key has been permanently revoked and can no longer be used."
    }


@app.get("/auth/validate-key")
async def validate_api_key_endpoint(request: Request):
    """
    Validate an API key and return its status and stats.
    Pass the key in X-API-Key header.
    """
    raw_key = request.headers.get("X-API-Key")
    
    if not raw_key:
        raise HTTPException(status_code=400, detail="X-API-Key header required")
    
    if not raw_key.startswith("tyche_"):
        raise HTTPException(status_code=400, detail="Invalid key format")
    
    key_hash = _hash_api_key(raw_key)
    
    with SessionLocal() as db:
        api_key = db.query(APIKey).filter(APIKey.key_hash == key_hash).first()
        
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        return {
            "valid": api_key.is_active == 1,
            "status": "active" if api_key.is_active == 1 else "revoked",
            "plan": api_key.plan,
            "key_prefix": api_key.key_prefix,
            "total_requests": api_key.total_requests or 0,
            "last_used_at": api_key.last_used_at,
            "created_at": api_key.created_at,
            "rate_limit": tier_rpm(api_key.plan),
        }


@app.get("/auth/tier-features/{tier}")
async def get_tier_features_endpoint(tier: str):
    """
    Get feature limits for a subscription tier.
    """
    features = get_tier_features(tier)
    return {"tier": tier, "features": features}


# ============================================================
# CURL EXAMPLES DOCUMENTATION ENDPOINT
# ============================================================

@app.get("/docs/curl-examples")
async def curl_examples():
    """
    Get example curl commands for all major endpoints.
    """
    base = os.getenv("API_BASE_URL", "http://localhost:8000")
    
    return {
        "market_data": [
            {
                "name": "Get Quote",
                "curl": f'curl -X GET "{base}/market/quote/AAPL"',
            },
            {
                "name": "Get Multiple Quotes",
                "curl": f'curl -X GET "{base}/market/quotes?tickers=AAPL,MSFT,GOOGL"',
            },
            {
                "name": "Get Price Bars",
                "curl": f'curl -X GET "{base}/market/bars/AAPL?range=1M&timespan=day"',
            },
            {
                "name": "Search Tickers",
                "curl": f'curl -X GET "{base}/market/search?query=apple&limit=10"',
            },
        ],
        "earnings": [
            {
                "name": "Earnings Summary",
                "curl": f'curl -X GET "{base}/company/AAPL/earnings-summary"',
            },
            {
                "name": "Earnings Details",
                "curl": f'curl -X GET "{base}/company/AAPL/earnings-details"',
            },
            {
                "name": "Earnings Reaction",
                "curl": f'curl -X GET "{base}/company/AAPL/earnings-reaction?window_days=5"',
            },
            {
                "name": "Analyst Ratings",
                "curl": f'curl -X GET "{base}/company/AAPL/earnings-analysts"',
            },
        ],
        "calendar": [
            {
                "name": "Today's Earnings",
                "curl": f'curl -X GET "{base}/calendar/today"',
            },
            {
                "name": "This Week's Earnings",
                "curl": f'curl -X GET "{base}/calendar/week"',
            },
            {
                "name": "Upcoming Earnings",
                "curl": f'curl -X GET "{base}/calendar/upcoming?days=7"',
            },
        ],
        "api_keys": [
            {
                "name": "Generate API Key",
                "curl": f'curl -X POST "{base}/auth/create-api-key" -H "Content-Type: application/json" -d \'{{"email": "user@example.com", "plan": "starter"}}\'',
            },
            {
                "name": "List API Keys",
                "curl": f'curl -X GET "{base}/auth/list-keys/user@example.com"',
            },
            {
                "name": "Revoke API Key",
                "curl": f'curl -X POST "{base}/auth/revoke-key" -H "Content-Type: application/json" -d \'{{"email": "user@example.com", "key_prefix": "abc12345"}}\'',
            },
        ],
    }



# ============================================================
# BATCH EARNINGS INTELLIGENCE ENDPOINTS
# ============================================================

import asyncio
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor

_yf_executor = ThreadPoolExecutor(max_workers=8)


# ------------------------------------------------------------------
# yfinance helpers — run in thread pool so they don't block async loop
# ------------------------------------------------------------------

def _yf_fetch_ticker_data(ticker: str) -> dict:
    """
    Fetch all data we need for a single ticker using yfinance.
    yfinance handles cookies/auth internally so it works reliably.
    Returns a flat dict with analyst + forecast data.
    """
    try:
        tk = yf.Ticker(ticker)
        info = tk.info or {}
    except Exception:
        info = {}

    short_name = info.get("shortName") or info.get("longName") or ticker
    current_price = info.get("currentPrice") or info.get("regularMarketPrice")

    # Analyst data
    buy = 0
    hold = 0
    sell = 0
    try:
        recs = tk.recommendations
        if recs is not None and not recs.empty:
            latest = recs.iloc[-1]
            cols = list(recs.columns)
            if "strongBuy" in cols:
                buy = int(latest.get("strongBuy", 0) or 0) + int(latest.get("buy", 0) or 0)
                hold = int(latest.get("hold", 0) or 0)
                sell = int(latest.get("sell", 0) or 0) + int(latest.get("strongSell", 0) or 0)
    except Exception:
        pass

    # EPS estimates from info (most reliable source)
    trailing_eps = info.get("trailingEps")
    forward_eps = info.get("forwardEps")
    eps_current = trailing_eps  # Current year = trailing
    eps_next = forward_eps       # Next year = forward

    # Revenue data
    rev_current = info.get("totalRevenue")  # Current revenue
    rev_growth = info.get("revenueGrowth")  # Growth rate
    rev_next = None
    if rev_current and rev_growth:
        try:
            rev_next = rev_current * (1 + rev_growth)
        except Exception:
            pass

    # Also try growth_estimates for EPS growth %
    eps_growth_pct = None
    try:
        ge = tk.growth_estimates
        if ge is not None and not ge.empty and "stockTrend" in ge.columns:
            for period in ["+1y", "0y"]:
                if period in ge.index:
                    v = ge.loc[period, "stockTrend"]
                    if v is not None and str(v) != "nan":
                        eps_growth_pct = round(float(v) * 100, 2)
                        break
    except Exception:
        pass

    return {
        "ticker": ticker,
        "shortName": short_name,
        "currentPrice": current_price,
        "targetMeanPrice": info.get("targetMeanPrice"),
        "targetLowPrice": info.get("targetLowPrice"),
        "targetHighPrice": info.get("targetHighPrice"),
        "recommendationKey": info.get("recommendationKey"),
        "numberOfAnalystOpinions": info.get("numberOfAnalystOpinions"),
        "buy_count": buy,
        "hold_count": hold,
        "sell_count": sell,
        "eps_current": eps_current,
        "eps_next": eps_next,
        "rev_current": rev_current,
        "rev_next": rev_next,
        "eps_growth_pct": eps_growth_pct,
    }


def _yf_fetch_earnings_history(ticker: str) -> list:
    """Get past earnings history with actual/estimate EPS."""
    try:
        tk = yf.Ticker(ticker)
        hist = tk.earnings_history
        if hist is None or hist.empty:
            return []
        rows = []
        for idx, row in hist.iterrows():
            actual = row.get("epsActual")
            estimate = row.get("epsEstimate")
            surprise = row.get("surprisePercent") or row.get("epsDifference")
            dt_str = str(idx.date()) if hasattr(idx, "date") else str(idx)
            if actual is not None and str(actual) != "nan":
                rows.append({
                    "date": dt_str,
                    "eps_actual": float(actual),
                    "eps_estimate": float(estimate) if estimate is not None and str(estimate) != "nan" else None,
                    "surprise_pct": float(surprise) if surprise is not None and str(surprise) != "nan" else None,
                })
        return rows
    except Exception:
        return []


def _yf_fetch_price_change(ticker: str, date_str: str) -> Optional[float]:
    """Get the price change around an earnings date."""
    import datetime as _dt
    try:
        date = _dt.date.fromisoformat(date_str)
        start = (date - _dt.timedelta(days=2)).strftime("%Y-%m-%d")
        end = (date + _dt.timedelta(days=4)).strftime("%Y-%m-%d")
        tk = yf.Ticker(ticker)
        hist = tk.history(start=start, end=end)
        if hist is not None and len(hist) >= 2:
            prev_close = float(hist.iloc[0]["Close"])
            post_close = float(hist.iloc[-1]["Close"])
            if prev_close > 0:
                return round(((post_close - prev_close) / prev_close) * 100, 2)
    except Exception:
        pass
    return None


async def _fetch_quotes_concurrent(tickers: List[str]) -> List[dict]:
    """Fetch multiple tickers concurrently using yfinance in thread pool."""
    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(_yf_executor, _yf_fetch_ticker_data, t) for t in tickers]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    out = []
    for r in results:
        if isinstance(r, dict) and r.get("shortName"):
            out.append(r)
    return out


# ------------------------------------------------------------------
# SURPRISES endpoint
# ------------------------------------------------------------------

class SurpriseItem(BaseModel):
    ticker: str
    company_name: str
    earnings_date: str
    eps_estimate: Optional[str] = None
    eps_actual: Optional[str] = None
    surprise_pct: Optional[float] = None
    beat: Optional[bool] = None
    revenue_estimate: Optional[str] = None
    market_cap: Optional[str] = None


class SurprisesResponse(BaseModel):
    items: List[SurpriseItem]
    count: int
    period: str


@app.get("/earnings/surprises", response_model=SurprisesResponse, tags=["Earnings Intelligence"])
async def earnings_surprises(
    days_back: int = Query(7, ge=1, le=30, description="Days of past earnings to scan"),
):
    """
    Get recent earnings surprises — stocks that beat or missed EPS estimates.
    Uses earnings calendar + yfinance earnings_history for actual results.
    """
    today = dt.date.today()
    start = (today - dt.timedelta(days=days_back)).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")

    # Get events from scraper
    try:
        events = await get_earnings_range(start, end)
    except Exception as e:
        print(f"[surprises] scraper error: {e}")
        events = []

    # Deduplicate
    seen = set()
    unique_events = []
    for e in events:
        if e.ticker not in seen:
            seen.add(e.ticker)
            unique_events.append(e)

    # For top tickers, fetch actual earnings history concurrently
    top_events = unique_events[:40]  # Limit to avoid too many requests
    loop = asyncio.get_event_loop()
    history_tasks = [
        loop.run_in_executor(_yf_executor, _yf_fetch_earnings_history, e.ticker)
        for e in top_events
    ]
    histories = await asyncio.gather(*history_tasks, return_exceptions=True)

    results: List[SurpriseItem] = []
    for e, hist_result in zip(top_events, histories):
        eps_est = e.eps_estimate
        eps_act = e.eps_actual
        surprise_pct = None
        beat = None

        # If yfinance has actual earnings data, use it
        if isinstance(hist_result, list) and hist_result:
            latest = hist_result[-1]
            if latest.get("eps_actual") is not None:
                eps_act = f"${latest['eps_actual']:.2f}"
            if latest.get("eps_estimate") is not None:
                eps_est = f"${latest['eps_estimate']:.2f}"
            if latest.get("surprise_pct") is not None:
                surprise_pct = round(latest["surprise_pct"] * 100, 2) if abs(latest["surprise_pct"]) < 10 else round(latest["surprise_pct"], 2)

        # Calculate surprise from actual vs estimate if not from yfinance
        if surprise_pct is None and eps_act and eps_est:
            try:
                actual = float(eps_act.replace("$", "").replace("(", "-").replace(")", "").replace(",", "").strip())
                estimate = float(eps_est.replace("$", "").replace("(", "-").replace(")", "").replace(",", "").strip())
                if estimate != 0:
                    surprise_pct = round((actual - estimate) / abs(estimate) * 100, 2)
                else:
                    surprise_pct = 100.0 if actual > 0 else (-100.0 if actual < 0 else 0.0)
            except (ValueError, TypeError):
                pass

        if surprise_pct is not None:
            beat = surprise_pct >= 0

        results.append(SurpriseItem(
            ticker=e.ticker,
            company_name=e.company_name,
            earnings_date=e.earnings_date,
            eps_estimate=eps_est,
            eps_actual=eps_act,
            surprise_pct=surprise_pct,
            beat=beat,
            revenue_estimate=e.revenue_estimate,
            market_cap=getattr(e, "market_cap", None),
        ))

    # Sort: items with data first, then by absolute surprise magnitude
    results.sort(key=lambda x: (0 if x.surprise_pct is not None else 1, -abs(x.surprise_pct or 0)))
    return SurprisesResponse(items=results, count=len(results), period=f"Past {days_back} days")


# ------------------------------------------------------------------
# MOVERS endpoint
# ------------------------------------------------------------------

class MoverItem(BaseModel):
    ticker: str
    company_name: str
    earnings_date: str
    earnings_time: Optional[str] = None
    return_pct: Optional[float] = None
    volume_change: Optional[str] = None
    direction: Optional[str] = None
    eps_estimate: Optional[str] = None
    eps_actual: Optional[str] = None


class MoversResponse(BaseModel):
    items: List[MoverItem]
    count: int
    period: str


@app.get("/earnings/movers", response_model=MoversResponse, tags=["Earnings Intelligence"])
async def earnings_movers(
    days_back: int = Query(7, ge=1, le=30),
):
    """
    Get biggest post-earnings price movers from recent earnings calendar.
    Uses yfinance for price data concurrently.
    """
    today = dt.date.today()
    start = (today - dt.timedelta(days=days_back)).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")

    try:
        events = await get_earnings_range(start, end)
    except Exception as e:
        print(f"[movers] scraper error: {e}")
        events = []

    seen = set()
    unique_events = []
    for e in events:
        if e.ticker not in seen:
            seen.add(e.ticker)
            unique_events.append(e)

    top_events = unique_events[:40]

    # Fetch price changes concurrently
    loop = asyncio.get_event_loop()
    move_tasks = [
        loop.run_in_executor(_yf_executor, _yf_fetch_price_change, e.ticker, e.earnings_date)
        for e in top_events
    ]
    moves = await asyncio.gather(*move_tasks, return_exceptions=True)

    results: List[MoverItem] = []
    for e, move in zip(top_events, moves):
        ret = move if isinstance(move, (int, float)) else None
        direction = None
        if ret is not None:
            direction = "up" if ret > 0.5 else ("down" if ret < -0.5 else "flat")
        results.append(MoverItem(
            ticker=e.ticker,
            company_name=e.company_name,
            earnings_date=e.earnings_date,
            earnings_time=e.earnings_time,
            eps_estimate=e.eps_estimate,
            eps_actual=e.eps_actual,
            return_pct=ret,
            direction=direction,
        ))

    # Sort: items with return data first, then by absolute return
    results.sort(key=lambda x: (0 if x.return_pct is not None else 1, -abs(x.return_pct or 0)))
    return MoversResponse(items=results[:50], count=min(len(results), 50), period=f"Past {days_back} days")


# ------------------------------------------------------------------
# GUIDANCE TRACKER endpoint
# ------------------------------------------------------------------

class GuidanceItem(BaseModel):
    ticker: str
    company_name: str
    eps_current_year: Optional[float] = None
    eps_next_year: Optional[float] = None
    eps_growth_pct: Optional[float] = None
    revenue_current_year: Optional[float] = None
    revenue_next_year: Optional[float] = None
    consensus: Optional[str] = None
    price_target_mean: Optional[float] = None
    price_target_upside: Optional[float] = None
    guidance_signal: Optional[str] = None


class GuidanceResponse(BaseModel):
    items: List[GuidanceItem]
    count: int


@app.get("/earnings/guidance", response_model=GuidanceResponse, tags=["Earnings Intelligence"])
async def earnings_guidance(
    tickers: str = Query("AAPL,MSFT,GOOGL,AMZN,NVDA,META,TSLA,JPM,V,WMT,JNJ,PG,UNH,HD,MA",
                         description="Comma-separated tickers"),
):
    """
    Get forward guidance and earnings forecast data using yfinance.
    Runs all tickers concurrently in thread pool.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()][:20]
    quotes = await _fetch_quotes_concurrent(ticker_list)

    results: List[GuidanceItem] = []
    for q in quotes:
        item = GuidanceItem(
            ticker=q["ticker"],
            company_name=q.get("shortName", q["ticker"]),
            consensus=q.get("recommendationKey"),
            price_target_mean=q.get("targetMeanPrice"),
            eps_current_year=q.get("eps_current"),
            eps_next_year=q.get("eps_next"),
            revenue_current_year=q.get("rev_current"),
            revenue_next_year=q.get("rev_next"),
        )

        # Use precomputed growth % from growth_estimates, or calculate
        growth = q.get("eps_growth_pct")
        if growth is None and item.eps_current_year and item.eps_next_year and item.eps_current_year != 0:
            growth = round(
                ((item.eps_next_year - item.eps_current_year) / abs(item.eps_current_year)) * 100, 2
            )
        if growth is not None:
            item.eps_growth_pct = growth
            if growth > 5:
                item.guidance_signal = "raised"
            elif growth < -5:
                item.guidance_signal = "lowered"
            else:
                item.guidance_signal = "maintained"

        cp = q.get("currentPrice")
        if item.price_target_mean and cp and cp > 0:
            item.price_target_upside = round(((item.price_target_mean - cp) / cp) * 100, 2)

        results.append(item)

    return GuidanceResponse(items=results, count=len(results))


# ------------------------------------------------------------------
# SENTIMENT BATCH endpoint
# ------------------------------------------------------------------

class SentimentItem(BaseModel):
    ticker: str
    company_name: str
    score: Optional[float] = None
    label: Optional[str] = None
    filing_type: Optional[str] = None
    filed_date: Optional[str] = None
    positive_cues: int = 0
    negative_cues: int = 0


class SentimentBatchResponse(BaseModel):
    items: List[SentimentItem]
    count: int


async def _analyze_ticker_sentiment(ticker: str) -> Optional[SentimentItem]:
    """Analyze sentiment for a single ticker using DeepSeek AI on SEC filing text."""
    # Get company name from yfinance
    loop = asyncio.get_event_loop()
    info = await loop.run_in_executor(_yf_executor, lambda: (yf.Ticker(ticker).info or {}).get("shortName", ticker))
    company_name = info if isinstance(info, str) else ticker

    try:
        cik10 = await _ticker_to_cik10(ticker)
    except Exception:
        return SentimentItem(
            ticker=ticker, company_name=company_name,
            score=0.0, label="neutral",
            filing_type="N/A", filed_date="N/A",
        )

    try:
        subs = await get_submissions(cik10)
        if not subs:
            return SentimentItem(
                ticker=ticker, company_name=company_name,
                score=0.0, label="neutral",
                filing_type="N/A", filed_date="N/A",
            )
        company_name = subs.get("name", ticker) or company_name

        recent = subs.get("filings", {}).get("recent", {})
        forms = recent.get("form", [])
        accns = recent.get("accessionNumber", [])
        dates = recent.get("filingDate", [])
        docs = recent.get("primaryDocument", [])

        for i, form in enumerate(forms[:20]):
            if form in ("10-Q", "10-K"):
                accn = accns[i] if i < len(accns) else None
                filed = dates[i] if i < len(dates) else None
                doc = docs[i] if i < len(docs) else None
                if not accn:
                    continue
                try:
                    filing = await sec_fetch_filing_html(cik10, accn, doc)
                    if filing:
                        text = html_to_text(filing)[:4000]

                        # Try DeepSeek AI sentiment
                        if DEEPSEEK_API_KEY:
                            try:
                                sentiment_prompt = f"""Analyze the sentiment of this SEC {form} filing excerpt for {ticker} ({company_name}).

Filing text:
\"\"\"
{text}
\"\"\"

Respond with ONLY valid JSON (no markdown, no backticks):
{{"score": <float from -1.0 to 1.0>, "label": "<positive|negative|neutral|mixed>", "positive_cues": <int count of positive signals>, "negative_cues": <int count of negative signals>}}

Scoring guide:
- Score > 0.3 = positive (strong revenue growth, beat estimates, raised guidance, expanding margins)
- Score 0.1 to 0.3 = slightly positive
- Score -0.1 to 0.1 = neutral (boilerplate, no strong signals)
- Score -0.3 to -0.1 = slightly negative
- Score < -0.3 = negative (revenue decline, missed estimates, lowered guidance, losses)

Be decisive. SEC filings with ANY growth, margin improvement, or positive outlook should score positive. Only truly neutral boilerplate should score near 0."""

                                ai_response = await deepseek_generate(sentiment_prompt)
                                # Parse JSON from response
                                import json as _json
                                # Strip any markdown formatting
                                clean = ai_response.strip()
                                if clean.startswith("```"):
                                    clean = clean.split("\n", 1)[1] if "\n" in clean else clean
                                    clean = clean.rsplit("```", 1)[0] if "```" in clean else clean
                                    clean = clean.strip()
                                parsed = _json.loads(clean)
                                return SentimentItem(
                                    ticker=ticker,
                                    company_name=company_name,
                                    score=max(-1.0, min(1.0, float(parsed.get("score", 0)))),
                                    label=parsed.get("label", "neutral"),
                                    filing_type=form,
                                    filed_date=filed,
                                    positive_cues=int(parsed.get("positive_cues", 0)),
                                    negative_cues=int(parsed.get("negative_cues", 0)),
                                )
                            except Exception:
                                pass  # Fall through to keyword-based

                        # Fallback: keyword-based sentiment
                        sent = simple_sentiment(text)
                        return SentimentItem(
                            ticker=ticker,
                            company_name=company_name,
                            score=sent.score,
                            label=sent.label,
                            filing_type=form,
                            filed_date=filed,
                            positive_cues=sent.cues.get("pos", 0),
                            negative_cues=sent.cues.get("neg", 0),
                        )
                except Exception:
                    pass
                break

        return SentimentItem(
            ticker=ticker, company_name=company_name,
            score=0.0, label="neutral",
            filing_type="pending", filed_date="N/A",
        )
    except Exception:
        return SentimentItem(
            ticker=ticker, company_name=company_name,
            score=0.0, label="neutral",
            filing_type="error", filed_date="N/A",
        )


@app.get("/earnings/sentiment-batch", response_model=SentimentBatchResponse, tags=["Earnings Intelligence"])
async def earnings_sentiment_batch(
    tickers: str = Query("AAPL,MSFT,GOOGL,AMZN,NVDA,META,TSLA,JPM,V,WMT",
                         description="Comma-separated tickers"),
):
    """
    Batch sentiment analysis on recent SEC filings — concurrent async.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()][:15]

    tasks = [_analyze_ticker_sentiment(t) for t in ticker_list]
    raw = await asyncio.gather(*tasks, return_exceptions=True)

    results = [r for r in raw if isinstance(r, SentimentItem)]
    results.sort(key=lambda x: x.score or 0, reverse=True)
    return SentimentBatchResponse(items=results, count=len(results))


# ------------------------------------------------------------------
# ANALYST LEADERBOARD endpoint
# ------------------------------------------------------------------

class LeaderboardItem(BaseModel):
    ticker: str
    company_name: str
    buy_count: Optional[int] = None
    hold_count: Optional[int] = None
    sell_count: Optional[int] = None
    total_analysts: Optional[int] = None
    consensus: Optional[str] = None
    target_low: Optional[float] = None
    target_mean: Optional[float] = None
    target_high: Optional[float] = None
    implied_upside_pct: Optional[float] = None
    eps_current_year: Optional[float] = None
    eps_next_year: Optional[float] = None
    accuracy_score: Optional[float] = None


class LeaderboardResponse(BaseModel):
    items: List[LeaderboardItem]
    count: int


@app.get("/earnings/analyst-leaderboard", response_model=LeaderboardResponse, tags=["Earnings Intelligence"])
async def analyst_leaderboard(
    tickers: str = Query("AAPL,MSFT,GOOGL,AMZN,NVDA,META,TSLA,JPM,V,WMT,JNJ,PG,UNH,HD,MA",
                         description="Comma-separated tickers"),
):
    """
    Analyst consensus leaderboard — concurrent yfinance fetch in thread pool.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()][:20]
    quotes = await _fetch_quotes_concurrent(ticker_list)

    results: List[LeaderboardItem] = []
    for q in quotes:
        item = LeaderboardItem(
            ticker=q["ticker"],
            company_name=q.get("shortName", q["ticker"]),
            consensus=q.get("recommendationKey"),
            target_low=q.get("targetLowPrice"),
            target_mean=q.get("targetMeanPrice"),
            target_high=q.get("targetHighPrice"),
            total_analysts=q.get("numberOfAnalystOpinions"),
            buy_count=q.get("buy_count", 0),
            hold_count=q.get("hold_count", 0),
            sell_count=q.get("sell_count", 0),
            eps_current_year=q.get("eps_current"),
            eps_next_year=q.get("eps_next"),
        )

        cp = q.get("currentPrice")
        if item.target_mean and cp and cp > 0:
            item.implied_upside_pct = round(((item.target_mean - cp) / cp) * 100, 2)

        total_recs = (item.buy_count or 0) + (item.hold_count or 0) + (item.sell_count or 0)
        if total_recs > 0:
            item.accuracy_score = round(((item.buy_count or 0) / total_recs) * 100, 1)
        elif item.total_analysts and item.total_analysts > 0:
            consensus = (item.consensus or "").lower()
            if "strong" in consensus and "buy" in consensus:
                item.accuracy_score = 90.0
            elif "buy" in consensus:
                item.accuracy_score = 75.0
            elif "hold" in consensus:
                item.accuracy_score = 50.0
            elif "sell" in consensus:
                item.accuracy_score = 20.0

        results.append(item)

    results.sort(key=lambda x: x.accuracy_score or 0, reverse=True)
    return LeaderboardResponse(items=results, count=len(results))
