import pool from "../db/db";
import { getUSDtoLKR, convertUSDtoLKR } from "../fx/fx.service";
import { slugify } from "../services/catalog/catalog.service";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Types ──────────────────────────────────────────────────────

interface RawItem {
  name: string;
  logo: string;
}

interface CollectedApp {
  appid: string;
  name: string;
  coverImg: string;
}

interface PriceInfo {
  priceUsd: number;
  discountPct: number;
}

// ── Phase 1: collect all app IDs + names via paginated search ──

function extractAppId(logoUrl: string): string | null {
  const m = logoUrl.match(/\/apps\/(\d+)\//);
  return m ? m[1] : null;
}

async function fetchSearchPage(
  start: number,
  count = 25,
  attempt = 1
): Promise<RawItem[]> {
  const url =
    `https://store.steampowered.com/search/results/` +
    `?filter=globaltopsellers&ndl=1&json=1&cc=us&l=en` +
    `&start=${start}&count=${count}`;

  const res = await fetch(url, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Mozilla/5.0 (compatible; pay-bee-scraper/1.0)",
    },
  });

  if (res.status === 429) {
    if (attempt > 3) throw new Error(`[scraper] search HTTP 429 after ${attempt} retries`);
    const wait = attempt * 15_000;
    console.warn(`[scraper] rate limited (429), waiting ${wait / 1000}s then retrying...`);
    await sleep(wait);
    return fetchSearchPage(start, count, attempt + 1);
  }

  if (!res.ok) throw new Error(`[scraper] search HTTP ${res.status}`);

  const raw = (await res.json()) as { items?: RawItem[] };
  return raw.items ?? [];
}

async function collectAllApps(): Promise<CollectedApp[]> {
  const PAGE_SIZE = 25;
  const all: CollectedApp[] = [];
  let start = 0;

  while (true) {
    const items = await fetchSearchPage(start, PAGE_SIZE);

    for (const item of items) {
      const appid = extractAppId(item.logo);
      if (!appid || !item.name) continue;
      all.push({
        appid,
        name: item.name,
        coverImg: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
      });
    }

    if (items.length < PAGE_SIZE) break;
    start += PAGE_SIZE;

    if (start % 250 === 0) {
      console.log(`[scraper] collected ${all.length} apps so far...`);
    }

    await sleep(1500);
  }

  return all;
}

// ── Phase 2: batch-fetch prices via appdetails ─────────────────

type PriceMap = Record<string, PriceInfo>;

async function fetchPriceBatch(appids: string[]): Promise<PriceMap> {
  const url =
    `https://store.steampowered.com/api/appdetails` +
    `?appids=${appids.join(",")}&filters=price_overview&cc=us&l=en`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`[scraper] appdetails HTTP ${res.status}`);

  const data = (await res.json()) as Record<
    string,
    {
      success: boolean;
      data?: { price_overview?: { final: number; discount_percent: number } };
    }
  >;

  const result: PriceMap = {};
  for (const [id, entry] of Object.entries(data)) {
    if (!entry.success) continue;
    const po = entry.data?.price_overview;
    result[id] = {
      priceUsd: po ? po.final / 100 : 0,
      discountPct: po ? po.discount_percent : 0,
    };
  }
  return result;
}

async function fetchAllPrices(appids: string[]): Promise<PriceMap> {
  const BATCH = 25;
  const prices: PriceMap = {};

  for (let i = 0; i < appids.length; i += BATCH) {
    const batch = appids.slice(i, i + BATCH);
    try {
      const batchPrices = await fetchPriceBatch(batch);
      Object.assign(prices, batchPrices);
    } catch (err) {
      console.error(
        `[scraper] price batch ${i}–${i + BATCH} failed:`,
        err
      );
    }
    if (i + BATCH < appids.length) await sleep(1000);

    if (i % 500 === 0 && i > 0) {
      console.log(
        `[scraper] fetched prices for ${i}/${appids.length} apps...`
      );
    }
  }

  return prices;
}

// ── Phase 3: upsert one game ───────────────────────────────────

async function upsertGame(
  app: CollectedApp,
  price: PriceInfo,
  fxRate: number
): Promise<void> {
  const priceLkr = convertUSDtoLKR(price.priceUsd, fxRate);

  const existing = await pool.query(
    "SELECT id FROM games WHERE steam_app_id = $1 LIMIT 1",
    [app.appid]
  );

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE games SET
         title            = $1,
         cover_img_url    = COALESCE($2, cover_img_url),
         price_usd        = $3,
         price_lkr        = $4,
         fx_rate_used     = $5,
         discount_percent = $6,
         price_updated_at = NOW()
       WHERE steam_app_id = $7`,
      [
        app.name,
        app.coverImg,
        price.priceUsd,
        priceLkr,
        fxRate,
        price.discountPct,
        app.appid,
      ]
    );
    return;
  }

  const slug = slugify(app.name) + "-" + app.appid;
  await pool.query(
    `INSERT INTO games
       (title, slug, steam_app_id,
        cover_img_url,
        platforms, genres, features, screenshots,
        price_usd, price_lkr, fx_rate_used,
        discount_percent, price_updated_at)
     VALUES ($1,$2,$3,$4,'["Windows"]','[]','[]','[]',$5,$6,$7,$8,NOW())`,
    [
      app.name,
      slug,
      app.appid,
      app.coverImg,
      price.priceUsd,
      priceLkr,
      fxRate,
      price.discountPct,
    ]
  );
}

// ── Main job ───────────────────────────────────────────────────

export async function runSteamScraper(): Promise<void> {
  const fxRate = await getUSDtoLKR();
  console.log(`[scraper] fx rate: 1 USD = ${fxRate} LKR`);

  // Phase 1
  console.log("[scraper] collecting apps from Steam search...");
  const apps = await collectAllApps();
  console.log(`[scraper] collected ${apps.length} apps total`);

  // Phase 2
  console.log("[scraper] fetching prices...");
  const appids = apps.map((a) => a.appid);
  const prices = await fetchAllPrices(appids);
  console.log(`[scraper] got prices for ${Object.keys(prices).length} apps`);

  // Phase 3
  let upserted = 0;
  let failed = 0;

  for (const app of apps) {
    const price = prices[app.appid] ?? { priceUsd: 0, discountPct: 0 };
    try {
      await upsertGame(app, price, fxRate);
      upserted++;
    } catch (err) {
      failed++;
      console.error(`[scraper] upsert failed for app ${app.appid}:`, err);
    }
  }

  console.log(`[scraper] done — ${upserted} upserted, ${failed} failed`);
}
