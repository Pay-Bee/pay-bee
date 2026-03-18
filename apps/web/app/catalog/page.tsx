"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import api from "../../lib/api";
import type { GameListItem } from "shared";

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZE = 40;
const PRICE_MAX = 50000;

const GENRES = ["Action", "Horror", "RPG", "Sports", "Racing", "Indie", "Battle Royale", "Roguelike"];
const FEATURES = ["Single-player", "Online Multiplayer", "Local Multiplayer", "Controller Support", "Cloud Saves", "Ray Tracing"];
const PLATFORMS = ["Windows", "MacOS", "Linux", "Xbox", "PS"];

const SORT_OPTIONS = [
  { label: "All",                value: "newest"     },
  { label: "New Release",        value: "newest"     },
  { label: "Alphabetical",       value: "alpha"      },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Price: Low to High", value: "price_asc"  },
] as const;

type SortValue = "newest" | "alpha" | "price_desc" | "price_asc";

// ── Skeleton card ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-xl overflow-hidden border animate-pulse"
      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div style={{ height: "245px", background: "rgba(255,255,255,0.06)" }} />
      <div className="px-3 pt-2 pb-3" style={{ background: "rgba(10,10,20,0.95)" }}>
        <div className="h-3 rounded mb-1" style={{ background: "rgba(255,255,255,0.08)", width: "80%" }} />
        <div className="h-3 rounded mb-3" style={{ background: "rgba(255,255,255,0.06)", width: "55%" }} />
        <div className="h-4 rounded" style={{ background: "rgba(255,255,255,0.08)", width: "50%" }} />
      </div>
    </div>
  );
}

// ── Game card ─────────────────────────────────────────────────
function GameCard({ game }: { game: GameListItem }) {
  const orig = game.discount_percent > 0
    ? Math.round(game.price_lkr / (1 - game.discount_percent / 100))
    : null;

  return (
    <Link
      href={`/catalog/${game.slug}`}
      className="game-card group block rounded-xl overflow-hidden border"
      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.09)" }}
    >
      {/* Portrait image */}
      <div className="relative overflow-hidden" style={{ height: "245px" }}>
        {game.cover_img_url ? (
          <img
            src={game.cover_img_url}
            alt={game.title}
            className="game-card-img h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div
            className="h-full w-full flex items-center justify-center text-4xl"
            style={{ background: "#12121e" }}
          >
            🎮
          </div>
        )}
        {game.discount_percent > 0 && (
          <span
            className="absolute top-0 left-0 rounded-br-lg px-2 py-1 text-xs font-black text-black"
            style={{ background: "#fbbf24" }}
          >
            -{game.discount_percent}%
          </span>
        )}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ height: "60px", background: "linear-gradient(to top, rgba(8,8,16,0.95), transparent)" }}
        />
      </div>

      {/* Info panel */}
      <div className="px-3 pt-2 pb-3" style={{ background: "rgba(10,10,20,0.95)" }}>
        <h3
          className="text-xs font-semibold text-white leading-tight line-clamp-2 mb-2"
          style={{ minHeight: "30px" }}
        >
          {game.title}
        </h3>
        {game.price_lkr === 0 ? (
          <span
            className="inline-block rounded px-2 py-0.5 text-xs font-bold"
            style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}
          >
            FREE
          </span>
        ) : (
          <div className="flex flex-col gap-0.5">
            {orig && (
              <span className="text-xs line-through" style={{ color: "rgba(255,255,255,0.3)" }}>
                LKR {orig.toLocaleString()}
              </span>
            )}
            <span className="text-sm font-black text-white">
              LKR {Math.round(game.price_lkr).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Dual-handle price slider ───────────────────────────────────
function PriceSlider({
  min, max, onChange,
}: {
  min: number; max: number;
  onChange: (lo: number, hi: number) => void;
}) {
  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);
  const emit = useRef(onChange);
  useEffect(() => { emit.current = onChange; });

  const loPercent = (lo / PRICE_MAX) * 100;
  const hiPercent = (hi / PRICE_MAX) * 100;

  return (
    <div>
      <div className="flex justify-between text-xs mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
        <span>LKR {lo.toLocaleString()}</span>
        <span>LKR {hi.toLocaleString()}</span>
      </div>

      <div className="relative h-1.5 rounded-full mb-1" style={{ background: "rgba(255,255,255,0.12)" }}>
        <div
          className="absolute h-full rounded-full"
          style={{ left: `${loPercent}%`, width: `${hiPercent - loPercent}%`, background: "#fbbf24" }}
        />

        <input type="range" min={0} max={PRICE_MAX} step={500} value={lo}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hi - 500);
            setLo(v);
            emit.current(v, hi);
          }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ zIndex: lo > PRICE_MAX - 1000 ? 5 : 3 }}
        />
        <input type="range" min={0} max={PRICE_MAX} step={500} value={hi}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lo + 500);
            setHi(v);
            emit.current(lo, v);
          }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ zIndex: 4 }}
        />

        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-yellow-400 pointer-events-none"
          style={{ left: `calc(${loPercent}% - 7px)`, background: "#080810", zIndex: 6 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-yellow-400 pointer-events-none"
          style={{ left: `calc(${hiPercent}% - 7px)`, background: "#080810", zIndex: 6 }}
        />
      </div>

      <style>{`
        input[type=range]::-webkit-slider-thumb { appearance: none; width: 0; height: 0; }
        input[type=range]::-moz-range-thumb { width: 0; height: 0; border: none; background: transparent; }
      `}</style>
    </div>
  );
}

// ── Filter sidebar section heading ────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-bold tracking-[0.2em] uppercase mb-3"
      style={{ color: "rgba(255,255,255,0.35)" }}
    >
      {children}
    </p>
  );
}

// ── Store page ────────────────────────────────────────────────
export default function CatalogPage() {
  const [games, setGames] = useState<GameListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Sort (top bar)
  const [sort, setSort] = useState<SortValue>("newest");
  const [activeSortLabel, setActiveSortLabel] = useState("All");

  // Search (populated from navbar "See all results" ?name= param)
  const [search, setSearch] = useState("");

  useEffect(() => {
    const name = new URLSearchParams(window.location.search).get("name");
    if (name) setSearch(name);
  }, []);

  // Sidebar filters
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(PRICE_MAX);
  const [sliderKey, setSliderKey] = useState(0);
  const [genre, setGenre] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [platform, setPlatform] = useState("");

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort,
      });
      if (search) params.set("name", search);
      if (genre) params.set("genre", genre);
      if (platform) params.set("platform", platform);
      if (selectedFeatures.length > 0) params.set("features", selectedFeatures.join(","));
      if (priceMin > 0) params.set("minPrice", String(priceMin));
      if (priceMax < PRICE_MAX) params.set("maxPrice", String(priceMax));

      const res = await api.get<{ data: GameListItem[]; total: number }>(`/catalog?${params}`);
      setGames(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      console.error("[catalog] fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [page, sort, search, genre, platform, selectedFeatures, priceMin, priceMax]);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  const resetSidebar = () => {
    setPriceMin(0);
    setPriceMax(PRICE_MAX);
    setSliderKey((k) => k + 1);
    setGenre("");
    setSelectedFeatures([]);
    setPlatform("");
    setPage(1);
  };

  const hasSidebarFilters =
    priceMin > 0 || priceMax < PRICE_MAX || genre !== "" || selectedFeatures.length > 0 || platform !== "";

  const toggleFeature = (f: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
    setPage(1);
  };

  return (
    <div style={{ background: "#080810", minHeight: "100vh" }}>
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(251,191,36,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">

        {/* ── Page header ─────────────────────────────────────── */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-1 rounded-full flex-shrink-0" style={{ height: "28px", background: "#fbbf24" }} />
          <div>
            <h1 className="text-2xl font-black tracking-widest uppercase text-white">Game Store</h1>
            {!loading && total > 0 && (
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                {total.toLocaleString()} games available
              </p>
            )}
          </div>
        </div>

        {/* ── Top sort bar ─────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {SORT_OPTIONS.map((opt) => {
            const isActive = activeSortLabel === opt.label;
            return (
              <button
                key={opt.label}
                onClick={() => {
                  setSort(opt.value as SortValue);
                  setActiveSortLabel(opt.label);
                  setPage(1);
                }}
                className="rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200"
                style={
                  isActive
                    ? { background: "#fbbf24", color: "#000" }
                    : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mb-8" style={{ height: "1px", background: "rgba(251,191,36,0.12)" }} />

        {/* ── Body: sidebar + grid ─────────────────────────────── */}
        <div className="flex gap-6 items-start">

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <aside
            className="flex-shrink-0 w-56 rounded-2xl p-5 space-y-6 sticky top-20"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Price range */}
            <div>
              <SectionLabel>Price (LKR)</SectionLabel>
              <PriceSlider
                key={sliderKey}
                min={priceMin}
                max={priceMax}
                onChange={(lo, hi) => { setPriceMin(lo); setPriceMax(hi); setPage(1); }}
              />
            </div>

            {/* Genre */}
            <div>
              <SectionLabel>Genre</SectionLabel>
              <div className="space-y-1.5">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => { setGenre(genre === g ? "" : g); setPage(1); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150"
                    style={
                      genre === g
                        ? { background: "rgba(251,191,36,0.15)", color: "#fbbf24" }
                        : { color: "rgba(255,255,255,0.55)" }
                    }
                  >
                    <span
                      className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border"
                      style={
                        genre === g
                          ? { background: "#fbbf24", borderColor: "#fbbf24" }
                          : { borderColor: "rgba(255,255,255,0.2)" }
                      }
                    >
                      {genre === g && (
                        <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Features */}
            <div>
              <SectionLabel>Features</SectionLabel>
              <div className="space-y-1.5">
                {FEATURES.map((f) => {
                  const active = selectedFeatures.includes(f);
                  return (
                    <button
                      key={f}
                      onClick={() => toggleFeature(f)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150"
                      style={
                        active
                          ? { background: "rgba(251,191,36,0.15)", color: "#fbbf24" }
                          : { color: "rgba(255,255,255,0.55)" }
                      }
                    >
                      <span
                        className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border"
                        style={
                          active
                            ? { background: "#fbbf24", borderColor: "#fbbf24" }
                            : { borderColor: "rgba(255,255,255,0.2)" }
                        }
                      >
                        {active && (
                          <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platform */}
            <div>
              <SectionLabel>Platform</SectionLabel>
              <div className="space-y-1.5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPlatform(platform === p ? "" : p); setPage(1); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150"
                    style={
                      platform === p
                        ? { background: "rgba(251,191,36,0.15)", color: "#fbbf24" }
                        : { color: "rgba(255,255,255,0.55)" }
                    }
                  >
                    <span
                      className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border"
                      style={
                        platform === p
                          ? { background: "#fbbf24", borderColor: "#fbbf24" }
                          : { borderColor: "rgba(255,255,255,0.2)" }
                      }
                    >
                      {platform === p && (
                        <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset filters */}
            {hasSidebarFilters && (
              <button
                onClick={resetSidebar}
                className="w-full rounded-lg py-2 text-xs font-semibold transition-colors"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  color: "#f87171",
                  border: "1px solid rgba(239,68,68,0.18)",
                }}
              >
                Reset Filters
              </button>
            )}
          </aside>

          {/* ── Game grid ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Result count */}
            {!loading && total > 0 && (
              <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                Showing {from}–{to} of {total.toLocaleString()} games
              </p>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : games.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-24" style={{ color: "rgba(255,255,255,0.3)" }}>
                <span className="text-5xl">🎮</span>
                <p className="text-sm">No games found. Try different filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg px-4 py-2 text-xs font-semibold transition-all disabled:opacity-30"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  ← Prev
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = totalPages <= 7
                      ? i + 1
                      : page <= 4
                        ? i + 1
                        : page >= totalPages - 3
                          ? totalPages - 6 + i
                          : page - 3 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                        style={
                          p === page
                            ? { background: "#fbbf24", color: "#000" }
                            : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }
                        }
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg px-4 py-2 text-xs font-semibold transition-all disabled:opacity-30"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
