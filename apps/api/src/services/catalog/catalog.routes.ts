import { Router, Request, Response } from "express";
import {
  listGames,
  getGameBySlug,
  createGame,
  getBannerGames,
  getNewlyAddedGames,
  getBestSellingGames,
  searchGames,
} from "./catalog.service";
import { CatalogFilters } from "shared";

const router = Router();

// GET /catalog — list games with optional filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const filters: CatalogFilters = {
      genre: req.query.genre as string | undefined,
      name: req.query.name as string | undefined,
      features: req.query.features as string | undefined,
      platform: req.query.platform as string | undefined,
      sort: (req.query.sort as CatalogFilters["sort"]) ?? "newest",
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Math.min(Number(req.query.pageSize), 100) : 40,
    };

    const result = await listGames(filters);
    res.json(result);
  } catch (err) {
    console.error("[catalog] list error:", err);
    res.status(500).json({ error: "Failed to fetch catalog" });
  }
});

// POST /catalog — manually add a game (admin)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { title, price_usd } = req.body;
    if (!title || price_usd === undefined) {
      res.status(400).json({ error: "title and price_usd are required" });
      return;
    }
    await createGame(req.body);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("[catalog] create error:", err);
    res.status(500).json({ error: "Failed to create game" });
  }
});

// GET /catalog/search?q= — instant search (navbar autocomplete)
router.get("/search", async (req: Request, res: Response) => {
  try {
    const q = ((req.query.q as string) ?? "").trim();
    if (q.length < 2) { res.json([]); return; }
    res.json(await searchGames(q));
  } catch (err) {
    console.error("[catalog] search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /catalog/banners — games flagged as big_banner
router.get("/banners", async (_req: Request, res: Response) => {
  try {
    res.json(await getBannerGames());
  } catch (err) {
    console.error("[catalog] banners error:", err);
    res.status(500).json({ error: "Failed to fetch banners" });
  }
});

// GET /catalog/new — latest 10 games
router.get("/new", async (_req: Request, res: Response) => {
  try {
    res.json(await getNewlyAddedGames());
  } catch (err) {
    console.error("[catalog] new error:", err);
    res.status(500).json({ error: "Failed to fetch new games" });
  }
});

// GET /catalog/best-sellers — most ordered 10 games
router.get("/best-sellers", async (_req: Request, res: Response) => {
  try {
    res.json(await getBestSellingGames());
  } catch (err) {
    console.error("[catalog] best-sellers error:", err);
    res.status(500).json({ error: "Failed to fetch best sellers" });
  }
});

// GET /catalog/:slug — full game detail
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const game = await getGameBySlug(req.params.slug);
    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
    res.json(game);
  } catch (err) {
    console.error("[catalog] detail error:", err);
    res.status(500).json({ error: "Failed to fetch game" });
  }
});

export default router;
