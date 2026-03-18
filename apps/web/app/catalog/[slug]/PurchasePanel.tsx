"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../../lib/api";

interface Props {
  slug: string;
  gameId: number;
}

export default function PurchasePanel({ slug, gameId }: Props) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  // reset "added" confirmation after 3 s
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 3000);
    return () => clearTimeout(t);
  }, [added]);

  useEffect(() => {
    api.get("/auth/me")
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  const loginUrl = `/login?returnTo=${encodeURIComponent(`/catalog/${slug}`)}`;
  const loading = authed === null;

  function handleBuyNow() {
    if (authed === false) {
      window.location.href = loginUrl;
      return;
    }
    if (authed === true) {
      router.push(`/checkout?slug=${slug}&gameId=${gameId}`);
    }
  }

  async function handleAddToCart() {
    if (authed === false) {
      window.location.href = loginUrl;
      return;
    }
    if (authed === true) {
      setAdding(true);
      try {
        await api.post("/cart", { gameId });
        setAdded(true);
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } catch {
        // leave button re-enabled on error
      } finally {
        setAdding(false);
      }
    }
  }

  return (
    <div className="space-y-3 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
      <button
        onClick={handleBuyNow}
        disabled={loading}
        className="w-full rounded-lg py-3 text-sm font-bold text-black transition-all hover:scale-[1.02] disabled:opacity-40"
        style={{
          background: loading ? "rgba(251,191,36,0.5)" : "linear-gradient(135deg, #fbbf24, #f59e0b)",
          boxShadow: loading ? "none" : "0 4px 20px rgba(251,191,36,0.3)",
        }}
      >
        {loading ? "Loading…" : "Buy Now"}
      </button>
      <button
        onClick={added ? () => router.push("/cart") : handleAddToCart}
        disabled={loading || adding}
        className="w-full rounded-lg border py-3 text-sm font-semibold transition-colors disabled:opacity-40"
        style={{
          borderColor: added ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.18)",
          color: added ? "#4ade80" : "#fff",
          background: added ? "rgba(74,222,128,0.08)" : undefined,
        }}
      >
        {adding ? "Adding…" : added ? "✓ Added — View Cart" : "Add to Cart"}
      </button>
    </div>
  );
}
