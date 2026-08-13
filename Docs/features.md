# features.md — SellBodr

Functional specification for every feature. Each feature lists its purpose, inputs, behaviour, outputs, and owning agent/module.

---

## A. Core Engines

### A1. Product Opportunity Engine
- **Purpose:** Continuously discover products satisfying high demand, low competition, good margin, easy India sourcing, lightweight shipping, strong review potential, and cross-border compliance suitability.
- **Analyzes:** Best sellers, trending, rising, seasonal, evergreen products, review growth, category growth, search demand.
- **Produces:** Candidate products + **Opportunity Score (0–100)**.
- **Owner:** Product Discovery + Trend + Scoring Engine.

### A2. Product Sourcing Engine
- **Purpose:** Find Indian suppliers and capture sourcing economics.
- **Sources:** IndiaMART, TradeIndia, verified manufacturers, factory suppliers, artisan suppliers.
- **Collects:** Product cost, MOQ, lead time, production capacity, export experience, supplier quality indicators.
- **Owner:** Supplier Discovery Agent.

### A3. Marketplace Analysis
- **Purpose:** Score each opportunity's marketplace conditions.
- **Computes:** Demand, Competition, Margin, Market Saturation, Trend, Shipping, Marketplace Fit, and composite Opportunity Score.
- **Owner:** Marketplace Research + Competition Agents → Scoring Engine.

### A4. Profitability Engine
- **Purpose:** Full cost-to-profit model.
- **Calculates:** Product cost, packaging, international shipping, Amazon FBA fees, referral fees, storage fees, advertising cost, taxes → gross profit, net profit, ROI, break-even units, monthly + annual profit projections.
- **Owner:** Profitability Agent + `packages/core/profit`.

### A5. Marketplace Launch Advisor
- **Purpose:** Make a recommendation actionable.
- **Generates:** Recommended selling price, product positioning, unique selling points, listing strategy, keyword strategy, SEO title suggestions, bullet points, product description, launch strategy.
- **Owner:** Listing Optimization + SEO Keyword + Product Launch Agents.

---

## B. Advanced Features

### B1. Product Gap Finder
- Detects products with **high demand + weak competitors + poor listings**.
- Uses Competition Agent's `listingQuality` scores and demand signals; flags gaps where top listings underperform.

### B2. Product Bundle Generator
- Suggests complementary product bundles to lift average order value.
- Uses co-purchase signals + embedding similarity; outputs bundle sets with combined margin.

### B3. AI Brand Builder
- Generates **brand names, logo concepts, packaging concepts, brand positioning**.
- Model-driven (Claude); concepts only — not production art.

### B4. Review Intelligence
- Mines competitor reviews to surface customer **pain points** and unmet needs.
- Clusters review embeddings; ranks pain points by frequency × negativity; feeds Listing Optimization.

### B5. Keyword Intelligence
- Marketplace-specific keyword generation for **Amazon, Etsy, Walmart, eBay**.
- Segments into primary/secondary/long-tail/backend; powered by SEO Keyword Agent.

### B6. Listing Generator
- Produces complete, marketplace-ready listings automatically (title, bullets, description, keywords, price) from an opportunity.

---

## C. Recommendation

### C1. AI Recommendation
- Combines all sub-scores into **Launch / Hold / Reject** with a **confidence %**.
- Example (Handmade Wooden Desk Organizer → Amazon USA): Demand 91, Competition 42, Margin 87, Shipping 82, Opportunity 89 → **Launch**, Confidence 92%.
- Always includes the score breakdown for explainability.

---

## D. Discovery Loop

- **Continuous re-scoring:** scheduled crawls refresh demand/competition/price; opportunities re-scored; users notified of material changes (e.g. score crosses a threshold).

---

## Feature → Tier Matrix

| Feature | Starter | Pro | Agency | Enterprise |
|---------|:--:|:--:|:--:|:--:|
| Opportunity discovery | limited | ✓ | ✓ | ✓ |
| Multi-marketplace | 1 | all | all | all + custom |
| Profitability engine | ✓ | ✓ | ✓ | ✓ |
| Launch Advisor | basic | ✓ | ✓ | ✓ |
| Advanced finders (Gap/Bundle/Review/Keyword) | — | ✓ | ✓ | ✓ |
| AI Brand Builder | — | ✓ | ✓ | ✓ |
| Portfolios + multi-user | — | — | ✓ | ✓ |
| Reports (PDF) | watermarked | ✓ | ✓ | ✓ |
| API access | — | — | — | ✓ |
| White-label | — | — | — | ✓ |

(See `monetization.md` for limits and `uiux.md` for where each surfaces.)
