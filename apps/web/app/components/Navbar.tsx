"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import api from "../../lib/api";
import type { UserProfile } from "shared";

interface SearchResult {
  id: number;
  slug: string;
  title: string;
  cover_img_url: string | null;
  price_lkr: number;
  discount_percent: number;
}

function NavSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<SearchResult[]>(
          `/catalog/search?q=${encodeURIComponent(query.trim())}`
        );
        setResults(res.data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function navigate(slug: string) {
    router.push(`/catalog/${slug}`);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={ref} className="relative w-64">
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 border transition-colors"
        style={{
          background: "rgba(255,255,255,0.05)",
          borderColor: open ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.1)",
        }}
      >
        <svg
          className="w-3.5 h-3.5 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setOpen(false); setQuery(""); }
          }}
          placeholder="Search games…"
          className="bg-transparent text-sm text-white placeholder-white/30 outline-none w-full"
        />
        {loading && (
          <div className="h-3 w-3 flex-shrink-0 animate-spin rounded-full border border-white/20 border-t-white/60" />
        )}
      </div>

      {open && (
        <div
          className="absolute top-full mt-1.5 w-full rounded-xl border overflow-hidden shadow-2xl z-50"
          style={{
            background: "#13131f",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          {results.length > 0 ? (
            <>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(r.slug)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 transition-colors hover:bg-white/5 text-left"
                >
                  <div
                    className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-lg"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    {r.cover_img_url ? (
                      <img
                        src={r.cover_img_url}
                        alt={r.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      "🎮"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{r.title}</p>
                    <p className="text-[11px] font-bold" style={{ color: "#fbbf24" }}>
                      LKR {r.price_lkr.toLocaleString()}
                    </p>
                  </div>
                </button>
              ))}
              <button
                onClick={() => {
                  router.push(`/catalog?name=${encodeURIComponent(query.trim())}`);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-center text-xs transition-colors border-t"
                style={{
                  color: "rgba(255,255,255,0.35)",
                  borderColor: "rgba(255,255,255,0.06)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
              >
                See all results for &ldquo;{query}&rdquo;
              </button>
            </>
          ) : (
            <p className="px-4 py-3 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              No games found for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<{ user: UserProfile }>("/auth/me")
      .then(async (r) => {
        setUser(r.data.user);
        const cart = await api.get<{ game_id: number }[]>("/cart");
        setCartCount(cart.data.length);
      })
      .catch(() => { setUser(null); setCartCount(0); });
  }, []);

  // Refresh cart count when an item is added from any page
  useEffect(() => {
    function onCartUpdated() {
      api.get<{ game_id: number }[]>("/cart")
        .then((r) => setCartCount(r.data.length))
        .catch(() => {});
    }
    window.addEventListener("cart-updated", onCartUpdated);
    return () => window.removeEventListener("cart-updated", onCartUpdated);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await api.post("/auth/logout").catch(() => {});
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    window.location.href = "/";
  };

  const displayName = user?.name || user?.email || "";

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a12]/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-xl font-black tracking-widest text-yellow-400 uppercase"
        >
          PayBee
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/catalog"
            className="font-semibold text-white hover:text-yellow-400 transition-colors"
          >
            Game Store
          </Link>
        </div>

        <NavSearch />

        <div className="flex items-center gap-3">
          {/* Cart icon */}
          <button
            onClick={() => {
              if (!user) {
                window.location.href = "/login?returnTo=%2Fcart";
              } else {
                router.push("/cart");
              }
            }}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cart"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-black text-black"
                style={{ background: "#fbbf24" }}
              >
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>

        <div>
          {user ? (
            <div className="relative" ref={dropdownRef}>
              {/* Avatar + name trigger */}
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt="avatar"
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-white/20"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                    <svg
                      className="h-4 w-4 text-gray-300"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  </span>
                )}
                <span className="max-w-[140px] truncate text-sm text-gray-200">
                  {displayName}
                </span>
                <svg
                  className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Dropdown */}
              {open && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#13131f] py-1 shadow-xl">
                  <button
                    onClick={() => { setOpen(false); router.push("/account"); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                    My Account
                  </button>
                  <button
                    onClick={() => { setOpen(false); router.push("/orders"); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Orders
                  </button>
                  <div className="my-1 border-t border-white/10" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={`/login?returnTo=${encodeURIComponent(pathname)}`}
              className="rounded-lg bg-yellow-400 px-4 py-1.5 text-sm font-bold text-black hover:bg-yellow-300 transition-colors tracking-wide"
            >
              Sign In
            </Link>
          )}
          </div>
        </div>
      </div>
    </nav>
  );
}
