"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { Order, OrdersListResponse, OrderStatus } from "shared";
import api from "../../lib/api";

const PAGE_SIZE = 25;

const STATUS_COLOR: Record<OrderStatus, { bg: string; color: string }> = {
  PENDING:  { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
  CONFIRM:  { bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
  CANCELED: { bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  DONE:     { bg: "rgba(99,102,241,0.12)",  color: "#818cf8" },
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING:  "Pending",
  CONFIRM:  "Confirmed",
  CANCELED: "Canceled",
  DONE:     "Done",
};

function DeleteModal({
  orderId,
  deleting,
  onCancel,
  onConfirm,
}: {
  orderId: number;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-6 space-y-4"
        style={{
          background: "#13131f",
          borderColor: "rgba(255,255,255,0.1)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Icon */}
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>

        <div className="text-center">
          <h3 className="text-base font-bold text-white">Remove from History?</h3>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Order <span className="font-mono text-white/70">#{orderId}</span> · This cannot be undone.
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors hover:bg-white/5 disabled:opacity-40"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-lg py-2.5 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "rgba(239,68,68,0.85)", color: "#fff" }}
          >
            {deleting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/30 border-t-white" />
                Removing…
              </span>
            ) : (
              "Yes, Remove"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrdersContent() {
  const params = useSearchParams();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const statusBanner = params.get("status");
  const orderIdParam = params.get("orderId");
  const page = Math.max(1, parseInt(params.get("page") ?? "1") || 1);

  useEffect(() => {
    setLoading(true);
    api
      .get<OrdersListResponse>(`/orders?page=${page}&pageSize=${PAGE_SIZE}`)
      .then((r) => {
        setOrders(r.data.orders);
        setTotal(r.data.total);
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          router.replace("/login");
        } else {
          setError("Failed to load orders.");
        }
      })
      .finally(() => setLoading(false));
  }, [router, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  const goPage = (p: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(p));
    sp.delete("status");
    sp.delete("orderId");
    router.push(`/orders?${sp.toString()}`);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget === null) return;
    setDeleting(true);
    try {
      await api.delete(`/orders/${deleteTarget}`);
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget));
      setTotal((prev) => prev - 1);
      setDeleteTarget(null);
    } catch {
      // keep modal open; user can retry or cancel
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: "#080810", minHeight: "100vh" }}>
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#080810", minHeight: "100vh" }}>
        <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-4">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg px-5 py-2 text-sm font-semibold text-black"
            style={{ background: "#fbbf24" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#080810", minHeight: "100vh" }}>
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(251,191,36,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-10">
        {/* Page header */}
        <div className="mb-8 flex items-center gap-3">
          <div
            className="w-1 rounded-full flex-shrink-0"
            style={{ height: "28px", background: "#fbbf24" }}
          />
          <div>
            <h1 className="text-2xl font-black tracking-widest uppercase text-white">My Orders</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              {total} {total === 1 ? "order" : "orders"} in history
            </p>
          </div>
        </div>

        {/* Payment redirect banners */}
        {statusBanner === "returned" && orderIdParam && (
          <div
            className="mb-6 rounded-xl border px-4 py-3 text-sm"
            style={{
              background: "rgba(251,191,36,0.08)",
              borderColor: "rgba(251,191,36,0.25)",
              color: "#fbbf24",
            }}
          >
            Payment submitted for order <strong>#{orderIdParam}</strong>. Status will update shortly.
          </div>
        )}
        {statusBanner === "cancelled" && (
          <div
            className="mb-6 rounded-xl border px-4 py-3 text-sm"
            style={{
              background: "rgba(239,68,68,0.08)",
              borderColor: "rgba(239,68,68,0.2)",
              color: "#f87171",
            }}
          >
            Payment was cancelled.
          </div>
        )}

        {/* Empty state */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-6 py-24">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black text-white mb-2">No orders yet</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                Your completed purchases will appear here.
              </p>
            </div>
            <Link
              href="/catalog"
              className="rounded-lg px-8 py-3 text-sm font-bold text-black transition-all hover:scale-[1.03]"
              style={{
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                boxShadow: "0 4px 24px rgba(251,191,36,0.35)",
              }}
            >
              Browse Game Store →
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {orders.map((order) => {
                const orderTotal = (order.items ?? []).reduce((s, i) => s + i.price_lkr, 0);
                const canDelete = order.status === "DONE" || order.status === "CANCELED";
                const statusStyle = STATUS_COLOR[order.status as OrderStatus] ?? {
                  bg: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.5)",
                };

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    {/* Card header */}
                    <div
                      className="flex items-center justify-between gap-4 px-5 py-4"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div>
                          <p className="font-mono text-xs font-semibold text-white">
                            #{order.id}
                          </p>
                          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {new Date(order.created_at).toLocaleDateString("en-LK", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                          style={{ background: statusStyle.bg, color: statusStyle.color }}
                        >
                          {STATUS_LABEL[order.status as OrderStatus] ?? order.status}
                        </span>
                      </div>

                      {/* Delete icon — only for DONE or CANCELED */}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(order.id)}
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-red-500/15"
                          style={{ color: "rgba(255,255,255,0.25)" }}
                          aria-label="Remove from history"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Game items */}
                    <div className="px-5 py-3 space-y-3">
                      {(order.items ?? []).map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div
                            className="flex-shrink-0 rounded-lg overflow-hidden"
                            style={{ width: 40, height: 40, background: "rgba(255,255,255,0.06)" }}
                          >
                            {item.cover_img_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.cover_img_url}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-base">🎮</div>
                            )}
                          </div>
                          <div className="flex flex-1 items-center justify-between min-w-0 gap-3">
                            <span className="truncate text-sm text-white">{item.title}</span>
                            <span
                              className="flex-shrink-0 text-sm font-semibold"
                              style={{ color: "rgba(255,255,255,0.55)" }}
                            >
                              LKR {item.price_lkr.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div
                      className="flex items-center justify-between px-5 py-3"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Order total
                      </span>
                      <span className="text-sm font-black" style={{ color: "#fbbf24" }}>
                        LKR {orderTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Showing {firstItem}–{lastItem} of {total} orders
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goPage(page - 1)}
                    disabled={page <= 1}
                    className="rounded-lg border px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                  >
                    Previous
                  </button>
                  <span className="px-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => goPage(page + 1)}
                    disabled={page >= totalPages}
                    className="rounded-lg border px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget !== null && (
        <DeleteModal
          orderId={deleteTarget}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div style={{ background: "#080810", minHeight: "100vh" }}>
          <div className="flex min-h-[80vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
          </div>
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
