"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { config } from "@/lib/config";

// ─── Types ──────────────────────────────────────────────────
interface Param {
    name: string;
    type: string;
    description: string;
    required?: boolean;
    default?: string;
}

interface EndpointDoc {
    method: string;
    path: string;
    description: string;
    params: Param[];
    responseExample: string;
    curl: string;
    python: string;
    javascript: string;
}

interface Section {
    id: string;
    title: string;
    description: string;
    endpoints: EndpointDoc[];
}

// ─── API Base ───────────────────────────────────────────────
const BASE = config.apiUrl;

// ─── Full Endpoint Documentation ────────────────────────────
const SECTIONS: Section[] = [
    // ════════════════════════════════════════════════════
    // 1. EARNINGS INTELLIGENCE
    // ════════════════════════════════════════════════════
    {
        id: "earnings",
        title: "Earnings Intelligence",
        description: "Deep earnings analysis — summaries, events, post-earnings reactions, analyst consensus, live polling, and AI-powered reviews.",
        endpoints: [
            {
                method: "GET",
                path: "/company/{ticker}/earnings-summary",
                description: "Get revenue, net income, EPS (basic & diluted) for a specific or latest fiscal period. Pulls directly from SEC XBRL filings.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker (e.g., AAPL)", required: true },
                    { name: "fy", type: "query", description: "Fiscal year (e.g., 2024)" },
                    { name: "fp", type: "query", description: "Fiscal period: Q1, Q2, Q3, Q4, or FY" },
                    { name: "form", type: "query", description: "SEC form type: 10-Q or 10-K" },
                    { name: "accn", type: "query", description: "Specific accession number" },
                    { name: "force_refresh", type: "query", description: "Force re-fetch from SEC", default: "false" },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "cik": "0000320193",
  "mode": "latest",
  "revenue": { "concept": "Revenues", "value": 94930000000, "end": "2024-09-28", "fy": 2024, "fp": "Q4" },
  "net_income": { "concept": "NetIncomeLoss", "value": 14736000000, "end": "2024-09-28" },
  "eps_basic": { "concept": "EarningsPerShareBasic", "value": 0.97 },
  "eps_diluted": { "concept": "EarningsPerShareDiluted", "value": 0.97 },
  "period_end": "2024-09-28",
  "notes": []
}`,
                curl: `curl "${BASE}/company/AAPL/earnings-summary?fy=2024&fp=Q4"`,
                python: `import requests
r = requests.get("${BASE}/company/AAPL/earnings-summary", params={"fy": 2024, "fp": "Q4"})
print(r.json())`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/earnings-summary?fy=2024&fp=Q4");
const data = await res.json();
console.log(data);`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-events",
                description: "Get historical and upcoming earnings event dates from multiple sources (Yahoo, Polygon, SEC proxy). Includes event timing, fiscal period mapping, and confidence levels.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "source", type: "query", description: "Data source: auto, polygon, yahoo, or sec_proxy", default: "auto" },
                    { name: "limit", type: "query", description: "Max events to return (1–200)", default: "20" },
                ],
                responseExample: `[
  {
    "ticker": "AAPL",
    "source": "polygon",
    "event_date": "2025-01-30",
    "event_time": "amc",
    "fy": 2025, "fp": "Q1",
    "confidence": "high"
  }
]`,
                curl: `curl "${BASE}/company/AAPL/earnings-events?limit=5"`,
                python: `r = requests.get("${BASE}/company/AAPL/earnings-events", params={"limit": 5})`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/earnings-events?limit=5");`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-reaction",
                description: "Measure post-earnings stock price reaction. Returns ref/end close, return %, max drawdown, max run-up, and volume over a configurable window.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "event_date", type: "query", description: "YYYY-MM-DD (defaults to latest earnings)" },
                    { name: "window_days", type: "query", description: "Trading days after event (1–60)", default: "5" },
                    { name: "source", type: "query", description: "auto|polygon|yahoo|sec_proxy", default: "auto" },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "event_date": "2025-01-30",
  "window_days": 5,
  "ref_close": 236.0,
  "end_close": 232.5,
  "return_pct": -1.48,
  "max_drawdown_pct": -3.1,
  "max_runup_pct": 1.2,
  "volume_sum": 482000000
}`,
                curl: `curl "${BASE}/company/AAPL/earnings-reaction?window_days=5"`,
                python: `r = requests.get("${BASE}/company/AAPL/earnings-reaction", params={"window_days": 5})`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/earnings-reaction?window_days=5");`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-details",
                description: "All-in-one earnings deep dive: aggregates event, fundamentals, summary, financial ratios, market reaction, analyst consensus, and EPS surprise. The most comprehensive single endpoint.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "event_date", type: "query", description: "YYYY-MM-DD (defaults to latest)" },
                    { name: "window_days", type: "query", description: "Reaction window (1–60)", default: "5" },
                    { name: "source", type: "query", description: "auto|polygon|yahoo|sec_proxy", default: "auto" },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "event_date": "2025-01-30",
  "event_source": "polygon",
  "fundamentals": { "assets": {...}, "liabilities": {...}, "cash": {...} },
  "summary": { "revenue": {...}, "net_income": {...}, "eps_basic": {...} },
  "reaction": { "return_pct": -1.48, "max_drawdown_pct": -3.1 },
  "ratios": { "debt_to_equity": 1.87, "current_ratio": 0.87, "cash_to_debt": 0.63 },
  "analysts": { "analysts": { "buy": 30, "hold": 8, "sell": 2 }, ... },
  "eps_surprise_pct": 4.3
}`,
                curl: `curl "${BASE}/company/AAPL/earnings-details"`,
                python: `r = requests.get("${BASE}/company/AAPL/earnings-details")`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/earnings-details");`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-analysts",
                description: "Analyst ratings (buy/hold/sell), price targets (low/mean/high with implied upside), and EPS/revenue forecasts from Yahoo Finance.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "source": "yahoo",
  "analysts": { "buy": 30, "hold": 8, "sell": 2, "total": 40, "consensus": "Buy" },
  "price_targets": { "low": 200.0, "mean": 252.5, "high": 300.0, "implied_upside_pct": 8.3 },
  "earnings_forecast": { "eps_current_year": 7.1, "eps_next_year": 7.8, "eps_growth_pct": 9.8 }
}`,
                curl: `curl "${BASE}/company/AAPL/earnings-analysts"`,
                python: `r = requests.get("${BASE}/company/AAPL/earnings-analysts")`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/earnings-analysts");`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-live",
                description: "Client-polled live earnings monitor. Scrapes IR pages for press releases and extracts actual EPS/revenue as they're published. Poll this during earnings calls.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "event_date", type: "query", description: "YYYY-MM-DD earnings date", required: true },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "event_date": "2025-01-30",
  "status": "released",
  "source": "https://investor.apple.com/...",
  "eps_actual": 2.40,
  "revenue_actual": 124300000000,
  "headline": "Apple Reports First Quarter Results",
  "confidence": "medium"
}`,
                curl: `curl "${BASE}/company/AAPL/earnings-live?event_date=2025-01-30"`,
                python: `r = requests.get("${BASE}/company/AAPL/earnings-live", params={"event_date": "2025-01-30"})`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/earnings-live?event_date=2025-01-30");`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-news",
                description: "Earnings-focused news bucketed by phase: pre-earnings, day-of, and post-earnings. Anchored to the actual earnings event date.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "window_days", type: "query", description: "Days before/after event (1–7)", default: "3" },
                    { name: "source", type: "query", description: "auto|polygon|yahoo|sec_proxy", default: "auto" },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "event_date": "2025-01-30",
  "window_days": 3,
  "buckets": [
    { "phase": "pre", "articles": [...] },
    { "phase": "day_of", "articles": [...] },
    { "phase": "post", "articles": [...] }
  ]
}`,
                curl: `curl "${BASE}/company/AAPL/earnings-news?window_days=3"`,
                python: `r = requests.get("${BASE}/company/AAPL/earnings-news", params={"window_days": 3})`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/earnings-news?window_days=3");`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-ai-review",
                description: "AI-generated earnings analysis. Produces a markdown write-up covering revenue trends, profitability, balance sheet health, and outlook.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "fy": 2024, "fp": "Q4",
  "period_end": "2024-09-28",
  "generated_at": "2025-02-10T19:00:00Z",
  "model": "ai-chat",
  "analysis_markdown": "## Apple Q4 FY2024 Earnings Review\\n\\n### Revenue..."
}`,
                curl: `curl "${BASE}/company/AAPL/earnings-ai-review"`,
                python: `r = requests.get("${BASE}/company/AAPL/earnings-ai-review")`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/earnings-ai-review");`,
            },
        ],
    },
    // ════════════════════════════════════════════════════
    // 2. COMPANY & SEC FILINGS
    // ════════════════════════════════════════════════════
    {
        id: "company",
        title: "Company & SEC Filings",
        description: "Company fundamentals, SEC filing history, financial health ratios, filing text extraction, and sentiment analysis.",
        endpoints: [
            {
                method: "GET",
                path: "/company/{ticker}/overview",
                description: "Company overview: name, CIK, SIC code, industry description, exchanges, and state of incorporation from SEC EDGAR.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "force_refresh", type: "query", description: "Force re-fetch from SEC", default: "false" },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "cik": "0000320193",
  "name": "Apple Inc.",
  "sic": "3571",
  "sicDescription": "Electronic Computers",
  "exchanges": ["NASDAQ"],
  "stateOfIncorporation": "CA"
}`,
                curl: `curl "${BASE}/company/AAPL/overview"`,
                python: `r = requests.get("${BASE}/company/AAPL/overview")`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/overview");`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/filings",
                description: "SEC filing history — list 10-Q, 10-K, 8-K filings with dates, accession numbers, and primary document filenames.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "forms", type: "query", description: "Comma-separated form types", default: "10-Q,10-K,8-K" },
                    { name: "limit", type: "query", description: "Max filings (1–200)", default: "25" },
                    { name: "force_refresh", type: "query", description: "Force re-fetch", default: "false" },
                ],
                responseExample: `[
  {
    "form": "10-Q",
    "filingDate": "2025-01-31",
    "reportDate": "2024-12-28",
    "accessionNumber": "0000320193-25-000079",
    "primaryDocument": "aapl-20241228.htm"
  }
]`,
                curl: `curl "${BASE}/company/AAPL/filings?forms=10-Q,10-K&limit=5"`,
                python: `r = requests.get("${BASE}/company/AAPL/filings", params={"forms": "10-Q,10-K", "limit": 5})`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/filings?forms=10-Q,10-K&limit=5");`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/periods",
                description: "List all available fiscal periods for a given metric, with filing dates and accession numbers. Useful for exploring history.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "metric", type: "query", description: "revenue, net_income, or eps", default: "revenue" },
                    { name: "limit", type: "query", description: "Max periods (1–500)", default: "120" },
                ],
                responseExample: `[
  { "fy": 2024, "fp": "Q4", "end": "2024-09-28", "filed": "2024-11-01", "form": "10-K", "accn": "0000320193-24-000123" },
  { "fy": 2024, "fp": "Q3", "end": "2024-06-29", "filed": "2024-08-02", "form": "10-Q" }
]`,
                curl: `curl "${BASE}/company/AAPL/periods?metric=revenue"`,
                python: `r = requests.get("${BASE}/company/AAPL/periods", params={"metric": "revenue"})`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/periods?metric=revenue");`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/financial-health",
                description: "Balance sheet health: assets, liabilities, cash, debt, operating cash flow, plus derived ratios (debt/equity, current ratio, cash/debt coverage).",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "fy", type: "query", description: "Fiscal year" },
                    { name: "fp", type: "query", description: "Fiscal period: Q1–Q4 or FY" },
                    { name: "form", type: "query", description: "10-Q or 10-K" },
                    { name: "accn", type: "query", description: "Accession number" },
                    { name: "force_refresh", type: "query", description: "Force re-fetch", default: "false" },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "cik": "0000320193",
  "fy": 2024, "fp": "Q4",
  "assets": { "value": 364980000000 },
  "liabilities": { "value": 308030000000 },
  "cash": { "value": 65170000000 },
  "debt": { "value": 96800000000 },
  "current_health": { "debt_to_equity": 5.41, "current_ratio": 0.87, "cash_to_debt": 0.67 }
}`,
                curl: `curl "${BASE}/company/AAPL/financial-health"`,
                python: `r = requests.get("${BASE}/company/AAPL/financial-health")`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/financial-health");`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/filing-text",
                description: "Fetch and extract text from an SEC filing by accession number. Returns cleaned text with automatic section extraction (Item 1, Item 2, etc.).",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "accn", type: "query", description: "Accession number (e.g., 0000320193-25-000079)", required: true },
                    { name: "primary_doc", type: "query", description: "Primary document filename" },
                    { name: "force_refresh", type: "query", description: "Force re-fetch", default: "false" },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "cik": "0000320193",
  "accn": "0000320193-25-000079",
  "url": "https://www.sec.gov/Archives/...",
  "text_len": 284532,
  "extracted_sections": { "Item 1": "...", "Item 2": "..." }
}`,
                curl: `curl "${BASE}/company/AAPL/filing-text?accn=0000320193-25-000079"`,
                python: `r = requests.get("${BASE}/company/AAPL/filing-text", params={"accn": "0000320193-25-000079"})`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/filing-text?accn=0000320193-25-000079");`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/filing-sentiment",
                description: "Simple rule-based sentiment analysis of a filing. Returns a score (–1 to +1), label (positive/negative/neutral), and keyword cue counts.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "accn", type: "query", description: "Accession number", required: true },
                    { name: "primary_doc", type: "query", description: "Primary document filename" },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "accn": "0000320193-25-000079",
  "score": 0.35,
  "label": "positive",
  "cues": { "growth": 12, "strong": 8, "risk": 3, "uncertain": 2 }
}`,
                curl: `curl "${BASE}/company/AAPL/filing-sentiment?accn=0000320193-25-000079"`,
                python: `r = requests.get("${BASE}/company/AAPL/filing-sentiment", params={"accn": "0000320193-25-000079"})`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/filing-sentiment?accn=0000320193-25-000079");`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/expected-move",
                description: "Options-implied expected move estimate derived from near-term IV. Useful for sizing earnings plays.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "horizon_days", type: "query", description: "Days to expiry (1–30)", default: "1" },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "as_of": "2025-01-29",
  "horizon_days": 1,
  "implied_move_pct": 3.8,
  "notes": ["Derived from near-term ATM IV"]
}`,
                curl: `curl "${BASE}/company/AAPL/expected-move?horizon_days=1"`,
                python: `r = requests.get("${BASE}/company/AAPL/expected-move", params={"horizon_days": 1})`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/expected-move?horizon_days=1");`,
            },
            {
                method: "GET",
                path: "/company/{ticker}/news",
                description: "Recent company news articles with source, title, description, URL, and publication time.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "days_back", type: "query", description: "How many days back (1–30)", default: "7" },
                    { name: "limit", type: "query", description: "Max articles (1–100)", default: "20" },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "total_results": 15,
  "articles": [
    { "source": "Reuters", "title": "Apple beats Q4 expectations...", "url": "https://...", "published_at": "2025-01-30T21:00:00Z" }
  ]
}`,
                curl: `curl "${BASE}/company/AAPL/news?days_back=7&limit=10"`,
                python: `r = requests.get("${BASE}/company/AAPL/news", params={"days_back": 7, "limit": 10})`,
                javascript: `const res = await fetch("${BASE}/company/AAPL/news?days_back=7&limit=10");`,
            },
        ],
    },
    // ════════════════════════════════════════════════════
    // 3. EARNINGS CALENDAR
    // ════════════════════════════════════════════════════
    {
        id: "calendar",
        title: "Earnings Calendar",
        description: "Scraped earnings calendar — today, this week, upcoming, or by specific date. Includes EPS estimates/actuals, revenue estimates, and market cap.",
        endpoints: [
            {
                method: "GET",
                path: "/calendar/today",
                description: "Get all companies reporting earnings today.",
                params: [],
                responseExample: `{
  "date": "2025-02-10",
  "events": [
    { "ticker": "ON", "company_name": "ON Semiconductor", "earnings_date": "2025-02-10", "earnings_time": "bmo", "eps_estimate": "0.96", "eps_actual": null, "revenue_estimate": "1.76B" }
  ],
  "count": 42
}`,
                curl: `curl "${BASE}/calendar/today"`,
                python: `r = requests.get("${BASE}/calendar/today")`,
                javascript: `const res = await fetch("${BASE}/calendar/today");`,
            },
            {
                method: "GET",
                path: "/calendar/week",
                description: "Get all earnings events for the current week (Monday through Friday).",
                params: [],
                responseExample: `{
  "start_date": "2025-02-10",
  "end_date": "2025-02-14",
  "events": [...],
  "count": 185
}`,
                curl: `curl "${BASE}/calendar/week"`,
                python: `r = requests.get("${BASE}/calendar/week")`,
                javascript: `const res = await fetch("${BASE}/calendar/week");`,
            },
            {
                method: "GET",
                path: "/calendar/upcoming",
                description: "Get upcoming earnings for the next N days.",
                params: [
                    { name: "days", type: "query", description: "Number of days ahead (1–30)", default: "7" },
                ],
                responseExample: `{
  "start_date": "2025-02-10",
  "end_date": "2025-02-17",
  "events": [...],
  "count": 312
}`,
                curl: `curl "${BASE}/calendar/upcoming?days=14"`,
                python: `r = requests.get("${BASE}/calendar/upcoming", params={"days": 14})`,
                javascript: `const res = await fetch("${BASE}/calendar/upcoming?days=14");`,
            },
            {
                method: "GET",
                path: "/calendar/date/{date_str}",
                description: "Get earnings calendar for a specific date.",
                params: [
                    { name: "date_str", type: "path", description: "Date in YYYY-MM-DD format", required: true },
                ],
                responseExample: `{
  "date": "2025-02-12",
  "events": [
    { "ticker": "SHOP", "company_name": "Shopify Inc.", "earnings_date": "2025-02-12", "earnings_time": "bmo", "eps_estimate": "0.44" }
  ],
  "count": 28
}`,
                curl: `curl "${BASE}/calendar/date/2025-02-12"`,
                python: `r = requests.get("${BASE}/calendar/date/2025-02-12")`,
                javascript: `const res = await fetch("${BASE}/calendar/date/2025-02-12");`,
            },
        ],
    },
    // ════════════════════════════════════════════════════
    // 4. MARKET DATA
    // ════════════════════════════════════════════════════
    {
        id: "market",
        title: "Market Data",
        description: "Real-time quotes, multi-ticker snapshots, major index levels, historical OHLCV bars, and ticker search.",
        endpoints: [
            {
                method: "GET",
                path: "/market/quote/{ticker}",
                description: "Real-time quote via Polygon — price, change, OHLCV, previous close, and market status.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "price": 232.47,
  "change": -3.53,
  "change_pct": -1.5,
  "open": 235.46,
  "high": 236.12,
  "low": 231.80,
  "close": 232.47,
  "volume": 64300000,
  "prev_close": 236.00,
  "market_status": "open"
}`,
                curl: `curl "${BASE}/market/quote/AAPL"`,
                python: `r = requests.get("${BASE}/market/quote/AAPL")`,
                javascript: `const res = await fetch("${BASE}/market/quote/AAPL");`,
            },
            {
                method: "GET",
                path: "/market/quotes",
                description: "Batch quotes for multiple tickers in a single request.",
                params: [
                    { name: "tickers", type: "query", description: "Comma-separated tickers (e.g., AAPL,MSFT,TSLA)", required: true },
                ],
                responseExample: `{
  "quotes": [
    { "ticker": "AAPL", "price": 232.47, "change": -3.53, ... },
    { "ticker": "MSFT", "price": 411.20, "change": 2.10, ... }
  ]
}`,
                curl: `curl "${BASE}/market/quotes?tickers=AAPL,MSFT,TSLA"`,
                python: `r = requests.get("${BASE}/market/quotes", params={"tickers": "AAPL,MSFT,TSLA"})`,
                javascript: `const res = await fetch("${BASE}/market/quotes?tickers=AAPL,MSFT,TSLA");`,
            },
            {
                method: "GET",
                path: "/market/indices",
                description: "Major market indices: S&P 500, NASDAQ, DOW, and VIX via yfinance.",
                params: [],
                responseExample: `{
  "indices": [
    { "symbol": "^GSPC", "name": "S&P 500", "price": 6025.99, "change": -18.45, "change_pct": -0.31 },
    { "symbol": "^IXIC", "name": "NASDAQ", "price": 19643.86, "change": 42.12, "change_pct": 0.21 }
  ]
}`,
                curl: `curl "${BASE}/market/indices"`,
                python: `r = requests.get("${BASE}/market/indices")`,
                javascript: `const res = await fetch("${BASE}/market/indices");`,
            },
            {
                method: "GET",
                path: "/market/bars/{ticker}",
                description: "Historical OHLCV bars for a ticker. Supports multiple ranges and timespans.",
                params: [
                    { name: "ticker", type: "path", description: "Stock ticker", required: true },
                    { name: "range", type: "query", description: "1D, 5D, 1M, 3M, 6M, 1Y, 5Y", default: "1M" },
                    { name: "timespan", type: "query", description: "minute, hour, day, week, month", default: "day" },
                ],
                responseExample: `{
  "ticker": "AAPL",
  "bars": [
    { "t": 1707350400000, "o": 230.5, "h": 233.1, "l": 229.8, "c": 232.47, "v": 64300000 }
  ],
  "count": 22
}`,
                curl: `curl "${BASE}/market/bars/AAPL?range=3M&timespan=day"`,
                python: `r = requests.get("${BASE}/market/bars/AAPL", params={"range": "3M", "timespan": "day"})`,
                javascript: `const res = await fetch("${BASE}/market/bars/AAPL?range=3M&timespan=day");`,
            },
            {
                method: "GET",
                path: "/market/search",
                description: "Search for tickers by company name or symbol.",
                params: [
                    { name: "query", type: "query", description: "Search query", required: true },
                    { name: "limit", type: "query", description: "Max results (1–50)", default: "10" },
                ],
                responseExample: `{
  "results": [
    { "ticker": "AAPL", "name": "Apple Inc.", "market": "stocks", "type": "CS", "currency": "USD", "primary_exchange": "XNAS" }
  ],
  "count": 1
}`,
                curl: `curl "${BASE}/market/search?query=apple&limit=5"`,
                python: `r = requests.get("${BASE}/market/search", params={"query": "apple", "limit": 5})`,
                javascript: `const res = await fetch("${BASE}/market/search?query=apple&limit=5");`,
            },
        ],
    },
];

// ─── Code tab state ─────────────────────────────────────────
const CODE_TABS = ["curl", "python", "javascript"] as const;
type CodeTab = typeof CODE_TABS[number];

export default function ApiDocsPage() {
    const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
    const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
    const [codeTabs, setCodeTabs] = useState<Record<string, CodeTab>>({});
    const [copied, setCopied] = useState<string | null>(null);

    const getCodeTab = (path: string): CodeTab => codeTabs[path] || "curl";
    const setCodeTab = (path: string, tab: CodeTab) => setCodeTabs({ ...codeTabs, [path]: tab });

    const copyText = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    const methodColor = (m: string) => {
        switch (m) {
            case "GET": return "text-emerald-400 bg-emerald-400/10";
            case "POST": return "text-blue-400 bg-blue-400/10";
            case "PUT": return "text-amber-400 bg-amber-400/10";
            case "DELETE": return "text-red-400 bg-red-400/10";
            default: return "text-text-muted bg-white/5";
        }
    };

    return (
        <DashboardLayout title="API Documentation">
            <div className="flex h-full">
                {/* Sidebar Nav */}
                <aside className="w-64 border-r border-border bg-surface/50 overflow-y-auto shrink-0 hidden lg:block">
                    <div className="p-5 border-b border-border">
                        <h2 className="text-lg font-bold text-text-main">API Reference</h2>
                        <p className="text-xs text-text-muted mt-1">Erns Earnings Intelligence API</p>
                    </div>
                    <nav className="p-3">
                        {/* Overview */}
                        <button
                            onClick={() => setActiveSection("overview")}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${activeSection === "overview" ? "bg-primary/10 text-primary font-medium" : "text-text-muted hover:text-text-main hover:bg-white/5"
                                }`}
                        >
                            Overview
                        </button>
                        {SECTIONS.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setActiveSection(s.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${activeSection === s.id ? "bg-primary/10 text-primary font-medium" : "text-text-muted hover:text-text-main hover:bg-white/5"
                                    }`}
                            >
                                {s.title}
                                <span className="ml-2 text-[10px] opacity-50">({s.endpoints.length})</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6 lg:p-10">
                    {/* Overview Section */}
                    {activeSection === "overview" && (
                        <div className="max-w-3xl">
                            <h1 className="text-3xl font-bold text-text-main mb-4">Erns Earnings Intelligence API</h1>
                            <p className="text-text-muted mb-6 leading-relaxed">
                                A comprehensive earnings-focused API for institutional-grade financial analysis. Get deep earnings intelligence including
                                SEC filings, analyst consensus, post-earnings stock reactions, AI-powered reviews, live earnings polling, and more — all from a single API.
                            </p>
                            <div className="bg-surface/80 border border-border rounded-xl p-5 mb-6">
                                <h3 className="text-sm font-semibold text-primary mb-3">Base URL</h3>
                                <code className="text-text-main font-mono text-sm bg-background px-3 py-1.5 rounded-lg">{BASE}</code>
                            </div>
                            <div className="bg-surface/80 border border-border rounded-xl p-5 mb-6">
                                <h3 className="text-sm font-semibold text-primary mb-3">Authentication</h3>
                                <p className="text-sm text-text-muted mb-2">Pass your API key in the <code className="text-primary/80 font-mono text-xs bg-primary/5 px-1.5 py-0.5 rounded">X-API-Key</code> header. Anonymous access is available with rate limits.</p>
                                <pre className="bg-background rounded-lg p-3 text-xs font-mono text-text-main mt-3">curl -H &quot;X-API-Key: YOUR_KEY&quot; {BASE}/company/AAPL/earnings-summary</pre>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {SECTIONS.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setActiveSection(s.id)}
                                        className="bg-surface/60 border border-border rounded-xl p-4 text-left hover:border-primary/30 transition-colors group"
                                    >
                                        <h4 className="text-sm font-semibold text-text-main group-hover:text-primary transition-colors">{s.title}</h4>
                                        <p className="text-xs text-text-muted mt-1 line-clamp-2">{s.description}</p>
                                        <p className="text-[10px] text-primary/60 mt-2">{s.endpoints.length} endpoints →</p>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-8 bg-surface/80 border border-border rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-primary mb-3">Rate Limits</h3>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-text-muted text-left text-xs">
                                            <th className="pb-2 font-medium">Tier</th>
                                            <th className="pb-2 font-medium">Requests/min</th>
                                            <th className="pb-2 font-medium">Access</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-text-main font-mono">
                                        <tr className="border-t border-border/50"><td className="py-2">Anonymous</td><td>10</td><td className="text-text-muted text-xs font-sans">No key required</td></tr>
                                        <tr className="border-t border-border/50"><td className="py-2">Starter</td><td>30</td><td className="text-text-muted text-xs font-sans">API key required</td></tr>
                                        <tr className="border-t border-border/50"><td className="py-2">Premium</td><td>120</td><td className="text-text-muted text-xs font-sans">API key required</td></tr>
                                        <tr className="border-t border-border/50"><td className="py-2">Enterprise</td><td>600</td><td className="text-text-muted text-xs font-sans">API key required</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Endpoint Sections */}
                    {SECTIONS.filter((s) => s.id === activeSection).map((section) => (
                        <div key={section.id} className="max-w-4xl">
                            <h1 className="text-2xl font-bold text-text-main mb-2">{section.title}</h1>
                            <p className="text-text-muted text-sm mb-8">{section.description}</p>

                            <div className="space-y-3">
                                {section.endpoints.map((ep) => {
                                    const isExpanded = expandedEndpoint === ep.path;
                                    const tab = getCodeTab(ep.path);
                                    const codeContent = ep[tab];
                                    return (
                                        <div key={ep.path} className="border border-border rounded-xl overflow-hidden bg-surface/60 hover:border-border/80 transition-colors">
                                            {/* Header */}
                                            <button
                                                onClick={() => setExpandedEndpoint(isExpanded ? null : ep.path)}
                                                className="w-full flex items-center gap-3 px-5 py-4 text-left"
                                            >
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded ${methodColor(ep.method)}`}>
                                                    {ep.method}
                                                </span>
                                                <code className="text-sm font-mono text-text-main flex-1">{ep.path}</code>
                                                <span className="text-xs text-text-muted hidden sm:block max-w-[200px] truncate">{ep.description.split(".")[0]}</span>
                                                <svg className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {/* Expanded Content */}
                                            {isExpanded && (
                                                <div className="border-t border-border">
                                                    <div className="px-5 py-4">
                                                        <p className="text-sm text-text-muted mb-4">{ep.description}</p>

                                                        {/* Parameters */}
                                                        {ep.params.length > 0 && (
                                                            <div className="mb-5">
                                                                <h4 className="text-xs font-semibold text-text-main uppercase tracking-wider mb-2">Parameters</h4>
                                                                <div className="bg-background rounded-lg overflow-hidden">
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="text-text-muted border-b border-border/50">
                                                                                <th className="text-left px-3 py-2 font-medium">Name</th>
                                                                                <th className="text-left px-3 py-2 font-medium">Type</th>
                                                                                <th className="text-left px-3 py-2 font-medium">Description</th>
                                                                                <th className="text-left px-3 py-2 font-medium">Default</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {ep.params.map((p) => (
                                                                                <tr key={p.name} className="border-b border-border/30 last:border-0">
                                                                                    <td className="px-3 py-2 font-mono text-primary/80">
                                                                                        {p.name}
                                                                                        {p.required && <span className="text-red-400 ml-1">*</span>}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-text-muted">{p.type}</td>
                                                                                    <td className="px-3 py-2 text-text-muted">{p.description}</td>
                                                                                    <td className="px-3 py-2 font-mono text-text-muted/60">{p.default || "—"}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Code Examples */}
                                                        <div className="mb-5">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <h4 className="text-xs font-semibold text-text-main uppercase tracking-wider">Code</h4>
                                                                <div className="flex gap-1 ml-auto">
                                                                    {CODE_TABS.map((t) => (
                                                                        <button
                                                                            key={t}
                                                                            onClick={() => setCodeTab(ep.path, t)}
                                                                            className={`text-[10px] px-2 py-1 rounded font-medium transition-colors ${tab === t ? "bg-primary/20 text-primary" : "text-text-muted hover:text-text-main"}`}
                                                                        >
                                                                            {t}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="relative">
                                                                <pre className="bg-background rounded-lg p-4 text-xs font-mono text-text-main overflow-x-auto">
                                                                    <code>{codeContent}</code>
                                                                </pre>
                                                                <button
                                                                    onClick={() => copyText(codeContent, ep.path + "-code")}
                                                                    className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded bg-white/5 text-text-muted hover:text-primary transition-colors"
                                                                >
                                                                    {copied === ep.path + "-code" ? "Copied!" : "Copy"}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Response Example */}
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <h4 className="text-xs font-semibold text-text-main uppercase tracking-wider">Response Example</h4>
                                                                <button
                                                                    onClick={() => copyText(ep.responseExample, ep.path + "-resp")}
                                                                    className="ml-auto text-[10px] px-2 py-1 rounded bg-white/5 text-text-muted hover:text-primary transition-colors"
                                                                >
                                                                    {copied === ep.path + "-resp" ? "Copied!" : "Copy"}
                                                                </button>
                                                            </div>
                                                            <pre className="bg-background rounded-lg p-4 text-xs font-mono text-emerald-300/80 overflow-x-auto max-h-[300px]">
                                                                <code>{ep.responseExample}</code>
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </main>
            </div>
        </DashboardLayout>
    );
}
