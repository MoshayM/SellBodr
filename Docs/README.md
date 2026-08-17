# SellBodr

> **Find Products in India. Sell Globally.**

SellBodr is an **AI-powered Cross-Border eCommerce Intelligence Platform**. It discovers products that can be **sourced cheaply in India** and **sold profitably on international marketplaces** — Amazon (US/UK/DE/CA/AU), Etsy, eBay, Walmart, and TikTok Shop.

It is **not** a B2B export tool. It is scoped entirely to **cross-border eCommerce (D2C / marketplace) opportunities** — from product discovery to a launch-ready listing.

---

## What It Does

For any product × marketplace × country, SellBodr runs a live AI scan and produces a single **Opportunity Score (0–100)** with a **Launch / Hold / Reject** recommendation, backed by seven scored dimensions:

| Dimension | What it measures |
|---|---|
| Demand | Search volume, sales velocity, trend direction |
| Competition | Number of sellers, review moat, brand dominance |
| Margin | Net profit after landed cost + marketplace fees |
| Saturation | Category crowding and new-seller viability |
| Trend | Momentum (rising / seasonal / evergreen) |
| Shipping | Feasibility and cost from India to destination |
| Marketplace Fit | Category rules, returns policy, Indian-seller eligibility |

### Shipped Features

- **Scout page** — keyword or category search triggers a live AI scan with real-time progress indicator; results ranked by Opportunity Score.
- **Opportunity cards** — per-result score breakdown across all 7 dimensions, filter bar (marketplace, score range, category, sort).
- **Supplier sourcing** — matched Indian suppliers per product with cost, MOQ, lead time, and export readiness, displayed on an interactive satellite map (Leaflet).
- **Profitability waterfall** — full landed-cost model: product cost + packaging + freight + duties + marketplace fees + ads = net profit, ROI, and break-even units.
- **AI listing generator** — SEO-optimised title, bullet points, description, backend keywords, and positioning for the selected marketplace.
- **Ads campaign structure** — suggested Sponsored Products campaign skeleton (match types, bids, structure).
- **9 marketplaces** — Amazon US, Amazon UK, Amazon DE, Amazon CA, Amazon AU, Etsy, eBay, Walmart, TikTok Shop.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, ShadCN UI |
| Backend | NestJS modular monolith |
| Database | Turso (LibSQL / SQLite edge) |
| Auth | JWT + Passkey (WebAuthn / FIDO2) |
| Maps | Leaflet (satellite supplier map) |
| Monorepo | Turborepo + pnpm workspaces |
| Deployment | Vercel (web + API) |
| E2E Tests | Playwright (`apps/e2e`) |

---

## Repository Layout

```
sellbodr/
├── apps/
│   ├── web/        # Next.js 14 — all user-facing UI
│   ├── api/        # NestJS — REST API
│   └── e2e/        # Playwright end-to-end tests
├── packages/
│   ├── core/       # Shared domain types and scoring formulas
│   ├── agents/     # AI agent definitions and orchestration
│   ├── connectors/ # Marketplace and supplier integrations
│   └── config/     # Shared ESLint, tsconfig, Tailwind presets
├── docs/           # All spec and reference docs (you are here)
└── turbo.json      # Turborepo task graph
```

Domain types and **scoring formulas live once** in `packages/core` and are imported everywhere. No marketplace SDK is imported directly in `apps/`.

---

## Application URLs

| Route | Page |
|---|---|
| `/` | Landing page |
| `/opportunities` | Scout — product discovery and AI scan |
| `/guide` | User guide |
| `/admin` | Admin dashboard |
| `/login` | Sign in (password or passkey) |
| `/register` | Create account |

---

## Plans

| Plan | Price | Limits |
|---|---|---|
| Free | $0 | 5 searches total, 10 results per search, 10 suppliers per product |
| Pro | $49 / mo | Unlimited searches, results, and suppliers |

---

## Quick Start

```bash
corepack enable
pnpm install
cp .env.example .env    # add Turso DB URL + auth token, AI model keys
pnpm dev                # web :3000, api :4000
```

The web app is also deployed to Vercel — no local setup required for UI work.

---

## Documentation

| Doc | Content |
|---|---|
| [`vision.md`](vision.md) | Mission, personas, value proposition, success metrics |
| [`roadmap.md`](roadmap.md) | Phased delivery plan |
| [`techstack.md`](techstack.md) | Technologies and rationale |
| [`architecture.md`](architecture.md) | System diagrams, services, data flow |
| [`database.md`](database.md) | Database schema |
| [`agents.md`](agents.md) | AI agents — purpose, inputs, outputs, logic |
| [`api.md`](api.md) | REST API specification |
| [`features.md`](features.md) | Full functional specification |
| [`uiux.md`](uiux.md) | Screens, dashboards, component structure |
| [`security.md`](security.md) | Auth, RBAC, audit, encryption |
| [`deployment.md`](deployment.md) | Vercel topology and CI/CD |
| [`testing.md`](testing.md) | Test strategy and coverage gates |
| [`monetization.md`](monetization.md) | Pricing tiers and billing |
| [`scaling.md`](scaling.md) | Scale-up strategy |
| [`ai-system.md`](ai-system.md) | Model routing, prompting, RAG, evals |
| [`integrations.md`](integrations.md) | External API connector contracts |
| [`marketplace-intelligence.md`](marketplace-intelligence.md) | Opportunity scoring formulas and research workflows |

---

## Core Principles

1. **Decisions over data** — every screen ends in an action.
2. **Show the math** — scores and profit figures are always explainable.
3. **Trust through verification** — AI-asserted numbers are grounded in connector data; unverifiable data is flagged and excluded from scoring.
4. **India-first sourcing, world-first selling.**

---

*Built to be developed with Claude Code. Start at [`../CLAUDE.md`](../CLAUDE.md).*
