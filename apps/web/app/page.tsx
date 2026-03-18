"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../lib/api";

const PAGE_BG = "#080810";

interface HomeGame {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  cover_img_url: string | null;
  price_usd: number;
  price_lkr: number;
  discount_percent: number;
}

// ── Helpers ───────────────────────────────────────────────────
function originalPrice(price_lkr: number, discount_percent: number) {
  if (discount_percent <= 0) return null;
  return Math.round(price_lkr / (1 - discount_percent / 100));
}

// ── Hero Banner ───────────────────────────────────────────────
function HeroBanner({ games }: { games: HomeGame[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const goTo = useCallback(
    (idx: number) => {
      setActive(idx);
      setProgressKey((k) => k + 1);
    },
    []
  );
  const next = useCallback(() => goTo((active + 1) % games.length), [active, games.length, goTo]);
  const prev = useCallback(() => goTo((active - 1 + games.length) % games.length), [active, games.length, goTo]);

  useEffect(() => {
    if (paused || games.length < 2) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next, paused, games.length]);

  if (games.length === 0) return null;
  const game = games[active];

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: "75vh", minHeight: "560px" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background slides — crossfade */}
      {games.map((g, i) => (
        <div
          key={g.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === active ? 1 : 0 }}
        >
          {g.cover_img_url ? (
            <img src={g.cover_img_url} alt="" className="h-full w-full object-cover object-center" />
          ) : (
            <div className="h-full w-full" style={{ background: "#12121e" }} />
          )}
        </div>
      ))}

      {/* Gradient overlays */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(8,8,16,0.97) 0%, rgba(8,8,16,0.75) 40%, rgba(8,8,16,0.15) 70%, rgba(8,8,16,0) 100%)" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,8,16,1) 0%, rgba(8,8,16,0.6) 20%, transparent 45%)" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,16,0.5) 0%, transparent 20%)" }} />

      {/* Content — re-mounts on active change to re-trigger animation */}
      <div key={active} className="banner-content-enter absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-7xl px-8">
          <div style={{ maxWidth: "520px" }}>
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 mb-5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "#fbbf24", boxShadow: "0 0 6px #fbbf24" }}
              />
              <span className="text-xs font-bold tracking-[0.35em] uppercase" style={{ color: "#fbbf24" }}>
                Featured Title
              </span>
            </div>

            {/* Title */}
            <h1
              className="font-black text-white leading-none mb-4"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", textShadow: "0 4px 30px rgba(0,0,0,0.7)" }}
            >
              {game.title}
            </h1>

            {/* Description */}
            {game.short_description && (
              <p className="text-sm leading-relaxed mb-6 line-clamp-2" style={{ color: "rgba(255,255,255,0.55)", maxWidth: "400px" }}>
                {game.short_description}
              </p>
            )}

            {/* Price */}
            <div className="flex items-center gap-3 mb-7">
              {game.discount_percent > 0 && (
                <span className="rounded-md px-2 py-1 text-xs font-black text-black" style={{ background: "#fbbf24" }}>
                  -{game.discount_percent}%
                </span>
              )}
              {originalPrice(game.price_lkr, game.discount_percent) && (
                <span className="text-sm line-through" style={{ color: "rgba(255,255,255,0.35)" }}>
                  LKR {originalPrice(game.price_lkr, game.discount_percent)!.toLocaleString()}
                </span>
              )}
              <span className="text-2xl font-black text-white">
                {game.price_lkr === 0 ? "Free to Play" : `LKR ${Math.round(game.price_lkr).toLocaleString()}`}
              </span>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3">
              <Link
                href={`/catalog/${game.slug}`}
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-black tracking-wider text-black transition-all duration-200 hover:scale-[1.03]"
                style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", boxShadow: "0 6px 24px rgba(251,191,36,0.4)" }}
              >
                Get Now
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href={`/catalog/${game.slug}`}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition-all duration-200 border hover:bg-white/10"
                style={{ borderColor: "rgba(255,255,255,0.2)" }}
              >
                More Info
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Prev / Next arrows */}
      {games.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-11 h-11 rounded-full border text-white transition-all duration-200 hover:scale-110"
            style={{ background: "rgba(8,8,16,0.6)", borderColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-11 h-11 rounded-full border text-white transition-all duration-200 hover:scale-110"
            style={{ background: "rgba(8,8,16,0.6)", borderColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Bottom strip: thumbnail nav + progress */}
      {games.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-10">
          {/* Progress bar */}
          <div className="w-full" style={{ background: "rgba(255,255,255,0.06)", height: "3px" }}>
            {!paused && <div key={progressKey} className="banner-progress-bar" />}
          </div>

          {/* Thumbnail strip */}
          <div
            className="mx-auto max-w-7xl px-8 py-4 flex items-center gap-3"
          >
            {games.map((g, i) => (
              <button
                key={g.id}
                onClick={() => goTo(i)}
                className="flex-shrink-0 rounded overflow-hidden transition-all duration-300"
                style={{
                  width: "80px",
                  height: "50px",
                  border: i === active ? "2px solid #fbbf24" : "2px solid rgba(255,255,255,0.12)",
                  boxShadow: i === active ? "0 0 12px rgba(251,191,36,0.5)" : "none",
                  opacity: i === active ? 1 : 0.55,
                }}
              >
                {g.cover_img_url ? (
                  <img src={g.cover_img_url} alt={g.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full" style={{ background: "#1a1a2e" }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Portrait Game Card ────────────────────────────────────────
function GameCard({ game }: { game: HomeGame }) {
  const orig = originalPrice(game.price_lkr, game.discount_percent);

  return (
    <Link
      href={`/catalog/${game.slug}`}
      className="game-card group flex-shrink-0 rounded-xl overflow-hidden border cursor-pointer"
      style={{
        width: "185px",
        background: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.09)",
      }}
    >
      {/* Image — portrait 3:4 */}
      <div className="relative overflow-hidden" style={{ height: "245px" }}>
        {game.cover_img_url ? (
          <img
            src={game.cover_img_url}
            alt={game.title}
            className="game-card-img h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-4xl" style={{ background: "#12121e" }}>
            🎮
          </div>
        )}

        {/* Discount badge */}
        {game.discount_percent > 0 && (
          <span
            className="absolute top-0 left-0 rounded-br-lg px-2 py-1 text-xs font-black text-black"
            style={{ background: "#fbbf24" }}
          >
            -{game.discount_percent}%
          </span>
        )}

        {/* Bottom gradient on image */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ height: "60px", background: "linear-gradient(to top, rgba(8,8,16,0.95), transparent)" }}
        />
      </div>

      {/* Info panel */}
      <div className="px-3 pt-2 pb-3" style={{ background: "rgba(10,10,20,0.95)" }}>
        <h3 className="text-xs font-semibold text-white leading-tight line-clamp-2 mb-2" style={{ minHeight: "30px" }}>
          {game.title}
        </h3>

        {game.price_lkr === 0 ? (
          <span className="inline-block rounded px-2 py-0.5 text-xs font-bold" style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}>
            FREE
          </span>
        ) : (
          <div className="flex flex-col gap-0.5">
            {orig && (
              <span className="text-xs line-through" style={{ color: "rgba(255,255,255,0.35)" }}>
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

// ── Game Row (carousel) ───────────────────────────────────────
function GameRow({
  title,
  games,
  accentColor = "#fbbf24",
  seeAllHref = "/catalog",
}: {
  title: string;
  games: HomeGame[];
  accentColor?: string;
  seeAllHref?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -1005 : 1005, behavior: "smooth" });
  };

  if (games.length === 0) return null;

  return (
    <section className="mb-14">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-1 rounded-full" style={{ height: "22px", background: accentColor }} />
            <h2 className="text-lg font-black tracking-widest uppercase text-white">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={seeAllHref}
              className="text-xs font-semibold tracking-widest uppercase transition-colors mr-2"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              See All →
            </Link>
            <button
              onClick={() => scroll("left")}
              className="flex items-center justify-center w-9 h-9 rounded-full border text-white transition-all duration-200 hover:border-yellow-400 hover:text-yellow-400"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              className="flex items-center justify-center w-9 h-9 rounded-full border text-white transition-all duration-200 hover:border-yellow-400 hover:text-yellow-400"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scroll wrapper with edge fades */}
        <div className="relative">
          {/* Left fade */}
          <div
            className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none"
            style={{ width: "40px", background: `linear-gradient(to right, ${PAGE_BG}, transparent)` }}
          />
          {/* Right fade */}
          <div
            className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none"
            style={{ width: "60px", background: `linear-gradient(to left, ${PAGE_BG}, transparent)` }}
          />

          <div
            ref={scrollRef}
            className="hide-scrollbar flex gap-4 overflow-x-auto pb-2"
          >
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Skeletons ─────────────────────────────────────────────────
function BannerSkeleton() {
  return (
    <div
      className="w-full"
      style={{ height: "75vh", minHeight: "560px", background: "linear-gradient(135deg, #0d0d1a 0%, #12121e 100%)" }}
    >
      <div className="h-full flex items-center">
        <div className="mx-auto w-full max-w-7xl px-8 space-y-5">
          <div className="h-3 w-32 rounded-full animate-pulse" style={{ background: "rgba(251,191,36,0.2)" }} />
          <div className="h-14 w-96 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.07)" }} />
          <div className="h-4 w-80 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
          <div className="h-4 w-64 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-32 rounded-lg animate-pulse" style={{ background: "rgba(251,191,36,0.2)" }} />
            <div className="h-11 w-28 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <section className="mb-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-5 rounded-full animate-pulse" style={{ background: "rgba(251,191,36,0.3)" }} />
          <div className="h-4 w-36 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 rounded-xl animate-pulse"
              style={{ width: "185px", height: "330px", background: "rgba(255,255,255,0.05)" }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Home Page ─────────────────────────────────────────────────
export default function Home() {
  const [banners, setBanners] = useState<HomeGame[]>([]);
  const [newGames, setNewGames] = useState<HomeGame[]>([]);
  const [bestSellers, setBestSellers] = useState<HomeGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<HomeGame[]>("/catalog/banners").then((r) => r.data).catch(() => []),
      api.get<HomeGame[]>("/catalog/new").then((r) => r.data).catch(() => []),
      api.get<HomeGame[]>("/catalog/best-sellers").then((r) => r.data).catch(() => []),
    ]).then(([b, n, bs]) => {
      setBanners(b);
      setNewGames(n);
      setBestSellers(bs);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ background: PAGE_BG, minHeight: "100vh" }}>
      {/* Hero */}
      {loading ? <BannerSkeleton /> : <HeroBanner games={banners} />}

      {/* Sections */}
      <div className="pt-12">
        {loading ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : (
          <>
            <GameRow title="New Arrivals" games={newGames} accentColor="#fbbf24" seeAllHref="/catalog" />
            <GameRow title="Best Sellers" games={bestSellers} accentColor="#22d3ee" seeAllHref="/catalog" />
          </>
        )}
      </div>

    </div>
  );
}
