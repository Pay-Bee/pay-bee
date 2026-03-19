"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../lib/api";
import type { CartItem, Game } from "shared";
import { BOOKING_FEE_LKR } from "shared";

// ── Normalised item for display + submission ──────────────────
interface CheckoutItem {
  game_id: number;
  title: string;
  cover_img_url: string | null;
  price_lkr: number;
  discount_percent: number;
}

// ── Reusable input component ──────────────────────────────────
function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: error ? "1px solid rgba(239,68,68,0.7)" : "1px solid rgba(255,255,255,0.1)",
          boxShadow: error ? "0 0 0 3px rgba(239,68,68,0.1)" : undefined,
        }}
        onFocus={(e) => {
          e.target.style.border = "1px solid rgba(251,191,36,0.6)";
          e.target.style.boxShadow = "0 0 0 3px rgba(251,191,36,0.1)";
        }}
        onBlur={(e) => {
          e.target.style.border = error
            ? "1px solid rgba(239,68,68,0.7)"
            : "1px solid rgba(255,255,255,0.1)";
          e.target.style.boxShadow = error ? "0 0 0 3px rgba(239,68,68,0.1)" : "none";
        }}
      />
    </div>
  );
}

// ── Custom checkbox ───────────────────────────────────────────
function Checkbox({
  checked,
  indeterminate,
  onChange,
  children,
  error,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <span
        onClick={() => onChange(!checked)}
        className="mt-0.5 flex-shrink-0 flex items-center justify-center w-4 h-4 rounded transition-all"
        style={{
          background: checked ? "#fbbf24" : "rgba(255,255,255,0.06)",
          border: error
            ? "1.5px solid rgba(239,68,68,0.7)"
            : checked
            ? "1.5px solid #fbbf24"
            : "1.5px solid rgba(255,255,255,0.2)",
        }}
      >
        {indeterminate && !checked ? (
          <span className="w-2 h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.5)" }} />
        ) : checked ? (
          <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2.5">
            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <span className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
        {children}
      </span>
    </label>
  );
}

// ── Section heading ───────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-sm font-bold text-white">{children}</span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────
function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();

  const source = params.get("source"); // "cart" | null
  const slug = params.get("slug");
  const gameId = params.get("gameId");

  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    billing_first_name: "",
    billing_last_name: "",
    billing_mobile: "",
    billing_address: "",
    billing_city: "",
    billing_state: "",
    billing_zip: "",
    steam_profile: "",
    steam_friend_code: "",
  });

  const [gateway, setGateway] = useState<"payzy" | "koko">("koko");
  const [checkedSteam, setCheckedSteam] = useState(false);
  const [checkedRefund, setCheckedRefund] = useState(false);
  const [checkedTerms, setCheckedTerms] = useState(false);

  const allChecked = checkedSteam && checkedRefund && checkedTerms;
  const anyChecked = checkedSteam || checkedRefund || checkedTerms;

  function setAll(v: boolean) {
    setCheckedSteam(v);
    setCheckedRefund(v);
    setCheckedTerms(v);
  }

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: false }));
  }

  // Load items
  useEffect(() => {
    async function load() {
      try {
        if (source === "cart") {
          const res = await api.get<CartItem[]>("/cart");
          setItems(
            res.data.map((i) => ({
              game_id: i.game_id,
              title: i.title,
              cover_img_url: i.cover_img_url,
              price_lkr: i.price_lkr,
              discount_percent: i.discount_percent,
            }))
          );
        } else if (slug) {
          const res = await api.get<Game>(`/catalog/${slug}`);
          const g = res.data;
          setItems([{
            game_id: g.id,
            title: g.title,
            cover_img_url: g.cover_img_url,
            price_lkr: g.price_lkr,
            discount_percent: g.discount_percent,
          }]);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [source, slug, gameId]);

  const subtotal = items.reduce((s, i) => s + i.price_lkr, 0);
  const total = subtotal + BOOKING_FEE_LKR;

  const installments = {
    payzy: { count: 4, label: "payzy", color: "#ff6b35" },
    koko: { count: 3, label: "koko", color: "#00c853" },
  };

  async function handleSubmit() {
    // Validate all form fields
    const newErrors: Record<string, boolean> = {};
    (Object.keys(form) as (keyof typeof form)[]).forEach((k) => {
      if (!form[k].trim()) newErrors[k] = true;
    });
    if (!checkedSteam || !checkedRefund || !checkedTerms) {
      newErrors.checkboxes = true;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      const el = document.querySelector("[data-error='true']");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/orders", {
        game_ids: items.map((i) => i.game_id),
        ...form,
      });

      // If from cart: clear all cart items and reset badge
      if (source === "cart") {
        await Promise.all(items.map((i) => api.delete(`/cart/${i.game_id}`)));
        window.dispatchEvent(new CustomEvent("cart-updated"));
      }

      router.push("/orders");
    } catch {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-400">Nothing to check out.</p>
        <Link href="/catalog" className="text-sm font-bold" style={{ color: "#fbbf24" }}>
          Browse the store →
        </Link>
      </div>
    );
  }

  const hasCheckboxError = errors.checkboxes;

  return (
    <div style={{ background: "#080810", minHeight: "100vh" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{
        background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(251,191,36,0.05) 0%, transparent 70%)",
      }} />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        {/* Page header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "#fbbf24", boxShadow: "0 0 6px #fbbf24" }}
            />
            <span className="text-xs font-bold tracking-[0.35em] uppercase" style={{ color: "#fbbf24" }}>
              Checkout
            </span>
          </div>
          <h1 className="font-black text-white" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
            You&apos;re almost there!
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Fill in your details below and unlock your {items.length === 1 ? "game" : "games"} instantly.
          </p>
        </div>

        {/* Two-column body */}
        <div className="flex gap-8 items-start">

          {/* ── Left: forms ──────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-8">

            {/* Billing Information */}
            <div
              className="rounded-2xl border p-6"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <SectionHeading>Billing Information</SectionHeading>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="First Name" value={form.billing_first_name}
                    onChange={(v) => setField("billing_first_name", v)}
                    placeholder="John" error={errors.billing_first_name} />
                  <Field label="Last Name" value={form.billing_last_name}
                    onChange={(v) => setField("billing_last_name", v)}
                    placeholder="Doe" error={errors.billing_last_name} />
                </div>
                <Field label="Mobile Number" value={form.billing_mobile}
                  onChange={(v) => setField("billing_mobile", v)}
                  placeholder="+94 77 000 0000" type="tel"
                  error={errors.billing_mobile} />
                <Field label="Address" value={form.billing_address}
                  onChange={(v) => setField("billing_address", v)}
                  placeholder="123 Main Street"
                  error={errors.billing_address} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="City" value={form.billing_city}
                    onChange={(v) => setField("billing_city", v)}
                    placeholder="Colombo" error={errors.billing_city} />
                  <Field label="State / Province" value={form.billing_state}
                    onChange={(v) => setField("billing_state", v)}
                    placeholder="Western" error={errors.billing_state} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="ZIP / Postal Code" value={form.billing_zip}
                    onChange={(v) => setField("billing_zip", v)}
                    placeholder="10100" error={errors.billing_zip} />
                </div>
              </div>
            </div>

            {/* Steam Details */}
            <div
              className="rounded-2xl border p-6"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <SectionHeading>Steam Details</SectionHeading>

              {/* Info banner */}
              <div
                className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5"
                style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}
              >
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(251,191,36,0.85)" }}>
                  We need your Steam Profile URL or Username to deliver your game as a digital gift.
                  Please double-check that your Steam Friend Code and Profile URL are correct —
                  we cannot resend to a wrong account.
                </p>
              </div>

              <div className="space-y-4">
                <Field label="Steam Profile URL or Username" value={form.steam_profile}
                  onChange={(v) => setField("steam_profile", v)}
                  placeholder="https://steamcommunity.com/id/yourname or yourname"
                  error={errors.steam_profile} />
                <Field label="Steam Friend Code" value={form.steam_friend_code}
                  onChange={(v) => setField("steam_friend_code", v)}
                  placeholder="XXXXX-XXXXX" error={errors.steam_friend_code} />
              </div>
            </div>
          </div>

          {/* ── Right: order summary ──────────────────────────── */}
          <div className="w-80 flex-shrink-0 sticky top-20 self-start">
            <div
              className="rounded-2xl border p-5 space-y-5"
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

              {/* Game rows */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.game_id} className="flex items-center gap-3">
                    <div
                      className="flex-shrink-0 rounded-lg overflow-hidden"
                      style={{ width: "44px", height: "44px", background: "#12121e" }}
                    >
                      {item.cover_img_url ? (
                        <img src={item.cover_img_url} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-base">🎮</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                      {item.discount_percent > 0 && (
                        <span className="text-[10px] font-black" style={{ color: "#fbbf24" }}>
                          -{item.discount_percent}% OFF
                        </span>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold text-white">
                      LKR {item.price_lkr.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Subtotal + fee + total */}
              <div className="border-t space-y-2 pt-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Items ({items.length})</span>
                  <span className="text-white">LKR {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Booking fee</span>
                  <span className="text-white">LKR {BOOKING_FEE_LKR.toLocaleString()}</span>
                </div>
                <div
                  className="flex justify-between items-center border-t pt-3"
                  style={{ borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <span className="text-sm font-bold text-white">Total</span>
                  <span className="text-xl font-black" style={{ color: "#fbbf24" }}>
                    LKR {total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Payment Method
                </p>
                <div className="space-y-2">
                  {(["payzy", "koko"] as const).map((gw) => {
                    const info = installments[gw];
                    const active = gateway === gw;
                    return (
                      <button
                        key={gw}
                        onClick={() => setGateway(gw)}
                        className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all"
                        style={{
                          background: active ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                          border: active ? `1.5px solid ${info.color}` : "1.5px solid rgba(255,255,255,0.08)",
                          boxShadow: active ? `0 0 14px ${info.color}25` : "none",
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                            style={{
                              borderColor: active ? info.color : "rgba(255,255,255,0.2)",
                              background: active ? info.color : "transparent",
                            }}
                          >
                            {active && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </span>
                          <img
                            src={`/payment-opt/${gw}.png`}
                            alt={gw}
                            className="h-5 w-auto object-contain"
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {info.count} installments
                          </p>
                          <p className="text-xs font-bold text-white">
                            LKR {Math.ceil(total / info.count).toLocaleString()} / mo
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Acknowledgement checkboxes */}
              <div
                className="border-t pt-4 space-y-3"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
                data-error={hasCheckboxError ? "true" : undefined}
              >
                {hasCheckboxError && (
                  <p className="text-xs" style={{ color: "#f87171" }}>
                    Please confirm all items before continuing.
                  </p>
                )}

                {/* Select All */}
                <Checkbox
                  checked={allChecked}
                  indeterminate={anyChecked && !allChecked}
                  onChange={(v) => setAll(v)}
                  error={hasCheckboxError && !allChecked}
                >
                  <span className="font-semibold text-white">Select All</span>
                </Checkbox>

                <div className="pl-2 space-y-3 border-l" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <Checkbox
                    checked={checkedSteam}
                    onChange={setCheckedSteam}
                    error={hasCheckboxError && !checkedSteam}
                  >
                    I have double-checked my Steam Friend Code and Profile URL.
                  </Checkbox>
                  <Checkbox
                    checked={checkedRefund}
                    onChange={setCheckedRefund}
                    error={hasCheckboxError && !checkedRefund}
                  >
                    I understand that digital gifts are <span className="font-semibold text-white">non-refundable</span> once sent.
                  </Checkbox>
                  <Checkbox
                    checked={checkedTerms}
                    onChange={setCheckedTerms}
                    error={hasCheckboxError && !checkedTerms}
                  >
                    By continuing, I agree to the{" "}
                    <span className="underline" style={{ color: "rgba(251,191,36,0.8)" }}>Terms &amp; Conditions</span>
                    {" "}and{" "}
                    <span className="underline" style={{ color: "rgba(251,191,36,0.8)" }}>Privacy Policy</span>.
                  </Checkbox>
                </div>
              </div>

              {/* Pay button */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-lg py-3.5 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  boxShadow: "0 4px 24px rgba(251,191,36,0.35)",
                }}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                    Placing Order…
                  </span>
                ) : (
                  `Pay LKR ${total.toLocaleString()} →`
                )}
              </button>

              <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                Secure checkout · Instant digital delivery
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
