"""
Earnings Calendar Web Scraper for Tyche Terminal.
Scrapes earnings dates from Yahoo Finance, Nasdaq, and EarningsWhispers.
Falls back gracefully if sources are unavailable.
"""

import asyncio
import datetime as dt
import json
import time
import re
from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass

import httpx
from bs4 import BeautifulSoup

# ─── In-memory TTL cache ─────────────────────────────────────
# Cache key: date_str -> (timestamp, events)
_earnings_cache: Dict[str, Tuple[float, List["EarningsEvent"]]] = {}
_CACHE_TTL = 600  # 10 minutes


@dataclass
class EarningsEvent:
    """Earnings event data structure."""
    ticker: str
    company_name: str
    earnings_date: str  # YYYY-MM-DD
    earnings_time: Optional[str]  # BMO (Before Market Open) / AMC (After Market Close)
    eps_estimate: Optional[str]
    eps_actual: Optional[str]
    revenue_estimate: Optional[str]
    source: str
    market_cap: Optional[str] = None
    surprise_pct: Optional[str] = None
    

# User agent for requests
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


async def scrape_yahoo_earnings(date_str: str) -> List[EarningsEvent]:
    """
    Scrape earnings calendar from Yahoo Finance.
    Yahoo renders with React, so we extract from embedded JSON data.
    """
    url = f"https://finance.yahoo.com/calendar/earnings?day={date_str}"
    
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
    }
    
    events: List[EarningsEvent] = []
    
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code != 200:
                return events
            
            html = response.text
            
            # Method 1: Try to find table (old Yahoo layout)
            soup = BeautifulSoup(html, "lxml")
            table = soup.find("table")
            if table:
                rows = table.find_all("tr")[1:]
                for row in rows:
                    cells = row.find_all("td")
                    if len(cells) < 5:
                        continue
                    try:
                        ticker = cells[0].get_text(strip=True)
                        company = cells[1].get_text(strip=True)
                        call_time_text = cells[2].get_text(strip=True).lower()
                        if "before" in call_time_text or "bmo" in call_time_text:
                            earnings_time = "BMO"
                        elif "after" in call_time_text or "amc" in call_time_text:
                            earnings_time = "AMC"
                        else:
                            earnings_time = None
                        eps_estimate = cells[3].get_text(strip=True) if len(cells) > 3 else None
                        eps_actual = cells[4].get_text(strip=True) if len(cells) > 4 else None
                        if ticker and ticker != "-":
                            events.append(EarningsEvent(
                                ticker=ticker.upper(),
                                company_name=company,
                                earnings_date=date_str,
                                earnings_time=earnings_time,
                                eps_estimate=eps_estimate if eps_estimate != "-" else None,
                                eps_actual=eps_actual if eps_actual != "-" else None,
                                revenue_estimate=None,
                                source="yahoo",
                            ))
                    except Exception:
                        continue
                if events:
                    return events
            
            # Method 2: Extract from embedded JSON (__NEXT_DATA__ or App.main)
            # Look for JSON data in script tags
            for script in soup.find_all("script"):
                text = script.string or ""
                if "root.App.main" in text:
                    try:
                        json_match = re.search(r'root\.App\.main\s*=\s*({.*?});\s*$', text, re.DOTALL)
                        if json_match:
                            data = json.loads(json_match.group(1))
                            # Navigate to earnings data
                            stores = data.get("context", {}).get("dispatcher", {}).get("stores", {})
                            cal_store = stores.get("ScreenerResultsStore", {})
                            results = cal_store.get("results", {}).get("rows", [])
                            for row in results:
                                ticker = row.get("ticker", "")
                                if not ticker:
                                    continue
                                call_time = row.get("callTime", "").lower()
                                if "before" in call_time or "bmo" in call_time:
                                    earnings_time = "BMO"
                                elif "after" in call_time or "amc" in call_time:
                                    earnings_time = "AMC"
                                else:
                                    earnings_time = None
                                events.append(EarningsEvent(
                                    ticker=ticker.upper(),
                                    company_name=row.get("companyshortname", ""),
                                    earnings_date=date_str,
                                    earnings_time=earnings_time,
                                    eps_estimate=row.get("epsestimate"),
                                    eps_actual=row.get("epsactual"),
                                    revenue_estimate=None,
                                    source="yahoo",
                                ))
                    except Exception:
                        pass
                elif "__NEXT_DATA__" in str(script.get("id", "")):
                    try:
                        data = json.loads(text)
                        # Try to find earnings data in Next.js props
                        props = data.get("props", {}).get("pageProps", {})
                        results = props.get("results") or props.get("data") or []
                        if isinstance(results, dict):
                            results = results.get("rows", []) or results.get("items", [])
                        for row in results:
                            if isinstance(row, dict) and row.get("ticker"):
                                call_time = str(row.get("callTime", row.get("startdatetime", ""))).lower()
                                if "before" in call_time or "bmo" in call_time:
                                    earnings_time = "BMO"
                                elif "after" in call_time or "amc" in call_time:
                                    earnings_time = "AMC"
                                else:
                                    earnings_time = None
                                events.append(EarningsEvent(
                                    ticker=row["ticker"].upper(),
                                    company_name=row.get("companyshortname", ""),
                                    earnings_date=date_str,
                                    earnings_time=earnings_time,
                                    eps_estimate=row.get("epsestimate"),
                                    eps_actual=row.get("epsactual"),
                                    revenue_estimate=None,
                                    source="yahoo",
                                ))
                    except Exception:
                        pass
                    
    except Exception:
        pass
    
    return events


async def scrape_nasdaq_earnings(date_str: str) -> List[EarningsEvent]:
    """
    Scrape earnings calendar from Nasdaq API.
    Now captures actual EPS and surprise data.
    """
    url = f"https://api.nasdaq.com/api/calendar/earnings?date={date_str}"
    
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://www.nasdaq.com",
        "Referer": "https://www.nasdaq.com/",
    }
    
    events: List[EarningsEvent] = []
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code != 200:
                return events
            
            data = response.json()
            rows = data.get("data", {}).get("rows", [])
            
            for row in rows:
                ticker = row.get("symbol", "").upper()
                if not ticker:
                    continue
                
                # Parse time - Nasdaq often returns "time-not-supplied"
                time_str = row.get("time", "").lower()
                if "before" in time_str or time_str == "bmo":
                    earnings_time = "BMO"
                elif "after" in time_str or time_str == "amc":
                    earnings_time = "AMC"
                else:
                    earnings_time = None  # Will be enriched later
                
                # Capture actual EPS (Nasdaq provides this!)
                eps_actual_str = row.get("eps", "")
                eps_actual = None
                if eps_actual_str and eps_actual_str != "N/A" and eps_actual_str.strip():
                    eps_actual = eps_actual_str
                
                eps_forecast = row.get("epsForecast", "")
                eps_estimate = None
                if eps_forecast and eps_forecast != "N/A" and eps_forecast.strip():
                    eps_estimate = eps_forecast
                
                # Capture surprise
                surprise = row.get("surprise", "")
                surprise_pct = None
                if surprise and surprise != "N/A" and surprise.strip():
                    surprise_pct = surprise
                
                events.append(EarningsEvent(
                    ticker=ticker,
                    company_name=row.get("name", ""),
                    earnings_date=date_str,
                    earnings_time=earnings_time,
                    eps_estimate=eps_estimate,
                    eps_actual=eps_actual,
                    revenue_estimate=None,
                    source="nasdaq",
                    market_cap=row.get("marketCap"),
                    surprise_pct=surprise_pct,
                ))
                
    except Exception:
        pass
    
    return events


async def scrape_earningswhispers(date_str: str) -> List[EarningsEvent]:
    """
    Scrape BMO/AMC earnings times from EarningsWhispers.
    This source is particularly good for BMO vs AMC classification.
    """
    events: List[EarningsEvent] = []
    
    try:
        # EarningsWhispers calendar page
        date_obj = dt.datetime.strptime(date_str, "%Y-%m-%d")
        ew_date = date_obj.strftime("%Y%m%d")
        url = f"https://www.earningswhispers.com/calendar?sb=c&d=0&t=all&v=t&page=1"
        
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html",
            "Referer": "https://www.earningswhispers.com/",
        }
        
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return events
            
            soup = BeautifulSoup(response.text, "lxml")
            
            # Look for BMO/AMC markers
            for item in soup.find_all(class_=re.compile(r"(cal-row|earnings-row|ticker)", re.I)):
                ticker_el = item.find(class_=re.compile(r"ticker", re.I))
                time_el = item.find(class_=re.compile(r"(time|when)", re.I))
                if ticker_el:
                    ticker = ticker_el.get_text(strip=True).upper()
                    time_text = (time_el.get_text(strip=True) if time_el else "").lower()
                    if "before" in time_text or "bmo" in time_text:
                        earnings_time = "BMO"
                    elif "after" in time_text or "amc" in time_text:
                        earnings_time = "AMC"
                    else:
                        earnings_time = None
                    events.append(EarningsEvent(
                        ticker=ticker,
                        company_name="",
                        earnings_date=date_str,
                        earnings_time=earnings_time,
                        eps_estimate=None,
                        eps_actual=None,
                        revenue_estimate=None,
                        source="earningswhispers",
                    ))
    except Exception:
        pass
    
    return events


async def _enrich_bmo_amc_yfinance(events: List[EarningsEvent]) -> List[EarningsEvent]:
    """
    For events without BMO/AMC time, determine it from yfinance info['earningsTimestamp'].
    This timestamp has the hour component which tells us BMO vs AMC:
    - Hour < 14 (2 PM ET) → BMO (most BMO reports at 6-9 AM)
    - Hour >= 14 → AMC (most AMC reports at 4-5 PM)
    """
    import yfinance as yf
    from concurrent.futures import ThreadPoolExecutor
    import datetime as _dt
    
    # Find events needing enrichment
    needs_enrichment = [(i, e) for i, e in enumerate(events) if e.earnings_time is None]
    if not needs_enrichment:
        return events
    
    # Limit to avoid rate limiting
    to_enrich = needs_enrichment[:40]
    
    def _get_bmo_amc(ticker: str) -> Optional[str]:
        """Determine BMO/AMC from yfinance info earningsTimestamp."""
        try:
            tk = yf.Ticker(ticker)
            info = tk.info or {}
            
            # Check earningsTimestamp (Unix timestamp with hour)
            ts = info.get("earningsTimestamp")
            if ts and isinstance(ts, (int, float)) and ts > 1000000000:
                hour = _dt.datetime.fromtimestamp(ts).hour
                return "BMO" if hour < 14 else "AMC"
            
            # Fallback: check earningsCallTimestampStart
            call_ts = info.get("earningsCallTimestampStart")
            if call_ts and isinstance(call_ts, (int, float)) and call_ts > 1000000000:
                hour = _dt.datetime.fromtimestamp(call_ts).hour
                return "BMO" if hour < 14 else "AMC"
        except Exception:
            pass
        return None
    
    loop = asyncio.get_event_loop()
    executor = ThreadPoolExecutor(max_workers=8)
    
    tasks = [loop.run_in_executor(executor, _get_bmo_amc, e.ticker) for _, e in to_enrich]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for (idx, event), result in zip(to_enrich, results):
        if isinstance(result, str):
            events[idx].earnings_time = result
    
    executor.shutdown(wait=False)
    return events


async def get_earnings_calendar(
    date_str: str,
    sources: List[str] = ["yahoo", "nasdaq"],
) -> List[EarningsEvent]:
    """
    Get earnings calendar for a specific date from multiple sources.
    Deduplicates by ticker, preferring sources with more data.
    Enriches BMO/AMC times from multiple sources.
    """
    all_events: List[EarningsEvent] = []
    
    tasks = []
    if "yahoo" in sources:
        tasks.append(scrape_yahoo_earnings(date_str))
    if "nasdaq" in sources:
        tasks.append(scrape_nasdaq_earnings(date_str))
    
    if not tasks:
        return []
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for result in results:
        if isinstance(result, list):
            all_events.extend(result)
    
    # Deduplicate by ticker, keeping the one with most data
    ticker_map: Dict[str, EarningsEvent] = {}
    
    for event in all_events:
        existing = ticker_map.get(event.ticker)
        
        if not existing:
            ticker_map[event.ticker] = event
        else:
            # Prefer event with more filled fields
            existing_score = sum([
                bool(existing.earnings_time),
                bool(existing.eps_estimate),
                bool(existing.eps_actual),
                bool(existing.revenue_estimate),
                bool(existing.market_cap),
                bool(existing.surprise_pct),
            ])
            new_score = sum([
                bool(event.earnings_time),
                bool(event.eps_estimate),
                bool(event.eps_actual),
                bool(event.revenue_estimate),
                bool(event.market_cap),
                bool(event.surprise_pct),
            ])
            
            if new_score > existing_score:
                ticker_map[event.ticker] = event
            elif new_score == existing_score and event.earnings_time and not existing.earnings_time:
                # If same score but new has BMO/AMC time, prefer it
                ticker_map[event.ticker] = event
            elif not existing.earnings_time and event.earnings_time:
                # Transfer BMO/AMC time from other source
                existing.earnings_time = event.earnings_time
            # Transfer missing fields
            if not existing.eps_actual and event.eps_actual:
                ticker_map[existing.ticker].eps_actual = event.eps_actual
            if not existing.surprise_pct and event.surprise_pct:
                ticker_map[existing.ticker].surprise_pct = event.surprise_pct
    
    merged = list(ticker_map.values())
    
    # Enrich BMO/AMC times for events that still don't have them
    needs_time = sum(1 for e in merged if e.earnings_time is None)
    if needs_time > 0 and needs_time <= 50:
        try:
            merged = await _enrich_bmo_amc_yfinance(merged)
        except Exception:
            pass
    
    return merged


async def _get_earnings_cached(date_str: str, sources: List[str]) -> List[EarningsEvent]:
    """Fetch earnings for a single date, using cache if available."""
    now = time.time()
    cached = _earnings_cache.get(date_str)
    if cached and (now - cached[0]) < _CACHE_TTL:
        return cached[1]
    
    events = await get_earnings_calendar(date_str, sources)
    _earnings_cache[date_str] = (now, events)
    return events


async def get_earnings_range(
    start_date: str,
    end_date: str,
    sources: List[str] = ["yahoo", "nasdaq"],
) -> List[EarningsEvent]:
    """
    Get earnings calendar for a date range.
    Uses caching and concurrent fetching for speed.
    """
    try:
        start = dt.datetime.strptime(start_date, "%Y-%m-%d")
        end = dt.datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        return []
    
    # Build list of dates (skip weekends)
    dates = []
    current = start
    while current <= end:
        if current.weekday() < 5:  # Mon-Fri only
            dates.append(current.strftime("%Y-%m-%d"))
        current += dt.timedelta(days=1)
    
    # Fetch all dates concurrently (with cache)
    tasks = [_get_earnings_cached(d, sources) for d in dates]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    all_events: List[EarningsEvent] = []
    for result in results:
        if isinstance(result, list):
            all_events.extend(result)
    
    return all_events


async def get_upcoming_earnings(days: int = 7) -> List[EarningsEvent]:
    """
    Get earnings for the next N days.
    """
    today = dt.date.today()
    start_date = today.isoformat()
    end_date = (today + dt.timedelta(days=days)).isoformat()
    
    events = await get_earnings_range(start_date, end_date)
    
    # Sort by date, then by time (BMO before AMC)
    def sort_key(e: EarningsEvent):
        time_priority = 0 if e.earnings_time == "BMO" else 1 if e.earnings_time == "AMC" else 2
        return (e.earnings_date, time_priority, e.ticker)
    
    return sorted(events, key=sort_key)


async def get_today_earnings() -> List[EarningsEvent]:
    """Get today's earnings."""
    today = dt.date.today().isoformat()
    return await get_earnings_calendar(today)


async def get_week_earnings() -> List[EarningsEvent]:
    """Get this week's earnings (Mon-Fri)."""
    today = dt.date.today()
    # Find Monday of current week
    monday = today - dt.timedelta(days=today.weekday())
    friday = monday + dt.timedelta(days=4)
    
    return await get_earnings_range(monday.isoformat(), friday.isoformat())


# Test function
if __name__ == "__main__":
    async def test():
        print("Testing earnings scraper...")
        # Test with a weekday
        today = dt.date.today()
        if today.weekday() >= 5:
            # If weekend, use last Friday
            today = today - dt.timedelta(days=today.weekday() - 4)
        date_str = today.isoformat()
        print(f"Fetching earnings for {date_str}")
        
        events = await get_earnings_calendar(date_str)
        bmo = [e for e in events if e.earnings_time == "BMO"]
        amc = [e for e in events if e.earnings_time == "AMC"]
        unknown = [e for e in events if e.earnings_time not in ("BMO", "AMC")]
        
        print(f"Found {len(events)} events: {len(bmo)} BMO, {len(amc)} AMC, {len(unknown)} unknown")
        
        print("\nBMO:")
        for event in bmo[:5]:
            print(f"  {event.ticker}: {event.company_name} | est={event.eps_estimate} actual={event.eps_actual}")
        
        print("\nAMC:")
        for event in amc[:5]:
            print(f"  {event.ticker}: {event.company_name} | est={event.eps_estimate} actual={event.eps_actual}")
        
        if unknown:
            print(f"\nUnknown time ({len(unknown)}):")
            for event in unknown[:5]:
                print(f"  {event.ticker}: {event.company_name}")
    
    asyncio.run(test())
