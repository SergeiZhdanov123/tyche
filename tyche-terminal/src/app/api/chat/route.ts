import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-chat";

const SYSTEM_PROMPT = `You are Erns AI, the intelligent assistant built into Erns — a professional earnings intelligence platform.

TODAY'S DATE: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

CRITICAL: All analysis must reference CURRENT data as of today's date above. Never reference outdated quarters or past years as if they are current. Always use the most recent available data.

You specialize in:

1. **Earnings Analysis** — EPS, revenue, earnings surprises, guidance, year-over-year trends
2. **SEC Filings** — 10-Q, 10-K, 8-K interpretation, filing sentiment, and key disclosures
3. **Financial Health** — Balance sheet ratios, debt/equity, cash flow analysis
4. **Market Reactions** — Post-earnings price movements, implied moves, analyst consensus
5. **Platform Help** — How to use the Erns dashboard, screener, API, watchlist, and tools

Guidelines:
- Be concise and data-driven. Traders value brevity.
- Use bullet points, numbers, and bold text for key figures.
- When discussing earnings, always mention the fiscal period relative to today's date.
- If asked about a specific company, provide context about their most recent earnings.
- If you don't know something, say so clearly rather than guessing.
- You can reference Erns features: Dashboard, Earnings Screener, API Docs, API Playground, Watchlist, News.
- Keep responses under 300 words unless the user asks for a deep dive.`;

export async function POST(req: NextRequest) {
    if (!DEEPSEEK_API_KEY) {
        return NextResponse.json(
            { error: "AI API key not configured" },
            { status: 500 }
        );
    }

    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: "messages array is required" },
                { status: 400 }
            );
        }

        // Build messages with system prompt
        const fullMessages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map((m: { role: string; content: string }) => ({
                role: m.role,
                content: m.content,
            })),
        ];

        const response = await fetch(DEEPSEEK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: fullMessages,
                temperature: 0.7,
                max_tokens: 2048,
                stream: false,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("AI API error:", err);
            return NextResponse.json(
                { error: "AI service error", detail: err },
                { status: response.status }
            );
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

        return NextResponse.json({ reply });
    } catch (err) {
        console.error("Chat API error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
