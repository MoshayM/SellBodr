# build.md — SellBodr

How to build, run, and develop the SellBodr monorepo locally and in CI.

---

## 1. Prerequisites

- Node.js LTS ≥ 20
- pnpm ≥ 9 (`corepack enable`)
- Docker + Docker Compose
- An Anthropic API key + OpenAI API key (for AI features)

---

## 2. Monorepo Layout

```
sellbodr/
├── apps/web        # Next.js 14
├── apps/api        # NestJS
├── packages/core   # domain types, scoring, profit, Money
├── packages/agents # agent defs, prompts, orchestrator, evals
├── packages/connectors # marketplace + supplier integrations
├── packages/config # eslint/tsconfig/tailwind presets
├── infra           # Terraform, docker-compose, k8s
├── docs            # specs (this folder)
├── turbo.json
└── pnpm-workspace.yaml
```

---

## 3. First-Time Setup

```bash
git clone <repo> && cd sellbodr
corepack enable
pnpm install
cp .env.example .env            # fill DB, Redis, ES, model keys
pnpm infra:up                   # docker-compose: postgres, redis, elasticsearch, s3-local
pnpm db:migrate                 # prisma migrate dev
pnpm db:seed                    # marketplaces, fee schedules, demo org
pnpm dev                        # turbo run dev (web + api + workers)
```

- Web: http://localhost:3000
- API: http://localhost:4000/v1 (Swagger at `/v1/docs`)

---

## 4. Turborepo Task Graph

`turbo.json` defines cached, dependency-aware tasks:

```jsonc
{
  "tasks": {
    "build":     { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev":       { "cache": false, "persistent": true },
    "lint":      {},
    "typecheck": { "dependsOn": ["^build"] },
    "test:unit": { "dependsOn": ["^build"] },
    "test:integration": { "dependsOn": ["^build"] },
    "test:eval": { "dependsOn": ["^build"] },
    "db:migrate":{ "cache": false },
    "db:seed":   { "cache": false }
  }
}
```

`^build` means "build my dependencies first" — `packages/core` builds before `apps/api` and `apps/web`.

---

## 5. Common Commands

| Command | Action |
|---------|--------|
| `pnpm dev` | Run web + api + workers with hot reload |
| `pnpm build` | Build all packages/apps (cached) |
| `pnpm lint` / `pnpm typecheck` | Lint / type-check everything |
| `pnpm test` | All test layers locally |
| `pnpm test:eval` | Run AI agent evals |
| `pnpm db:migrate` / `pnpm db:seed` | Prisma migrate / seed |
| `pnpm infra:up` / `pnpm infra:down` | Start/stop local infra |
| `pnpm generate:openapi` | Emit OpenAPI from NestJS |
| `pnpm generate:client` | Generate typed web client + SDK |

---

## 6. Environment Variables (.env.example)

```
# Core
NODE_ENV=development
API_PORT=4000
WEB_URL=http://localhost:3000

# Data
DATABASE_URL=postgresql://bs:bs@localhost:5432/SellBodr
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

# Auth
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# AI
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
MODEL_BUDGET_USD_PER_PIPELINE=0.50

# Storage / Billing
S3_BUCKET=SellBodr-local
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

(In cloud envs these come from AWS Secrets Manager, never `.env`.)

---

## 7. Code Generation Flow

1. Define Zod DTOs in `packages/core`.
2. NestJS controllers reference them → `pnpm generate:openapi`.
3. `pnpm generate:client` produces the typed fetch client used by `apps/web` and the public SDK.

---

## 8. Local AI Development

- Set `MODEL_PROVIDER=mock` to run agents against recorded fixtures (no API spend) for UI work.
- The Model Gateway caches responses; identical agent inputs are free on repeat.

---

## 9. Build Performance

- Turborepo remote cache enabled in CI (shared artifacts).
- Prisma client generated once and cached.
- Next.js standalone output for slim container images.

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| ES connection refused | `pnpm infra:up` not finished; wait for health |
| Migration drift | `pnpm db:reset` (local only) |
| Model 429 in dev | switch `MODEL_PROVIDER=mock` |
| Type errors after schema change | `pnpm generate:client` |
