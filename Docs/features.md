# features.md — SellBodr

Functional specification for shipped features only. Each entry documents what is live in the app as of August 2026.

---

## A. Core Engines

### A1. Product Opportunity Engine

- **Purpose:** Discover products satisfying high demand, low competition, good margin, easy India sourcing, and cross-border suitability.
- **Trigger:** User enters a product keyword + selects a marketplace from the Scout page dropdown (Amazon US / UK / DE / CA / AU, Etsy, eBay, Walmart, TikTok Shop).
- **Produces:** Ranked results table showing Opportunity Score (0–100), recommendation badge (Launch / Hold / Reject + confidence %), and net profit estimate per result.
- **Owner:** Product Discovery + Trend + Scoring Engine (AI agent pipeline).

### A2. Product Sourcing Engine

- **Purpose:** Find Indian suppliers and capture sourcing economics per opportunity.
- **Platforms:** IndiaMART, TradeIndia, Alibaba, Made-in-China, DHgate, Global Sources, Etsy, eBay, Amazon, TradeKey (per-platform quality profiles stored as `qualityIndicators` JSON).
- **Collects:** Unit cost, MOQ, lead time, trust score (%), feasibility, supplier country, platform.
- **Owner:** Supplier Discovery Agent.

### A3. Marketplace Analysis

- **Purpose:** Score each opportunity's marketplace conditions.
- **Sub-scores computed:** Demand, Competition, Margin, Market Saturation, Trend, Shipping Feasibility, Marketplace Fit.
- **Composite:** These feed the Opportunity Score (0–100) produced by the Scoring Engine.
- **Owner:** Marketplace Research + Competition Agents → Scoring Engine.

### A4. Profitability Engine

- **Purpose:** Full cost-to-profit model shown in the Profitability tab.
- **Calculates:** Sale price, source cost, international shipping, packaging, import duty, landed cost, marketplace fees, ad spend → net profit, ROI, breakeven units, monthly and annual projections.
- **UI:** Butterfly waterfall chart visualising each cost/revenue component.
- **Owner:** Profitability Agent + `packages/core/profit`.

### A5. AI Listing Generator

- **Purpose:** Produce marketplace-ready listing copy per opportunity.
- **Generates:** Title, bullet points, product description, keyword list — tailored to the selected marketplace.
- **Surfaces in:** Listing tab of the Opportunity Detail page.
- **Owner:** Listing Optimization + SEO Keyword Agents.

---

## B. Advanced Features

### B1. Keyword Intelligence

- Marketplace-specific keyword generation (Amazon, Etsy, Walmart, eBay, TikTok Shop).
- Segments into primary, secondary, long-tail, and backend keywords.
- Standalone page (`/keyword-intelligence`): per-opportunity selector, keyword type/competition filter chips, keyword table (type badge, volume, competition, CPC), backend search terms copy block.
- Also displayed in the Listing tab alongside listing copy.

### B2. PPC / Ads Campaign Structure

- Generates a PPC campaign structure: ad groups, keyword match types, and suggested bids.
- Shown in the Ads tab of the Opportunity Detail page.

### B3. Growth Signals

- Surfaces trend and growth signals for the opportunity's niche.
- Shown in the Growth tab of the Opportunity Detail page.

### B4. Supplier RFQ Generator

- Generates a Request for Quotation message for a selected supplier.
- Accessible from the Supplier Profile Drawer (outreach tools: email, WhatsApp, SMS, portal link).

### B5. Competition Analysis

- Full competitor teardown on the Competition tab of Opportunity Detail.
- Score grid + market gap alert + deterministic competitor table derived from opportunity sub-scores.
- Price landscape bar chart; Review Intelligence (pain points, positive themes, differentiation suggestions); review velocity bars per competitor.

### B6. AI Brand Builder

- Accessed from the Brand Builder tab of Opportunity Detail (Pro/Org gated).
- Generate button → AI produces: brand name options with rationale, positioning statement, taglines, colour palette, brand voice, domain ideas.

### B7. Product Bundle Generator

- Accessed from the Bundle tab of Opportunity Detail (Pro/Org gated).
- Generate button → AI produces bundle cards: product combination, pricing, AOV lift %, listing title, and strategy note.

### B8. Gap Finder (`/gap-finder`)

- Calculates a Gap Score per opportunity: `demand×0.4 + competition×0.35 + saturation×0.25`.
- Criteria chip filters: Low Reviews, High Demand, Weak Listings, Low Saturation.
- Marketplace + min gap score + sort controls.
- Clicking a result navigates to the opportunity's Competition tab.
- Pro gate.

### B9. Bulk Scan (`/bulk-scan`)

- Text area input: up to 20 product keywords (one per line), live counter, over-limit warning.
- Marketplace selector; results ranked by Opportunity Score with RecommendationBadge.
- Pro gate.

### B10. Team Management (`/team`)

- Available to Organisation plan users (and admin override).
- Invite team members by email; set role at invite time (Viewer, Analyst, Manager, Admin).
- Pending invites list with cancel action.
- Members list with inline role edit and remove controls.
- Seat usage counter; role reference table.
- Non-Organisation users see an upgrade prompt explaining the feature.

---

## C. Recommendation

### C1. AI Recommendation

- Combines all sub-scores into a **Launch / Hold / Reject** verdict with a **confidence %**.
- Score breakdown is always shown for explainability.
- Displayed as a badge on every result row in the Scout table and as the primary output on the Recommendation tab of the Opportunity Detail page.
- The Recommendation page (`/recommendations`) groups all evaluated opportunities by their verdict.

---

## D. Discovery Loop

- **On-demand re-scan:** Pro users can trigger an additional AI scan from the Scout page bottom bar ("Scan for More" button). Each scan runs the full 7-stage pipeline.
- **Free plan cap:** 5 total searches; 10 results per marketplace per search. Results beyond the cap are shown as locked gate rows with an "Upgrade to Pro" CTA.

---

## E. UI Features

### E1. LIVE AI Scan Progress Panel

- Displayed during an active Scout search directly on the Scout page.
- Animates through 7 sequential stages: Discovering → Demand → Competition → Suppliers → Profit → Scoring → Verdicts.
- Each stage shows a spinner and label; completed stages check off.
- Collapses and reveals the results table when all stages complete.

### E2. Bottom Bar & Scan for More

- Persistent bar at the bottom of the Scout results view.
- Shows: total result count, count of hot opportunities, Launch-verdict count, profitable-product count.
- **Pro users:** "Scan for More" button triggers an additional AI scan appending new results.
- **Free users:** button replaced with an "Upgrade to Pro" CTA.

### E3. Supplier Profile Drawer

- Opens from the View button in the Suppliers tab sourcing-candidates table.
- Shows full supplier profile: name, country flag, platform, unit cost, trust %, MOQ, lead time, feasibility rating.
- Outreach tools: email, WhatsApp, SMS, supplier portal link.
- Includes RFQ Generator to produce a ready-to-send quotation request.

### E4. Search More Suppliers

- Shown as a card at the bottom of the Suppliers tab sourcing-candidates table.
- **Free users:** Inline ProGate blocks the action (10 supplier cap per product); shows upgrade prompt.
- **Pro users:** Fetches additional sourcing candidates via API and appends to the table.

### E5. Global Supplier Map

- Interactive Leaflet 1.9.4 map rendered inside an iframe on the Suppliers tab.
- Basemap toggle: street map (default) or satellite (Esri World Imagery).
- Pins display 5-decimal GPS coordinates and a Google Maps deep-link for each supplier.
- Header bar shows total supplier count; map legend explains pin types.
- **Full-screen modal:** expand button opens the map in a fixed inset-0 modal with a smooth open animation. ESC key or close button dismisses it.

---

## F. Auth & Access

- **Authentication methods:** Passkey / WebAuthn (primary) + email/password fallback.
- **Session storage:** JWT stored in localStorage as `bs_access_token` and `bs_user`.
- **Plans:** Free and Pro. Plan stored on the user record.
- **Admin access:** Users with `role=admin` or email `sellbodr@gmail.com` can access `/admin`.
- **Admin panel (`/admin`):** User list with inline plan/role editing, AI provider key management, platform stats.

---

## G. Other Shipped Pages

| Route | Description |
|-------|-------------|
| `/opportunities` | Scout — main product discovery page |
| `/opportunities/[id]` | Opportunity Detail (12 tabs: Overview, Research, Suppliers, Profitability, Competition, Listing, Ads, Growth, Brand Builder, Bundle, Recommendation, Report) |
| `/recommendations` | All opportunities grouped by Launch / Hold / Reject verdict |
| `/reports` | Generate, copy, and view reports per opportunity |
| `/gap-finder` | Gap Finder — high-demand / low-competition niche discovery |
| `/keyword-intelligence` | Keyword Intelligence — per-opportunity keyword deep-dive |
| `/bulk-scan` | Bulk Scan — up to 20 keywords scored at once (Pro) |
| `/team` | Team management — invite members, manage roles (Organisation) |
| `/settings` | Account settings: AI Keys, Security, Marketplaces, API Keys, White-label |
| `/guide` | User Guide — 7 sections with sticky table of contents |
| `/admin` | Admin panel (admin-role users only) |
| `/login` | Email/password + passkey sign-in |
| `/register` | Account creation |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

PWA support is active: the app is installable on Android, iOS, and desktop via the PWA install banner.

---

## Feature → Tier Matrix

| Feature | Free | Pro | Organisation |
|---------|:----:|:---:|:------------:|
| Scout search (marketplace dropdown) | 5 total searches | Unlimited | Unlimited |
| Results per marketplace per search | 10 (rest locked) | Unlimited | Unlimited |
| Marketplaces available | All 13 (incl. Temu/Noon/Lazada/Shopee) | All 13 | All 13 |
| Opportunity Score + recommendation badge | ✓ | ✓ | ✓ |
| Opportunity Detail (all 12 tabs) | ✓ | ✓ | ✓ |
| Profitability waterfall chart | ✓ | ✓ | ✓ |
| AI Listing Generator | ✓ | ✓ | ✓ |
| Ads / PPC campaign structure | ✓ | ✓ | ✓ |
| Growth tab | ✓ | ✓ | ✓ |
| Competition tab (full teardown) | ✓ | ✓ | ✓ |
| Brand Builder tab | — (ProGate) | ✓ | ✓ |
| Bundle Generator tab | — (ProGate) | ✓ | ✓ |
| Suppliers per product | 10 (rest ProGated) | Unlimited | Unlimited |
| Search More Suppliers | — (ProGate shown) | ✓ | ✓ |
| Scan for More (bottom bar) | — (upgrade CTA) | ✓ | ✓ |
| Supplier Profile Drawer + RFQ | ✓ | ✓ | ✓ |
| Global Supplier Map + full-screen modal | ✓ | ✓ | ✓ |
| Gap Finder | — (ProGate) | ✓ | ✓ |
| Keyword Intelligence | — (ProGate) | ✓ | ✓ |
| Bulk Scan (up to 20 keywords) | — (ProGate) | ✓ | ✓ |
| Reports (generate / copy / view) | ✓ | ✓ | ✓ |
| API Keys (self-serve) | — | — | ✓ |
| White-label Settings | — | — | ✓ |
| Team Management (multi-seat) | — | — | ✓ |
| User Guide (/guide) | ✓ | ✓ | ✓ |
| PWA install | ✓ | ✓ | ✓ |
| Admin panel | admin role only | admin role only | admin role only |

(See `monetization.md` for billing details and `uiux.md` for component-level documentation.)
