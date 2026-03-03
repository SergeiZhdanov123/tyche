import nodemailer from 'nodemailer';
import { config } from './config';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendEmail(to: string, subject: string, html: string) {
    const from = process.env.SMTP_USER || 'tychefinancials@gmail.com';
    try {
        const result = await transporter.sendMail({
            from: `"Erns" <${from}>`,
            to,
            subject,
            html,
        });
        console.log(`[Email] Sent to ${to}: ${subject} — ${result.messageId}`);
        return result;
    } catch (err) {
        console.error(`[Email] Failed to send to ${to}:`, err);
        throw err;
    }
}

// ─────────────────────────────────────────────────────────
// WELCOME EMAIL — GREEN THEMED
// ─────────────────────────────────────────────────────────
export function welcomeEmailHtml(firstName: string, plan: string): string {
    const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#0a0f0a;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#e0e0e0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0f0a;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0d1a0d 0%,#0a120a 100%);border-radius:16px;overflow:hidden;border:1px solid #1a2e1a;">

<!-- HEADER -->
<tr><td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:40px 40px 30px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Welcome to Erns 🚀</h1>
<p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">Your journey to smarter investing starts now</p>
</td></tr>

<!-- BODY -->
<tr><td style="padding:40px;">
<p style="font-size:16px;line-height:1.7;margin:0 0 20px;color:#e0e0e0;">Hey <strong style="color:#34d399;">${firstName}</strong>,</p>
<p style="font-size:15px;line-height:1.7;margin:0 0 20px;color:#b0c0b0;">
Welcome aboard! You've signed up for the <strong style="color:#10b981;">${planLabel}</strong> plan, and we're excited to have you.
Erns is your all-in-one financial intelligence platform, built for traders who want an edge.
</p>

<h3 style="color:#34d399;margin:30px 0 15px;font-size:16px;">Here's what you can do right now:</h3>

<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:12px 16px;background:#0d1a0d;border-radius:8px;border-left:3px solid #10b981;">
<p style="margin:0;font-size:14px;"><strong style="color:#10b981;">📊 Screener</strong> — <span style="color:#b0c0b0;">Scan stocks with advanced filters and real-time data</span></p>
</td></tr>
<tr><td style="height:8px;"></td></tr>
<tr><td style="padding:12px 16px;background:#0d1a0d;border-radius:8px;border-left:3px solid #10b981;">
<p style="margin:0;font-size:14px;"><strong style="color:#10b981;">📅 Earnings Calendar</strong> — <span style="color:#b0c0b0;">Never miss an earnings date again</span></p>
</td></tr>
<tr><td style="height:8px;"></td></tr>
<tr><td style="padding:12px 16px;background:#0d1a0d;border-radius:8px;border-left:3px solid #10b981;">
<p style="margin:0;font-size:14px;"><strong style="color:#10b981;">🤖 AI Signals</strong> — <span style="color:#b0c0b0;">Get AI-powered trading signals on your watchlist</span></p>
</td></tr>
<tr><td style="height:8px;"></td></tr>
<tr><td style="padding:12px 16px;background:#0d1a0d;border-radius:8px;border-left:3px solid #10b981;">
<p style="margin:0;font-size:14px;"><strong style="color:#10b981;">📈 Analyst Board</strong> — <span style="color:#b0c0b0;">See Wall Street consensus, price targets, and surprise data</span></p>
</td></tr>
<tr><td style="height:8px;"></td></tr>
<tr><td style="padding:12px 16px;background:#0d1a0d;border-radius:8px;border-left:3px solid #10b981;">
<p style="margin:0;font-size:14px;"><strong style="color:#10b981;">📰 News & Filings</strong> — <span style="color:#b0c0b0;">Curated financial news and SEC filing sentiment analysis</span></p>
</td></tr>
</table>

<div style="margin:30px 0;text-align:center;">
<a href="${config.appUrl}/dashboard"
   style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 15px rgba(16,185,129,0.3);">
Open Your Dashboard →
</a>
</div>

<p style="font-size:13px;line-height:1.6;color:#5a7a5a;margin-top:30px;border-top:1px solid #1a2e1a;padding-top:20px;">
<strong style="color:#6b8a6b;">Pro Tip:</strong> Start by adding tickers to your watchlist — it powers AI signals, earnings alerts, and more.
</p>
</td></tr>

<!-- FOOTER -->
<tr><td style="padding:20px 40px 30px;text-align:center;border-top:1px solid #1a2e1a;">
<p style="margin:0;color:#4a6a4a;font-size:12px;">© ${new Date().getFullYear()} Erns — Built for serious investors</p>
<p style="margin:5px 0 0;color:#3a5a3a;font-size:11px;">Questions? Reply to this email or reach out at tychefinancials@gmail.com</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}


// ─────────────────────────────────────────────────────────
// DAILY PROMO EMAILS (4 versions, rotated by day) — GREEN THEMED
// ─────────────────────────────────────────────────────────
const appUrl = config.appUrl;

export function promoEmailHtml(version: number, firstName: string): { subject: string; html: string } {
    const year = new Date().getFullYear();
    const footer = `
    <tr><td style="padding:20px 40px 30px;text-align:center;border-top:1px solid #1a2e1a;">
    <p style="margin:0;color:#4a6a4a;font-size:12px;">© ${year} Erns — Built for serious investors</p>
    <p style="margin:5px 0 0;color:#3a5a3a;font-size:11px;">You're receiving this because you're on the Starter plan. Upgrade anytime at ${appUrl}/settings</p>
    </td></tr>`;

    const wrapper = (inner: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#0a0f0a;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#e0e0e0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0f0a;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0d1a0d 0%,#0a120a 100%);border-radius:16px;overflow:hidden;border:1px solid #1a2e1a;">
${inner}
${footer}
</table>
</td></tr>
</table>
</body>
</html>`;

    const cta = `<div style="margin:30px 0;text-align:center;">
<a href="${appUrl}/settings" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 15px rgba(16,185,129,0.3);">
Upgrade to Pro →
</a>
</div>`;

    switch (version % 4) {
        case 0:
            return {
                subject: "🤖 Unlock AI Trading Signals — Erns Pro",
                html: wrapper(`
<tr><td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:35px 40px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">AI Signals That Actually Work</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Pro members get real-time AI-powered trading signals</p>
</td></tr>
<tr><td style="padding:35px 40px;">
<p style="font-size:15px;line-height:1.7;color:#b0c0b0;">Hey ${firstName},</p>
<p style="font-size:15px;line-height:1.7;color:#b0c0b0;">
Imagine getting <strong style="color:#34d399;">personalized AI trading signals</strong> for every stock in your watchlist — every day. That's exactly what Erns Pro delivers.
</p>
<p style="font-size:15px;line-height:1.7;color:#b0c0b0;">Our AI analyzes momentum, volume, earnings data, analyst sentiment, and key technical levels to generate
<strong style="color:#10b981;">actionable buy/sell signals</strong> with entry prices, stop losses, and profit targets.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
<tr><td style="padding:12px 16px;background:#0d1a0d;border-radius:8px;border-left:3px solid #10b981;">
<p style="margin:0;font-size:13px;color:#b0c0b0;"><strong style="color:#34d399;">✓</strong> Deep analysis modal — click any signal for a 200-word AI breakdown</p>
</td></tr>
<tr><td style="height:6px;"></td></tr>
<tr><td style="padding:12px 16px;background:#0d1a0d;border-radius:8px;border-left:3px solid #10b981;">
<p style="margin:0;font-size:13px;color:#b0c0b0;"><strong style="color:#34d399;">✓</strong> Key levels, catalysts, and risk factors for every signal</p>
</td></tr>
<tr><td style="height:6px;"></td></tr>
<tr><td style="padding:12px 16px;background:#0d1a0d;border-radius:8px;border-left:3px solid #10b981;">
<p style="margin:0;font-size:13px;color:#b0c0b0;"><strong style="color:#34d399;">✓</strong> Unlimited signal refreshes — re-analyze whenever you want</p>
</td></tr>
</table>
${cta}
</td></tr>`)
            };

        case 1:
            return {
                subject: "📊 Pro Screener + Analyst Intelligence — See What You're Missing",
                html: wrapper(`
<tr><td style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:35px 40px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Wall Street Data at Your Fingertips</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Pro members unlock analyst boards, movers, and surprise data</p>
</td></tr>
<tr><td style="padding:35px 40px;">
<p style="font-size:15px;line-height:1.7;color:#b0c0b0;">Hey ${firstName},</p>
<p style="font-size:15px;line-height:1.7;color:#b0c0b0;">
Professional traders don't guess — they use data. With <strong style="color:#10b981;">Erns Pro</strong>, you get access to the same intelligence that Wall Street uses:
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
<tr><td style="padding:15px;background:#0d1a0d;border-radius:10px;border-left:3px solid #10b981;">
<h4 style="margin:0 0 8px;color:#34d399;font-size:14px;">🏆 Analyst Leaderboard</h4>
<p style="margin:0;font-size:13px;color:#7a9a7a;">See buy/hold/sell counts, price targets, and consensus for any stock. Know what analysts are thinking before earnings.</p>
</td></tr>
<tr><td style="height:8px;"></td></tr>
<tr><td style="padding:15px;background:#0d1a0d;border-radius:10px;border-left:3px solid #10b981;">
<h4 style="margin:0 0 8px;color:#34d399;font-size:14px;">📈 Earnings Surprises & Movers</h4>
<p style="margin:0;font-size:13px;color:#7a9a7a;">Track which stocks beat or missed estimates, and see the biggest post-earnings price moves — in real time.</p>
</td></tr>
<tr><td style="height:8px;"></td></tr>
<tr><td style="padding:15px;background:#0d1a0d;border-radius:10px;border-left:3px solid #10b981;">
<h4 style="margin:0 0 8px;color:#34d399;font-size:14px;">📋 SEC Filing Sentiment</h4>
<p style="margin:0;font-size:13px;color:#7a9a7a;">Our AI reads the actual SEC filings and scores their tone — bullish or bearish — so you don't have to read 100-page documents.</p>
</td></tr>
</table>
${cta}
</td></tr>`)
            };

        case 2:
            return {
                subject: "⚡ Your Portfolio Deserves Better Tools — Upgrade Today",
                html: wrapper(`
<tr><td style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:35px 40px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Trade With Confidence</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Everything a serious investor needs — in one platform</p>
</td></tr>
<tr><td style="padding:35px 40px;">
<p style="font-size:15px;line-height:1.7;color:#b0c0b0;">Hey ${firstName},</p>
<p style="font-size:15px;line-height:1.7;color:#b0c0b0;">
You've been using Erns on the Starter plan, and we hope you're enjoying it.
But here's the thing — <strong style="color:#22c55e;">you're only seeing 30% of what Erns can do.</strong>
</p>
<p style="font-size:15px;line-height:1.7;color:#b0c0b0;">Pro members get:</p>
<table width="100%" cellpadding="0" cellspacing="8">
<tr>
<td width="50%" style="padding:15px;background:#0d1a0d;border-radius:10px;vertical-align:top;border:1px solid #1a2e1a;">
<p style="margin:0 0 5px;font-size:20px;">🤖</p>
<p style="margin:0;font-size:13px;font-weight:600;color:#34d399;">AI Trading Signals</p>
<p style="margin:5px 0 0;font-size:12px;color:#7a9a7a;">Personalized signals with entry/exit levels</p>
</td>
<td width="50%" style="padding:15px;background:#0d1a0d;border-radius:10px;vertical-align:top;border:1px solid #1a2e1a;">
<p style="margin:0 0 5px;font-size:20px;">📊</p>
<p style="margin:0;font-size:13px;font-weight:600;color:#34d399;">Advanced Screeners</p>
<p style="margin:5px 0 0;font-size:12px;color:#7a9a7a;">Filter by EPS, revenue, market cap & more</p>
</td>
</tr>
<tr>
<td width="50%" style="padding:15px;background:#0d1a0d;border-radius:10px;vertical-align:top;border:1px solid #1a2e1a;">
<p style="margin:0 0 5px;font-size:20px;">📈</p>
<p style="margin:0;font-size:13px;font-weight:600;color:#34d399;">Guidance Tracker</p>
<p style="margin:5px 0 0;font-size:12px;color:#7a9a7a;">See which companies raised or lowered guidance</p>
</td>
<td width="50%" style="padding:15px;background:#0d1a0d;border-radius:10px;vertical-align:top;border:1px solid #1a2e1a;">
<p style="margin:0 0 5px;font-size:20px;">🔌</p>
<p style="margin:0;font-size:13px;font-weight:600;color:#34d399;">API Access</p>
<p style="margin:5px 0 0;font-size:12px;color:#7a9a7a;">Build your own tools with our data API</p>
</td>
</tr>
</table>
${cta}
</td></tr>`)
            };

        case 3:
        default:
            return {
                subject: "🔥 Did You Know? 78% of Erns Pro Users Say It Improved Their Trading",
                html: wrapper(`
<tr><td style="background:linear-gradient(135deg,#047857 0%,#065f46 100%);padding:35px 40px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Don't Leave Money on the Table</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">See what top traders use inside Erns Pro</p>
</td></tr>
<tr><td style="padding:35px 40px;">
<p style="font-size:15px;line-height:1.7;color:#b0c0b0;">Hey ${firstName},</p>
<p style="font-size:15px;line-height:1.7;color:#b0c0b0;">
Quick question: <strong style="color:#10b981;">How confident are you in your next trade?</strong>
</p>
<p style="font-size:15px;line-height:1.7;color:#b0c0b0;">
Pro members have an unfair advantage. They see earnings surprises before the crowd reacts, they get AI signals with specific price levels, and they can read the sentiment of SEC filings in seconds — not hours.
</p>
<div style="margin:25px 0;padding:20px;background:#0d1a0d;border-radius:12px;border-left:4px solid #10b981;">
<p style="margin:0 0 10px;font-size:14px;color:#7a9a7a;font-style:italic;">"I caught a 12% move on NVDA earnings because Erns's sentiment analysis flagged the filing as extremely bullish before the market opened."</p>
<p style="margin:0;font-size:12px;color:#4a6a4a;">— Erns Pro member</p>
</div>
<p style="font-size:15px;line-height:1.7;color:#b0c0b0;">
Here's what you're missing on the free plan:
</p>
<ul style="font-size:14px;color:#b0c0b0;line-height:2;">
<li><strong style="color:#34d399;">AI Trading Signals</strong> — personalized to your watchlist</li>
<li><strong style="color:#34d399;">Earnings Sentiment Analysis</strong> — AI reads SEC filings for you</li>
<li><strong style="color:#34d399;">Post-Earnings Movers</strong> — see the biggest winners and losers</li>
<li><strong style="color:#34d399;">Guidance Tracker</strong> — know which companies raised estimates</li>
<li><strong style="color:#34d399;">Full API Access</strong> — build custom trading tools</li>
</ul>
${cta}
</td></tr>`)
            };
    }
}
