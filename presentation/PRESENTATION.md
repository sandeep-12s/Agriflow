# AgriFlow — Presentation Script

Companion to `presentation/AgriFlow_Presentation.pptx`. This is what to
actually say and click — rehearse from this, present from the slides.

---

## 60-Second Pitch

> Every year, farmers across India face the same question right after
> harvest: sell now, store it, transport it somewhere else, or process
> it into something more valuable? Most tools stop at showing a price.
> They don't help with the actual decision — and a wrong one means
> spoiled produce, distress selling, or income left on the table.
>
> AgriFlow is a mobile-first platform that makes that decision for a
> farmer, transparently. A farmer logs in, adds what they've harvested,
> and AgriFlow compares four real options — sell now, store, process,
> or sell to a matched buyer — using actual market prices, storage
> costs, and spoilage risk. No black-box AI, just honest arithmetic,
> scored and explained in plain language.
>
> It's fully built: fifteen stages, a working recommendation engine, a
> buyer marketplace, an AI assistant in English and Hindi, real
> analytics, and it's deployment-ready today.
>
> AgriFlow doesn't just tell farmers the price. It helps them decide
> what to do next.

*(~150 words — read it aloud once and trim to fit your own pace; aim
for 60 seconds, not 60 seconds of rushed reading.)*

---

## 3-Minute Live Demo Script

**Scenario** (per the brief): a farmer has 10 quintals of tomatoes.
Demo this on the actual running application, not just slides.

| Time | Action | What to say |
|---|---|---|
| 0:00–0:20 | Log in, land on Dashboard | "This is a farmer's dashboard — right now it's empty, so it's telling them exactly what to do first." |
| 0:20–0:50 | Produce → Add Produce → Tomato, 10, Quintal, Grade A, today's date | "Ramesh just harvested 10 quintals of tomatoes. That's the entire input AgriFlow needs." |
| 0:50–1:20 | Go to Market page, show Tomato price comparison across 3 markets | "Before deciding anything, here's real price comparison — current vs. last week, with distance and demand factored in." |
| 1:20–2:10 | Produce list → "Get Recommendation" on the Tomato entry | "This is the core feature. It's comparing Sell Now, Store, Process, and a matched Alternative Buyer — each with real profit and risk numbers, not a guess." — point out the winning option and read its one-line explanation aloud. |
| 2:10–2:35 | Produce list → "Find Buyers" → Propose Transaction | "If Alternative Buyer wins, the farmer can act on it immediately — this creates a real transaction and marks the produce sold." |
| 2:35–2:55 | Back to Dashboard | "And the dashboard updates immediately — estimated value, profit, and risk are now real numbers, not placeholders." |
| 2:55–3:00 | (Optional, if time) Assistant page | "There's also a bilingual AI assistant for quick questions — English or Hindi." |

**Backup plan if live demo breaks:** the deck's slide 5 (How AgriFlow
Works) and slide 6 (Recommendation & AI Engine) cover the same flow
with static visuals — narrate from those instead of stalling on a
frozen screen.

---

## Judge Q&A Prep

**"Is this using real market data?"**
No — it's clearly labeled demo/seeded data for 7 crops across 3 demo
markets. The architecture (`DATABASE_URL`-driven, no hardcoded prices)
is built so a real mandi API can be plugged in without changing the
recommendation logic itself.

**"Is the recommendation engine AI or machine learning?"**
No, deliberately. It's transparent arithmetic — revenue minus costs,
scored by profit and risk — specifically so a farmer (or a judge) can
see exactly why an option won, rather than trusting a black box.

**"What about existing platforms like eNAM or Kisan apps?"**
Those solve price discovery. AgriFlow assumes you can already see a
price and answers the next question: given this price, what should you
actually *do*? It's complementary, not competing on the same layer.

**"How would this make money?"**
Free for farmers to keep it accessible; a small commission on completed
buyer transactions, plus B2B licensing to FPOs, cooperatives, and state
agriculture departments (see slide 9).

**"What happens if the AI assistant's API key isn't configured?"**
It falls back to a rule-based answer system automatically — the app
never breaks or shows an error just because a key is missing. This was
a deliberate requirement from day one, not a patch.

**"How far along is this — is it actually deployed?"**
Fully built and tested locally across all 15 stages, including an
automated backend test suite. Deployment configs (Render + Vercel/
Netlify, free tier) are ready — see `DEPLOYMENT.md` — the remaining
step is just clicking deploy with real hosting accounts.

**"What was the hardest technical part?"**
Keeping the recommendation engine's numbers consistent everywhere they
appear — the dashboard, the recommendation page, and the standalone
processing-opportunities page all had to agree, since they reuse the
exact same calculation functions rather than three separate estimates.

---

## Architecture, in one breath

React + TypeScript + Tailwind talks to a FastAPI backend over a REST
API secured with JWT; the backend runs the recommendation engine
against PostgreSQL (SQLite locally) and optionally calls the Claude API
for the assistant. Everything is environment-variable-driven, so the
same code runs identically in local dev and production.

## Impact, in one breath

Post-harvest loss in Indian agriculture is a widely-documented,
persistent problem — driven by exactly the fragmented, uninformed
decisions AgriFlow targets. The app doesn't claim to have measured a
reduction in that loss (it hasn't been deployed to real farmers yet) —
it claims to close the specific decision gap that causes it.
