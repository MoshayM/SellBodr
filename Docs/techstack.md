# techstack.md — BorderScout AI

Every technology, its role, and why it was chosen. The stack is a **TypeScript monorepo** so domain types and scoring logic are shared end-to-end.

---

## Monorepo

| Tech | Role | Why |
|------|------|-----|
| **Turborepo** | Task orchestration + caching | Fast incremental builds, remote cache for CI |
| **pnpm workspaces** | Package manager | Strict, fast, disk-efficient; great monorepo support |

---

## Frontend (`apps/web`)

| Tech | Role | Why |
|------|------|-----|
| **Next.js 14 (App Router)** | Web app + SSR/RSC | Server components for fast dashboards, route handlers for BFF |
| **TypeScript** | Language | Shared types with backend via `packages/core` |
| **Tailwind CSS** | Styling | Utility-first, consistent design tokens |
| **ShadCN UI** | Component library | Accessible, unstyled-but-themeable primitives on Radix |
| **TanStack Query** | Server-state | Caching, mutations, optimistic updates |
| **Zustand** | Client UI state | Lightweight, no boilerplate |
| **Recharts** | Charts | Score/profit visualizations |
| **react-hook-form + Zod** | Forms + validation | Zod schemas shared with API |

---

## Backend (`apps/api`)

| Tech | Role | Why |
|------|------|-----|
| **NestJS** | API framework | Modular DI architecture; clean agent/service separation |
| **PostgreSQL** | Primary datastore | Relational integrity for products, suppliers, opportunities, billing |
| **Prisma** | ORM | Type-safe queries, migrations, generated client |
| **Redis** | Cache + pub/sub + rate-limit store | Hot reads (scores), session, WS fan-out |
| **Elasticsearch** | Search + aggregations | Full-text product/keyword search, faceted opportunity browsing |
| **BullMQ** | Job queue | Agent pipelines, crawls, re-scoring, report generation |
| **Socket.IO** | Realtime | Live agent progress + dashboard updates |

---

## AI Layer (`packages/agents` + `ai-system`)

| Tech | Role | Why |
|------|------|-----|
| **Claude API** | Primary reasoning model | Strong structured reasoning for analysis/recommendations/copy |
| **OpenAI API** | Secondary/fallback + embeddings | Model diversity, routing, cost optimization, vector embeddings |
| **Model Gateway (internal)** | Routing/caching/cost/logging | One choke point for all model calls (see `ai-system.md`) |
| **pgvector** | Vector store | Embeddings for RAG over reviews/keywords/products |

---

## Authentication

| Tech | Role | Why |
|------|------|-----|
| **JWT** | Stateless access tokens | Standard, scalable, short-lived access + refresh rotation |
| **OAuth 2.0** | Third-party auth | Standard authorization framework |
| **Google Login** | Social sign-in | Lowest-friction onboarding |
| **TOTP (MFA)** | Second factor | App-based 2FA for sensitive tiers |

---

## Cloud & Infrastructure

| Tech | Role | Why |
|------|------|-----|
| **AWS** | Cloud provider | Maturity, breadth, managed services |
| **S3** | Object storage | Reports, exports, assets, logos |
| **ECS Fargate / EKS** | Compute | Containerized API + workers (EKS at scale) |
| **RDS (PostgreSQL)** | Managed DB | Backups, HA, read replicas |
| **ElastiCache (Redis)** | Managed cache | Managed, HA Redis |
| **OpenSearch** | Managed Elasticsearch | AWS-native managed search |
| **CloudFront** | CDN | Edge delivery for web app |
| **Terraform** | IaC | Reproducible, reviewable infra |

---

## Observability

| Tech | Role | Why |
|------|------|-----|
| **Prometheus** | Metrics | Pull-based metrics, alerting rules |
| **Grafana** | Dashboards | Visualize SLOs, queue depth, model cost |
| **OpenTelemetry** | Tracing | Cross-service + agent-pipeline traces |
| **Sentry** | Error tracking | Frontend + backend exceptions |

---

## Billing

| Tech | Role | Why |
|------|------|-----|
| **Stripe** | Subscriptions + metering | Tiered plans, usage-based add-ons, invoicing |

---

## Version Pinning Policy

- Node LTS (≥ 20).
- Pin major versions in `package.json`; renovate bot for patch/minor PRs.
- Database migrations are forward-only and reviewed.

## Architecture Pattern

- **Modular monolith** (NestJS) for the API in early phases → extract heavy workers (crawlers, scoring, report gen) into separate deployables as load grows (see `scaling.md`).
- **BFF pattern**: Next.js route handlers proxy/aggregate for the web client; mobile/3rd-party use the public API directly.
