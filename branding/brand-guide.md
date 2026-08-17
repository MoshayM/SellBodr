# SellBodr — Brand Guide

> Saved: 2026-08-18. Source of truth for all SellBodr brand assets and usage rules.

---

## 1. Identity

| Field | Value |
|-------|-------|
| **App name** | SellBodr |
| **Short name** | SellBodr |
| **Tagline** | *Find Products in India. Sell Globally.* |
| **Description** | AI-powered cross-border eCommerce intelligence. Discover high-margin India-sourced products and sell on Amazon, Etsy, eBay & 70+ global marketplaces. |
| **Category** | eCommerce Intelligence / AI SaaS |
| **Copyright** | © 2026 Digiaim Group |

---

## 2. Logo Files (this folder)

| File | Format | Purpose |
|------|--------|---------|
| `logo-animated.svg` | SVG | Primary in-app logo (transparent bg, floating + shimmer animation) |
| `logo-app-icon.svg` | SVG | App icon (black circle background, static, for stores/PWA) |
| `logo-512px.png` | PNG 512×512 | High-res raster for stores, OG images |
| `logo-192px.png` | PNG 192×192 | PWA splash, Android homescreen |

### Full icon set path: `apps/web/public/icons/`

| File | Size |
|------|------|
| `icon.svg` | vector animated |
| `icon-app.svg` | vector static (app icon) |
| `icon-72.png` | 72×72 |
| `icon-96.png` | 96×96 |
| `icon-128.png` | 128×128 |
| `icon-144.png` | 144×144 |
| `icon-152.png` | 152×152 |
| `icon-192.png` | 192×192 |
| `icon-384.png` | 384×384 |
| `icon-512.png` | 512×512 |
| `apple-icon-180.png` | 180×180 |

---

## 3. Logo Design System

### Mark concept
Two S-curved exchange arrows forming a circular loop — symbolising cross-border trade flow (India → Global). Upper arc goes lower-left to upper-right; lower arc returns upper-right to lower-left. Each arc has a solid arrowhead.

### Animated in-app logo (`logo-animated.svg`)
- **Background**: Transparent (used on dark backgrounds in-app)
- **Animation**: Floating bob (translateY 0 → −3.5px → 0, 3s loop) + shimmer sweep along each arrow (4s stagger)
- **3D depth**: Dark extrusion offset layer (+2.5x, +3y) for depth illusion
- **Glow**: Wide Gaussian bloom (stdDeviation=5.5, pulsing 0.4→0.88) + tight inner glow (stdDeviation=2)

### App icon (`logo-app-icon.svg`)
- **Background**: Solid black circle `#000000` + subtle violet radial ambient glow
- **Style**: Static (no animation) — compatible with all app stores and launchers

### Main gradient (both versions)
```
Linear gradient (upper-left to lower-right, userSpaceOnUse coords):
  0%   → #7C3AED (deep violet)
  48%  → #DB2777 (hot pink)
  100% → #F59E0B (amber gold)
```

### Depth/shadow gradient
```
  0%   → #1E0A3C (near-black violet)
  100% → #431407 (near-black amber)
```

---

## 4. Color Palette

### Primary brand colors
| Role | Hex | Usage |
|------|-----|-------|
| Accent Violet | `#7C3AED` | CTA buttons, active states, highlights |
| Accent Indigo | `#6366F1` | Secondary accent, gradients |
| Accent Cyan | `#06B6D4` | Data accents, secondary charts |
| Logo Pink | `#DB2777` | Logo gradient midpoint only |
| Logo Amber | `#F59E0B` | Logo gradient endpoint only |

### Dark theme surfaces
| Role | Hex | Usage |
|------|-----|-------|
| Background | `#020817` | Main page background |
| Surface / Card | `#0F1629` | Card backgrounds |
| Surface 2 | `#0E1628` | Dropdown, secondary surfaces |
| Nav background | `rgba(2,8,23,0.85)` | Header / bottom bar (glassmorphism) |
| Border | `rgba(255,255,255,0.08)` | Default borders |
| Text primary | `#FFFFFF` | Main text |
| Text muted | `rgba(255,255,255,0.5)` | Secondary text |

### Light theme surfaces
| Role | Hex | Usage |
|------|-----|-------|
| Background | `#F8FAFC` | Main page background |
| Surface / Card | `#FFFFFF` | Card backgrounds |
| Nav background | `rgba(255,255,255,0.92)` | Header / bottom bar (glassmorphism) |
| Border | `rgba(15,23,42,0.08)` | Default borders |
| Text primary | `#0F172A` | Main text |
| Text muted | `rgba(15,23,42,0.5)` | Secondary text |

### Semantic colors
| Role | Hex |
|------|-----|
| Success / Launch | `#10B981` |
| Warning / Hold | `#F59E0B` |
| Error / Reject | `#EF4444` |

---

## 5. Typography

| Weight | Class | Usage |
|--------|-------|-------|
| 900 (Black) | `font-black` | Logo name, hero headings |
| 800 | `font-extrabold` | Section headings |
| 700 | `font-bold` | Subheadings, CTA labels |
| 600 | `font-semibold` | Nav items, card titles |
| 500 | `font-medium` | Body labels |
| 400 | `font-normal` | Body text |

**Font**: Inter (Google Fonts). System fallbacks: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif.

---

## 6. Brand Voice & Usage Rules

1. **App name**: Always `SellBodr` — capital S and capital B, no space, no hyphen, no all-caps.
2. **Tagline**: *Find Products in India. Sell Globally.* — always in italic when used in marketing copy.
3. **Logo placement**: Use `logo-animated.svg` on dark backgrounds only. Use `logo-app-icon.svg` for any platform icon slot (stores, launcher, notifications).
4. **Logo clear space**: Minimum 16px padding around the mark on all sides.
5. **Do not** use white or light backgrounds behind the animated logo — it is designed for dark surfaces.
6. **Do not** recolour or modify the logo gradient.
7. **Button gradient**: `from-violet-600 to-indigo-600` (hover: `from-violet-500 to-indigo-500`).
8. **Glass effect**: `backdrop-filter: blur(20px)` + semi-transparent fill — used on nav bar and cards.

---

## 7. PWA / Store Metadata

| Field | Value |
|-------|-------|
| Theme color | `#020817` |
| Background color | `#020817` |
| Display | `standalone` |
| Orientation | `portrait-primary` |
| App ID (PWA) | `sellbodr-pwa` |
| Bundle ID (desktop) | `com.sellbodr.app` |
