"""
Investor Relations Scraper for Erns Live Earnings Monitor.
Resolves IR page URLs, scrapes press releases, detects earnings drops,
and parses EPS/revenue/guidance from earnings announcements.
"""

import asyncio
import datetime as dt
import re
import time
import json
from typing import Optional, Dict, List, Tuple, Any
from dataclasses import dataclass, field

import httpx
from bs4 import BeautifulSoup


# ─── Constants ─────────────────────────────────────────────
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

# Cache: ticker -> (timestamp, LiveEarningsResult)
_monitor_cache: Dict[str, Tuple[float, "LiveEarningsResult"]] = {}
_MONITOR_CACHE_TTL = 8  # seconds


@dataclass
class LiveEarningsResult:
    """Result of checking for a live earnings drop."""
    ticker: str
    status: str  # "waiting" | "dropped" | "error"
    company_name: str = ""
    ir_url: str = ""
    last_checked: str = ""

    # Waiting state
    expected_date: Optional[str] = None
    expected_time: Optional[str] = None  # BMO / AMC

    # Dropped state
    dropped_at: Optional[str] = None
    headline: Optional[str] = None
    source_url: Optional[str] = None
    eps_actual: Optional[str] = None
    eps_estimate: Optional[str] = None
    revenue_actual: Optional[str] = None
    revenue_estimate: Optional[str] = None
    eps_surprise_pct: Optional[float] = None
    revenue_surprise_pct: Optional[float] = None
    beat_eps: Optional[bool] = None
    beat_revenue: Optional[bool] = None
    guidance: Optional[str] = None

    # Error
    error_message: Optional[str] = None


# ─── IR URL Map (Curated top tickers) ─────────────────────
# Maps ticker -> investor relations press releases page
IR_URL_MAP: Dict[str, str] = {
    # Mega-cap tech
    "AAPL": "https://investor.apple.com/investor-relations/default.aspx",
    "MSFT": "https://www.microsoft.com/en-us/Investor/earnings/FY-2026-Q2/press-release-webcast",
    "GOOGL": "https://abc.xyz/investor/",
    "GOOG": "https://abc.xyz/investor/",
    "AMZN": "https://ir.aboutamazon.com/news-release/news-release-details/",
    "META": "https://investor.fb.com/investor-news/default.aspx",
    "NVDA": "https://investor.nvidia.com/news/press-release-details/",
    "TSLA": "https://ir.tesla.com/",
    "AVGO": "https://investors.broadcom.com/news-releases",
    "ORCL": "https://investor.oracle.com/news-events/press-releases/default.aspx",

    # Big tech & software
    "CRM": "https://investor.salesforce.com/press-releases",
    "ADBE": "https://www.adobe.com/investor-relations/press-releases.html",
    "AMD": "https://ir.amd.com/news-events/press-releases",
    "INTC": "https://www.intc.com/news-events/press-releases",
    "CSCO": "https://investor.cisco.com/news/news-details/",
    "NFLX": "https://ir.netflix.net/ir/overview/default.aspx",
    "QCOM": "https://investor.qualcomm.com/news-events/press-releases",

    # Finance
    "JPM": "https://www.jpmorganchase.com/ir/news",
    "BAC": "https://investor.bankofamerica.com/press-releases",
    "GS": "https://www.goldmansachs.com/investor-relations/press-releases/",
    "MS": "https://www.morganstanley.com/about-us-ir/press-releases",
    "WFC": "https://www.wellsfargo.com/about/press/",
    "C": "https://www.citigroup.com/global/news/press-release/",
    "V": "https://investor.visa.com/news/news-details/",
    "MA": "https://investor.mastercard.com/investor-relations/news/press-releases/",

    # Healthcare
    "UNH": "https://www.unitedhealthgroup.com/newsroom/press-releases.html",
    "JNJ": "https://www.investor.jnj.com/press-releases",
    "LLY": "https://investor.lilly.com/news-releases",
    "PFE": "https://www.pfizer.com/news/press-releases",
    "ABBV": "https://investors.abbvie.com/press-releases",
    "MRK": "https://www.merck.com/news/",

    # Consumer
    "WMT": "https://corporate.walmart.com/newsroom/press-releases",
    "PG": "https://www.pginvestor.com/financial-reporting/press-releases/",
    "KO": "https://investors.coca-colacompany.com/news-events/press-releases",
    "PEP": "https://investor.pepsico.com/news-events/press-releases",
    "COST": "https://investor.costco.com/news-events/press-releases",
    "MCD": "https://investor.mcdonalds.com/press-releases",
    "NKE": "https://investors.nike.com/investors/news-events-and-reports/press-releases/",
    "SBUX": "https://investor.starbucks.com/press-releases",
    "DIS": "https://thewaltdisneycompany.com/category/investor-relations/",

    # Industrial & Energy
    "XOM": "https://investor.exxonmobil.com/news-events/press-releases",
    "CVX": "https://www.chevron.com/newsroom/press-releases",
    "CAT": "https://www.caterpillar.com/en/investors/press-releases.html",
    "BA": "https://investors.boeing.com/investors/news/press-release-details/",
    "UPS": "https://investors.ups.com/news-releases",

    # Other popular
    "COIN": "https://investor.coinbase.com/news/news-details/",
    "SQ": "https://investors.block.xyz/news/news-details/",
    "SHOP": "https://investors.shopify.com/news-releases/",
    "SNOW": "https://investors.snowflake.com/news-releases/",
    "PLTR": "https://investors.palantir.com/news-details/",
    "UBER": "https://investor.uber.com/news-events/",
    "ABNB": "https://news.airbnb.com/category/financials/",
    "ROKU": "https://ir.roku.com/news-releases",
    "SNAP": "https://investor.snap.com/news-releases",
    "PINS": "https://investor.pinterestinc.com/press-releases/",
    "RBLX": "https://ir.roblox.com/news/news-details/",
    "NET": "https://cloudflare.net/news/news-details/",
    "CRWD": "https://ir.crowdstrike.com/news-releases",
    "ZS": "https://ir.zscaler.com/news-releases",
    "DDOG": "https://investors.datadoghq.com/news-releases",
    "MDB": "https://investors.mongodb.com/news-releases/",
    "PANW": "https://investors.paloaltonetworks.com/news-releases",
}

# Common IR URL patterns to try when ticker isn't in the map
IR_URL_PATTERNS = [
    "https://investor.{domain}/press-releases",
    "https://investor.{domain}/news-releases",
    "https://investors.{domain}/press-releases",
    "https://investors.{domain}/news-releases",
    "https://ir.{domain}/press-releases",
    "https://ir.{domain}/news-releases",
    "https://www.{domain}/investor-relations/press-releases",
]


# ─── Earnings Data Extraction ─────────────────────────────

# Regex patterns for EPS extraction
EPS_PATTERNS = [
    # "earnings per share of $1.58" / "EPS of $1.58"
    r'(?:earnings\s+per\s+share|EPS|diluted\s+EPS|GAAP\s+EPS|non-GAAP\s+EPS)\s+(?:of\s+)?\$?([\d]+\.[\d]{2})',
    # "$1.58 per diluted share"
    r'\$([\d]+\.[\d]{2})\s+per\s+(?:diluted\s+)?share',
    # "EPS: $1.58"
    r'EPS:\s*\$?([\d]+\.[\d]{2})',
    # Negative EPS: "loss of $0.52 per share"
    r'loss\s+(?:of\s+)?\$?([\d]+\.[\d]{2})\s+per\s+share',
]

# Regex patterns for revenue extraction
REVENUE_PATTERNS = [
    # "revenue of $94.8 billion"
    r'revenue\s+(?:of\s+)?\$([\d]+\.?\d*)\s*(billion|million|B|M)',
    # "net revenue was $94.8 billion"
    r'(?:net\s+)?revenue\s+(?:was|totaled|reached|came in at)\s+\$([\d]+\.?\d*)\s*(billion|million|B|M)',
    # "$94.8 billion in revenue"
    r'\$([\d]+\.?\d*)\s*(billion|million|B|M)\s+(?:in\s+)?(?:total\s+)?(?:net\s+)?revenue',
    # "Revenue: $94.8B"
    r'[Rr]evenue:\s*\$([\d]+\.?\d*)\s*(B|M|billion|million)',
]

# Guidance patterns
GUIDANCE_PATTERNS = [
    r'(?:expects|forecasts|anticipates|guides|outlook|guidance)[:\s]+.*?\$([\d]+\.?\d*)\s*(billion|million|B|M).*?(?:to|and|-)\s*\$([\d]+\.?\d*)\s*(billion|million|B|M)',
    r'(?:Q[1-4]|next quarter|full[- ]year).*?(?:revenue|EPS)\s+.*?\$([\d]+\.?\d*)',
]

# Keywords that indicate an earnings press release
EARNINGS_KEYWORDS = [
    "reports first quarter", "reports second quarter", "reports third quarter", "reports fourth quarter",
    "quarterly results", "quarterly earnings", "financial results",
    "q1 results", "q2 results", "q3 results", "q4 results",
    "q1 earnings", "q2 earnings", "q3 earnings", "q4 earnings",
    "fiscal year results", "annual results", "full year results",
    "earnings per share", "diluted eps", "revenue of",
    "reports q1", "reports q2", "reports q3", "reports q4",
    "first quarter results", "second quarter results",
    "third quarter results", "fourth quarter results",
    "announces financial results", "reports financial results",
]


def _parse_earnings_text(text: str) -> Dict[str, Any]:
    """
    Extract EPS, revenue, and guidance from press release text.
    Returns dict with parsed values.
    """
    result: Dict[str, Any] = {}
    text_lower = text.lower()

    # Extract EPS
    for pattern in EPS_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            eps_val = float(match.group(1))
            # Check if it's a loss
            if "loss" in text_lower[max(0, match.start() - 30):match.start()].lower():
                eps_val = -eps_val
            result["eps_actual"] = eps_val
            break

    # Extract revenue
    for pattern in REVENUE_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            rev_val = float(match.group(1))
            unit = match.group(2).lower()
            if unit in ("billion", "b"):
                result["revenue_actual"] = rev_val * 1e9
                result["revenue_display"] = f"${rev_val}B"
            elif unit in ("million", "m"):
                result["revenue_actual"] = rev_val * 1e6
                result["revenue_display"] = f"${rev_val}M"
            break

    # Extract guidance
    for pattern in GUIDANCE_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            context_start = max(0, match.start() - 20)
            context_end = min(len(text), match.end() + 20)
            result["guidance"] = text[context_start:context_end].strip()
            break

    return result


def _is_earnings_headline(text: str) -> bool:
    """Check if a headline/title is about earnings."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in EARNINGS_KEYWORDS)


# ─── IR Page Scraper ──────────────────────────────────────

async def _resolve_ir_url(ticker: str) -> Optional[str]:
    """Resolve the IR page URL for a ticker."""
    # Check curated map first
    if ticker.upper() in IR_URL_MAP:
        return IR_URL_MAP[ticker.upper()]

    # Try to get company website from yfinance
    try:
        import yfinance as yf
        tk = yf.Ticker(ticker)
        info = tk.info or {}
        website = info.get("website", "")
        if website:
            from urllib.parse import urlparse
            domain = urlparse(website).netloc.replace("www.", "")
            # Try common IR URL patterns
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                for pattern in IR_URL_PATTERNS:
                    url = pattern.format(domain=domain)
                    try:
                        r = await client.head(url, headers={"User-Agent": USER_AGENT})
                        if r.status_code < 400:
                            return url
                    except Exception:
                        continue
    except Exception:
        pass

    return None


async def _scrape_ir_page(url: str, ticker: str) -> List[Dict[str, str]]:
    """
    Scrape an IR page for press release headlines and links.
    Returns list of {title, url, date} dicts.
    """
    releases: List[Dict[str, str]] = []

    try:
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        }

        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code >= 400:
                return releases

            soup = BeautifulSoup(resp.text, "lxml")

            # Strategy 1: Look for links with earnings keywords
            for a_tag in soup.find_all("a", href=True):
                title = a_tag.get_text(strip=True)
                if not title or len(title) < 15:
                    continue

                if _is_earnings_headline(title):
                    href = a_tag["href"]
                    if not href.startswith("http"):
                        from urllib.parse import urljoin
                        href = urljoin(url, href)

                    # Try to find an associated date
                    date_text = ""
                    parent = a_tag.parent
                    if parent:
                        date_el = parent.find(string=re.compile(r'\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}|\w+ \d{1,2},? \d{4}'))
                        if date_el:
                            date_text = str(date_el).strip()

                    releases.append({
                        "title": title,
                        "url": href,
                        "date": date_text,
                    })

            # Strategy 2: Look for structured press release lists
            for item in soup.find_all(class_=re.compile(r'press-release|news-item|release-item|article-item|news-release', re.I)):
                title_el = item.find(["a", "h2", "h3", "h4"])
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                if not title or len(title) < 15:
                    continue

                href = ""
                link = title_el if title_el.name == "a" else item.find("a", href=True)
                if link and link.get("href"):
                    href = link["href"]
                    if not href.startswith("http"):
                        from urllib.parse import urljoin
                        href = urljoin(url, href)

                if _is_earnings_headline(title) and href:
                    releases.append({
                        "title": title,
                        "url": href,
                        "date": "",
                    })

    except Exception:
        pass

    # Deduplicate by URL
    seen_urls = set()
    unique = []
    for r in releases:
        if r["url"] not in seen_urls:
            seen_urls.add(r["url"])
            unique.append(r)

    return unique[:10]  # Limit to most recent 10


async def _scrape_press_release(url: str) -> Optional[str]:
    """Fetch and extract text from a press release page."""
    try:
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
        }
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code >= 400:
                return None

            soup = BeautifulSoup(resp.text, "lxml")

            # Remove scripts, styles
            for tag in soup.find_all(["script", "style", "nav", "footer", "header"]):
                tag.decompose()

            # Try to find the main article content
            article = (
                soup.find("article") or
                soup.find(class_=re.compile(r'article|press-release|content|body|release', re.I)) or
                soup.find("main")
            )

            text = (article or soup.body or soup).get_text(separator=" ", strip=True)
            # Limit to first 5000 chars (earnings data is always near the top)
            return text[:5000]
    except Exception:
        return None


# ─── SEC EDGAR 8-K Check ──────────────────────────────────

async def _check_sec_8k(ticker: str) -> Optional[Dict[str, str]]:
    """
    Check SEC EDGAR for recent 8-K filings (earnings results are filed as 8-K).
    Returns the most recent 8-K filing info if found within last 24 hours.
    """
    try:
        # First get CIK from ticker
        url = f"https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&dateRange=custom&startdt={(dt.date.today() - dt.timedelta(days=1)).isoformat()}&enddt={dt.date.today().isoformat()}&forms=8-K"
        headers = {
            "User-Agent": "Erns-App/1.0 support@tychefinancials.com",
            "Accept": "application/json",
        }

        # Use EDGAR full-text search
        search_url = f"https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&forms=8-K&dateRange=custom&startdt={(dt.date.today() - dt.timedelta(days=1)).isoformat()}&enddt={dt.date.today().isoformat()}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try EDGAR company search
            cik_url = f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=&CIK={ticker}&type=8-K&dateb=&owner=include&count=3&search_text=&action=getcompany"
            resp = await client.get(cik_url, headers=headers, follow_redirects=True)

            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                # Find filing links
                for row in soup.find_all("tr"):
                    cells = row.find_all("td")
                    if len(cells) >= 4:
                        form_type = cells[0].get_text(strip=True)
                        date_filed = cells[3].get_text(strip=True) if len(cells) > 3 else ""

                        if form_type == "8-K" and date_filed:
                            try:
                                filed_date = dt.datetime.strptime(date_filed, "%Y-%m-%d").date()
                                if (dt.date.today() - filed_date).days <= 1:
                                    link = cells[1].find("a", href=True)
                                    if link:
                                        return {
                                            "form": "8-K",
                                            "date": date_filed,
                                            "url": f"https://www.sec.gov{link['href']}",
                                        }
                            except ValueError:
                                pass
    except Exception:
        pass
    return None


# ─── Main Monitor Function ────────────────────────────────

async def check_earnings_live(ticker: str) -> LiveEarningsResult:
    """
    Main function: Check if earnings have dropped for a ticker.
    1. Resolve the IR page URL
    2. Scrape for recent press releases
    3. If an earnings press release is found from today, parse it
    4. Also check SEC 8-K filings
    5. Return result with status
    """
    ticker = ticker.upper().strip()
    now = dt.datetime.utcnow()
    now_str = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Check cache
    cached = _monitor_cache.get(ticker)
    if cached and (time.time() - cached[0]) < _MONITOR_CACHE_TTL:
        return cached[1]

    # Get company info from yfinance
    company_name = ticker
    expected_date = None
    expected_time = None
    eps_estimate = None
    revenue_estimate = None

    try:
        import yfinance as yf
        tk = yf.Ticker(ticker)
        info = tk.info or {}
        company_name = info.get("shortName") or info.get("longName") or ticker

        # Get expected earnings date
        ts = info.get("earningsTimestamp")
        if ts and isinstance(ts, (int, float)) and ts > 1000000000:
            earn_dt = dt.datetime.fromtimestamp(ts)
            expected_date = earn_dt.strftime("%Y-%m-%d")
            expected_time = "BMO" if earn_dt.hour < 14 else "AMC"

        # Get estimates
        fwd_eps = info.get("forwardEps")
        if fwd_eps is not None and str(fwd_eps) != "nan":
            eps_estimate = float(fwd_eps)

        rev = info.get("totalRevenue")
        if rev and isinstance(rev, (int, float)) and rev > 0:
            revenue_estimate = rev
    except Exception:
        pass

    # Resolve IR URL
    ir_url = await _resolve_ir_url(ticker)

    # Scrape IR page for press releases
    earnings_found = False
    earnings_data: Dict[str, Any] = {}
    headline = ""
    source_url = ""

    if ir_url:
        releases = await _scrape_ir_page(ir_url, ticker)

        for release in releases:
            # Check if this release is from today (or very recent)
            title = release["title"]
            if _is_earnings_headline(title):
                # Fetch and parse the full press release
                pr_text = await _scrape_press_release(release["url"])
                if pr_text:
                    parsed = _parse_earnings_text(pr_text)
                    if parsed.get("eps_actual") is not None or parsed.get("revenue_actual") is not None:
                        earnings_found = True
                        earnings_data = parsed
                        headline = title
                        source_url = release["url"]
                        break

    # Also check SEC 8-K as backup
    if not earnings_found:
        sec_filing = await _check_sec_8k(ticker)
        if sec_filing:
            # There's a recent 8-K — try to parse it
            pr_text = await _scrape_press_release(sec_filing["url"])
            if pr_text:
                parsed = _parse_earnings_text(pr_text)
                if parsed.get("eps_actual") is not None:
                    earnings_found = True
                    earnings_data = parsed
                    headline = f"{ticker} 8-K Filing Detected"
                    source_url = sec_filing["url"]

    # Build result
    if earnings_found:
        # Calculate surprises
        eps_act = earnings_data.get("eps_actual")
        rev_act = earnings_data.get("revenue_actual")
        eps_surp = None
        rev_surp = None
        beat_eps = None
        beat_rev = None

        if eps_act is not None and eps_estimate is not None and eps_estimate != 0:
            eps_surp = round((eps_act - eps_estimate) / abs(eps_estimate) * 100, 2)
            beat_eps = eps_act >= eps_estimate

        if rev_act is not None and revenue_estimate is not None and revenue_estimate != 0:
            rev_surp = round((rev_act - revenue_estimate) / abs(revenue_estimate) * 100, 2)
            beat_rev = rev_act >= revenue_estimate

        result = LiveEarningsResult(
            ticker=ticker,
            status="dropped",
            company_name=company_name,
            ir_url=ir_url or "",
            last_checked=now_str,
            dropped_at=now_str,
            headline=headline,
            source_url=source_url,
            eps_actual=f"${eps_act:.2f}" if eps_act is not None else None,
            eps_estimate=f"${eps_estimate:.2f}" if eps_estimate is not None else None,
            revenue_actual=earnings_data.get("revenue_display"),
            revenue_estimate=f"${revenue_estimate / 1e9:.2f}B" if revenue_estimate and revenue_estimate >= 1e9 else (f"${revenue_estimate / 1e6:.0f}M" if revenue_estimate else None),
            eps_surprise_pct=eps_surp,
            revenue_surprise_pct=rev_surp,
            beat_eps=beat_eps,
            beat_revenue=beat_rev,
            guidance=earnings_data.get("guidance"),
        )
    else:
        result = LiveEarningsResult(
            ticker=ticker,
            status="waiting",
            company_name=company_name,
            ir_url=ir_url or "",
            last_checked=now_str,
            expected_date=expected_date,
            expected_time=expected_time,
            eps_estimate=f"${eps_estimate:.2f}" if eps_estimate is not None else None,
            revenue_estimate=f"${revenue_estimate / 1e9:.2f}B" if revenue_estimate and revenue_estimate >= 1e9 else (f"${revenue_estimate / 1e6:.0f}M" if revenue_estimate else None),
        )

    # Cache
    _monitor_cache[ticker] = (time.time(), result)
    return result
