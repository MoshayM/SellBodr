# claude.md — SellBodr Master Context

> **Purpose**: This is the root context file for Claude Code. Read this first before working on any task in this repository. It defines what SellBodr is, how the codebase is organized, the conventions every contributor (human or AI) must follow, and where to find deeper documentation.

---

## 1. Product One-Liner

**SellBodr** — *"Find Products in India. Sell Globally."*

An AI-powered **Cross-Border eCommerce Intelligence Platform** that discovers products which can be **sourced cheaply in India** and **sold profitably on international eCommerce marketplaces** (Amazon USA/UK/DE/CA/AU, Etsy, eBay, Walmart, Shopify, TikTok Shop, and later Temu/Noon/Lazada/Shopee).

**Explicitly NOT** a traditional B2B export platform. The entire product is scoped to **cross-border eCommerce (D2C / marketplace) opportunities only.**

---

## 2. What Problem We Solve

Sellers cannot easily answer:

1. Which products have **strong demand**?
2. Which products have **low competition**?
3. Which products have **good margins**?
4. Which **marketplace** and **country** is best?
5. Is **sourcing in India feasible** (cost, MOQ, lead time)?
6. What is the **estimated net profit** after fees + shipping + ads + tax?

SellBodr answers all six with an AI agent pipeline that ends in a single **Opportunity Score (0–100)** and a **Launch / Hold / Reject** recommendation with a confidence percentage.

---

## 3. Mental Model of the System

```
Discovery → Sourcing → Marketplace Analysis → Profitability → Recommendation → Launch Assets
```

Each stage is owned by one or more **AI Agents** (see `agents.md`). Agents read/write to a shared PostgreSQL store, enrich via external connectors (Amazon, IndiaMART, etc.), cache hot reads in Redis, and run full-text/aggregation queries through Elasticsearch.

---

## 4. Repository Layout (Target)

```
sellbodr/
├── apps/
│   ├── web/                 # Next.js 14 (App Router) + TS + Tailwind + ShadCN
│   └── api/                 # NestJS modular monolith (REST + WS)
├── packages/
│   ├── core/                # Shared domain types, scoring formulas, DTOs
│   ├── agents/              # AI agent definitions + orchestration
│   ├── connectors/          # Marketplace + supplier integrations
│   └── config/              # eslint, tsconfig, tailwind presets
├── infra/                   # IaC (Terraform), Docker, k8s manifests
├── docs/                    # ← YOU ARE HERE (all *.md spec files)
└── turbo.json               # Monorepo task graph (Turborepo)
```

We use a **Turborepo monorepo** with **pnpm** workspaces.

---

## 5. Canonical Documentation Index

| File | What it covers |
|------|----------------|
| `vision.md` | Mission, personas, value prop, success metrics |
| `roadmap.md` | Phased delivery plan (MVP → Enterprise) |
| `techstack.md` | Every technology + why it was chosen |
| `architecture.md` | System diagrams, services, data flow |
| `database.md` | Full PostgreSQL schema + ER diagrams |
| `agents.md` | All 10 AI agents (purpose/inputs/outputs/logic) |
| `api.md` | REST + WebSocket API specification |
| `features.md` | Functional spec for every feature |
| `uiux.md` | Dashboards, screens, component structure |
| `security.md` | RBAC, MFA, audit, encryption, rate limiting |
| `deployment.md` | AWS topology, CI/CD, environments |
| `testing.md` | Test strategy + coverage gates |
| `build.md` | Local dev + build + monorepo task graph |
| `monetization.md` | Pricing tiers, billing, metering |
| `scaling.md` | Scale-up strategy and bottleneck plan |
| `ai-system.md` | Prompting, model routing, RAG, evals |
| `integrations.md` | External APIs and connector contracts |
| `marketplace-intelligence.md` | Scoring formulas + research workflows |
| `README.md` | Public-facing repo entry point |

---

## 6. Engineering Conventions (Hard Rules)

1. **TypeScript everywhere.** No `any` without an explicit `// eslint-disable-next-line` and a reason.
2. **Domain logic lives in `packages/core`.** UI and API are thin shells over it. Scoring formulas are defined *once* in `core/scoring` and imported everywhere.
3. **Agents never call models directly.** They route through the `ai-system` model gateway (see `ai-system.md`) so we can swap Claude/OpenAI, log, cost-track, and cache.
4. **All external calls go through `packages/connectors`** behind a typed interface. No marketplace SDK is imported in `apps/`.
5. **Money is never a float.** Use integer minor units (cents/paise) + a `Money` value object. Currency always attached.
6. **Every write is auditable.** Mutations emit domain events consumed by the audit log (see `security.md`).
7. **Idempotency** on all job handlers (BullMQ) keyed by a deterministic job ID.
8. **Feature flags** gate every new surface. Default off in prod.

---

## 7. Scoring Is Sacred

The **Opportunity Score** and its six sub-scores (Demand, Competition, Margin, Saturation, Trend, Shipping, Marketplace Fit) are the heart of the product. Their formulas are specified in `marketplace-intelligence.md` and implemented in `packages/core/scoring`. **Never** reimplement them inline. Changes require a version bump (`scoreVersion`) so historical recommendations stay reproducible.

---

## 8. AI Behaviour Rules

- Agents must always return **structured JSON** matching the schemas in `agents.md`, never free prose, unless the output is explicitly a human-facing asset (listing copy, brand names).
- Every AI-generated number that feeds a decision must be accompanied by a **source** and a **confidence**.
- Hallucination guard: any supplier, price, or fee the model asserts must be **verifiable against a connector** before it influences a score. Unverifiable data is flagged `unverified` and excluded from scoring.

---

## 9. How to Work in This Repo (for Claude Code)

1. Identify which `docs/*.md` file owns the area you are changing. Read it fully.
2. Check `packages/core` for existing types/formulas before writing new ones.
3. Add or update tests (`testing.md` defines the gates).
4. Keep PRs scoped to one feature flag.
5. Update the relevant `docs/*.md` in the **same** change if behaviour changes.

---

## 10. Glossary

| Term | Meaning |
|------|---------|
| **Opportunity** | A (product × marketplace × country) candidate being evaluated |
| **Opportunity Score** | 0–100 composite ranking of an Opportunity |
| **Sourcing Candidate** | A specific Indian supplier offer for a product |
| **Landed Cost** | Product + packaging + freight + duties to the destination FC |
| **Net Margin** | Sale price − landed cost − marketplace fees − ads − tax |
| **Launch Assets** | AI-generated title, bullets, description, keywords, pricing |

---

*This file is intentionally dense and stable. Deep detail lives in the linked docs.*
