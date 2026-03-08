"use client";

import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { config } from "@/lib/config";
import { useSubscription } from "@/hooks/useSubscription";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────
interface ParamDef {
    name: string;
    type: "path" | "query";
    required?: boolean;
    description: string;
    placeholder?: string;
    default?: string;
}

interface EndpointDef {
    method: string;
    path: string;
    description: string;
    params: ParamDef[];
}

interface CategoryDef {
    category: string;
    icon: string;
    endpoints: EndpointDef[];
}

// ─── Full Endpoint Catalog ──────────────────────────────────
const ENDPOINTS: CategoryDef[] = [
    {
        category: "Earnings Intelligence",
        icon: "📊",
        endpoints: [
            {
                method: "GET",
                path: "/company/{ticker}/earnings-summary",
                description: "Revenue, net income, EPS for a fiscal period",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "AAPL" },
                    { name: "fy", type: "query", description: "Fiscal year", placeholder: "2024" },
                    { name: "fp", type: "query", description: "Period: Q1,Q2,Q3,Q4,FY", placeholder: "Q4" },
                    { name: "form", type: "query", description: "10-Q or 10-K" },
                    { name: "accn", type: "query", description: "Accession number" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-events",
                description: "Historical & upcoming earnings event dates",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "TSLA" },
                    { name: "source", type: "query", description: "auto|polygon|yahoo|sec_proxy", default: "auto" },
                    { name: "limit", type: "query", description: "Max events (1–200)", default: "20" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-reaction",
                description: "Post-earnings stock price reaction & volume",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "NVDA" },
                    { name: "event_date", type: "query", description: "YYYY-MM-DD", placeholder: "2025-01-30" },
                    { name: "window_days", type: "query", description: "Trading days (1–60)", default: "5" },
                    { name: "source", type: "query", description: "auto|polygon|yahoo|sec_proxy", default: "auto" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-details",
                description: "All-in-one: event + fundamentals + ratios + reaction + analysts",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "MSFT" },
                    { name: "event_date", type: "query", description: "YYYY-MM-DD" },
                    { name: "window_days", type: "query", description: "Reaction window (1–60)", default: "5" },
                    { name: "source", type: "query", description: "auto|polygon|yahoo|sec_proxy", default: "auto" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-analysts",
                description: "Analyst ratings, price targets, EPS/revenue forecasts",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "GOOGL" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-live",
                description: "Live earnings polling — scrapes IR pages for actuals",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "AAPL" },
                    { name: "event_date", type: "query", required: true, description: "YYYY-MM-DD", placeholder: "2025-01-30" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-news",
                description: "Pre/day-of/post earnings news buckets",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "AMZN" },
                    { name: "window_days", type: "query", description: "Days before/after (1–7)", default: "3" },
                    { name: "source", type: "query", description: "auto|polygon|yahoo|sec_proxy", default: "auto" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/earnings-ai-review",
                description: "AI-generated earnings analysis",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "META" },
                ],
            },
        ],
    },
    {
        category: "Company & SEC",
        icon: "🏛️",
        endpoints: [
            {
                method: "GET",
                path: "/company/{ticker}/overview",
                description: "Company info: name, CIK, SIC, exchanges",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "AAPL" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/filings",
                description: "SEC filing history (10-Q, 10-K, 8-K)",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "AAPL" },
                    { name: "forms", type: "query", description: "Comma-separated forms", default: "10-Q,10-K,8-K" },
                    { name: "limit", type: "query", description: "Max filings (1–200)", default: "25" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/periods",
                description: "Available fiscal periods for a metric",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "AAPL" },
                    { name: "metric", type: "query", description: "revenue|net_income|eps", default: "revenue" },
                    { name: "limit", type: "query", description: "Max periods (1–500)", default: "120" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/financial-health",
                description: "Balance sheet: assets, liabilities, ratios",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "AAPL" },
                    { name: "fy", type: "query", description: "Fiscal year" },
                    { name: "fp", type: "query", description: "Period: Q1–Q4 or FY" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/filing-text",
                description: "Extract text and sections from SEC filing",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "AAPL" },
                    { name: "accn", type: "query", required: true, description: "Accession number", placeholder: "0000320193-25-000079" },
                    { name: "primary_doc", type: "query", description: "Primary doc filename" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/filing-sentiment",
                description: "Sentiment analysis of a filing",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "AAPL" },
                    { name: "accn", type: "query", required: true, description: "Accession number", placeholder: "0000320193-25-000079" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/expected-move",
                description: "Options-implied expected move from IV",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "TSLA" },
                    { name: "horizon_days", type: "query", description: "Days (1–30)", default: "1" },
                ],
            },
            {
                method: "GET",
                path: "/company/{ticker}/news",
                description: "Recent company news articles",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "AAPL" },
                    { name: "days_back", type: "query", description: "Days back (1–30)", default: "7" },
                    { name: "limit", type: "query", description: "Max articles (1–100)", default: "20" },
                ],
            },
        ],
    },
    {
        category: "Earnings Calendar",
        icon: "📅",
        endpoints: [
            {
                method: "GET",
                path: "/calendar/today",
                description: "Today's earnings calendar",
                params: [],
            },
            {
                method: "GET",
                path: "/calendar/week",
                description: "This week's earnings (Mon–Fri)",
                params: [],
            },
            {
                method: "GET",
                path: "/calendar/upcoming",
                description: "Upcoming earnings for next N days",
                params: [
                    { name: "days", type: "query", description: "Days ahead (1–30)", default: "7" },
                ],
            },
            {
                method: "GET",
                path: "/calendar/date/{date_str}",
                description: "Earnings for a specific date",
                params: [
                    { name: "date_str", type: "path", required: true, description: "YYYY-MM-DD", placeholder: "2025-02-12" },
                ],
            },
        ],
    },
    {
        category: "Market Data",
        icon: "📈",
        endpoints: [
            {
                method: "GET",
                path: "/market/quote/{ticker}",
                description: "Real-time quote via Polygon",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "AAPL" },
                ],
            },
            {
                method: "GET",
                path: "/market/quotes",
                description: "Batch quotes for multiple tickers",
                params: [
                    { name: "tickers", type: "query", required: true, description: "Comma-separated tickers", placeholder: "AAPL,MSFT,TSLA" },
                ],
            },
            {
                method: "GET",
                path: "/market/indices",
                description: "Major indices: S&P 500, NASDAQ, DOW, VIX",
                params: [],
            },
            {
                method: "GET",
                path: "/market/bars/{ticker}",
                description: "Historical OHLCV bars",
                params: [
                    { name: "ticker", type: "path", required: true, description: "Stock ticker", placeholder: "AAPL" },
                    { name: "range", type: "query", description: "1D,5D,1M,3M,6M,1Y,5Y", default: "1M" },
                    { name: "timespan", type: "query", description: "minute,hour,day,week,month", default: "day" },
                ],
            },
            {
                method: "GET",
                path: "/market/search",
                description: "Search tickers by name or symbol",
                params: [
                    { name: "query", type: "query", required: true, description: "Search query", placeholder: "apple" },
                    { name: "limit", type: "query", description: "Max results (1–50)", default: "10" },
                ],
            },
        ],
    },
];

const API_BASE = config.apiUrl;

export default function ApiPlaygroundPage() {
    const [selectedCategory, setSelectedCategory] = useState(0);
    const [selectedEndpoint, setSelectedEndpoint] = useState(0);
    const [paramValues, setParamValues] = useState<Record<string, string>>({});
    const [response, setResponse] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState<number | null>(null);
    const [codeTab, setCodeTab] = useState<"curl" | "python" | "javascript">("curl");
    const [starterRequestCount, setStarterRequestCount] = useState(0);

    const category = ENDPOINTS[selectedCategory];
    const endpoint = category.endpoints[selectedEndpoint];

    const selectEndpoint = (catIdx: number, epIdx: number) => {
        setSelectedCategory(catIdx);
        setSelectedEndpoint(epIdx);
        setParamValues({});
        setResponse(null);
        setStatus(null);
        setElapsed(null);
    };

    const buildUrl = useCallback(() => {
        let path = endpoint.path;
        const queryParams: string[] = [];

        endpoint.params.forEach((p) => {
            const val = paramValues[p.name] || p.default || "";
            if (!val) return;
            if (p.type === "path") {
                path = path.replace(`{${p.name}}`, encodeURIComponent(val));
            } else {
                queryParams.push(`${p.name}=${encodeURIComponent(val)}`);
            }
        });

        const qs = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
        return `${API_BASE}${path}${qs}`;
    }, [endpoint, paramValues]);

    const executeRequest = async () => {
        // Enforce Starter limit
        if (isStarter && starterRequestCount >= 5) return;
        setLoading(true);
        setResponse(null);
        setStatus(null);
        const t0 = performance.now();

        try {
            const res = await fetch(buildUrl());
            const t1 = performance.now();
            setElapsed(Math.round(t1 - t0));
            setStatus(res.status);

            const json = await res.json();
            setResponse(JSON.stringify(json, null, 2));
            // Track Starter usage
            if (isStarter) {
                setStarterRequestCount(c => c + 1);
            }
        } catch (err) {
            setElapsed(Math.round(performance.now() - t0));
            setStatus(0);
            setResponse(JSON.stringify({ error: String(err) }, null, 2));
        } finally {
            setLoading(false);
        }
    };

    const generateCode = () => {
        const url = buildUrl();
        switch (codeTab) {
            case "curl":
                return `curl "${url}"`;
            case "python":
                return `import requests\n\nresponse = requests.get("${url}")\ndata = response.json()\nprint(data)`;
            case "javascript":
                return `const response = await fetch("${url}");\nconst data = await response.json();\nconsole.log(data);`;
        }
    };

    const statusColor = status
        ? status < 300
            ? "text-emerald-400"
            : status < 500
                ? "text-amber-400"
                : "text-red-400"
        : "text-text-muted";

    const methodColor = (m: string) => {
        switch (m) {
            case "GET": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
            case "POST": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
            case "PUT": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
            case "DELETE": return "text-red-400 bg-red-400/10 border-red-400/20";
            default: return "text-text-muted";
        }
    };

    const { isStarter, isPaid, loading: subLoading } = useSubscription();

    return (
        <DashboardLayout title="API Playground">
            <div className="relative flex flex-col h-full">
                {/* ─── Starter Request Limit Banner ─── */}
                {!subLoading && isStarter && (
                    <div className="shrink-0 p-3 bg-gradient-to-r from-amber-500/10 to-cyan-500/10 border border-amber-500/20 rounded-xl mb-4 flex items-center justify-between">
                        <span className="text-amber-400 text-xs font-semibold">Starter Plan — {Math.max(0, 5 - starterRequestCount)}/5 free requests remaining</span>
                        <Link
                            href="/select-plan"
                            className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-primary text-white rounded-lg text-[10px] font-bold hover:opacity-90 transition-opacity"
                        >
                            Upgrade for Unlimited →
                        </Link>
                    </div>
                )}
                <div className="flex flex-1 min-h-0">
                    {/* ─── Endpoint Browser ─── */}
                    <aside className="w-72 border-r border-border bg-surface/50 overflow-y-auto shrink-0 hidden lg:flex flex-col">
                        <div className="p-4 border-b border-border">
                            <h2 className="text-base font-bold text-text-main">API Playground</h2>
                            <p className="text-[10px] text-text-muted mt-1">Select an endpoint to test</p>
                        </div>
                        <nav className="flex-1 overflow-y-auto p-2">
                            {ENDPOINTS.map((cat, catIdx) => (
                                <div key={cat.category} className="mb-3">
                                    <div className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                                        <span>{cat.icon}</span>
                                        {cat.category}
                                    </div>
                                    {cat.endpoints.map((ep, epIdx) => {
                                        const active = catIdx === selectedCategory && epIdx === selectedEndpoint;
                                        return (
                                            <button
                                                key={ep.path}
                                                onClick={() => selectEndpoint(catIdx, epIdx)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-0.5 transition-all flex items-center gap-2 ${active
                                                    ? "bg-primary/10 border border-primary/20 text-text-main"
                                                    : "text-text-muted hover:text-text-main hover:bg-white/5 border border-transparent"
                                                    }`}
                                            >
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${methodColor(ep.method)}`}>
                                                    {ep.method}
                                                </span>
                                                <span className="font-mono truncate text-[11px]">
                                                    {ep.path.replace("/company/{ticker}/", "").replace("/market/", "").replace("/calendar/", "")}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </nav>
                    </aside>

                    {/* ─── Main Panel ─── */}
                    <main className="flex-1 overflow-y-auto flex flex-col">
                        {/* Endpoint Header */}
                        <div className="p-5 lg:p-6 border-b border-border bg-surface/30">
                            {/* Mobile selector */}
                            <div className="lg:hidden mb-4">
                                <select
                                    value={`${selectedCategory}-${selectedEndpoint}`}
                                    onChange={(e) => {
                                        const [c, ep] = e.target.value.split("-").map(Number);
                                        selectEndpoint(c, ep);
                                    }}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-main font-mono"
                                >
                                    {ENDPOINTS.map((cat, ci) =>
                                        cat.endpoints.map((ep, ei) => (
                                            <option key={`${ci}-${ei}`} value={`${ci}-${ei}`}>
                                                {cat.icon} {ep.method} {ep.path}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded border ${methodColor(endpoint.method)}`}>
                                    {endpoint.method}
                                </span>
                                <code className="text-base font-mono text-text-main">{endpoint.path}</code>
                            </div>
                            <p className="text-sm text-text-muted">{endpoint.description}</p>
                        </div>

                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            {/* ─── Parameters Panel ─── */}
                            <div className="lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-5 overflow-y-auto">
                                <h3 className="text-xs font-semibold text-text-main uppercase tracking-wider mb-4">Parameters</h3>

                                {endpoint.params.length === 0 ? (
                                    <p className="text-xs text-text-muted italic">No parameters required</p>
                                ) : (
                                    <div className="space-y-4">
                                        {endpoint.params.map((p) => (
                                            <div key={p.name}>
                                                <label className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-xs font-mono text-text-main">{p.name}</span>
                                                    {p.required && <span className="text-[9px] text-red-400 font-bold">REQUIRED</span>}
                                                    <span className="text-[9px] text-text-muted/50 ml-auto">{p.type}</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={paramValues[p.name] || ""}
                                                    onChange={(e) => setParamValues({ ...paramValues, [p.name]: e.target.value })}
                                                    placeholder={p.placeholder || p.default || p.description}
                                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono text-text-main placeholder-text-muted/40 focus:border-primary/50 outline-none transition-colors"
                                                />
                                                <p className="text-[10px] text-text-muted mt-1">{p.description}{p.default ? ` (default: ${p.default})` : ""}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Execute Button */}
                                <button
                                    onClick={executeRequest}
                                    disabled={loading || (isStarter && starterRequestCount >= 5)}
                                    className="w-full mt-6 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20" />
                                            </svg>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Send Request
                                        </>
                                    )}
                                </button>

                                {/* URL Preview */}
                                <div className="mt-4">
                                    <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Request URL</h4>
                                    <pre className="bg-background rounded-lg px-3 py-2 text-[10px] font-mono text-primary/70 overflow-x-auto whitespace-pre-wrap break-all">
                                        {buildUrl()}
                                    </pre>
                                </div>

                                {/* Code Examples */}
                                <div className="mt-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Code</h4>
                                        <div className="flex gap-1 ml-auto">
                                            {(["curl", "python", "javascript"] as const).map((t) => (
                                                <button
                                                    key={t}
                                                    onClick={() => setCodeTab(t)}
                                                    className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${codeTab === t ? "bg-primary/20 text-primary" : "text-text-muted/50 hover:text-text-muted"}`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <pre className="bg-background rounded-lg p-3 text-[10px] font-mono text-text-main overflow-x-auto">
                                        <code>{generateCode()}</code>
                                    </pre>
                                </div>
                            </div>

                            {/* ─── Response Panel ─── */}
                            <div className="flex-1 p-5 overflow-hidden flex flex-col">
                                <div className="flex items-center gap-3 mb-3">
                                    <h3 className="text-xs font-semibold text-text-main uppercase tracking-wider">Response</h3>
                                    {status !== null && (
                                        <div className="flex items-center gap-3 ml-auto">
                                            <span className={`text-xs font-mono font-bold ${statusColor}`}>
                                                {status === 0 ? "ERR" : status}
                                            </span>
                                            {elapsed !== null && (
                                                <span className="text-[10px] text-text-muted font-mono">{elapsed}ms</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 bg-background rounded-xl border border-border overflow-auto">
                                    {response ? (
                                        <pre className="p-4 text-xs font-mono text-emerald-300/80 whitespace-pre-wrap">
                                            <code>{response}</code>
                                        </pre>
                                    ) : (
                                        <div className="h-full flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-3xl mb-3 opacity-20">⚡</div>
                                                <p className="text-sm text-text-muted/50">Hit &quot;Send Request&quot; to see the response</p>
                                                <p className="text-[10px] text-text-muted/30 mt-1">Results will appear here</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </DashboardLayout>
    );
}
