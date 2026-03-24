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
}

interface GameDetails {
  coverImg: string;
  priceUsd: number;
  discountPct: number;
  shortDescription: string;
  longDescription: string;
  developer: string;
  publisher: string;
  genres: string[];
  features: string[];
  releaseDate: string | null;
  trailerUrl: string | null;
  screenshots: string[];
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
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Mozilla/5.0 (compatible; pay-bee-scraper/1.0)",
    },
  });

  if (res.status === 429) {
    if (attempt > 3)
      throw new Error(`[scraper] search HTTP 429 after ${attempt} retries`);
    const wait = attempt * 15_000;
    console.warn(
      `[scraper] rate limited (429), waiting ${wait / 1000}s then retrying...`
    );
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
      all.push({ appid, name: item.name });
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

// ── Phase 2: batch-fetch full game details ─────────────────────

type DetailsMap = Record<string, GameDetails>;

type SteamAppDetailsResponse = Record<
  string,
  {
    success: boolean;
    data?: {
      is_free?: boolean;
      short_description?: string;
      detailed_description?: string;
      developers?: string[];
      publishers?: string[];
      genres?: { id: string; description: string }[];
      categories?: { id: number; description: string }[];
      release_date?: { coming_soon: boolean; date: string };
      movies?: {
        id: number;
        name: string;
        mp4?: { 480: string; max: string };
        webm?: { 480: string; max: string };
        highlight?: boolean;
      }[];
      screenshots?: {
        id: number;
        path_thumbnail: string;
        path_full: string;
      }[];
      header_image?: string;
      price_overview?: { final: number; discount_percent: number };
    };
  }
>;

async function fetchDetailsBatch(appids: string[]): Promise<DetailsMap> {
  const url =
    `https://store.steampowered.com/api/appdetails` +
    `?appids=${appids.join(",")}&cc=us&l=en`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`[scraper] appdetails HTTP ${res.status}`);

  const data = (await res.json()) as SteamAppDetailsResponse;
  const result: DetailsMap = {};

  for (const [id, entry] of Object.entries(data)) {
    if (!entry.success || !entry.data) continue;

    const d = entry.data;

    if (d.is_free) continue;

    const po = d.price_overview;
    if (!po) continue;

    const trailer =
      d.movies?.find((m) => m.highlight) ?? d.movies?.[0] ?? null;

    let releaseDate: string | null = null;
    if (d.release_date && !d.release_date.coming_soon && d.release_date.date) {
      const parsed = new Date(d.release_date.date);
      if (!isNaN(parsed.getTime())) {
        releaseDate = parsed.toISOString().split("T")[0];
      }
    }

    result[id] = {
      coverImg:
        d.header_image ??
        `https://cdn.akamai.steamstatic.com/steam/apps/${id}/header.jpg`,
      priceUsd: po.final / 100,
      discountPct: po.discount_percent,
      shortDescription: d.short_description ?? "",
      longDescription: d.detailed_description ?? "",
      developer: d.developers?.[0] ?? "",
      publisher: d.publishers?.[0] ?? "",
      genres: (d.genres ?? []).map((g) => g.description),
      features: (d.categories ?? []).map((c) => c.description),
      releaseDate,
      trailerUrl: trailer?.mp4?.max ?? trailer?.webm?.max ?? null,
      screenshots: (d.screenshots ?? []).map((s) => s.path_full),
    };
  }

  return result;
}

async function fetchAllDetails(appids: string[]): Promise<DetailsMap> {
  const BATCH = 10;
  const details: DetailsMap = {};

  for (let i = 0; i < appids.length; i += BATCH) {
    const batch = appids.slice(i, i + BATCH);
    try {
      const batchDetails = await fetchDetailsBatch(batch);
      Object.assign(details, batchDetails);
    } catch {
      for (const appid of batch) {
        try {
          const single = await fetchDetailsBatch([appid]);
          Object.assign(details, single);
        } catch {
          // bad appid (DLC, video, etc.) — skip silently
        }
        await sleep(600);
      }
    }

    if (i + BATCH < appids.length) await sleep(1500);

    if (i > 0 && i % 200 === 0) {
      console.log(
        `[scraper] fetched details for ${i}/${appids.length} apps...`
      );
    }
  }

  return details;
}

// ── Phase 3: fetch user-defined tags from Steamspy ─────────────

type TagsMap = Record<string, string[]>;

async function fetchSteamspyTags(appid: string): Promise<string[]> {
  const url = `https://steamspy.com/api.php?request=appdetails&appid=${appid}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = (await res.json()) as {
      tags?: Record<string, number>;
    };

    return Object.keys(data.tags ?? {});
  } catch {
    return [];
  }
}

async function fetchAllTags(appids: string[]): Promise<TagsMap> {
  const tags: TagsMap = {};

  for (let i = 0; i < appids.length; i++) {
    tags[appids[i]] = await fetchSteamspyTags(appids[i]);

    if (i > 0 && i % 50 === 0) {
      console.log(`[scraper] fetched tags for ${i}/${appids.length} apps...`);
    }

    await sleep(600);
  }

  return tags;
}

// ── Phase 4: upsert one game ───────────────────────────────────

async function upsertGame(
  app: CollectedApp,
  details: GameDetails,
  tags: string[],
  fxRate: number
): Promise<void> {
  const priceLkr = convertUSDtoLKR(details.priceUsd, fxRate);
  const features = [...details.features, ...tags];

  const existing = await pool.query(
    "SELECT id FROM games WHERE steam_app_id = $1 LIMIT 1",
    [app.appid]
  );

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE games SET
         title             = $1,
         cover_img_url     = COALESCE($2, cover_img_url),
         short_description = $3,
         long_description  = $4,
         developer         = $5,
         publisher         = $6,
         genres            = $7,
         features          = $8,
         release_date      = $9,
         trailer_video_url = $10,
         screenshots       = $11,
         price_usd         = $12,
         price_lkr         = $13,
         fx_rate_used      = $14,
         discount_percent  = $15,
         price_updated_at  = NOW()
       WHERE steam_app_id = $16`,
      [
        app.name,
        details.coverImg,
        details.shortDescription,
        details.longDescription,
        details.developer,
        details.publisher,
        JSON.stringify(details.genres),
        JSON.stringify(features),
        details.releaseDate,
        details.trailerUrl,
        JSON.stringify(details.screenshots),
        details.priceUsd,
        priceLkr,
        fxRate,
        details.discountPct,
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
        short_description, long_description,
        developer, publisher,
        genres, features, platforms,
        release_date, trailer_video_url, screenshots,
        price_usd, price_lkr, fx_rate_used,
        discount_percent, price_updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'["Windows"]',$11,$12,$13,$14,$15,$16,$17,NOW())`,
    [
      app.name,
      slug,
      app.appid,
      details.coverImg,
      details.shortDescription,
      details.longDescription,
      details.developer,
      details.publisher,
      JSON.stringify(details.genres),
      JSON.stringify(features),
      details.releaseDate,
      details.trailerUrl,
      JSON.stringify(details.screenshots),
      details.priceUsd,
      priceLkr,
      fxRate,
      details.discountPct,
    ]
  );
}

// ── Main job ───────────────────────────────────────────────────

export async function runSteamScraper(): Promise<void> {
  const fxRate = await getUSDtoLKR();
  console.log(`[scraper] fx rate: 1 USD = ${fxRate} LKR`);

  console.log("[scraper] collecting apps from Steam search...");
  const apps = await collectAllApps();
  console.log(`[scraper] collected ${apps.length} apps total`);

  console.log("[scraper] fetching game details...");
  const appids = apps.map((a) => a.appid);
  const detailsMap = await fetchAllDetails(appids);
  const paidAppids = Object.keys(detailsMap);
  console.log(
    `[scraper] got details for ${paidAppids.length} paid apps (${apps.length - paidAppids.length} free/no-price skipped)`
  );

  console.log("[scraper] fetching user-defined tags from Steamspy...");
  const tagsMap = await fetchAllTags(paidAppids);

  let upserted = 0;
  let failed = 0;

  for (const app of apps) {
    const details = detailsMap[app.appid];
    if (!details) continue;

    const tags = tagsMap[app.appid] ?? [];

    try {
      await upsertGame(app, details, tags, fxRate);
      upserted++;
    } catch (err) {
      failed++;
      console.error(`[scraper] upsert failed for app ${app.appid}:`, err);
    }
  }

  console.log(
    `[scraper] done — ${upserted} upserted, ${apps.length - upserted - failed} skipped (free/no-price), ${failed} failed`
  );
}
