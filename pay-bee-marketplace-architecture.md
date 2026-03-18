# Epic Games LK Marketplace — System Architecture

## Overview

This document describes the architecture for a Sri Lankan marketplace that integrates with the Epic Games Partner/Commerce API and provides local installment payment options via Koko and Mintpay. The system is built entirely in Node.js/TypeScript, targets B2C Sri Lankan consumers, uses Google OAuth 2.0 as the sole authentication method, and serves a rich game catalog (cover images, screenshots, videos, full descriptions, system requirements) comparable to the official Epic Games Store. It is designed to accommodate additional payment gateways in the future without structural changes.

All primary tables use **soft deletes** via a `deleted_at` timestamp column — records are never physically removed. A non-refundable **booking fee of LKR 200** is charged at checkout and included in the total amount sent to the payment gateway.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Layer Breakdown](#2-layer-breakdown)
3. [Authentication — Google OAuth 2.0](#3-authentication--google-oauth-20)
4. [Rich Catalog — Fetching & Storing Game Assets](#4-rich-catalog--fetching--storing-game-assets)
5. [Database Schema](#5-database-schema)
6. [Soft Deletes](#6-soft-deletes)
7. [Booking Fee (LKR 200)](#7-booking-fee-lkr-200)
8. [Key Flows](#8-key-flows)
9. [Koko Payment Integration](#9-koko-payment-integration)
10. [Payment Gateway Adapter Design](#10-payment-gateway-adapter-design)
11. [Currency Conversion (USD → LKR)](#11-currency-conversion-usd--lkr)
12. [Project Structure](#12-project-structure)
13. [Environment Configuration](#13-environment-configuration)
14. [Technology Stack Summary](#14-technology-stack-summary)
15. [Future Considerations](#15-future-considerations)

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│              Web App (Next.js/TS) — SSR + CSR                │
│   Game catalog, rich detail pages, checkout, order history   │
└───────────────────────────────┬──────────────────────────────┘
                                │ HTTPS
┌───────────────────────────────▼──────────────────────────────┐
│                      API GATEWAY LAYER                       │
│          Express.js — JWT verification, rate limiting,       │
│                    routing, CORS                             │
└──────────┬──────────────────┬──────────────────┬────────────┘
           │                  │                  │
┌──────────▼──────┐  ┌────────▼────────┐  ┌──────▼──────────┐
│  Auth Service   │  │ Catalog Service  │  │  Order Service  │
│ Google OAuth    │  │ Games, media,    │  │ Checkout,       │
│ JWT issuance    │  │ FX, LKR prices   │  │ installments    │
└─────────────────┘  └────────┬────────┘  └──────┬──────────┘
                              │                  │
                    ┌─────────▼──────────────────▼──────────┐
                    │       Payment Gateway Adapter          │
                    │  Unified interface for all gateways    │
                    └──────────┬──────────────┬─────────────┘
                               │              │
                    ┌──────────▼──┐  ┌────────▼───────┐  ┌──────────────────┐
                    │  Koko API   │  │  Mintpay API   │  │ [Future Gateway] │
                    │ (BNPL/inst) │  │ (installments) │  │  plug-in ready   │
                    └─────────────┘  └────────────────┘  └──────────────────┘

 ┌────────────────────────────────────────────────────────────┐
 │                      EXTERNAL APIs                         │
 │  Epic Games Partner API   Google OAuth   FX Rate Service   │
 └────────────────────────────────────────────────────────────┘

 ┌────────────────────────────────────────────────────────────┐
 │                       DATA LAYER                           │
 │     MySQL (primary DB)    In-process cache (node-cache)    │
 └────────────────────────────────────────────────────────────┘
```

---

## 2. Layer Breakdown

### 2.1 Client Layer

**Technology:** Next.js (App Router) with TypeScript

The frontend is server-side rendered. SSR ensures game detail pages (with full metadata, images, and descriptions) are fast on first load and indexable. Interactive elements (cart, checkout) are client components.

Key responsibilities:

- Rich game catalog with cover art, hero banners, and genre filters
- Full game detail pages: screenshots, video trailers, long-form descriptions, system requirements, ratings
- Google Sign-In button (single login method — no email/password form)
- Checkout with installment plan selector (Koko / Mintpay)
- Order history and entitlement tracking per user

### 2.2 API Gateway Layer

**Technology:** Express.js with TypeScript

Single entry point for all client requests. Handles cross-cutting concerns centrally.

Key responsibilities:

- JWT verification on all protected routes (token issued after Google OAuth)
- Rate limiting (`express-rate-limit`) per IP and per user
- Request routing to downstream services
- Global error handling and response normalisation
- CORS configuration locked to the Next.js frontend origin

### 2.3 Service Layer

Three focused services, each owning a distinct domain:

#### Auth Service

- Initiates and handles the Google OAuth 2.0 callback
- Exchanges the Google authorisation code for a Google ID token, verifies it, and extracts profile data (email, name, avatar)
- Issues a short-lived JWT access token (15 min) and a rotating refresh token (7 days) for the internal API
- Creates or upserts the user record in MySQL on first login
- No password storage — authentication is delegated entirely to Google

#### Catalog Service

- Fetches full game metadata from the Epic Games Partner API: title, description, long description, developer, publisher, release date, genres, age rating, system requirements, cover image, hero image, screenshot URLs, and video trailer URLs
- Stores all metadata and media URLs as a local snapshot in MySQL for resilience and fast serving
- Applies USD → LKR conversion before serving prices to the client
- Caches converted catalog data in-process (`node-cache`, TTL: 10 minutes) to avoid redundant Epic API calls
- Exposes a search and filter endpoint (by genre, price range, name)

#### Order Service

- Creates and manages orders
- Delegates payment initiation to the Payment Gateway Adapter
- Handles the three Koko redirect URLs: `_returnUrl` (user browser redirect on success/failure), `_cancelUrl` (user browser redirect on cancel), `_responseUrl` (authoritative server-to-server POST)
- Verifies the RSA signature on the Koko `_responseUrl` POST before trusting it
- Triggers game entitlement delivery via the Epic Games API on confirmed payment
- Persists full order and installment plan details in MySQL

### 2.4 Payment Gateway Adapter

A dedicated abstraction layer between the Order Service and all payment providers. Adding a new gateway requires only a new provider class — the Order Service is never modified.

```
IPaymentGateway (interface)
├── KokoProvider      ← RSA-signed dataString, 3-URL flow
├── MintpayProvider
└── [FutureProvider]  ← implement interface and register
```

### 2.5 External Integrations

| Service                          | Purpose                                               | Auth method                         |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------- |
| Epic Games Partner API           | Full game catalog, media assets, entitlement delivery | OAuth 2.0 client credentials        |
| Google OAuth 2.0                 | User authentication (sole login method)               | OAuth 2.0 authorisation code flow   |
| Koko API (`prodapi.paykoko.com`) | Buy now, pay later / installment payments             | Merchant ID + API key + RSA signing |
| Mintpay API                      | Installment plans (3/6/12 months)                     | API key + webhook secret            |
| ExchangeRate-API                 | USD → LKR live exchange rate                          | API key                             |

### 2.6 Data Layer

**Primary database:** MySQL
**Caching:** In-process via `node-cache` (no Redis at MVP scale)

The cache is used in exactly two places:

- **FX rates** — TTL 30 minutes; refreshed on expiry from the FX API
- **Catalog snapshots** — TTL 10 minutes per game; prevents hammering the Epic Games API

All catalog media (images, screenshots, trailer URLs) are stored as URLs in MySQL. Actual binary assets are served directly from Epic's CDN — no S3 or file storage needed at MVP.

---

## 3. Authentication — Google OAuth 2.0

Google Sign-In is the **only** login method. No email/password registration form exists.

### Flow summary

```
1. Client clicks "Sign in with Google"
2. Client is redirected to Google's OAuth consent screen
   GET https://accounts.google.com/o/oauth2/v2/auth
       ?client_id=...
       &redirect_uri=https://api.yourdomain.lk/auth/google/callback
       &response_type=code
       &scope=openid email profile

3. Google redirects to our callback with ?code=...
   GET https://api.yourdomain.lk/auth/google/callback?code=...

4. Auth Service exchanges the code for a Google ID token
   POST https://oauth2.googleapis.com/token

5. Auth Service verifies the ID token (google-auth-library)
   Extracts: sub (Google user ID), email, name, picture

6. UPSERT user in MySQL
   (INSERT if new; UPDATE avatar_url / full_name if existing)

7. Issue internal JWT access token (15 min) + refresh token (7 days)
   Set as httpOnly cookies on the response

8. All subsequent API calls use the internal JWT
   Google is not contacted again until re-login or token refresh
```

### User profile fields captured from Google

| Google field | Stored as    | Notes                         |
| ------------ | ------------ | ----------------------------- |
| `sub`        | `google_id`  | Unique Google user identifier |
| `email`      | `email`      |                               |
| `name`       | `full_name`  |                               |
| `picture`    | `avatar_url` | Google profile picture URL    |

### Libraries

```
google-auth-library        — ID token verification and token exchange
passport-google-oauth20    — optional Passport.js middleware wrapper
```

---

## 4. Rich Catalog — Fetching & Storing Game Assets

The Catalog Service fetches and persists the full set of game metadata from the Epic Games Partner API to deliver an experience comparable to the official Epic Games Store.

### Fields fetched per game

| Category       | Fields                                               |
| -------------- | ---------------------------------------------------- |
| Identity       | `productId`, `title`, `slug`                         |
| Marketing copy | `shortDescription`, `longDescription`                |
| Branding       | `developerName`, `publisherName`                     |
| Classification | `genres[]`, `tags[]`, `ageRating`, `releaseDate`     |
| Pricing        | `priceUSD`, `originalPriceUSD`, `discountPercent`    |
| Cover art      | `thumbnailUrl`, `heroImageUrl`, `portraitImageUrl`   |
| Gallery        | `screenshots[]` (up to 10 URLs)                      |
| Video          | `trailerUrl`, `gameplayVideoUrl`                     |
| Requirements   | `minimumRequirements{}`, `recommendedRequirements{}` |
| Ratings        | `criticScore`, `userScore`                           |
| Features       | `features[]` (e.g. "Multiplayer", "Cloud Saves")     |

### Catalog sync strategy

1. **On demand:** When a client requests a game page and the in-process cache has expired (10 min TTL), a fresh fetch is triggered from the Epic API and the MySQL snapshot is updated.
2. **Nightly scheduled refresh:** A `node-cron` job at 02:00 LKT re-fetches the full catalog list, picking up new titles, price changes, and removed games.
3. **LKR price lock:** The LKR price in the snapshot is for display only. At checkout, the LKR amount is always recalculated live using the current FX rate and locked into the order record.

---

## 5. Database Schema

### `users`

| Column       | Type         | Notes                                               |
| ------------ | ------------ | --------------------------------------------------- |
| `id`         | UUID         | Primary key                                         |
| `google_id`  | VARCHAR(255) | Unique Google `sub` claim                           |
| `email`      | VARCHAR(255) | Unique                                              |
| `full_name`  | VARCHAR(255) | From Google profile                                 |
| `avatar_url` | VARCHAR(512) | Google profile picture URL                          |
| `phone`      | VARCHAR(20)  | Optional, user-supplied post-login                  |
| `created_at` | TIMESTAMP    |                                                     |
| `updated_at` | TIMESTAMP    |                                                     |
| `deleted_at` | TIMESTAMP    | NULL = active; soft delete timestamp if deactivated |

> No `password_hash` column — authentication is via Google only.

### `refresh_tokens`

| Column       | Type         | Notes                                           |
| ------------ | ------------ | ----------------------------------------------- |
| `id`         | UUID         | Primary key                                     |
| `user_id`    | UUID         | FK → users                                      |
| `token_hash` | VARCHAR(255) | SHA-256 of the refresh token                    |
| `expires_at` | TIMESTAMP    |                                                 |
| `revoked`    | BOOLEAN      | Default false                                   |
| `deleted_at` | TIMESTAMP    | NULL = active; soft delete timestamp if removed |

### `catalog_snapshots`

| Column                     | Type             | Notes                                                        |
| -------------------------- | ---------------- | ------------------------------------------------------------ |
| `id`                       | UUID             | Primary key                                                  |
| `epic_product_id`          | VARCHAR(255)     | Unique Epic product ID                                       |
| `title`                    | VARCHAR(255)     |                                                              |
| `slug`                     | VARCHAR(255)     | URL-friendly identifier                                      |
| `short_description`        | VARCHAR(500)     |                                                              |
| `long_description`         | LONGTEXT         | Full HTML/markdown description                               |
| `developer_name`           | VARCHAR(255)     |                                                              |
| `publisher_name`           | VARCHAR(255)     |                                                              |
| `genres`                   | JSON             | Array of genre strings                                       |
| `tags`                     | JSON             | Array of tag strings                                         |
| `features`                 | JSON             | Array of feature strings                                     |
| `age_rating`               | VARCHAR(20)      | e.g. "PEGI 18"                                               |
| `release_date`             | DATE             |                                                              |
| `price_usd`                | DECIMAL(10,2)    |                                                              |
| `original_price_usd`       | DECIMAL(10,2)    | Pre-discount price                                           |
| `discount_percent`         | TINYINT          | 0 if no discount                                             |
| `price_lkr`                | DECIMAL(12,2)    | Display price at snapshot time                               |
| `fx_rate_used`             | DECIMAL(10,4)    | FX rate at snapshot time                                     |
| `thumbnail_url`            | VARCHAR(512)     | Small cover image                                            |
| `hero_image_url`           | VARCHAR(512)     | Large hero banner                                            |
| `portrait_image_url`       | VARCHAR(512)     | Portrait key art                                             |
| `screenshots`              | JSON             | Array of screenshot URLs (up to 10)                          |
| `trailer_url`              | VARCHAR(512)     | Nullable                                                     |
| `gameplay_video_url`       | VARCHAR(512)     | Nullable                                                     |
| `minimum_requirements`     | JSON             | `{ os, cpu, ram, gpu, storage }`                             |
| `recommended_requirements` | JSON             | `{ os, cpu, ram, gpu, storage }`                             |
| `critic_score`             | TINYINT UNSIGNED | Nullable                                                     |
| `user_score`               | TINYINT UNSIGNED | Nullable                                                     |
| `snapshotted_at`           | TIMESTAMP        |                                                              |
| `deleted_at`               | TIMESTAMP        | NULL = active; soft delete if game removed from Epic catalog |

### `orders`

| Column                  | Type                                                   | Notes                                         |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------- |
| `id`                    | UUID                                                   | Primary key                                   |
| `user_id`               | UUID                                                   | FK → users                                    |
| `epic_product_id`       | VARCHAR(255)                                           |                                               |
| `game_amount_lkr`       | DECIMAL(12,2)                                          | Game price in LKR, locked at checkout         |
| `booking_fee_lkr`       | DECIMAL(12,2)                                          | Fixed LKR 200.00, non-refundable              |
| `amount_lkr`            | DECIMAL(12,2)                                          | Total = game_amount_lkr + booking_fee_lkr     |
| `amount_usd`            | DECIMAL(10,2)                                          | Game price in USD, for reference              |
| `fx_rate_used`          | DECIMAL(10,4)                                          | Rate at order creation                        |
| `payment_gateway`       | ENUM('koko','mintpay')                                 |                                               |
| `koko_trn_id`           | VARCHAR(255)                                           | Koko `trnId` — populated from webhook         |
| `payment_reference`     | VARCHAR(255)                                           | Internal reference sent to gateway            |
| `status`                | ENUM('pending','paid','failed','cancelled','refunded') |                                               |
| `entitlement_delivered` | BOOLEAN                                                | Default false                                 |
| `created_at`            | TIMESTAMP                                              |                                               |
| `updated_at`            | TIMESTAMP                                              |                                               |
| `deleted_at`            | TIMESTAMP                                              | NULL = active; soft delete if order is voided |

### `installment_plans`

| Column                  | Type                   | Notes                                        |
| ----------------------- | ---------------------- | -------------------------------------------- |
| `id`                    | UUID                   | Primary key                                  |
| `order_id`              | UUID                   | FK → orders                                  |
| `gateway`               | ENUM('koko','mintpay') |                                              |
| `plan_months`           | TINYINT                | 3, 6, or 12                                  |
| `instalment_amount_lkr` | DECIMAL(12,2)          | Per-month amount                             |
| `total_repayable_lkr`   | DECIMAL(12,2)          | Including interest                           |
| `gateway_plan_id`       | VARCHAR(255)           | Gateway's own plan reference                 |
| `created_at`            | TIMESTAMP              |                                              |
| `deleted_at`            | TIMESTAMP              | NULL = active; soft delete if plan is voided |

---

## 6. Soft Deletes

All five primary tables (`users`, `refresh_tokens`, `catalog_snapshots`, `orders`, `installment_plans`) use a `deleted_at TIMESTAMP NULL` column for soft deletes. Records are **never physically removed** from the database.

### Convention

| `deleted_at` value | Meaning                                                            |
| ------------------ | ------------------------------------------------------------------ |
| `NULL`             | Record is active                                                   |
| any timestamp      | Record is soft-deleted; treat as non-existent in application logic |

### Prisma configuration

All models use Prisma's `@default(null)` on `deleted_at` and a global middleware filter to exclude soft-deleted rows from every query automatically:

```typescript
// db/prisma.ts
prisma.$use(async (params, next) => {
  const softDeleteModels = [
    "User",
    "RefreshToken",
    "CatalogSnapshot",
    "Order",
    "InstallmentPlan",
  ];
  if (softDeleteModels.includes(params.model ?? "")) {
    if (params.action === "findUnique" || params.action === "findFirst") {
      params.action = "findFirst";
      params.args.where = { ...params.args.where, deleted_at: null };
    }
    if (params.action === "findMany") {
      params.args = params.args ?? {};
      params.args.where = { ...params.args.where, deleted_at: null };
    }
  }
  return next(params);
});
```

### Performing a soft delete

```typescript
// Never use prisma.order.delete()
// Always use:
await prisma.order.update({
  where: { id: orderId },
  data: { deleted_at: new Date() },
});
```

### When each table is soft-deleted

| Table               | Trigger                                                                          |
| ------------------- | -------------------------------------------------------------------------------- |
| `users`             | Account deactivation request from the user                                       |
| `refresh_tokens`    | Logout, token rotation, or account deactivation                                  |
| `catalog_snapshots` | Game removed from the Epic Games catalog during nightly sync                     |
| `orders`            | Admin voids an order (e.g. fraud review); `status` must be `pending` or `failed` |
| `installment_plans` | Voided alongside its parent order                                                |

### Querying soft-deleted records (admin only)

Admin endpoints bypass the global middleware filter by passing `deleted_at: { not: null }` or omitting the filter entirely using a raw Prisma query. This is intentional — soft-deleted data is retained for audit, dispute resolution, and financial reconciliation.

---

## 7. Booking Fee (LKR 200)

A non-refundable **booking fee of LKR 200** is added to every order at checkout. It is charged as part of the total amount sent to the payment gateway and is not a separate transaction.

### Rationale

The booking fee covers payment processing costs and platform overhead for installment orders. It is disclosed to the user on the checkout page before confirmation.

### How it is applied

```typescript
// order.service.ts

const BOOKING_FEE_LKR = 200;

export async function createOrder(
  userId: string,
  epicProductId: string,
  gateway: "koko" | "mintpay",
): Promise<Order> {
  const fxRate = await getUSDtoLKR();
  const product = await getCatalogSnapshot(epicProductId);
  const gameAmountLKR = convertUSDtoLKR(product.price_usd, fxRate);
  const totalLKR = gameAmountLKR + BOOKING_FEE_LKR;

  const order = await prisma.order.create({
    data: {
      user_id: userId,
      epic_product_id: epicProductId,
      game_amount_lkr: gameAmountLKR,
      booking_fee_lkr: BOOKING_FEE_LKR,
      amount_lkr: totalLKR, // this is what is sent to the gateway
      amount_usd: product.price_usd,
      fx_rate_used: fxRate,
      payment_gateway: gateway,
      status: "pending",
    },
  });

  return order;
}
```

### Checkout UI display

The checkout page must clearly itemise the booking fee before the user confirms payment:

```
Game price          LKR 12,800.00
Booking fee                200.00
─────────────────────────────────
Total charged       LKR 13,000.00

  Non-refundable booking fee applies.
```

### Refund policy

| Scenario                                          | Game amount    | Booking fee    |
| ------------------------------------------------- | -------------- | -------------- |
| Order failed / cancelled before payment           | Not charged    | Not charged    |
| Payment successful, entitlement not yet delivered | Refundable     | Non-refundable |
| Entitlement delivered                             | Non-refundable | Non-refundable |

The `booking_fee_lkr` column is stored on the order record so that refund calculations in future admin tools always use the exact fee that was charged, not the current constant.

---

## 8. Key Flows

### 8.1 Google Login Flow

```
Client  →  GET /auth/google
            → Auth Service redirects to Google consent screen

Google  →  GET /auth/google/callback?code=...
            → Auth Service exchanges code for Google ID token
            → Verifies ID token with google-auth-library
            → Extracts: google_id, email, full_name, avatar_url
            → UPSERT into users table (deleted_at must be NULL — reject deactivated accounts)
            → Issues JWT access token (15 min)
            → Issues refresh token (7 days, stored hashed)
            → Redirects client to /catalog with tokens in httpOnly cookies
```

### 8.2 Browse & Game Detail Flow

```
Client  →  GET /catalog?genre=action&page=1
            → Catalog Service checks in-process cache (TTL 10 min)
            → Cache miss: fetch from Epic Games API
            → Apply USD → LKR conversion (FX rate cached 30 min)
            → Store/update catalog_snapshots in MySQL (WHERE deleted_at IS NULL)
            → Return paginated list:
              { title, thumbnail_url, price_lkr, genres, discount_percent }

Client  →  GET /catalog/:slug
            → Return full snapshot (deleted_at IS NULL):
              { hero_image_url, portrait_image_url, screenshots[],
                trailer_url, gameplay_video_url, long_description,
                minimum_requirements, recommended_requirements,
                features[], critic_score, user_score }
```

### 8.3 Checkout & Installment Payment Flow

```
Client  →  POST /orders  { epicProductId, gateway: 'koko' }
            → Verify JWT (user deleted_at must be NULL)
            → Recalculate live LKR game price at current FX rate
            → Add booking fee: total = game_amount_lkr + 200
            → INSERT order:
                game_amount_lkr, booking_fee_lkr=200, amount_lkr=total
                status: pending
            → Build Koko payload with amount_lkr as _amount (see Section 9)
            → Construct dataString in exact Koko field order
            → Sign with merchant RSA private key → base64 signature
            → POST to prodapi.paykoko.com/api/merchants/orderCreate
            → Receive Koko checkout URL
            → Return { checkoutUrl } to client

Client  →  Redirect to Koko checkout page
            → User sees total (game + booking fee) and selects installment plan

── Authoritative backend confirmation ────────────────────────

Koko    →  POST /webhooks/koko/response  (_responseUrl)
            (application/x-www-form-urlencoded)
            → Order Service:
                Concatenate: orderId + trnId + status
                crypto.createVerify('SHA256') with Koko public key
                Signature invalid → HTTP 400, log and abort
                Signature valid:
                  UPDATE order.status = paid | failed
                  UPDATE order.koko_trn_id = trnId
                  If paid:
                    INSERT installment_plan
                    Call Epic Games API → deliver entitlement
                    SET entitlement_delivered = true

── Frontend redirect (display only — not trusted) ────────────

Koko    →  Redirect to _returnUrl?orderId=...&status=SUCCESS|FAILURE
        →  Redirect to _cancelUrl?orderId=...&status=CANCELED
            → Frontend shows result screen based on status param
            → Entitlement is NEVER triggered from this redirect
```

---

## 9. Koko Payment Integration

### 9.1 Overview

Koko uses a three-URL model for the payment lifecycle:

| URL parameter  | Triggered by  | Direction                    | Purpose                                   |
| -------------- | ------------- | ---------------------------- | ----------------------------------------- |
| `_returnUrl`   | Koko frontend | Browser redirect to merchant | Return user to site on success or failure |
| `_cancelUrl`   | Koko frontend | Browser redirect to merchant | Return user to site on cancellation       |
| `_responseUrl` | Koko backend  | Server-to-server POST        | Authoritative payment confirmation        |

The `_responseUrl` server-to-server POST is the **only** trustworthy signal. The `_returnUrl` redirect is client-side and can be manipulated — never use it to trigger entitlement delivery.

**Koko API environments:**

| Environment | Base URL              |
| ----------- | --------------------- |
| Dev         | `devapi.paykoko.com`  |
| QA          | `qaapi.paykoko.com`   |
| Production  | `prodapi.paykoko.com` |

**Endpoint:** `POST /api/merchants/orderCreate`
**Content-Type:** `application/x-www-form-urlencoded`

### 9.2 dataString Construction & RSA Signing

The `dataString` must be constructed in the **exact field order** defined by Koko. Any deviation causes RSA signature verification to fail on Koko's side.

**Concatenation order (not alphabetical):**

```
_mId + _amount + _currency + _pluginName + _pluginVersion +
_returnUrl + _cancelUrl + _orderId + _reference +
_firstName + _lastName + _email + _description +
api_key + _responseUrl
```

The `signature` field is a Base64-encoded RSA SHA-256 signature of the raw bytes of `dataString`, produced with the **merchant RSA private key** issued by Koko.

```typescript
import crypto from "crypto";

export function buildKokoDataString(p: KokoSigningParams): string {
  return (
    p.mId +
    p.amount +
    p.currency +
    p.pluginName +
    p.pluginVersion +
    p.returnUrl +
    p.cancelUrl +
    p.orderId +
    p.reference +
    p.firstName +
    p.lastName +
    p.email +
    p.description +
    p.apiKey +
    p.responseUrl
  );
}

export function signKokoDataString(
  dataString: string,
  merchantPrivateKeyPem: string,
): string {
  const sign = crypto.createSign("SHA256");
  sign.update(Buffer.from(dataString));
  sign.end();
  return sign.sign(merchantPrivateKeyPem, "base64");
}
```

### 9.3 KokoProvider Implementation

```typescript
import qs from "qs";
import crypto from "crypto";
import {
  IPaymentGateway,
  PaymentPayload,
  PaymentSession,
  WebhookResult,
} from "../types";
import { buildKokoDataString, signKokoDataString } from "./koko.signing";

export class KokoProvider implements IPaymentGateway {
  private readonly baseUrl = process.env.KOKO_API_BASE!;
  private readonly merchantId = process.env.KOKO_MERCHANT_ID!;
  private readonly apiKey = process.env.KOKO_API_KEY!;
  private readonly privateKey = process.env.KOKO_MERCHANT_PRIVATE_KEY!;
  private readonly publicKey = process.env.KOKO_PUBLIC_KEY!;
  private readonly pluginName = "customapi";
  private readonly pluginVersion = "1.0.0";

  async initiatePayment(payload: PaymentPayload): Promise<PaymentSession> {
    const base = process.env.WEBHOOK_BASE_URL!;
    const returnUrl = `${base}/koko/return?orderId=${payload.orderId}`;
    const cancelUrl = `${base}/koko/cancel?orderId=${payload.orderId}`;
    const responseUrl = `${base}/koko/response`;

    const p = {
      _mId: this.merchantId,
      api_key: this.apiKey,
      _returnUrl: returnUrl,
      _cancelUrl: cancelUrl,
      _responseUrl: responseUrl,
      _amount: payload.amountLKR.toFixed(2),
      _currency: "LKR",
      _reference: payload.orderId,
      _orderId: payload.orderId,
      _pluginName: this.pluginName,
      _pluginVersion: this.pluginVersion,
      _description: payload.productName,
      _firstName: payload.customerFirstName,
      _lastName: payload.customerLastName,
      _email: payload.customerEmail,
    };

    const dataString = buildKokoDataString({
      mId: p._mId,
      amount: p._amount,
      currency: p._currency,
      pluginName: p._pluginName,
      pluginVersion: p._pluginVersion,
      returnUrl: p._returnUrl,
      cancelUrl: p._cancelUrl,
      orderId: p._orderId,
      reference: p._reference,
      firstName: p._firstName,
      lastName: p._lastName,
      email: p._email,
      description: p._description,
      apiKey: p.api_key,
      responseUrl: p._responseUrl,
    });

    const signature = signKokoDataString(dataString, this.privateKey);

    const res = await fetch(
      `https://${this.baseUrl}/api/merchants/orderCreate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: qs.stringify({ ...p, dataString, signature }),
      },
    );

    if (!res.ok) throw new Error(`Koko orderCreate failed: HTTP ${res.status}`);
    const data = await res.json();

    return {
      checkoutUrl: data.checkoutUrl,
      gatewayReference: data.orderId ?? payload.orderId,
    };
  }

  verifyWebhook(body: Record<string, string>): boolean {
    // Koko backend signs: orderId + trnId + status using Koko's private key
    // We verify using the Koko RSA public key provided by the Koko merchant team
    const dataString = body.orderId + body.trnId + body.status;
    const verify = crypto.createVerify("SHA256");
    verify.update(Buffer.from(dataString));
    verify.end();
    try {
      return verify.verify(
        this.publicKey,
        Buffer.from(body.signature, "base64"),
      );
    } catch {
      return false;
    }
  }

  parseWebhookResult(body: Record<string, string>): WebhookResult {
    return {
      orderId: body.orderId,
      status: body.status === "SUCCESS" ? "paid" : "failed",
      gatewayReference: body.trnId,
    };
  }
}
```

### 9.4 Response URL Webhook Verification

The `_responseUrl` POST body fields (sent as `application/x-www-form-urlencoded`):

| Field       | Example             | Notes                                       |
| ----------- | ------------------- | ------------------------------------------- |
| `orderId`   | `400702`            | Our internal order ID                       |
| `trnId`     | `f7ec3q588eq435...` | Koko transaction ID                         |
| `status`    | `SUCCESS`           | Always `SUCCESS` for this endpoint          |
| `desc`      | `""`                | Reserved, currently empty                   |
| `signature` | Base64 string       | RSA signature of `orderId + trnId + status` |

Verification steps in the Order Service webhook handler:

1. Parse the `application/x-www-form-urlencoded` body
2. Call `kokoProvider.verifyWebhook(body)`
3. If `false` → respond HTTP 400, log the attempt, abort — do not update the order
4. If `true` → update order status, store `trnId`, deliver entitlement if paid

---

## 10. Payment Gateway Adapter Design

```typescript
// types.ts

export interface PaymentPayload {
  orderId: string;
  amountLKR: number;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  productName: string;
}

export interface PaymentSession {
  checkoutUrl: string;
  gatewayReference: string;
}

export interface WebhookResult {
  orderId: string;
  status: "paid" | "failed" | "cancelled";
  gatewayReference: string;
  installmentPlan?: {
    months: number;
    instalmentLKR: number;
    totalRepayable: number;
    gatewayPlanId: string;
  };
}

export interface IPaymentGateway {
  initiatePayment(payload: PaymentPayload): Promise<PaymentSession>;
  verifyWebhook(body: Record<string, string>): boolean;
  parseWebhookResult(body: Record<string, string>): WebhookResult;
}

// adapter.ts

export class PaymentGatewayAdapter {
  private providers = new Map<string, IPaymentGateway>([
    ["koko", new KokoProvider()],
    ["mintpay", new MintpayProvider()],
  ]);

  get(gateway: string): IPaymentGateway {
    const p = this.providers.get(gateway);
    if (!p) throw new Error(`Unknown payment gateway: ${gateway}`);
    return p;
  }
}
```

Adding a future gateway (e.g. PayHere):

```typescript
// 1. Implement the interface
export class PayHereProvider implements IPaymentGateway { ... }

// 2. Register — the Order Service is never modified
this.providers.set('payhere', new PayHereProvider());
```

---

## 11. Currency Conversion (USD → LKR)

```typescript
import NodeCache from "node-cache";

const fxCache = new NodeCache({ stdTTL: 1800 }); // 30 minutes

export async function getUSDtoLKR(): Promise<number> {
  const cached = fxCache.get<number>("USD_LKR");
  if (cached !== undefined) return cached;

  const res = await fetch(
    `https://v6.exchangerate-api.com/v6/${process.env.FX_API_KEY}/latest/USD`,
  );
  const data = await res.json();
  const rate: number = data.conversion_rates.LKR;

  fxCache.set("USD_LKR", rate);
  return rate;
}

export function convertUSDtoLKR(usd: number, rate: number): number {
  return Math.ceil(usd * rate); // always round up — never short-charge
}
```

- The rate at snapshot time is stored in `catalog_snapshots.fx_rate_used` for auditability.
- At checkout, the LKR amount is always recalculated live — never read from the catalog snapshot.
- The locked rate and amount are stored in `orders.fx_rate_used` and `orders.amount_lkr` to support dispute resolution.

---

## 12. Project Structure

```
pay-bee/
├── apps/
│   ├── web/                              # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── callback/             # Google OAuth callback page
│   │   │   ├── catalog/
│   │   │   │   ├── page.tsx              # Catalog grid with filters
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx          # Rich game detail page
│   │   │   ├── checkout/
│   │   │   │   └── page.tsx              # Installment plan selector
│   │   │   ├── orders/
│   │   │   │   └── page.tsx              # Order history
│   │   │   └── layout.tsx
│   │   └── package.json
│   │
│   └── api/                              # Express API
│       ├── src/
│       │   ├── gateway/
│       │   │   ├── index.ts              # Express entry point
│       │   │   ├── middleware/
│       │   │   │   ├── auth.middleware.ts
│       │   │   │   └── rateLimit.middleware.ts
│       │   │   └── routes/
│       │   ├── services/
│       │   │   ├── auth/
│       │   │   │   ├── auth.service.ts   # Google OAuth, JWT issuance
│       │   │   │   └── auth.routes.ts    # GET /auth/google, /callback
│       │   │   ├── catalog/
│       │   │   │   ├── catalog.service.ts
│       │   │   │   ├── catalog.routes.ts
│       │   │   │   └── catalog.cache.ts  # node-cache instance (10 min TTL)
│       │   │   └── order/
│       │   │       ├── order.service.ts
│       │   │       ├── order.routes.ts
│       │   │       └── webhook.routes.ts # POST /webhooks/koko/response etc.
│       │   ├── payment/
│       │   │   ├── adapter.ts
│       │   │   ├── types.ts
│       │   │   └── providers/
│       │   │       ├── koko.provider.ts
│       │   │       ├── koko.signing.ts   # dataString + RSA sign/verify
│       │   │       └── mintpay.provider.ts
│       │   ├── db/
│       │   │   ├── prisma.ts             # Prisma client singleton
│       │   │   └── schema.prisma
│       │   ├── fx/
│       │   │   └── fx.service.ts         # USD→LKR, node-cache 30 min TTL
│       │   └── utils/
│       └── package.json
│
├── packages/
│   └── shared/                           # Shared TS types (web + api)
│       └── src/
│           ├── catalog.types.ts
│           ├── order.types.ts
│           └── auth.types.ts
│
└── package.json                          # npm workspaces root
```

---

## 13. Environment Configuration

```env
# ── Server ────────────────────────────────────────────────────
PORT=3000
NODE_ENV=production

# ── JWT (internal tokens) ─────────────────────────────────────
JWT_SECRET=<strong-random-secret>
JWT_ACCESS_TTL=900        # 15 minutes (seconds)
JWT_REFRESH_TTL=604800    # 7 days (seconds)

# ── MySQL ─────────────────────────────────────────────────────
DATABASE_URL=mysql://app_user:<password>@localhost:3306/epic_lk

# ── Google OAuth ──────────────────────────────────────────────
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_CALLBACK_URL=https://api.yourdomain.lk/auth/google/callback

# ── Epic Games ────────────────────────────────────────────────
EPIC_CLIENT_ID=<epic-client-id>
EPIC_CLIENT_SECRET=<epic-client-secret>
EPIC_API_BASE=https://api.epicgames.dev

# ── FX Rate ───────────────────────────────────────────────────
FX_API_KEY=<exchangerate-api-key>

# ── Koko ──────────────────────────────────────────────────────
KOKO_API_BASE=prodapi.paykoko.com
KOKO_MERCHANT_ID=<encrypted-merchant-id-from-koko>
KOKO_API_KEY=<koko-api-key>
KOKO_MERCHANT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
KOKO_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# ── Mintpay ───────────────────────────────────────────────────
MINTPAY_API_KEY=<key>
MINTPAY_API_BASE=https://api.mintpay.lk
MINTPAY_WEBHOOK_SECRET=<secret>

# ── App URLs ──────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=https://api.yourdomain.lk
WEBHOOK_BASE_URL=https://api.yourdomain.lk/webhooks
```

> **Security:** Never commit RSA private keys or OAuth secrets to source control. Use a secrets manager (AWS Secrets Manager, Railway secret variables, etc.) and inject at runtime.

---

## 14. Technology Stack Summary

| Layer          | Technology                               | Rationale                                           |
| -------------- | ---------------------------------------- | --------------------------------------------------- |
| Frontend       | Next.js + TypeScript                     | SSR for rich catalog pages, unified TS stack        |
| API Gateway    | Express.js + TypeScript                  | Lightweight, flexible middleware                    |
| Authentication | Google OAuth 2.0 (`google-auth-library`) | No password storage, fast user onboarding           |
| Services       | Node.js + TypeScript                     | Consistent across the codebase                      |
| Caching        | `node-cache` (in-process)                | Zero operational overhead for MVP                   |
| Database       | MySQL via Prisma                         | Relational integrity, type-safe queries, migrations |
| Koko signing   | Node.js `crypto` (RSA SHA-256)           | Native module, no extra dependency                  |
| Catalog cron   | `node-cron`                              | Nightly full-catalog refresh, lightweight           |
| Monorepo       | npm workspaces                           | Shared types between `web` and `api`                |

---

## 13. Future Considerations

### Deployment

The monorepo is deployment-agnostic. Recommended starting points:

- **Low cost / fast:** Railway or Render — Next.js and API as separate services, managed MySQL. Secrets stored in platform environment variables.
- **Production scale:** AWS — ECS Fargate for the API, RDS MySQL, CloudFront for Next.js, Secrets Manager for RSA keys and OAuth credentials.

### When to add Redis

`node-cache` works correctly on a single API instance. If the API is scaled horizontally behind a load balancer, each instance holds an independent cache — FX rates and catalog data become inconsistent across instances. At that point, swap `node-cache` for `ioredis`. The swap is localised to `fx.service.ts` and `catalog.cache.ts`; no business logic changes.

### Email / SMS notifications

Not in MVP scope. When added, trigger from the Order Service on status transitions (`pending → paid`, `paid → entitlement_delivered`). Recommended: **Postmark** for transactional email, **Notify.lk** for SMS to Sri Lankan numbers.

### Admin dashboard

A separate internal Next.js app with an `admin` role claim in the JWT. Key views: order list with status filters, installment plan details per order, FX rate history log, catalog sync status, and Koko/Mintpay transaction references.

### Koko test environments

During development, set `KOKO_API_BASE=devapi.paykoko.com` (dev) or `qaapi.paykoko.com` (QA). Koko issues separate credential sets (Merchant ID, API key, RSA key pair) per environment — do not reuse production credentials in dev or QA.
