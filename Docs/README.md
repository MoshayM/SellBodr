# BorderScout AI

> **Find Products in India. Sell Globally.**

BorderScout AI is an **AI-powered Cross-Border eCommerce Intelligence Platform**. It discovers products that can be **sourced cheaply in India** and **sold profitably on international marketplaces** — Amazon (US/UK/DE/CA/AU), Etsy, eBay, Walmart, Shopify, TikTok Shop, and more.

It is **not** a B2B export tool. It is focused entirely on **cross-border eCommerce opportunities**, from discovery to a launch-ready listing.

---

## What it does

For any product × marketplace × country, BorderScout AI produces a single **Opportunity Score (0–100)** and a **Launch / Hold / Reject** recommendation with a confidence %, backed by:

- **Discovery** — best sellers, trending, rising, seasonal, evergreen products
- **Sourcing** — matched Indian suppliers (cost, MOQ, lead time, export readiness)
- **Profitability** — full landed-cost + fee model → net profit, ROI, break-even, projections
- **Launch assets** — SEO title, bullets, description, keywords, pricing, positioning

A ten-agent AI pipeline runs the whole flow:

```
Discovery → Sourcing → Marketplace Analysis → Profitability → Recommendation → Launch Assets
```

---

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind, ShadCN UI
- **Backend:** NestJS, PostgreSQL (+pgvector), Redis, Elasticsearch, BullMQ
- **AI:** Claude API + OpenAI API behind an internal Model Gateway
- **Auth:** JWT, OAuth, Google Login, TOTP MFA
- **Cloud:** AWS (ECS/EKS, RDS, ElastiCache, OpenSearch, S3, KMS), Terraform
- **Observability:** Prometheus, Grafana, OpenTelemetry, Sentry
- **Billing:** Stripe

---

## Monorepo Layout

```
apps/web · apps/api · packages/{core,agents,connectors,config} · infra · docs
```

Turborepo + pnpm. Domain types and **scoring formulas live once** in `packages/core`.

---

## Quick Start

```bash
corepack enable
pnpm install
cp .env.example .env        # add DB/Redis/ES + model keys
pnpm infra:up               # postgres, redis, elasticsearch, s3-local
pnpm db:migrate && pnpm db:seed
pnpm dev                    # web :3000, api :4000/v1
```

Set `MODEL_PROVIDER=mock` to develop UI without model spend. Full guide: [`docs/build.md`](docs/build.md).

---

## Documentation

| Doc | |
|-----|---|
| [`claude.md`](docs/claude.md) | Master context for Claude Code (read first) |
| [`vision.md`](docs/vision.md) | Mission, personas, metrics |
| [`roadmap.md`](docs/roadmap.md) | Phased delivery plan |
| [`techstack.md`](docs/techstack.md) | Technologies + rationale |
| [`architecture.md`](docs/architecture.md) | System + pipeline diagrams |
| [`database.md`](docs/database.md) | PostgreSQL schema + ERD |
| [`agents.md`](docs/agents.md) | The 10 AI agents |
| [`api.md`](docs/api.md) | REST + WebSocket API |
| [`features.md`](docs/features.md) | Full functional spec |
| [`uiux.md`](docs/uiux.md) | Dashboards + components |
| [`security.md`](docs/security.md) | RBAC, MFA, audit, encryption |
| [`deployment.md`](docs/deployment.md) | AWS topology + CI/CD |
| [`testing.md`](docs/testing.md) | Test strategy + gates |
| [`build.md`](docs/build.md) | Local dev + build |
| [`monetization.md`](docs/monetization.md) | Pricing + billing |
| [`scaling.md`](docs/scaling.md) | Scaling strategy |
| [`ai-system.md`](docs/ai-system.md) | Model gateway, RAG, evals |
| [`integrations.md`](docs/integrations.md) | External connectors |
| [`marketplace-intelligence.md`](docs/marketplace-intelligence.md) | **Scoring formulas + workflows** |

---

## Plans

**Starter** (limited) · **Pro Seller** (unlimited, advanced analytics) · **Agency** (multi-user, portfolios) · **Enterprise** (white-label, API access). See [`docs/monetization.md`](docs/monetization.md).

---

## Core Principles

1. **Decisions over data** — every screen ends in an action.
2. **Show the math** — scores and profit are always explainable.
3. **Trust through verification** — AI claims are grounded in connector data.
4. **India-first sourcing, world-first selling.**

---

*Built to be developed with Claude Code. Start at [`docs/claude.md`](docs/claude.md).*
