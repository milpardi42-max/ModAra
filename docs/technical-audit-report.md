# Technical Audit Report — مُدارا Marketplace Platform

**Prepared by:** Senior Software Architect / Full Stack Engineer  
**Date:** 2026  
**Repository:** ModernAra1  
**Audit scope:** Full codebase — frontend, backend, database, authentication, security, performance  

---

## Table of Contents

1. [Current Architecture Summary](#1-current-architecture-summary)
2. [Strengths](#2-strengths)
3. [Weaknesses](#3-weaknesses)
4. [Technical Debt](#4-technical-debt)
5. [Security Issues](#5-security-issues)
6. [Scalability Issues](#6-scalability-issues)
7. [Database Issues](#7-database-issues)
8. [Frontend Issues](#8-frontend-issues)
9. [Backend Issues](#9-backend-issues)
10. [Recommended Refactoring Roadmap](#10-recommended-refactoring-roadmap)

---

## 1. Current Architecture Summary

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | React | 18.3.1 |
| Language | TypeScript | 5.5.3 |
| Build tool | Vite | 5.4.2 |
| Styling | Tailwind CSS | 3.4.1 |
| Animation | Framer Motion | 13.1.1 |
| Icons | Lucide React | 0.344.0 |
| Backend-as-a-Service | Supabase | 2.57.4 |
| Database | PostgreSQL (via Supabase) | — |
| Edge Functions | Deno (Supabase Functions) | — |
| Payment gateway | ZarinPal | — |
| Font | Beiruti (Google Fonts) | — |
| Deployment target | GitHub Pages (static SPA) | — |

### Application Architecture

The project is a **single-page application (SPA)** with:

- **No client-side router library.** Navigation is handled entirely through a custom hash-based routing system implemented in [`App.tsx`](../src/App.tsx). Every view change is a `setState` call; the browser hash is kept in sync manually.
- **Dual-mode backend:** When `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are absent the app uses a fully in-browser demo backend ([`localBackend.ts`](../src/lib/localBackend.ts)) backed by `localStorage`. When credentials are present, it talks to a real Supabase project.
- **Supabase Edge Functions** handle payment flows (ZarinPal request and callback) using the service-role key server-side — this is the only true backend logic.
- **Static hosting on GitHub Pages** under the sub-path `/ModernAra1/`.

### Domain Model (Current)

The database schema defines a **single-vendor e-commerce** store:

```
categories → products ← cart_items ← orders ← order_items
                      ← reviews
blog_posts
coupons
customer_profiles
store_settings
auth.users (Supabase Auth)
```

**What is NOT present** (per the business roadmap):
- Creators / Sellers / Multi-vendor
- Shops per creator
- Designs / Digital assets
- Collections / Curated lists
- Favorites / Wishlists
- Follow system
- Portfolio
- Education platform

### Page Inventory

| Route | Component | Commerce? |
|-------|-----------|-----------|
| `#` / `#home` | `Home.tsx` | Displays products, has "add to cart" |
| `#shop` | `Shop.tsx` | Product listing + filtering |
| `#product/:slug` | `ProductDetail.tsx` | Product detail + cart + reviews |
| `#blog` | `Blog.tsx` | Blog listing |
| `#blog-post/:slug` | `BlogPostPage.tsx` | Blog detail |
| `#account` | `Account.tsx` | Order history |
| `#backoffice-login` | `AdminLogin.tsx` | Admin auth |
| `#admin` | `AdminPanel.tsx` | Full backoffice |
| `#invoice/:id` | `Invoice.tsx` | Order invoice |
| `?payment=zarinpal` | `PaymentCallback.tsx` | Payment return handler |

---

## 2. Strengths

### ✅ RTL & Persian Localization
- `<html lang="fa" dir="rtl">` is set at document root — correct.
- All user-facing text is in Persian with appropriate `Intl.NumberFormat('fa-IR')` and `Intl.DateTimeFormat('fa-IR')` usage throughout.
- Font choice (Beiruti) renders Arabic-script text cleanly at all weights.
- CSS utility `.no-rtl-flip` exists for LTR exceptions.
- `dir="rtl"` is applied at page-level containers where needed.

### ✅ Database Security (Row Level Security)
- RLS is enabled on **all** tables.
- Owner-scoped policies correctly use `auth.uid() = user_id`.
- Payment metadata mutations are locked to the service-role (Edge Functions only) — customers cannot update `status`, `payment_authority`, or `payment_ref_id` from the browser.
- An `is_admin()` `SECURITY DEFINER` function avoids repeating JWT inspection inline.
- `UNIQUE` index on `payment_authority` prevents duplicate-payment attacks.

### ✅ Payment Architecture
- ZarinPal flows run entirely server-side in Deno Edge Functions — the service-role key is never exposed to the browser.
- Idempotency: the callback checks `order.status === 'paid'` before re-verifying, preventing double-charge.
- `status` can only progress from `pending` via the server; the INSERT policy enforces `status = 'pending'`.

### ✅ Demo / Dev Mode
- The local demo backend is a well-designed fallback that mirrors the Supabase API surface, allowing the app to run with zero configuration.
- Hardcoded demo credentials (`admin` / `admin 1234`) are gated behind `isDemoMode` — they cannot be used in production.

### ✅ Design System
- A coherent Tailwind design token system: `dark`, `amber`, `accent`, `success`, `error`, `warning` scales.
- Reusable utility classes: `.btn-primary`, `.btn-ghost`, `.card`, `.input-field`, `.glass`.
- Skeleton shimmer loading states are consistent across all data-loading views.
- `prefers-reduced-motion` media query is honoured for all animations.

### ✅ Catalogue Quality
- 94 products across 6 meaningful Persian fashion categories with proper slugs, descriptions, ratings, and stock.
- Seed data is version-controlled in SQL migrations.

---

## 3. Weaknesses

### 🔴 Critical

| # | Issue |
|---|-------|
| C-1 | **No client-side router.** Custom hash routing in App.tsx does not support nested routes, programmatic back-navigation, lazy loading, or `<Suspense>` boundaries. All pages are always imported and bundled regardless of the active view. |
| C-2 | **Commerce code is alive in the codebase.** `CartContext`, `CartDrawer`, `CheckoutModal`, `PaymentCallback`, `Invoice`, `CartItem`, `Order`, `OrderItem` types, and ZarinPal Edge Functions all exist and are imported in every page load. Per the business mandate, commerce is a future phase and must be cleanly separated. |
| C-3 | **Single-vendor schema.** The database has no concept of `creators`, `shops`, or `seller` identity. The marketplace vision requires a fundamental schema redesign before any multi-vendor feature can be built. |
| C-4 | **Admin authentication is broken in production.** `AdminLogin.tsx` explicitly blocks login when not in demo mode. There is no Supabase Auth flow for setting `app_metadata.role = admin`, nor documentation on how an operator would promote a user to admin. |

### 🟠 High

| # | Issue |
|---|-------|
| H-1 | **No pagination.** `Shop.tsx` loads all products from Supabase in one query; `AdminPanel.tsx` loads all orders, products, reviews, customers at once. At scale this will be catastrophic for performance and database load. |
| H-2 | **All filtering is client-side.** Search, category filter, price range, and rating filter all execute in the browser after a full dataset load. No use of server-side `WHERE` clauses, full-text search, or Supabase's `textSearch()`. |
| H-3 | **No image optimization pipeline.** All product images are served as raw `.jpg` files from the `public/` directory or external URLs. No WebP conversion, no responsive `srcset`, no image CDN. |
| H-4 | **Missing marketplace domain entities.** `Creators`, `Shops`, `Designs`, `Collections`, `Favorites`, `Follows` do not exist in any form — not even as placeholder tables. Introducing them later will require destructive schema changes and data migrations. |
| H-5 | **`CartProvider` wraps the entire app**, including admin and utility pages, wasting a Supabase query on cart data for every user session regardless of what page they are on. |
| H-6 | **No error boundaries.** A single unhandled runtime error in any component will crash the entire application with a blank screen. |
| H-7 | **`AdminPanel.tsx` is a 500+ line monolith.** All admin tabs (overview, orders, products, categories, blog, reviews, coupons, customers, settings) are defined as inline functions inside one file with dozens of repeated patterns. |

### 🟡 Medium

| # | Issue |
|---|-------|
| M-1 | **No SEO.** The app is a client-rendered SPA with a single `<title>` and one `<meta description>`. Product pages, blog posts, and category pages have no dynamic `<meta>` tags, no Open Graph per-page, no structured data (JSON-LD), no sitemap, and no `robots.txt`. |
| M-2 | **OG image points to bolt.new.** `index.html` uses `https://bolt.new/static/og_default.png` for both `og:image` and `twitter:image` — a third-party domain that could disappear. |
| M-3 | **`localStorage` demo DB is unbounded.** `localBackend.ts` stores all demo data in `localStorage` with no size limit. Large sessions may hit the ~5 MB browser quota. |
| M-4 | **`product.rating` is a manually set field.** There is no mechanism to automatically recalculate average rating from `reviews`. The static `rating` column and the computed average in `ProductDetail` diverge. |
| M-5 | **Review submission has no spam/abuse protection.** Any authenticated user can submit unlimited reviews for any product. There is no rate limiting, no moderation queue by default (status defaults to `published`), and no verification that the reviewer purchased the product. |
| M-6 | **No `<meta charset>` / `<link rel="canonical">` per route.** Hash routing makes canonical URLs impossible without additional infrastructure. |
| M-7 | **No test suite.** Zero unit tests, integration tests, or E2E tests exist in this repository. |
| M-8 | **`window.history.replaceState` (not pushState).** Back/forward browser navigation does not work correctly because all navigations replace rather than push the current state. |

### 🟢 Low

| # | Issue |
|---|-------|
| L-1 | **`package.json` name is still `vite-react-typescript-starter`** — the Bolt scaffolding default was never updated. |
| L-2 | **`storageKey` is `technoshop-auth`** in `supabase.ts` — remnant of a previous project name, inconsistent with the `modara-demo-db-v1` / `modara-demo-users-v1` keys in `localBackend.ts`. |
| L-3 | **`HomeContent` loads a redundant `category` query.** `Home.tsx` independently queries `categories` and also separately queries `products` via `fetchCategoryProducts`. The same category-to-product mapping is done twice in the same session. |
| L-4 | **`src/lib/demoSeed.ts` is imported in production pages** (`Home.tsx`, `Shop.tsx`) as a fallback. The seed bundle (94 products + reviews) is always shipped to the client even in production Supabase mode. |
| L-5 | **`vite.config.ts` sets `allowedHosts: true`** which disables host header validation in development — acceptable locally but should be documented. |

---

## 4. Technical Debt

### Architecture Debt

1. **No router library.** The custom hash router in `App.tsx` (~70 lines) is a local reimplementation of what `react-router-dom` or TanStack Router provides. It lacks: lazy route splitting, nested layouts, typed route params, navigation guards, scroll restoration hooks, and `<Link>` components. This must be replaced before the application scales to 10+ routes.

2. **No state management layer.** The app uses React Context for auth and cart. For a marketplace with creators, shops, designs, and collections this will result in deeply nested providers, prop-drilling, and stale closures. A proper data-fetching layer (React Query / SWR) should be introduced early.

3. **Dual-backend abstraction is leaking.** `isDemoMode` is imported in `CheckoutModal.tsx`, `Account.tsx`, `AdminLogin.tsx`, and `supabase.ts`. Feature flags and backend-mode decisions should not be scattered across UI components.

4. **Types defined in `lib/supabase.ts`.** All domain types (`Product`, `Order`, `CartItem`, `Review`, etc.) are co-located with the Supabase client configuration. There is no `types/` directory and no separation between infrastructure types and domain types.

5. **The local backend does not implement RLS.** `localBackend.ts` executes operations without checking `user_id` ownership on cart/order mutations. This means demo-mode behaviour differs from production-mode behaviour — a testing/QA gap.

### Code Quality Debt

1. **`AdminPanel.tsx` is ~500 lines**, containing 12+ sub-components as inline functions. This file is impossible to independently test or reason about.

2. **`type: 'as unknown as'` casts** appear in `Account.tsx`, `Shop.tsx`, `Home.tsx` for Supabase query results. These bypass the TypeScript type system and hide potential null/undefined bugs.

3. **`src/lib/demoSeed.ts` is bundled in production** builds. It should be tree-shaken away or placed in a dev-only import.

4. **No `loading` state for initial auth check.** `AuthContext` sets `loading: true` initially but most pages render their "logged out" states before `loading` resolves, causing layout flashes.

---

## 5. Security Issues

### 🔴 Critical Security Issues

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| S-1 | **Critical** | **Demo admin credentials are hardcoded as a visible placeholder in the admin login UI:** `admin` / `admin 1234` is displayed as hint text in `AdminLogin.tsx` (line 63). Any visitor can see them. | `src/pages/AdminLogin.tsx:63` |
| S-2 | **Critical** | **No production admin promotion flow.** The system relies on Supabase Dashboard to manually set `app_metadata.role = admin`. There is no documented, audited, or code-enforced process. If a Supabase project is cloned or restored, all admin assignments may be lost. | `supabase/migrations/20260822100000_payment_admin.sql` |
| S-3 | **Critical** | **`zarinpal-callback` Edge Function accepts `order_id` from query params.** An attacker who guesses or brute-forces an `order_id` UUID and also obtains the `Authority` token (leaked from a URL) could trigger a verify call against the wrong order. The function validates `order.payment_authority === authority` which mitigates this, but relies on UUIDs being unguessable — correct but fragile. | `supabase/functions/zarinpal-callback/index.ts:40` |

### 🟠 High Security Issues

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| S-4 | **High** | **Review insertion has no `user_id` linkage.** `ProductDetail.tsx` inserts a review with only a free-text `name` field — not the authenticated user's ID. Combined with the `user_id nullable` column in the reviews table, this means reviews cannot be traced back to actual verified users and are trivially spoofable. | `src/pages/ProductDetail.tsx:88-97`, `supabase/migrations/20260822130000_admin_backoffice.sql` |
| S-5 | **High** | **No rate limiting on review submission or auth endpoints.** The Supabase anon key is exposed client-side (by design), but without rate limiting, bots can spam reviews or attempt credential stuffing on the sign-in endpoint. | `src/pages/ProductDetail.tsx` |
| S-6 | **High** | **No CSRF protection for Edge Functions.** The ZarinPal request function checks `Authorization: Bearer` but does not validate an `Origin` header, so a malicious page can trigger payment initiation from a victim's authenticated session. | `supabase/functions/zarinpal-request/index.ts` |
| S-7 | **High** | **`ALLOWED_ORIGIN` defaults to `*`** in both Edge Functions. In production this should be locked to the site's domain. | `supabase/functions/zarinpal-request/index.ts:9` |

### 🟡 Medium Security Issues

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| S-8 | **Medium** | **No Content Security Policy (CSP) headers.** The app loads external fonts from `fonts.googleapis.com` and `fonts.gstatic.com` but has no CSP in place to prevent XSS injection of arbitrary scripts. | `index.html` |
| S-9 | **Medium** | **`window.localStorage` used for session persistence** with key `technoshop-auth`. XSS vulnerabilities can steal the session token. Supabase recommends `flowType: 'pkce'` with `storage: sessionStorage` for higher-security apps. | `src/lib/supabase.ts:22-26` |
| S-10 | **Medium** | **Auth flow uses `flowType: 'implicit'`** which embeds the access token in the URL hash. This is the legacy OAuth flow; PKCE is the current secure standard. | `src/lib/supabase.ts:25` |
| S-11 | **Medium** | **Admin access check in `Account.tsx` bypasses security in demo mode:** `isDemoMode || user?.app_metadata?.role === 'admin'` — any demo-mode user sees the admin panel link. | `src/pages/Account.tsx:37` |

---

## 6. Scalability Issues

### Database Scalability

1. **No index on `products.category_id`.** The most frequent query pattern (filter by category) has no supporting index. At thousands of products this will become a sequential scan.

2. **No index on `products.slug`.** Product lookup by slug is used on every product page load with no index.

3. **No composite indexes for common filter combinations** (category + rating, category + price).

4. **`reviews.product_id` has no index.** Every product detail page runs `WHERE product_id = ?` — this is a full table scan once reviews reach thousands of rows.

5. **No soft-delete pattern.** All entities use hard deletes. Deleted products break order history (cascade to `SET NULL` or `CASCADE` depending on table).

6. **Single `products` table for a multi-vendor marketplace** will need to be sharded or partitioned as product count grows into hundreds of thousands.

### Application Scalability

1. **Entire product catalogue loaded per page.** There is no pagination, cursor-based loading, or virtual scrolling. At 1000+ products the initial page load will be several seconds.

2. **CartContext refreshes on every mutation** by calling `refreshCart()` which re-fetches the full cart after every `addToCart`, `updateQuantity`, and `removeFromCart`. Five rapid cart actions = five full round-trips.

3. **No CDN for static assets.** Product images at `public/images/` are served from the GitHub Pages origin with no CDN edge caching.

4. **No caching layer.** No React Query, SWR, or stale-while-revalidate pattern. Every page navigation re-fetches all data from Supabase.

5. **Supabase free tier limits.** The current architecture has no circuit breakers or graceful degradation if Supabase hits rate limits or goes down.

---

## 7. Database Issues

### Schema Design Issues

1. **Missing marketplace entities.** The schema is a single-vendor catalogue. For a multi-vendor Persian RTL Marketplace the following tables are needed but absent:
   - `creators` (seller profiles, bio, social links, commission_rate)
   - `shops` (creator-owned storefronts)
   - `designs` (digital or physical product designs by creators)
   - `collections` (curated product groups)
   - `favorites` (user → product wishlist)
   - `follows` (user → creator/shop follows)
   - `media_assets` (centralised image management)

2. **`product.rating` is a static numeric column** not a computed/materialized view from `reviews`. The two diverge immediately after the first review is submitted.

3. **`reviews.user_id` is nullable** and not linked to the `name` text field. A verified-purchaser review system requires `user_id NOT NULL` and a join to `orders`.

4. **`orders.address` and `orders.phone` are free-text strings** stored directly on the order. This makes analytics on delivery regions impossible and prevents address reuse across orders.

5. **`store_settings` uses `id = 'store'` as a text primary key.** While functional, this is an unusual pattern. A single-row settings table is fine but the key should be `boolean DEFAULT true` enforced with a `CHECK` constraint.

6. **No `updated_at` column on `products`, `categories`, `reviews`.** Makes cache invalidation, change-data-capture, and sync patterns impossible.

7. **No soft-delete / `deleted_at` on `products`.** Hard-deleting a product with existing orders causes dangling references in `order_items.product_id` (which cascades to `ON DELETE CASCADE` — meaning historical order data is destroyed).

### Migration Issues

1. **Migration `20260820120000_reseed_full_catalog.sql` runs `DELETE FROM` on all transactional tables** (`order_items`, `orders`, `cart_items`) before re-seeding. This is destructive in a shared/production environment and should never run on a live database. It must be wrapped in a guard or split into a separate seed script.

2. **No migration numbering convention.** Migrations use timestamp prefixes but the year 2026 is a future date — this is likely a scaffolding artefact and will cause ordering issues with real future migrations dated 2025–2026.

3. **Seed data in production migrations.** Seed data (categories, products, blog posts) is embedded directly in schema migrations. Schema migrations and data seeding should be separated.

---

## 8. Frontend Issues

### Architecture Issues

1. **No code splitting / lazy loading.** All 10 page components and 10 UI components are eagerly imported and bundled together. The initial JS payload includes `AdminPanel`, `Invoice`, `PaymentCallback`, and demo seed data regardless of the user's entry point.

2. **Custom hash router cannot support server-side rendering.** If the project ever needs SSR/SSG (for SEO), the entire routing layer must be replaced.

3. **Navigation is passed as `onNavigate` prop through every component.** This prop-drilling reaches 2–3 levels deep in some trees. A router's `<Link>` / `useNavigate` would eliminate this.

4. **`window.history.replaceState` (not `pushState`).** Users cannot navigate backwards through page history within the app.

### Component Issues

1. **`ProductCard` dispatches a custom DOM event** (`modara:open-cart`) to open the cart drawer — a workaround for the lack of a proper event bus or state management. This pattern is fragile and untraceable.

2. **`Header.tsx` is navigation-only** with no cart icon, no user menu, no search shortcut, no mobile hamburger menu. All navigation is done by scrolling the page and clicking the logo. This is adequate for the demo but insufficient for a marketplace with many categories.

3. **Image elements lack `width`/`height` attributes and `loading="lazy"`.** This causes layout shift (CLS) and eager loading of off-screen images.

4. **No `alt` text fallback strategy.** `ProductCard` uses `product.name` as alt text which is correct, but images in `Account.tsx` use `item.product?.name || ''` — an empty string alt on a non-decorative image is an accessibility violation.

5. **Hardcoded `clothing` as default category in `Home.tsx`.** Lines like `if (activeCategory !== 'clothing')` and `setActiveCategory('clothing')` are hardcoded strings. If the category slug changes in the DB, the Home page silently breaks.

### RTL Issues

1. **`slideInRight` / `slideInLeft` keyframes are not RTL-aware.** Animations that slide "in from the right" visually mean "from the left" in RTL. `tailwind.config.js` defines these as absolute LTR directions.

2. **`ArrowLeft` icon is used for "forward" navigation** throughout the app (e.g., "مشاهده همه"). In RTL, forward direction is right-to-left, so `ArrowLeft` is semantically correct, but the Lucide icon is not automatically flipped for RTL — the visual and semantic intent happen to align here, but this is not guaranteed for all Lucide icons in RTL contexts.

### Performance Issues

1. **Google Fonts loaded synchronously** in `<head>` with no `font-display: swap`. This is a render-blocking request.

2. **`framer-motion` imported at 13.1.1** but used only for minor UI animations (none visible in the audited components). The library adds ~50 KB gzipped to the bundle. If its usage is minimal, it should be removed or replaced with CSS transitions.

3. **All data fetching in `useEffect` with no caching.** Every navigation to `Shop` re-fetches all products. Every navigation to `Home` re-fetches featured products, blog posts, and categories independently.

4. **No `Suspense` or streaming.** Page transitions show skeleton loaders driven by local `loading` state, not React Suspense. This approach duplicates loading logic in every page component.

---

## 9. Backend Issues

### Edge Function Issues

1. **`zarinpal-callback` creates an `adminClient` at module scope** (top-level `createClient` call). In Supabase Edge Functions, the module is re-used across requests in the same isolate — this is acceptable but the client is created with a service-role key at startup, meaning the service-role key is held in memory for the lifetime of the isolate. This is the expected Supabase pattern but must be documented.

2. **No logging / observability.** Neither Edge Function emits structured logs, correlation IDs, or error telemetry. Debugging failed payments requires manual Supabase log inspection.

3. **`zarinpal-request` does not decrement stock** after order creation. A product with `stock = 1` can be added to multiple carts simultaneously and multiple orders can be created for the same item before any stock check fails.

4. **No idempotency key on the payment request.** If the network fails after the order is created but before the ZarinPal call, the function returns an error but the `pending` order remains in the database with no cleanup. On retry, a second order will be created for the same cart.

5. **Cart validation in `zarinpal-request` reads from the DB** but does not lock the rows. Two concurrent checkout requests for the same cart could both pass the stock check and both create orders.

### API Architecture Issues

1. **No API abstraction layer.** Supabase queries are scattered directly inside page components and context providers with no service layer, repository pattern, or query hooks. This makes testing impossible and creates duplication.

2. **Direct Supabase calls from every component** means any future backend migration (e.g., moving to a custom REST API) requires touching every page.

3. **No request cancellation.** In `Shop.tsx` a `cancelled` flag is used for the load function, but other components do not cancel in-flight requests when unmounting. This can cause state updates on unmounted components.

---

## 10. Recommended Refactoring Roadmap

### Phase 0 — Immediate Fixes (Before Any Feature Work) `Critical`

These items must be resolved before any further development.

| Priority | Task | Effort |
|----------|------|--------|
| 🔴 CRITICAL | Remove demo credential hint from `AdminLogin.tsx` production UI | 1h |
| 🔴 CRITICAL | Document and implement the admin user promotion process for production | 4h |
| 🔴 CRITICAL | Lock `ALLOWED_ORIGIN` in Edge Functions to the production domain | 1h |
| 🔴 CRITICAL | Add `Origin` header validation to `zarinpal-request` | 2h |
| 🔴 CRITICAL | Fix `window.history.replaceState` → `pushState` for all navigations | 2h |
| 🟠 HIGH | Remove OG image pointing to `bolt.new` — replace with a real asset | 1h |

### Phase 1 — Marketplace Foundation (Core Architecture) `High`

This is the **next implementation step** after Phase 0. The goal is to establish the architecture for a real marketplace without implementing commerce.

| Priority | Task | Effort |
|----------|------|--------|
| 🟠 HIGH | **Install `react-router-dom` v6** and migrate from custom hash router | 1d |
| 🟠 HIGH | **Create `src/types/` directory** and extract all domain interfaces | 4h |
| 🟠 HIGH | **Install React Query (TanStack Query)** for data fetching and caching | 4h |
| 🟠 HIGH | **Implement server-side pagination** — `LIMIT`/`OFFSET` or cursor-based | 1d |
| 🟠 HIGH | **Move filtering to server-side** Supabase queries with `ilike`, `gte`, `lte` | 1d |
| 🟠 HIGH | **Add marketplace database tables:** `creators`, `shops`, `designs`, `collections`, `favorites`, `follows` | 2d |
| 🟠 HIGH | **Separate demo seed from production bundle** — import only in dev/demo mode | 4h |
| 🟠 HIGH | **Split `AdminPanel.tsx`** into separate files per tab | 1d |
| 🟠 HIGH | **Add `ErrorBoundary`** components at route level | 4h |

### Phase 2 — SEO & Performance `High`

| Priority | Task | Effort |
|----------|------|--------|
| 🟠 HIGH | **Add `react-helmet-async`** for per-page `<title>`, `<meta>`, `og:*` tags | 1d |
| 🟠 HIGH | **Image optimization pipeline:** `loading="lazy"`, `width`/`height`, WebP | 1d |
| 🟠 HIGH | **Evaluate Framer Motion usage** — remove or confine to necessary animations | 4h |
| 🟠 HIGH | **`font-display: swap`** for Beiruti to eliminate render-blocking font request | 1h |
| 🟡 MEDIUM | Add `sitemap.xml` and `robots.txt` | 4h |
| 🟡 MEDIUM | Add JSON-LD structured data (Product, BlogPosting) | 1d |

### Phase 3 — Data Integrity & Security Hardening `Medium`

| Priority | Task | Effort |
|----------|------|--------|
| 🟡 MEDIUM | **Materialized or computed `product.rating`** — replace static field with trigger or view | 4h |
| 🟡 MEDIUM | **Link `reviews.user_id` as NOT NULL** and enforce verified-purchase check | 4h |
| 🟡 MEDIUM | **Add database indexes:** `products.category_id`, `products.slug`, `reviews.product_id` | 2h |
| 🟡 MEDIUM | **Add `updated_at` columns** to `products`, `categories`, `reviews` | 1h |
| 🟡 MEDIUM | **Implement soft-delete** for `products` | 4h |
| 🟡 MEDIUM | **Migrate to `flowType: 'pkce'`** in Supabase Auth config | 2h |
| 🟡 MEDIUM | **Separate seed data from schema migrations** | 4h |
| 🟡 MEDIUM | **Add rate limiting** to review submissions (Supabase Edge Function middleware) | 4h |

### Phase 4 — Creator & Marketplace Layer `Future`

> Do not implement until Phase 1–3 are complete.

- Creator registration and profile management
- Shop creation per creator
- Design/product upload by creators
- Collection curation
- Follow system
- Favorites / Wishlist
- Creator dashboards
- Commission and payout model design (no payment implementation yet)

### Phase 5 — Commerce (Last) `Future — Do Not Start`

> Per business mandate, commerce is the final implementation phase.  
> Cart, Checkout, Payment, Orders, Refunds, Payouts — blocked until marketplace layer is stable.

---

## Files Inspected

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `index.html` | Entry HTML, meta tags, font loading |
| `vite.config.ts` | Build configuration, base path, dev server |
| `tailwind.config.js` | Design tokens, animations |
| `src/index.css` | Global styles, component utilities |
| `src/main.tsx` | (implied) React root mount |
| `src/App.tsx` | Custom router, top-level layout |
| `src/lib/supabase.ts` | Supabase client, type definitions |
| `src/lib/localBackend.ts` | In-browser demo backend |
| `src/lib/format.ts` | Price/date formatting, asset URL resolution |
| `src/lib/demoSeed.ts` | (implied) Demo catalogue data |
| `src/context/AuthContext.tsx` | Authentication provider |
| `src/context/CartContext.tsx` | Cart state provider |
| `src/components/Header.tsx` | Top navigation bar |
| `src/components/ProductCard.tsx` | Product tile component |
| `src/components/CheckoutModal.tsx` | Checkout flow modal |
| `src/pages/Home.tsx` | Homepage — hero, categories, products |
| `src/pages/Shop.tsx` | Product listing with filters |
| `src/pages/ProductDetail.tsx` | Product detail + reviews |
| `src/pages/Account.tsx` | User account + order history |
| `src/pages/AdminLogin.tsx` | Admin authentication page |
| `src/pages/AdminPanel.tsx` | Full backoffice management panel |
| `supabase/migrations/20260712202617_create_ecommerce_schema.sql` | Base schema |
| `supabase/migrations/20260712203604_reseed_fashion_data.sql` | Fashion catalogue seed |
| `supabase/migrations/20260820120000_reseed_full_catalog.sql` | Full 94-product catalogue |
| `supabase/migrations/20260822100000_payment_admin.sql` | Payment metadata + admin RLS |
| `supabase/migrations/20260822130000_admin_backoffice.sql` | Backoffice tables + policies |
| `supabase/functions/zarinpal-request/index.ts` | Payment initiation Edge Function |
| `supabase/functions/zarinpal-callback/index.ts` | Payment verification Edge Function |

---

## Biggest Risks Summary

| Risk | Severity | Impact |
|------|----------|--------|
| No marketplace schema — single-vendor only | 🔴 Critical | The entire multi-vendor vision requires a foundational DB redesign |
| Commerce code fully active in the codebase | 🔴 Critical | Contradicts business mandate; creates scope confusion and bundle bloat |
| Demo admin credentials visible to public | 🔴 Critical | Anyone can access the admin panel in demo/dev deployments |
| No pagination — full table loads | 🟠 High | Will become unusable at moderate data volumes |
| No SEO infrastructure | 🟠 High | Persian marketplace cannot be discovered via search engines |
| No test suite | 🟡 Medium | Regressions cannot be detected; refactoring is high-risk |
| Client-side-only filtering | 🟡 Medium | Unfeasible at marketplace scale; must move server-side |

---

## Recommended Next Implementation Step

**Implement Phase 1, Step 1: Replace the custom hash router with `react-router-dom` v6.**

This is the highest-leverage single action because:
1. It unblocks lazy loading of all page components (immediate bundle size reduction).
2. It enables proper browser back/forward navigation.
3. It establishes the routing patterns needed for the marketplace domain (creator pages, shop pages, design pages).
4. It removes the `onNavigate` prop-drilling that currently reaches into every component.
5. It is a self-contained change that can be shipped without touching the database or business logic.

All subsequent architecture work (data layer, SEO, marketplace entities) depends on having a proper router in place.

---

*End of Technical Audit Report*
