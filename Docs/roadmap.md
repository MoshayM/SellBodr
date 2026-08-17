# roadmap.md — SellBodr

A phased plan from MVP to Enterprise. Each phase is shippable and gated by the success criteria listed.

> **Status as of August 2026:** Phases 0, 1, and 2 are fully shipped. Phase 3 is in progress. Phase 4 has not started.

---

## ✅ Phase 0 — Foundations (SHIPPED)

**Goal:** Repo, infra, auth, and the scoring core exist.

- ✅ Turborepo + pnpm monorepo scaffolding
- ✅ NestJS API skeleton, Next.js web skeleton
- ✅ Turso (LibSQL) database provisioned (replaced original PostgreSQL + Redis + Elasticsearch plan)
- ✅ Auth: JWT + RBAC roles seeded
- ✅ `packages/core/scoring` with versioned formulas + unit tests
- ✅ CI pipeline (lint, typecheck, test, build)

**Exit criteria met:** A user can sign up, log in, and the scoring functions are tested and importable.

---

## ✅ Phase 1 — MVP: Single-Marketplace Opportunity Engine (SHIPPED)

**Goal:** End-to-end for **India → Amazon USA** only.

- ✅ Product Discovery Agent (best sellers, trending, rising)
- ✅ Marketplace Research Agent (demand/competition signals)
- ✅ Profitability Engine (Amazon FBA fee model, landed cost, net profit, ROI, break-even)
- ✅ Opportunity Score v1 computed and stored
- ✅ Supplier Discovery Agent (IndiaMART/TradeIndia connectors, basic)
- ✅ Opportunity Dashboard (Scout page) + Product Research tab
- ✅ AI Recommendation card (Launch/Hold/Reject + confidence%)
- ✅ Free & Pro tiers with metering

**Exit criteria met:** A Pro user gets a ranked list of Amazon USA opportunities with sourcing and full profit breakdown.

---

## ✅ Phase 2 — Launch Assets + Multi-Marketplace (SHIPPED)

**Goal:** Make recommendations actionable and expand marketplaces.

### Originally planned — all shipped:
- ✅ Listing Optimization Agent + SEO Keyword Agent
- ✅ AI Launch Assets (marketplace-specific title, bullets, description, keywords)
- ✅ Amazon US, UK, DE, CA, AU + Etsy + eBay + Walmart + TikTok Shop
- ✅ Marketplace Dashboard
- ✅ Profitability Dashboard (butterfly waterfall chart)
- ✅ Listing tab, Ads tab, Growth tab
- ✅ Report generation (exportable opportunity reports)

### Also shipped in Phase 2 (not in original plan):
- ✅ Live AI Scan Progress Panel — 7-stage animated real-time scan pipeline UI
- ✅ Scan for More — bottom bar for continuous opportunity discovery
- ✅ Search More Suppliers — inline supplier search with ProGate access control and live API calls
- ✅ Global Supplier Map — Leaflet-based interactive map with satellite imagery, full-screen modal, and precise GPS pin placement
- ✅ Supplier Profile Drawer — per-supplier detail drawer with outreach tools and RFQ workflows
- ✅ Admin Panel — user management, AI API key management
- ✅ Passkey / WebAuthn authentication — passwordless login alongside JWT
- ✅ Plan-based access control — feature gating enforced per subscription tier
- ✅ User Guide page (`/guide`) — in-app onboarding documentation

**Exit criteria met:** A user picks a product and receives a complete, marketplace-specific launch kit across 9 marketplaces.

---

## 🔄 Phase 3 — Advanced Intelligence (IN PROGRESS)

**Goal:** Deepen the moat.

- 🔄 Competition Analysis tab — partial; core agent exists, full teardown UI incomplete
- ⬜ Product Gap Finder (high demand + weak listings)
- ⬜ Review Intelligence (competitor review mining → pain points)
- ⬜ Keyword Intelligence (marketplace-specific deep dive)
- ⬜ Product Bundle Generator
- ⬜ AI Brand Builder (names, logo concepts, packaging, positioning)
- ⬜ Agency tier: multi-user workspaces, portfolio management

**Exit:** Agencies manage client portfolios; advanced finders drive differentiated picks.

---

## ⬜ Phase 4 — Enterprise & Scale (NOT STARTED)

**Goal:** Platformize.

- ⬜ Public REST API + API keys + usage metering (Enterprise tier)
- ⬜ White-label theming
- ⬜ Bulk scoring + batch jobs
- ⬜ Future marketplaces: Temu, Noon, Lazada, Shopee
- ⬜ Advanced observability (Grafana/Prometheus dashboards, SLOs)
- ⬜ Model routing + eval harness hardening
- ⬜ SOC2-readiness (audit logs, access reviews, encryption posture)

**Exit:** Enterprises integrate via API and white-label; platform meets scale + compliance bars.

---

## ⬜ Phase 5 — Continuous Discovery Loop (NOT STARTED)

- ⬜ Always-on crawl + re-score pipeline (opportunities refresh automatically)
- ⬜ Feedback loop: realized seller outcomes retrain scoring weights
- ⬜ Marketplace expansion playbook (add a new marketplace in < 2 weeks)

---

## Dependency Graph (Mermaid)

```mermaid
graph LR
  P0[Phase 0: Foundations ✅] --> P1[Phase 1: MVP Amazon USA ✅]
  P1 --> P2[Phase 2: Launch Assets + Multi-MP ✅]
  P2 --> P3[Phase 3: Advanced Intelligence 🔄]
  P3 --> P4[Phase 4: Enterprise & Scale ⬜]
  P4 --> P5[Phase 5: Continuous Discovery ⬜]
```

## Release Gates

Every phase must pass: typecheck, ≥80% core coverage, security scan clean, scoring eval suite green, and one e2e happy-path test for the new surface.
