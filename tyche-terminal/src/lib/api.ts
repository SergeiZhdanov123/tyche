/**
 * Erns API Client
 * Centralized API client for all backend calls
 */
import { config } from './config';

const API_BASE_URL = config.apiUrl;

// Types
export interface QuoteResponse {
    ticker: string;
    price: number;
    change: number;
    change_pct: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    prev_close: number;
    timestamp: string;
    market_status: string;
}

export interface TickerInfo {
    ticker: string;
    name: string;
    market: string;
    type: string;
    currency: string;
    primary_exchange: string;
}

export interface PriceBar {
    t: number; // timestamp
    o: number; // open
    h: number; // high
    l: number; // low
    c: number; // close
    v: number; // volume
}

export interface CalendarEvent {
    ticker: string;
    company_name: string;
    earnings_date: string;
    earnings_time: string | null;
    eps_estimate: string | null;
    eps_actual: string | null;
    revenue_estimate: string | null;
    source: string;
    market_cap: string | null;
}

export interface EarningsSummary {
    ticker: string;
    cik: string;
    mode: string;
    revenue: { value: number; fy: number; fp: string } | null;
    net_income: { value: number } | null;
    eps_basic: { value: number } | null;
    eps_diluted: { value: number } | null;
    period_end: string | null;
    as_of: string | null;
    notes: string[];
}

export interface AnalystRatings {
    buy: number | null;
    hold: number | null;
    sell: number | null;
    total: number | null;
    consensus: string | null;
}

export interface PriceTargets {
    low: number | null;
    mean: number | null;
    high: number | null;
    implied_upside_pct: number | null;
}

export interface EarningsAnalystsResponse {
    ticker: string;
    analysts: AnalystRatings;
    price_targets: PriceTargets;
    earnings_forecast: {
        eps_current_year: number | null;
        eps_next_year: number | null;
        eps_growth_pct: number | null;
    };
    notes: string[];
}

export interface APIKeyInfo {
    key_prefix: string;
    masked_key: string;
    plan: string;
    created_at: string;
    is_active: boolean;
    total_requests: number;
    name: string | null;
}

export interface WatchlistItem {
    ticker: string;
    added_at: string;
    notes: string | null;
}

// API Error
export class APIError extends Error {
    status: number;
    detail: string;

    constructor(status: number, detail: string) {
        super(detail);
        this.status = status;
        this.detail = detail;
        this.name = 'APIError';
    }
}

// Fetch wrapper with error handling
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new APIError(response.status, error.detail || 'API request failed');
    }

    return response.json();
}

// ============================================================
// Market Data API
// ============================================================

export async function getQuote(ticker: string): Promise<QuoteResponse> {
    return apiFetch<QuoteResponse>(`/market/quote/${ticker.toUpperCase()}`);
}

export async function getMultipleQuotes(tickers: string[]): Promise<{
    quotes: QuoteResponse[];
    count: number;
}> {
    return apiFetch(`/market/quotes?tickers=${tickers.join(',')}`);
}

export async function getPriceBars(
    ticker: string,
    range: '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y' = '1M',
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<{
    ticker: string;
    range: string;
    timespan: string;
    bars: PriceBar[];
    count: number;
}> {
    return apiFetch(`/market/bars/${ticker.toUpperCase()}?range=${range}&timespan=${timespan}`);
}

export async function getMarketIndices(): Promise<{
    indices: {
        symbol: string;
        name: string;
        price: number;
        change: number;
        change_pct: number;
    }[];
    count: number;
}> {
    return apiFetch('/market/indices');
}

export async function searchTickers(
    query: string,
    limit: number = 10
): Promise<{
    results: TickerInfo[];
    count: number;
}> {
    return apiFetch(`/market/search?query=${encodeURIComponent(query)}&limit=${limit}`);
}

// ============================================================
// Earnings API
// ============================================================

export async function getEarningsSummary(ticker: string): Promise<EarningsSummary> {
    return apiFetch<EarningsSummary>(`/company/${ticker.toUpperCase()}/earnings-summary`);
}

export async function getEarningsAnalysts(ticker: string): Promise<EarningsAnalystsResponse> {
    return apiFetch<EarningsAnalystsResponse>(`/company/${ticker.toUpperCase()}/earnings-analysts`);
}

export async function getEarningsReaction(
    ticker: string,
    windowDays: number = 5
): Promise<{
    ticker: string;
    event_date: string;
    window_days: number;
    ref_close: number | null;
    end_close: number | null;
    return_pct: number | null;
    max_drawdown_pct: number | null;
    max_runup_pct: number | null;
    volume_sum: number | null;
    notes: string[];
}> {
    return apiFetch(`/company/${ticker.toUpperCase()}/earnings-reaction?window_days=${windowDays}`);
}

// ============================================================
// Calendar API
// ============================================================

export async function getTodayEarnings(): Promise<{
    date: string;
    events: CalendarEvent[];
    count: number;
}> {
    return apiFetch('/calendar/today');
}

export async function getWeekEarnings(): Promise<{
    start_date: string;
    end_date: string;
    events: CalendarEvent[];
    count: number;
}> {
    return apiFetch('/calendar/week');
}

export async function getUpcomingEarnings(days: number = 7): Promise<{
    start_date: string;
    end_date: string;
    events: CalendarEvent[];
    count: number;
}> {
    return apiFetch(`/calendar/upcoming?days=${days}`);
}

export async function getEarningsByDate(date: string): Promise<{
    date: string;
    events: CalendarEvent[];
    count: number;
}> {
    return apiFetch(`/calendar/date/${date}`);
}

// ============================================================
// Watchlist API
// ============================================================

export async function getWatchlist(email: string): Promise<{
    email: string;
    items: WatchlistItem[];
    count: number;
}> {
    return apiFetch(`/user/watchlist/${encodeURIComponent(email)}`);
}

export async function addToWatchlist(
    email: string,
    ticker: string,
    notes?: string
): Promise<{ status: string; ticker?: string; message?: string }> {
    return apiFetch('/user/watchlist/add', {
        method: 'POST',
        body: JSON.stringify({ email, ticker, notes }),
    });
}

export async function removeFromWatchlist(
    email: string,
    ticker: string
): Promise<{ status: string; ticker: string }> {
    return apiFetch(`/user/watchlist/${encodeURIComponent(email)}/${ticker.toUpperCase()}`, {
        method: 'DELETE',
    });
}

// ============================================================
// API Key Management
// ============================================================

export async function createAPIKey(
    email: string,
    plan: 'starter' | 'premium' | 'enterprise'
): Promise<{
    api_key: string;
    key_prefix: string;
    plan: string;
    warning: string;
}> {
    return apiFetch('/auth/create-api-key', {
        method: 'POST',
        body: JSON.stringify({ email, plan }),
    });
}

export async function listAPIKeys(email: string): Promise<{
    email: string;
    keys: APIKeyInfo[];
    count: number;
}> {
    return apiFetch(`/auth/list-keys/${encodeURIComponent(email)}`);
}

export async function revokeAPIKey(
    email: string,
    keyPrefix: string
): Promise<{ status: string; key_prefix: string }> {
    return apiFetch('/auth/revoke-key', {
        method: 'POST',
        body: JSON.stringify({ email, key_prefix: keyPrefix }),
    });
}

export async function getTierFeatures(tier: string): Promise<{
    tier: string;
    features: {
        rate_limit: number;
        watchlist_size: number;
        api_calls_monthly: number;
        historical_days: number;
        realtime_quotes: boolean;
        ai_analysis: boolean;
    };
}> {
    return apiFetch(`/auth/tier-features/${tier}`);
}

// ============================================================
// Company Overview API
// ============================================================

export async function getCompanyOverview(ticker: string): Promise<{
    ticker: string;
    cik: string;
    name: string | null;
    sic: string | null;
    sicDescription: string | null;
    exchanges: string[] | null;
    stateOfIncorporation: string | null;
}> {
    return apiFetch(`/company/${ticker.toUpperCase()}/overview`);
}

export interface EarningsEvent {
    ticker: string;
    source: string;
    event_date: string;
    event_time: string | null;
    fy: number | null;
    fp: string | null;
    accn: string | null;
    filing_date: string | null;
    form: string | null;
    confidence: string;
}

export async function getCompanyEarningsEvents(ticker: string, limit: number = 20): Promise<EarningsEvent[]> {
    return apiFetch(`/company/${ticker.toUpperCase()}/earnings-events?limit=${limit}&source=sec_proxy`);
}

export interface EPSQuarter {
    fy: number;
    fp: string;
    period_end: string | null;
    filed: string | null;
    form: string | null;
    eps_basic: number | null;
    eps_diluted: number | null;
    revenue: number | null;
    net_income: number | null;
}

export interface EPSHistoryResponse {
    ticker: string;
    quarters: EPSQuarter[];
}

export async function getEPSHistory(ticker: string, limit: number = 12): Promise<EPSHistoryResponse> {
    return apiFetch(`/company/${ticker.toUpperCase()}/eps-history?limit=${limit}`);
}

export interface EarningsReaction {
    ticker: string;
    event_date: string;
    window_days: number;
    ref_close: number;
    end_close: number;
    return_pct: number;
    max_drawdown_pct: number;
    max_runup_pct: number;
    volume_sum: number;
    notes: string[];
}

export async function getEarningsReactionData(ticker: string, windowDays: number = 5): Promise<EarningsReaction> {
    return apiFetch(`/company/${ticker.toUpperCase()}/earnings-reaction?window_days=${windowDays}`);
}

export async function getCompanyFilings(
    ticker: string,
    forms: string = '10-Q,10-K,8-K',
    limit: number = 25
): Promise<{
    form: string;
    filingDate: string;
    reportDate: string | null;
    accessionNumber: string;
    primaryDocument: string | null;
}[]> {
    return apiFetch(`/company/${ticker.toUpperCase()}/filings?forms=${forms}&limit=${limit}`);
}

// ============================================================
// Health Check
// ============================================================

export async function healthCheck(): Promise<{
    ok: boolean;
    version: string;
    tier: string;
    sec_user_agent_set: boolean;
    polygon_enabled: boolean;
}> {
    return apiFetch('/health');
}
