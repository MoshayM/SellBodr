# api.md — BorderScout AI

REST + WebSocket API. Base URL `https://api.borderscout.ai/v1`. JSON only. Auth via `Authorization: Bearer <jwt>` (web) or `X-API-Key` (Enterprise). All list endpoints support `?page`, `?limit`, `?sort`. Errors follow a single envelope.

## Conventions

- **Money** returned as `{ amountMinor: int, currency: "USD" }`.
- **Timestamps** ISO 8601 UTC.
- **Idempotency**: mutating POSTs accept `Idempotency-Key` header.
- **Rate limits**: per plan (see `monetization.md`); `429` with `Retry-After`.

### Error Envelope
```json
{ "error": { "code": "OPPORTUNITY_NOT_FOUND", "message": "…", "details": {}, "requestId": "uuid" } }
```

---

## 1. Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create org + owner user |
| POST | `/auth/login` | Email/password → tokens |
| POST | `/auth/oauth/google` | Google sign-in |
| POST | `/auth/refresh` | Rotate refresh → new access |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/mfa/enroll` | Begin TOTP enrollment → otpauth URI |
| POST | `/auth/mfa/verify` | Verify TOTP code |

`POST /auth/login`
```json
// request
{ "email": "a@b.com", "password": "…", "mfaCode": "123456" }
// response
{ "accessToken": "…", "refreshToken": "…", "expiresIn": 900,
  "user": { "id": "uuid", "role": "owner", "organizationId": "uuid" } }
```

---

## 2. Searches (start the pipeline)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/searches` | Start an opportunity discovery run |
| GET | `/searches` | List searches |
| GET | `/searches/:id` | Status + summary |

`POST /searches`
```json
// request
{ "marketplaces": ["amazon_us","etsy"], "country": "US",
  "category": "home_decor", "budgetRangeMinor": { "min": 0, "max": 1500, "currency": "USD" },
  "filters": { "maxWeightG": 500, "minMargin": 30 } }
// response
{ "searchId": "uuid", "status": "queued", "jobId": "uuid" }
```

---

## 3. Opportunities

| Method | Path | Description |
|--------|------|-------------|
| GET | `/opportunities` | List/rank (filter by search, marketplace, recommendation, minScore) |
| GET | `/opportunities/:id` | Full opportunity (scores, sourcing, profit, recommendation) |
| POST | `/opportunities/:id/refresh` | Re-run pipeline / re-score |
| POST | `/opportunities/:id/launch-assets` | Generate listing + launch kit |
| POST | `/opportunities/:id/archive` | Archive |

`GET /opportunities/:id` (abridged)
```json
{
  "id": "uuid",
  "product": { "title": "Handmade Wooden Desk Organizer", "category": "home_office", "weightG": 420 },
  "marketplace": "amazon_us",
  "scores": { "demand": 91, "competition": 42, "margin": 87, "saturation": 55,
              "trend": 78, "shipping": 82, "marketplaceFit": 80, "opportunity": 89 },
  "recommendation": "launch",
  "confidence": 92,
  "scoreVersion": "2.0.0",
  "profit": {
    "salePrice": { "amountMinor": 3499, "currency": "USD" },
    "netProfit": { "amountMinor": 1180, "currency": "USD" },
    "roiPct": 67.4, "breakevenUnits": 38,
    "monthlyProfit": { "amountMinor": 354000, "currency": "USD" }
  },
  "sourcing": [{ "supplier": "…", "productCost": { "amountMinor": 35000, "currency": "INR" },
                "moq": 100, "leadTimeDays": 21, "feasibility": "easy" }]
}
```

---

## 4. Sourcing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/opportunities/:id/suppliers` | Sourcing candidates |
| GET | `/suppliers/:id` | Supplier detail |
| POST | `/opportunities/:id/suppliers/refresh` | Re-discover suppliers |

---

## 5. Profitability

| Method | Path | Description |
|--------|------|-------------|
| GET | `/opportunities/:id/profit` | Profit model |
| POST | `/opportunities/:id/profit/recalculate` | Recalc with custom assumptions |

`POST .../profit/recalculate`
```json
{ "salePriceMinor": 3999, "currency": "USD", "adAcosPct": 18, "monthlyVolume": 300 }
```

---

## 6. Listing & Launch

| Method | Path | Description |
|--------|------|-------------|
| GET | `/opportunities/:id/listing` | Launch assets |
| POST | `/opportunities/:id/keywords` | Regenerate keywords |
| POST | `/opportunities/:id/brand` | AI Brand Builder concepts |
| POST | `/opportunities/:id/bundles` | Bundle suggestions |

---

## 7. Competition & Reviews

| Method | Path | Description |
|--------|------|-------------|
| GET | `/opportunities/:id/competitors` | Competitor teardown |
| GET | `/opportunities/:id/review-insights` | Mined pain points |
| GET | `/opportunities/:id/gaps` | Product Gap Finder result |

---

## 8. Reports & Portfolios

| Method | Path | Description |
|--------|------|-------------|
| POST | `/opportunities/:id/reports` | Generate report (pdf/json) → S3 signed URL |
| GET | `/reports/:id` | Report metadata + download URL |
| GET | `/portfolios` / POST | List / create portfolios (Agency) |
| POST | `/portfolios/:id/opportunities` | Add opportunity to portfolio |

---

## 9. Billing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/billing/subscription` | Current plan + usage meters |
| POST | `/billing/checkout` | Stripe checkout session |
| POST | `/billing/portal` | Stripe customer portal |
| POST | `/webhooks/stripe` | Stripe events (signature-verified) |

---

## 10. Admin / Enterprise API Keys

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api-keys` | Create key (scopes) |
| GET | `/api-keys` | List |
| DELETE | `/api-keys/:id` | Revoke |

---

## 11. WebSocket (Socket.IO) — Live Pipeline

Namespace `/realtime`. Authenticated via token in the connection handshake.

| Event | Direction | Payload |
|-------|-----------|---------|
| `subscribe` | client→server | `{ jobId }` |
| `pipeline.progress` | server→client | `{ jobId, agent, status, pct }` |
| `pipeline.agentComplete` | server→client | `{ jobId, agent, summary }` |
| `pipeline.complete` | server→client | `{ jobId, searchId, opportunityCount }` |
| `pipeline.error` | server→client | `{ jobId, agent, error }` |

---

## 12. OpenAPI

The API is the source of truth for the generated OpenAPI 3.1 spec at `/v1/openapi.json` (NestJS Swagger). Zod DTOs ↔ OpenAPI kept in sync; the web client and SDKs are generated from it.
