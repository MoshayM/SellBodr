# architecture.md — SellBodr

System architecture: services, data flow, agent orchestration, and deployment topology.

---

## 1. High-Level System Architecture

```mermaid
graph TB
  subgraph Client
    WEB[Next.js Web App]
    APICLIENT[API Consumers / Enterprise]
  end

  subgraph Edge
    CF[CloudFront CDN]
    GW[API Gateway / NestJS Edge]
  end

  subgraph Core["Core API (NestJS Modular Monolith)"]
    AUTH[Auth Module]
    OPP[Opportunity Module]
    SRC[Sourcing Module]
    PROF[Profitability Module]
    LIST[Listing Module]
    REPORT[Report Module]
    BILL[Billing Module]
  end

  subgraph AI["AI Layer"]
    GWY[Model Gateway]
    ORCH[Agent Orchestrator]
    AGENTS[(10 Specialized Agents)]
  end

  subgraph Workers["Async Workers (BullMQ)"]
    CRAWL[Crawl Workers]
    SCORE[Scoring Workers]
    GEN[Report/Asset Workers]
  end

  subgraph Data
    PG[(PostgreSQL + pgvector)]
    RD[(Redis)]
    ES[(Elasticsearch)]
    S3[(S3)]
  end

  subgraph External
    MP[Marketplaces: Amazon/Etsy/eBay/Walmart...]
    SUP[Suppliers: IndiaMART/TradeIndia]
    LLM[Claude API / OpenAI API]
  end

  WEB --> CF --> GW
  APICLIENT --> GW
  GW --> Core
  Core --> AI
  AI --> GWY --> LLM
  ORCH --> AGENTS
  Core --> Workers
  CRAWL --> MP
  CRAWL --> SUP
  Core --> PG
  Core --> RD
  Core --> ES
  Workers --> PG
  Workers --> ES
  GEN --> S3
  AGENTS --> GWY
```

---

## 2. Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| **Auth** | Sign-up/in, JWT issue/refresh, OAuth, MFA, RBAC enforcement |
| **Opportunity** | Create/score/rank opportunities; orchestrate discovery agents |
| **Sourcing** | Supplier discovery, sourcing candidates, feasibility |
| **Profitability** | Landed cost, fee models, net profit, ROI, break-even |
| **Listing** | Launch assets: title, bullets, description, keywords, pricing |
| **Report** | Compose and export opportunity reports (PDF/JSON) |
| **Billing** | Plans, metering, Stripe webhooks, entitlement checks |

---

## 3. The Opportunity Pipeline (Sequence)

```mermaid
sequenceDiagram
  participant U as User
  participant API as Opportunity Module
  participant ORCH as Agent Orchestrator
  participant DA as Discovery Agent
  participant SA as Supplier Agent
  participant MA as Marketplace Agent
  participant PA as Profitability Agent
  participant SC as Scoring Engine
  participant DB as PostgreSQL

  U->>API: Request opportunities (marketplace, country, filters)
  API->>ORCH: Start pipeline (jobId)
  ORCH->>DA: Discover candidate products
  DA-->>ORCH: Product candidates + demand signals
  ORCH->>SA: Find Indian suppliers
  SA-->>ORCH: Sourcing candidates (cost, MOQ, lead time)
  ORCH->>MA: Analyze marketplace (competition, trend, saturation)
  MA-->>ORCH: Marketplace signals
  ORCH->>PA: Compute profitability (landed cost, fees, net profit)
  PA-->>ORCH: Profit model
  ORCH->>SC: Compute sub-scores + Opportunity Score
  SC-->>DB: Persist opportunity + scoreVersion
  ORCH-->>API: Pipeline complete (live via WS)
  API-->>U: Ranked opportunities + recommendation
```

---

## 4. Agent Orchestration Pattern

- The **Agent Orchestrator** runs pipelines as **DAGs of BullMQ jobs**. Each agent is a job handler.
- Agents are **stateless**; they read inputs from PostgreSQL/cache and write structured outputs back.
- Every agent call to a model goes through the **Model Gateway** (logging, cost, caching, fallback).
- Pipeline progress streams to the client over **Socket.IO** keyed by `jobId`.
- Failures are isolated: a failed agent marks its node `failed`, the pipeline continues where possible, and the opportunity is flagged `partial`.

```mermaid
graph LR
  D[Discovery] --> T[Trend]
  D --> S[Supplier]
  T --> M[Marketplace Research]
  S --> P[Profitability]
  M --> P
  P --> C[Competition]
  C --> SC[Scoring Engine]
  SC --> R[Recommendation]
  R --> L[Listing/Launch Assets]
  L --> RG[Report Generation]
```

---

## 5. Data Flow & Storage Strategy

| Data | Store | Notes |
|------|-------|-------|
| Entities (users, products, suppliers, opportunities, billing) | PostgreSQL | Source of truth |
| Embeddings (reviews, keywords, products) | pgvector | RAG retrieval |
| Searchable product/keyword index | Elasticsearch | Faceted browse + aggregations |
| Hot scores, sessions, rate limits | Redis | TTL caches |
| Reports, exports, brand assets | S3 | Signed URLs |
| Job queues + pipeline state | Redis (BullMQ) | Idempotent handlers |

---

## 6. Caching Layers

1. **Model response cache** (Redis) keyed by `(agent, promptHash, modelVersion)` — dedupe identical analyses.
2. **Score cache** (Redis) — opportunity scores with TTL; invalidated on re-crawl.
3. **HTTP cache** (CloudFront) — static + cacheable GETs.
4. **Query cache** (Prisma + Redis) — expensive aggregations.

---

## 7. Resilience

- **Circuit breakers** around marketplace/supplier connectors.
- **Retry with backoff + jitter** on transient connector/model failures.
- **Dead-letter queue** for poisoned jobs.
- **Graceful degradation**: if a connector is down, score with available signals and mark confidence lower.

---

## 8. Environments

`local` (docker-compose) → `dev` → `staging` → `production`. Each isolated VPC + DB. See `deployment.md`.
