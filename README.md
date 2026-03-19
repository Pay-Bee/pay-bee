# Pay-Bee

A game key marketplace that lets customers buy Epic Games titles in LKR using local Sri Lankan payment options (Payzy & Koko installment plans).

---

## Project Structure

```
pay-bee/                         ← monorepo root (npm workspaces)
├── apps/
│   ├── api/                     ← Express + TypeScript REST API  (port 3001)
│   └── web/                     ← Next.js 16 frontend            (port 3000)
└── packages/
    └── shared/                  ← Shared TypeScript types used by both apps
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Backend | Express 4, TypeScript, ts-node |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (access + refresh tokens via httpOnly cookies), Google OAuth 2.0 |
| Payments | Payzy, Koko |
| Monorepo | npm workspaces |

---

## Prerequisites

Make sure the following are installed before setting up locally:

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **npm** v9 or higher (comes with Node)
- **PostgreSQL** — a Supabase project or local PostgreSQL instance on port `5432`

---

## Local Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd pay-bee
```

### 2. Install all dependencies

Run this once from the **root** of the monorepo. It installs packages for all workspaces.

```bash
npm install
```

### 3. Configure environment variables

Create a single `.env` file in the **root** of the repo (both apps read from here):

```bash
# ── Database ──────────────────────────────────────────────────
# Supabase Session Pooler (recommended):
DATABASE_URL=postgresql://postgres.xxxx:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
# Local PostgreSQL:
# DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/pay_bee

# ── JWT ───────────────────────────────────────────────────────
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# ── Google OAuth (optional — skip for email/password-only dev) ─
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# ── App URLs ──────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# ── Node ──────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001
```

> **Supabase tip:** Use the **Session Pooler** URL from Supabase Dashboard → Project Settings → Database → Connection pooling → Session mode. This uses IPv4 and is required on Windows.
>
> **`GOOGLE_CLIENT_ID`** is optional. If omitted, Google login is stubbed and still works in development.

### 4. Run database migrations

The API auto-runs the schema on startup, but you can also run it manually:

```bash
npm run db:init --workspace=apps/api
```

This creates all tables (`customers`, `games`, `orders`, `cart_items`, `game_requests`, etc.) using `apps/api/src/db/schema.sql`.

### 5. (Optional) Seed the database

Populate the database with sample game data:

```bash
npm run seed --workspace=apps/api
```

### 6. Start the development servers

Run both the API and the web app at the same time from the root:

```bash
npm run dev
```

Or start them individually in separate terminals:

```bash
# Terminal 1 — API server on http://localhost:3001
npm run dev:api

# Terminal 2 — Next.js frontend on http://localhost:3000
npm run dev:web
```

Open **http://localhost:3000** in your browser.

---

## Available Scripts

Run these from the **monorepo root**:

| Command | Description |
|---|---|
| `npm run dev` | Start both API and web in development mode |
| `npm run dev:api` | Start only the API server |
| `npm run dev:web` | Start only the Next.js frontend |
| `npm run build` | Build both apps for production |
| `npm run db:init --workspace=apps/api` | Run schema migrations manually |
| `npm run seed --workspace=apps/api` | Seed the database with sample data |

---

## API Overview

The API runs on `http://localhost:3001`. All endpoints are prefixed as shown below.

| Prefix | Description |
|---|---|
| `POST /auth/register` | Register with email + password |
| `POST /auth/login` | Login with email + password |
| `GET /auth/google` | Redirect to Google OAuth consent screen |
| `GET /auth/me` | Get current authenticated user profile |
| `PATCH /auth/profile` | Update name / email |
| `PATCH /auth/password` | Change password (custom accounts only) |
| `POST /auth/logout` | Clear auth cookies |
| `GET /catalog` | List games (with filters, pagination) |
| `GET /catalog/:slug` | Get a single game by slug |
| `GET /catalog/search?q=` | Search games by name |
| `GET /cart` | Get current user's cart |
| `POST /cart` | Add a game to cart |
| `DELETE /cart/:gameId` | Remove a game from cart |
| `POST /orders` | Create a new order |
| `GET /orders` | Get current user's order history |
| `DELETE /orders/:id` | Remove a DONE/CANCELED order from history |
| `POST /game-requests` | Submit a game request (auth required) |

---

## Authentication

- Auth uses **httpOnly cookies** — no tokens are stored in `localStorage`.
- The frontend axios client in `apps/web/lib/api.ts` automatically calls `POST /auth/refresh` when it receives a `401`, then retries the original request.
- Access token expires in **15 minutes**; refresh token expires in **7 days**.

---

## Key Directories

```
apps/api/src/
├── db/
│   ├── schema.sql          ← PostgreSQL schema (auto-run on startup)
│   ├── init.ts             ← DB init script (npm run db:init)
│   └── db.ts               ← pg connection pool
├── gateway/
│   ├── index.ts            ← Express app entry point, middleware, route registration
│   └── middleware/
│       ├── auth.middleware.ts    ← JWT verification, requireAuth guard
│       └── rateLimit.middleware.ts
└── services/
    ├── auth/               ← Registration, login, Google OAuth, JWT, profile
    ├── cart/               ← Cart CRUD
    ├── catalog/            ← Game listing, search, caching
    ├── order/              ← Order creation, history, webhooks
    └── game-requests/      ← Customer game request submissions

apps/web/app/
├── components/
│   ├── Navbar.tsx          ← Navigation + search + request game modal
│   └── Footer.tsx
├── (auth)/                 ← Login, register, OAuth callback pages
├── catalog/                ← Game store listing + game detail pages
├── cart/                   ← Shopping cart page
├── checkout/               ← Checkout + payment method selection
├── orders/                 ← Order history page
├── account/                ← My account (profile + password change)
└── help/                   ← How it works, FAQ, contact

packages/shared/src/
├── auth.types.ts
├── cart.types.ts
├── catalog.types.ts
└── order.types.ts
```

---

## Environment Variable Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://postgres:@localhost:5432/pay_bee` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | — | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for signing refresh tokens |
| `PORT` | No | `3001` | API server port |
| `NODE_ENV` | No | `development` | Set to `production` for secure cookies |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | No | `http://localhost:3001/auth/google/callback` | OAuth redirect URI |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | API base URL used by the frontend |
| `FRONTEND_URL` | No | `http://localhost:3000` | Allowed CORS origin |

---

## Common Issues

**`ENOTFOUND db.xxx.supabase.co`** — You are using the direct connection URL. Switch to the **Session Pooler URL** from Supabase Dashboard → Project Settings → Database → Connection pooling → Session mode.

**`connect ECONNREFUSED 127.0.0.1:5432`** — Local PostgreSQL is not running. Start it with `brew services start postgresql` (macOS) or `net start postgresql` (Windows).

**`Cannot find module 'shared'`** — Run `npm install` from the repo root to link workspace packages.

**Port conflict on 3000** — The Next.js dev server uses port `3000` by default. Change it in `apps/web/package.json` (`next dev --port XXXX`) and update `FRONTEND_URL` accordingly.

**Google OAuth not working** — If `GOOGLE_CLIENT_ID` is missing, Google login is automatically stubbed and redirects to the callback with a test user. This is expected behaviour in development.
