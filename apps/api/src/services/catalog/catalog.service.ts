import pool from "../../db/db";
import { getUSDtoLKR, convertUSDtoLKR } from "../../fx/fx.service";
import catalogCache from "./catalog.cache";
import { CatalogFilters, Game, GameListItem } from "shared";

// ── Helper: slugify a game title ──────────────────────────────
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// ── Parse a raw DB row into Game ───────────────────────────────
function rowToGame(row: Record<string, unknown>): Game {
  const parse = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : (v ?? []));
  return {
    id: Number(row.id),
    title: row.title as string,
    slug: row.slug as string,
    short_description: row.short_description as string | null,
    long_description: row.long_description as string | null,
    developer: row.developer as string | null,
    publisher: row.publisher as string | null,
    genres: parse(row.genres) as string[],
    features: parse(row.features) as string[],
    platforms: parse(row.platforms) as Game["platforms"],
    release_date: row.release_date as string | null,
    steam_app_id: row.steam_app_id as string | null,
    cover_img_url: row.cover_img_url as string | null,
    trailer_video_url: row.trailer_video_url as string | null,
    screenshots: parse(row.screenshots) as string[],
    price_usd: Number(row.price_usd),
    price_lkr: Number(row.price_lkr),
    fx_rate_used: Number(row.fx_rate_used),
    discount_percent: Number(row.discount_percent),
    price_updated_at: row.price_updated_at as Date,
    active: Boolean(row.active),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

// ── Input type for manually adding a game ─────────────────────
interface CreateGameInput {
  title: string;
  slug?: string;
  short_description?: string;
  long_description?: string;
  developer?: string;
  publisher?: string;
  genres?: string[];
  features?: string[];
  platforms?: string[];
  price_usd: number;
  discount_percent?: number;
  steam_app_id?: string;
  cover_img_url?: string;
  trailer_video_url?: string;
  hero_image_url?: string; // alias accepted from seed script
  thumbnail_url?: string;  // alias accepted from seed script
  screenshots?: string[];
  release_date?: string; // YYYY-MM-DD
}

// ── Create a game manually ────────────────────────────────────
export async function createGame(data: CreateGameInput): Promise<void> {
  const fxRate = await getUSDtoLKR();
  const discountPct = data.discount_percent ?? 0;
  const discountedUSD = data.price_usd * (1 - discountPct / 100);
  const priceLkr = convertUSDtoLKR(discountedUSD, fxRate);
  const slug = data.slug ?? slugify(data.title);

  // Accept thumbnail_url/hero_image_url as aliases for cover_img_url
  const coverImg = data.cover_img_url ?? data.thumbnail_url ?? null;

  await pool.query(
    `INSERT INTO games
       (title, slug, short_description, long_description,
        developer, publisher,
        genres, features, platforms,
        release_date, steam_app_id,
        cover_img_url, trailer_video_url, screenshots,
        price_usd, price_lkr, fx_rate_used, discount_percent,
        price_updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())`,
    [
      data.title,
      slug,
      data.short_description ?? null,
      data.long_description ?? null,
      data.developer ?? null,
      data.publisher ?? null,
      JSON.stringify(data.genres ?? []),
      JSON.stringify(data.features ?? []),
      JSON.stringify(data.platforms ?? ["Windows"]),
      data.release_date ?? null,
      data.steam_app_id ?? null,
      coverImg,
      data.trailer_video_url ?? null,
      JSON.stringify(data.screenshots ?? []),
      data.price_usd,
      priceLkr,
      fxRate,
      discountPct,
    ]
  );
}

// ── List games ─────────────────────────────────────────────────
export async function listGames(filters: CatalogFilters): Promise<{
  data: GameListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ["active = TRUE"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];

  function nextParam(value: unknown): string {
    params.push(value);
    return `$${params.length}`;
  }

  if (filters.name) {
    conditions.push(`title ILIKE ${nextParam(`%${filters.name}%`)}`);
  }
  if (filters.genre) {
    conditions.push(`genres @> ${nextParam(JSON.stringify([filters.genre]))}::jsonb`);
  }
  if (filters.minPrice !== undefined) {
    conditions.push(`price_lkr >= ${nextParam(filters.minPrice)}`);
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(`price_lkr <= ${nextParam(filters.maxPrice)}`);
  }
  if (filters.platform) {
    conditions.push(`platforms @> ${nextParam(JSON.stringify([filters.platform]))}::jsonb`);
  }
  if (filters.features) {
    for (const f of filters.features.split(",").map((s) => s.trim()).filter(Boolean)) {
      conditions.push(`features @> ${nextParam(JSON.stringify([f]))}::jsonb`);
    }
  }

  const ORDER: Record<string, string> = {
    newest:     "created_at DESC",
    alpha:      "title ASC",
    price_asc:  "price_lkr ASC",
    price_desc: "price_lkr DESC",
  };
  const orderBy = ORDER[filters.sort ?? "newest"] ?? ORDER.newest;

  const where = conditions.join(" AND ");

  const { rows } = await pool.query(
    `SELECT id, title, slug, short_description, genres, platforms,
            price_usd, price_lkr, discount_percent, cover_img_url
     FROM games
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT ${pageSize} OFFSET ${offset}`,
    params
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS total FROM games WHERE ${where}`,
    params
  );

  const total = Number(countRows[0].total);
  const parse = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : (v ?? []));

  const data: GameListItem[] = rows.map((r) => ({
    id: Number(r.id),
    title: r.title as string,
    slug: r.slug as string,
    short_description: r.short_description as string | null,
    genres: parse(r.genres) as string[],
    platforms: parse(r.platforms) as Game["platforms"],
    price_usd: Number(r.price_usd),
    price_lkr: Number(r.price_lkr),
    discount_percent: Number(r.discount_percent),
    cover_img_url: r.cover_img_url as string | null,
  }));

  return { data, total, page, pageSize };
}

// ── Get game by slug ───────────────────────────────────────────
export async function getGameBySlug(slug: string): Promise<Game | null> {
  const cacheKey = `slug:${slug}`;
  const cached = catalogCache.get<Game>(cacheKey);
  if (cached) return cached;

  const { rows } = await pool.query(
    "SELECT * FROM games WHERE slug = $1 AND active = TRUE",
    [slug]
  );

  if (rows.length === 0) return null;

  const game = rowToGame(rows[0]);
  catalogCache.set(cacheKey, game);
  return game;
}

// ── Home page queries ─────────────────────────────────────────
export interface HomeGameItem {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  cover_img_url: string | null;
  price_usd: number;
  price_lkr: number;
  discount_percent: number;
}

export async function getBannerGames(): Promise<HomeGameItem[]> {
  const { rows } = await pool.query(
    `SELECT id, title, slug, short_description, cover_img_url,
            price_usd, price_lkr, discount_percent
     FROM games WHERE big_banner = TRUE AND active = TRUE`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    title: r.title as string,
    slug: r.slug as string,
    short_description: r.short_description as string | null,
    cover_img_url: r.cover_img_url as string | null,
    price_usd: Number(r.price_usd),
    price_lkr: Number(r.price_lkr),
    discount_percent: Number(r.discount_percent),
  }));
}

export async function getNewlyAddedGames(): Promise<HomeGameItem[]> {
  const { rows } = await pool.query(
    `SELECT id, title, slug, short_description, cover_img_url,
            price_usd, price_lkr, discount_percent
     FROM games WHERE active = TRUE ORDER BY created_at DESC LIMIT 10`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    title: r.title as string,
    slug: r.slug as string,
    short_description: r.short_description as string | null,
    cover_img_url: r.cover_img_url as string | null,
    price_usd: Number(r.price_usd),
    price_lkr: Number(r.price_lkr),
    discount_percent: Number(r.discount_percent),
  }));
}

export async function getBestSellingGames(): Promise<HomeGameItem[]> {
  const { rows } = await pool.query(
    `SELECT g.id, g.title, g.slug, g.short_description, g.cover_img_url,
            g.price_usd, g.price_lkr, g.discount_percent,
            COUNT(oi.id) AS order_count
     FROM games g
     JOIN order_items oi ON oi.game_id = g.id
     WHERE g.active = TRUE
     GROUP BY g.id, g.title, g.slug, g.short_description,
              g.cover_img_url, g.price_usd, g.price_lkr, g.discount_percent
     ORDER BY order_count DESC
     LIMIT 10`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    title: r.title as string,
    slug: r.slug as string,
    short_description: r.short_description as string | null,
    cover_img_url: r.cover_img_url as string | null,
    price_usd: Number(r.price_usd),
    price_lkr: Number(r.price_lkr),
    discount_percent: Number(r.discount_percent),
  }));
}

// ── Instant search (navbar autocomplete) ─────────────────────
export interface SearchResult {
  id: number;
  slug: string;
  title: string;
  cover_img_url: string | null;
  price_lkr: number;
  discount_percent: number;
}

export async function searchGames(q: string): Promise<SearchResult[]> {
  const { rows } = await pool.query(
    `SELECT id, slug, title, cover_img_url, price_lkr, discount_percent
     FROM games
     WHERE active = TRUE AND title ILIKE $1
     ORDER BY title ASC
     LIMIT 8`,
    [`%${q}%`]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    slug: r.slug as string,
    title: r.title as string,
    cover_img_url: r.cover_img_url as string | null,
    price_lkr: Number(r.price_lkr),
    discount_percent: Number(r.discount_percent),
  }));
}

// ── Get game by id (used by order service) ────────────────────
export async function getGameById(
  id: number
): Promise<{ title: string; price_usd: number; price_lkr: number; discount_percent: number } | null> {
  const { rows } = await pool.query(
    "SELECT title, price_usd, price_lkr, discount_percent FROM games WHERE id = $1 AND active = TRUE",
    [id]
  );
  if (rows.length === 0) return null;
  return {
    title: rows[0].title as string,
    price_usd: Number(rows[0].price_usd),
    price_lkr: Number(rows[0].price_lkr),
    discount_percent: Number(rows[0].discount_percent),
  };
}
