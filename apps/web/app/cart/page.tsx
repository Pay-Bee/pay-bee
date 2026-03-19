"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import type { CartItem } from "shared";

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  async function fetchCart() {
    try {
      const res = await api.get<CartItem[]>("/cart");
      setItems(res.data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCart(); }, []);

  async function removeItem(gameId: number) {
    setRemoving(gameId);
    try {
      await api.delete(`/cart/${gameId}`);
      setItems((prev) => prev.filter((i) => i.game_id !== gameId));
    } finally {
      setRemoving(null);
    }
  }

  async function clearCart() {
    setClearing(true);
    try {
      await Promise.all(items.map((i) => api.delete(`/cart/${i.game_id}`)));
      setItems([]);
    } finally {
      setClearing(false);
    }
  }

  const subtotal = items.reduce((s, i) => s + i.price_lkr, 0);
  const BOOKING_FEE = 200;
  const total = subtotal + (items.length > 0 ? BOOKING_FEE : 0);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ background: "#080810", minHeight: "100vh" }}>
        <div className="pointer-events-none fixed inset-0 z-0" style={{
          background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(251,191,36,0.05) 0%, transparent 70%)",
        }} />
        <div className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center gap-6 px-4">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <svg className="h-11 w-11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-white mb-2">Your cart is empty</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Your next favourite game is just one click away.
            </p>
          </div>
          <Link
            href="/catalog"
            className="rounded-lg px-8 py-3 text-sm font-bold text-black transition-all hover:scale-[1.03]"
            style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", boxShadow: "0 4px 24px rgba(251,191,36,0.35)" }}
          >
            Explore the Store →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#080810", minHeight: "100vh" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{
        background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(251,191,36,0.05) 0%, transparent 70%)",
      }} />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">

        {/* Page header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-1 rounded-full flex-shrink-0" style={{ height: "28px", background: "#fbbf24" }} />
          <div>
            <h1 className="text-2xl font-black tracking-widest uppercase text-white">Your Cart</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              {items.length} {items.length === 1 ? "game" : "games"} ready to unlock
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex gap-8 items-start">

          {/* ── Left: items list ─────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              {items.map((item, idx) => (
                <div
                  key={item.game_id}
                  className="flex items-center gap-5 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                  style={{
                    borderBottom: idx < items.length - 1 ? "1px solid rgba(255,255,255,0.06)" : undefined,
                  }}
                >
                  {/* Cover */}
                  <Link href={`/catalog/${item.slug}`} className="flex-shrink-0">
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{ width: "80px", height: "80px", background: "#12121e", flexShrink: 0 }}
                    >
                      {item.cover_img_url ? (
                        <img
                          src={item.cover_img_url}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-2xl">🎮</div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/catalog/${item.slug}`}
                      className="block text-sm font-bold text-white truncate hover:text-yellow-400 transition-colors mb-1"
                    >
                      {item.title}
                    </Link>
                    {item.short_description && (
                      <p
                        className="text-xs leading-relaxed line-clamp-2"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        {item.short_description}
                      </p>
                    )}
                    {item.discount_percent > 0 && (
                      <span
                        className="inline-block mt-1.5 rounded px-1.5 py-0.5 text-[10px] font-black text-black"
                        style={{ background: "#fbbf24" }}
                      >
                        -{item.discount_percent}% OFF
                      </span>
                    )}
                  </div>

                  {/* Price + remove */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <span className="text-base font-black text-white">
                      LKR {item.price_lkr.toLocaleString()}
                    </span>
                    <button
                      onClick={() => removeItem(item.game_id)}
                      disabled={removing === item.game_id}
                      className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-red-500/15 disabled:opacity-40"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                      aria-label="Remove"
                    >
                      {removing === item.game_id ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white/30 border-t-transparent" />
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Clear cart */}
            <div className="mt-4 flex justify-between items-center">
              <Link
                href="/catalog"
                className="text-xs transition-colors hover:text-white"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                ← Keep Shopping
              </Link>
              <button
                onClick={clearCart}
                disabled={clearing}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all disabled:opacity-40"
                style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}
              >
                {clearing ? (
                  <div className="h-3 w-3 animate-spin rounded-full border border-red-400/40 border-t-transparent" />
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                Clear Cart
              </button>
            </div>
          </div>

          {/* ── Right: order summary ──────────────────────────── */}
          <div className="w-80 flex-shrink-0 sticky top-20 self-start">
            <div
              className="rounded-2xl border p-6 space-y-5"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Heading */}
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: "#fbbf24", boxShadow: "0 0 6px #fbbf24" }}
                />
                <h2 className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: "#fbbf24" }}>
                  Order Summary
                </h2>
              </div>

              {/* Line items */}
              <div className="space-y-2.5">
                {items.map((item) => (
                  <div key={item.game_id} className="flex justify-between items-start gap-3 text-xs">
                    <span className="leading-tight truncate max-w-[170px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {item.title}
                    </span>
                    <span className="flex-shrink-0 font-semibold text-white">
                      LKR {item.price_lkr.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Subtotal + fee */}
              <div className="border-t space-y-2 pt-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>
                    Items ({items.length})
                  </span>
                  <span className="text-white">LKR {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Booking fee</span>
                  <span className="text-white">LKR {BOOKING_FEE.toLocaleString()}</span>
                </div>
              </div>

              {/* Total */}
              <div
                className="border-t pt-4 flex justify-between items-center"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              >
                <span className="font-bold text-white">Total</span>
                <span className="text-2xl font-black" style={{ color: "#fbbf24" }}>
                  LKR {total.toLocaleString()}
                </span>
              </div>

              {/* Installments */}
              <div className="space-y-2">
                {/* Payzy */}
                <div
                  className="flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,107,53,0.2)" }}
                >
                  <img src="/payment-opt/payzy.png" alt="Payzy" className="h-5 w-auto object-contain" />
                  <div className="text-right">
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>4 easy installments</p>
                    <p className="text-xs font-bold text-white">
                      LKR {Math.ceil(total / 4).toLocaleString()} / mo
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
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>3 easy installments</p>
                    <p className="text-xs font-bold text-white">
                      LKR {Math.ceil(total / 3).toLocaleString()} / mo
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => router.push("/checkout?source=cart")}
                className="w-full rounded-lg py-3.5 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-100"
                style={{
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  boxShadow: "0 4px 24px rgba(251,191,36,0.35)",
                }}
              >
                Proceed to Checkout →
              </button>

              <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                Secure checkout · Instant delivery
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
