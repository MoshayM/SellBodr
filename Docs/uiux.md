# uiux.md — SellBodr

UI/UX specification: navigation, pages, dashboards, key components, and design system. Built with Next.js App Router + Tailwind + ShadCN UI.

---

## 1. Design Principles

1. **Decisions over data** — every screen ends in a clear action (Launch / Source / Optimize / Export).
2. **Show the math** — scores and profit are always expandable into their breakdown.
3. **Progressive disclosure** — summary first, drill-down on demand.
4. **Live feedback** — pipeline progress streams in-page via WebSocket with animated stage indicators.

---

## 2. Design System

- **Background:** `#020817` base; `card-dark` class for content cards; `glass` / `glass-card` utilities on the public landing page.
- **Brand gradient:** violet → indigo (primary CTAs, score highlights, Pro badges).
- **Accent colors:** emerald for India sourcing / positive signals; amber for Hold; red for Reject / danger.
- **Score color scale:** 0–39 red, 40–69 amber, 70–100 emerald (applied to gauges and badges).
- **Components (ShadCN):** Card, Table (TanStack), Tabs, Dialog, Sheet, Badge, Progress, Tooltip, DropdownMenu.
- **Charts (Recharts):** radial score gauge, diverging butterfly waterfall, trend line, competitor scatter.
- **Layout:** sticky left sidebar on desktop; header nav with avatar/account menu; responsive to tablet. No modal command palette — search is an anchored inline dropdown in the header.

---

## 3. Navigation Map

```mermaid
graph TD
  LAND[Landing /] --> LOGIN[/login]
  LAND --> REG[/register]
  LOGIN --> SCOUT
  REG --> SCOUT

  SCOUT[Scout — Opportunity Dashboard] --> DETAIL[Opportunity Detail /opportunities/:id]
  SCOUT --> RESEARCH[Research]
  SCOUT --> SUPPLIERS[Suppliers]
  SCOUT --> MARKETPLACE[Marketplace]
  SCOUT --> PROFITABILITY[Profitability]
  SCOUT --> LISTING[AI Listing]
  SCOUT --> REC[Recommendations]
  SCOUT --> REPORTS[Reports]
  SCOUT --> SETTINGS[Settings]

  DETAIL --> TAB_OV[Overview tab]
  DETAIL --> TAB_RES[Research tab]
  DETAIL --> TAB_SUP[Suppliers tab]
  DETAIL --> TAB_PROF[Profitability tab]
  DETAIL --> TAB_COMP[Competition tab]
  DETAIL --> TAB_LIST[Listing tab]
  DETAIL --> TAB_ADS[Ads tab]
  DETAIL --> TAB_GROWTH[Growth tab]
  DETAIL --> TAB_REC[Recommendation tab]
  DETAIL --> TAB_REP[Report tab]

  SETTINGS --> ADMIN[Admin Panel — admin only]
  SETTINGS --> AIKEYS[AI Keys — admin only]

  LAND --> GUIDE[/guide]
  LAND --> PRIVACY[/privacy]
  LAND --> TERMS[/terms]
```

---

## 4. Pages

### 4.1 Scout (Opportunity Dashboard) — `/`

The main workspace. All scanning and browsing happens here.

**Scan Controls (top)**
- Marketplace dropdown (Amazon USA / UK / DE / CA / AU, Etsy, eBay, Walmart, Shopify, TikTok Shop).
- Keyword input.
- "New Scan" button triggers the AI agent pipeline.

**Filter Bar (sticky, attached to nav)**
- Score range slider, Recommendation filter (Launch / Hold / Reject), Marketplace filter.

**Live 7-Stage AI Scan Progress Panel**
- Appears inline below controls when a scan is running.
- Animated current-stage indicator with stage name and description.
- Pill grid showing all 7 stages; each pill transitions queued → running (pulsing) → done (filled).
- Dismisses when scan completes and results load.

**Results Area**
- Table/card view of opportunities: product name, marketplace, Opportunity Score gauge, Recommendation badge (Launch / Hold / Reject), net profit estimate, confidence %.

**Bottom Bar**
- Result count stats (total opportunities, avg score, launch-ready count).
- Free tier: "Upgrade to Pro" CTA.
- Pro tier: "Scan for More" button for extended results.

---

### 4.2 Opportunity Detail — `/opportunities/[id]`

Tabbed page binding all analysis for one opportunity. Header shows product name, score gauge, recommendation badge, and "Generate Launch Assets" primary CTA.

Ten tabs:

| Tab | Content |
|-----|---------|
| **Overview** | Score breakdown card, key signals summary, top recommendation rationale |
| **Research** | Demand signals, trend chart (seasonal / evergreen), review growth, search demand, category growth |
| **Suppliers** | Sourcing candidates table + SupplierProfileDrawer + Search More Suppliers card + Global Supplier Map card |
| **Profitability** | Butterfly waterfall chart, summary grid, editable assumptions |
| **Competition** | Competitor scatter, price band, top ASIN table, saturation and differentiation signals |
| **Listing** | AI-generated title, bullets, description, keywords, recommended price; inline edit + copy |
| **Ads** | ACOS estimate, suggested bid, keyword ad plan, sponsored placement recommendations |
| **Growth** | Trend forecast, expansion marketplace suggestions, bundle / variant ideas |
| **Recommendation** | Full decision card: Launch / Hold / Reject + confidence %, sub-score breakdown, "Why this" expander |
| **Report** | Generate PDF / JSON report; download via signed URL; share within workspace |

---

### 4.3 Research — `/research`

Standalone product research view outside of a specific opportunity. Demand signals, trend charts, category comparisons, saved research history.

### 4.4 Suppliers — `/suppliers`

Global supplier browser. Search and filter across all sourcing candidates. Links into SupplierProfileDrawer.

### 4.5 Marketplace — `/marketplace`

Per-marketplace comparison view: sub-scores (Demand, Competition, Saturation, Trend, Fit), price bands, restrictions, best marketplace + country recommendation.

### 4.6 Profitability — `/profitability`

Standalone profitability calculator. Editable assumptions (price, ACOS, volume, FX) with live recalculation.

### 4.7 AI Listing — `/listing`

Listing generation outside of a specific opportunity. Tabs: Listing | Keywords | Brand | Bundles | Review Insights. Marketplace char-limit indicators. Copy-to-clipboard per field.

### 4.8 Recommendations — `/recommendations`

Feed of all AI Launch / Hold / Reject decisions across opportunities. Filterable by recommendation, score, marketplace.

### 4.9 Reports — `/reports`

List of generated reports. Generate new (PDF / JSON), download via signed URL, share within workspace.

### 4.10 Settings — `/settings`

User profile, billing, plan, notification preferences, API key management.

### 4.11 Admin Panel — `/admin` (admin only)

User management, org configuration, feature flags, usage monitoring.

### 4.12 AI Keys — `/ai-keys` (admin only)

Configure and rotate AI model API keys used by the agent pipeline.

---

### 4.13 Public Pages

| Route | Content |
|-------|---------|
| `/` (landing) | Hero with 3D tilt cards, stats bar, 6-feature grid, 3-step how-it-works, pricing (Free $0 / Pro $49 / Org custom), PWA install section, footer |
| `/register` | Plan selector (Free / Pro), email + passkey creation flow |
| `/login` | Email lookup + passkey assertion; fallback to password |
| `/guide` | 7-section user guide, sticky sidebar TOC, active-section tracking, mobile chip nav |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

---

## 5. Key UI Components

### 5.1 Scan Progress Panel

Inline panel that appears on the Scout page during an active scan.

- **Stage pills:** a horizontal/grid row of 7 pills labelled by agent stage name. States: `queued` (muted outline), `running` (brand gradient fill, pulse animation), `done` (solid emerald fill with checkmark).
- **Current stage display:** large animated label + description text for the stage currently executing.
- **Behavior:** auto-hides and transitions to results when the final stage completes.

### 5.2 Bottom Bar (Scout Page)

Fixed bar at the bottom of the Scout results area.

- Left: result count stats — total found, average score, count of Launch recommendations.
- Right (Free): "Upgrade to Pro" button linking to billing.
- Right (Pro): "Scan for More" button that triggers an extended scan on the same keyword.

### 5.3 Suppliers Tab Components

**Sourcing Candidates Table**
- Columns: supplier name (with country flag), source platform, product cost, MOQ, lead time, trust bar (visual indicator), feasibility badge (High / Medium / Low).
- Row click or "View" action opens the SupplierProfileDrawer.

**Search More Suppliers Card**
- Free: two-step ProGate reveal — first click shows a blurred preview; second click prompts upgrade.
- Pro: triggers live supplier search and displays "+N found" note when complete.

**Global Supplier Map Card**
- Default state: collapsed 280 px tall Leaflet iframe with an "Expand Map" button.
- Expanded state: full-screen fixed `inset-0` modal with:
  - Dark header: title ("Global Supplier Map"), supplier count badge, India-only count pill (emerald), ESC keyboard hint, Close button.
  - Map fills remaining viewport height.
  - Legend bar at bottom: India suppliers (emerald dot), global suppliers (indigo dot).

### 5.4 SupplierProfileDrawer

Slide-in Sheet panel from the right side of the screen. White background (contrasts with dark app chrome).

- **Header:** supplier name, Verified badge (if applicable), source platform label.
- **Contact buttons:** Email, WhatsApp, SMS, Visit Portal — each triggers the appropriate action or link.
- **Generate RFQ button:** generates a request-for-quote draft with Copy and Send actions.
- **Body:** product cost, MOQ, lead time, capacity, export experience rating, quality indicators.

### 5.5 Profitability Waterfall Chart

Diverging butterfly waterfall built with Recharts.

- Left side: cost bars (product cost, packaging, shipping, FBA/fulfillment, referral fee, storage, ads, tax).
- Right side: revenue bar (sale price).
- Color coding: cost bars in red/amber gradient; revenue bar in emerald.
- Cost/revenue legend above the chart.
- Summary grid below: net margin %, ROI %, break-even units, monthly projection, annual projection.
- Editable assumptions panel: price, ACOS %, volume, FX rate — changes trigger live recalculation.

### 5.6 ProGate

Upgrade wall component used in two modes:

- **Full-page variant:** shown for entirely gated pages. Centered card with feature list, plan comparison, and "Upgrade to Pro" CTA.
- **Inline variant:** shown within a page for feature-specific locks (e.g., Search More Suppliers free tier). Blurred content preview with overlay prompt.

---

## 6. Component Architecture (web)

```
apps/web/
├── app/
│   ├── (auth)/login, register
│   ├── (dash)/
│   │   ├── page.tsx                         # Scout dashboard
│   │   ├── research, suppliers, marketplace,
│   │   │   profitability, listing,
│   │   │   recommendations, reports, settings
│   │   ├── admin, ai-keys                   # admin-only
│   │   └── opportunities/[id]/              # Opportunity Detail tabs
│   ├── guide/
│   ├── privacy/
│   └── terms/
├── components/
│   ├── score/       (ScoreGauge, ScoreBreakdown, RecommendationBadge)
│   ├── profit/      (ProfitWaterfall, AssumptionsForm)
│   ├── tables/      (OpportunityTable, SupplierTable)
│   ├── pipeline/    (ScanProgressPanel)
│   ├── suppliers/   (SupplierProfileDrawer, GlobalSupplierMap, SearchMoreCard)
│   ├── scout/       (BottomBar, FilterBar)
│   ├── progate/     (ProGate, InlineProGate)
│   └── ui/          (ShadCN primitives)
├── lib/             (api client, query hooks, ws client)
└── stores/          (zustand UI state)
```

---

## 7. Realtime UX

A WebSocket connection (`/realtime`) streams agent-stage events during a scan. The Scan Progress Panel consumes these events to animate stage transitions without polling. On completion, the results list updates in place — no page reload required.

---

## 8. Auth Pages

- **/register:** Plan selector (Free / Pro) rendered as clickable cards before account creation. After plan selection: email input + passkey creation (WebAuthn). No password required.
- **/login:** Email lookup step first; if passkeys exist for the account, WebAuthn assertion is triggered. Fallback path for accounts without passkeys.

---

## 9. Accessibility & i18n

- WCAG AA: full keyboard navigation, visible focus rings, ARIA roles on gauges and tables, color is never the sole signal (icons + labels accompany all score states).
- i18n-ready (next-intl); currency and number formatting per marketplace locale.

---

## 10. White-Label (Enterprise)

Theme tokens, logo, and domain pulled from `organizations.white_label_config` and applied at layout root. Sidebar and header branding swap without code changes.
