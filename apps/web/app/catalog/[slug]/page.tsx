import { notFound } from "next/navigation";
import type { Game, Platform } from "shared";
import MediaSlider from "./MediaSlider";
import PurchasePanel from "./PurchasePanel";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function getGame(slug: string): Promise<Game | null> {
  try {
    const res = await fetch(`${API_BASE}/catalog/${slug}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return null;
}

function PlatformIcon({ platform }: { platform: Platform }) {
  const labels: Record<Platform, string> = {
    Windows: "Windows",
    Xbox: "Xbox",
    PS: "PlayStation",
    MacOS: "macOS",
    Linux: "Linux",
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      {platform === "Windows" && (
        <svg width="28" height="28" viewBox="0 0 23 23">
          <path fill="rgba(255,255,255,0.90)" d="M0 0h11v11H0z" />
          <path fill="rgba(255,255,255,0.72)" d="M12 0h11v11H12z" />
          <path fill="rgba(255,255,255,0.60)" d="M0 12h11v11H0z" />
          <path fill="rgba(255,255,255,0.48)" d="M12 12h11v11H12z" />
        </svg>
      )}
      {platform === "Xbox" && (
        <svg width="28" height="28" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="47" fill="none" stroke="white" strokeWidth="5" strokeOpacity="0.8" />
          <line x1="29" y1="29" x2="71" y2="71" stroke="white" strokeWidth="12" strokeLinecap="round" strokeOpacity="0.9" />
          <line x1="71" y1="29" x2="29" y2="71" stroke="white" strokeWidth="12" strokeLinecap="round" strokeOpacity="0.9" />
        </svg>
      )}
      {platform === "PS" && (
        <svg width="28" height="28" viewBox="0 0 100 100">
          <rect width="100" height="100" rx="14" fill="rgba(255,255,255,0.08)" />
          <text x="50" y="68" fontSize="44" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif" fillOpacity="0.9">
            PS
          </text>
        </svg>
      )}
      {platform === "MacOS" && (
        <svg width="28" height="28" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="47" fill="none" stroke="white" strokeWidth="5" strokeOpacity="0.6" />
          <text x="50" y="60" fontSize="20" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fillOpacity="0.85">
            Mac
          </text>
        </svg>
      )}
      {platform === "Linux" && (
        <svg width="28" height="28" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="47" fill="none" stroke="white" strokeWidth="5" strokeOpacity="0.6" />
          <text x="50" y="62" fontSize="22" fill="white" textAnchor="middle" fontFamily="monospace" fontWeight="bold" fillOpacity="0.85">
            LX
          </text>
        </svg>
      )}
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
        {labels[platform]}
      </span>
    </div>
  );
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getGame(slug);
  if (!game) notFound();

  const hasDiscount = game.discount_percent > 0;
  const originalLkr = Math.ceil(game.price_usd * game.fx_rate_used);
  const finalLkr = game.price_lkr;
  const releaseDate = game.release_date?.slice(0, 10) ?? null;

  // Build slides: video first, then screenshots
  type Slide =
    | { type: "video"; embedUrl: string | null; directUrl: string | null }
    | { type: "image"; url: string };

  const slides: Slide[] = [];
  if (game.trailer_video_url) {
    const embedUrl = getYouTubeEmbedUrl(game.trailer_video_url);
    slides.push({
      type: "video",
      embedUrl,
      directUrl: embedUrl ? null : game.trailer_video_url,
    });
  }
  for (const url of game.screenshots ?? []) {
    slides.push({ type: "image", url });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#080810" }}>
      {/* ── Background tint from cover art ──────────────────── */}
      {game.cover_img_url && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <img
            src={game.cover_img_url}
            alt=""
            className="w-full h-full object-cover"
            style={{
              filter: "blur(80px) saturate(2) brightness(0.35)",
              transform: "scale(1.1)",
            }}
          />
          <div className="absolute inset-0" style={{ background: "rgba(8,8,16,0.82)" }} />
        </div>
      )}

      {/* ── All content sits above the tint ─────────────────── */}
      <div className="relative mx-auto max-w-7xl px-6" style={{ zIndex: 1 }}>
        {/* ── Hero header ─────────────────────────────────────── */}
        <div className="pt-10 pb-8">
          {/* Yellow pill badge */}
          <div className="inline-flex items-center gap-2 mb-4">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "#fbbf24", boxShadow: "0 0 6px #fbbf24" }}
            />
            <span
              className="text-xs font-bold tracking-[0.35em] uppercase"
              style={{ color: "#fbbf24" }}
            >
              Game Details
            </span>
          </div>

          {/* Title */}
          <h1
            className="font-black text-white leading-none mb-3"
            style={{
              fontSize: "clamp(2rem, 4vw, 3.2rem)",
              textShadow: "0 4px 30px rgba(0,0,0,0.7)",
            }}
          >
            {game.title}
          </h1>

          {/* Developer / publisher + genre pills */}
          <div className="flex items-center flex-wrap gap-3">
            {(game.developer || game.publisher) && (
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                {game.developer}
                {game.developer && game.publisher && " · "}
                {game.publisher && `Published by ${game.publisher}`}
              </p>
            )}
            {game.genres?.map((g) => (
              <span
                key={g}
                className="rounded-full px-3 py-0.5 text-xs border"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderColor: "rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* ── Two-column body ──────────────────────────────────── */}
        <div className="flex gap-8 pb-20 items-start">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Media slider */}
            {slides.length > 0 && <MediaSlider slides={slides} />}

            {/* Features */}
            {game.features && game.features.length > 0 && (
              <div>
                <h3
                  className="mb-3 text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Features
                </h3>
                <ul className="grid grid-cols-2 gap-y-2 gap-x-4">
                  {game.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                      <span style={{ color: "#fbbf24", fontSize: "10px" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Short description */}
            {game.short_description && (
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                {game.short_description}
              </p>
            )}

            {/* Long description */}
            {game.long_description && (
              <div
                className="prose prose-invert prose-sm max-w-none leading-relaxed"
                style={{ color: "rgba(255,255,255,0.55)" }}
                dangerouslySetInnerHTML={{ __html: game.long_description }}
              />
            )}
          </div>

          {/* ── Right sidebar ──────────────────────────────────── */}
          <div className="w-72 flex-shrink-0 sticky top-20 self-start">
            <div
              className="rounded-2xl border p-5 space-y-5"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Platforms */}
              {game.platforms && game.platforms.length > 0 && (
                <div>
                  <p
                    className="mb-3 text-xs font-bold uppercase tracking-[0.2em]"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Available on
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {game.platforms.map((p) => (
                      <PlatformIcon key={p} platform={p} />
                    ))}
                  </div>
                </div>
              )}

              {/* Meta info */}
              {(releaseDate || game.steam_app_id) && (
                <div className="space-y-2.5 border-t pt-4 text-sm" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  {releaseDate && (
                    <div className="flex justify-between items-center">
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>Release Date</span>
                      <span className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                        {releaseDate}
                      </span>
                    </div>
                  )}
                  {game.steam_app_id && (
                    <div className="flex justify-between items-center">
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>Steam App ID</span>
                      <span className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                        {game.steam_app_id}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Price */}
              <div className="border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                {hasDiscount ? (
                  <>
                    <div className="flex items-center gap-2 mb-1.5">
                      <s className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                        LKR {originalLkr.toLocaleString()}
                      </s>
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-black text-black"
                        style={{ background: "#fbbf24" }}
                      >
                        -{game.discount_percent}% OFF
                      </span>
                    </div>
                    <p className="text-3xl font-black text-white">
                      LKR {finalLkr.toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="text-3xl font-black text-white">
                    {finalLkr === 0 ? "Free to Play" : `LKR ${finalLkr.toLocaleString()}`}
                  </p>
                )}
              </div>

              {/* Installments */}
              {finalLkr > 0 && (
                <div className="space-y-2 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  {/* Payzy */}
                  <div
                    className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,107,53,0.2)" }}
                  >
                    <img src="/payment-opt/payzy.png" alt="Payzy" className="h-5 w-auto object-contain" />
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        4 installments
                      </p>
                      <p className="text-xs font-bold text-white">
                        LKR {Math.ceil(finalLkr / 4).toLocaleString()} / mo
                      </p>
                    </div>
                  </div>

                  {/* Koko */}
                  <div
                    className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,200,83,0.2)" }}
                  >
                    <img src="/payment-opt/koko.png" alt="Koko" className="h-5 w-auto object-contain" />
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        3 installments
                      </p>
                      <p className="text-xs font-bold text-white">
                        LKR {Math.ceil(finalLkr / 3).toLocaleString()} / mo
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Buy buttons */}
              <PurchasePanel
                slug={game.slug}
                gameId={game.id}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
