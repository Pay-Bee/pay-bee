"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ── Intersection-observer reveal hook ────────────────────────
function useReveal<T extends HTMLElement>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null!);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

// ── FAQ item ─────────────────────────────────────────────────
const FAQS = [
  {
    q: "How do I purchase a game?",
    a: "Browse our catalog, click on any game to view details, then click 'Add to Cart' or 'Buy Now'. Proceed to checkout, fill in your details, choose your payment method, and complete the payment. Your game key will be delivered instantly.",
  },
  {
    q: "When will I receive my game key?",
    a: "Game keys are delivered instantly after payment confirmation. You'll find them on your Orders page. In rare cases it may take up to 5 minutes if payment verification is delayed.",
  },
  {
    q: "What payment methods are supported?",
    a: "We support Payzy and Koko — both are trusted Sri Lankan digital payment platforms that let you pay in LKR. Installment plans are available through Koko.",
  },
  {
    q: "Is my payment secure?",
    a: "Yes. All transactions are processed securely through Payzy or Koko. We never store your card details. Our site uses HTTPS end-to-end.",
  },
  {
    q: "How do I redeem my game key?",
    a: "For Steam games: open Steam → Games menu → Activate a product on Steam → enter your key. For Epic Games: open the Epic Games Launcher → click your profile → Redeem Code.",
  },
  {
    q: "Do I need a Steam or Epic Games account?",
    a: "Yes. During checkout you'll be asked for your Steam profile or Epic Games username so the key can be linked correctly. Make sure it matches your active account.",
  },
  {
    q: "What if my key doesn't work?",
    a: "Contact us at paybee.store@gmail.com with your order ID and a screenshot of the error. We'll resolve it within 24 hours.",
  },
  {
    q: "Can I get a refund?",
    a: "Once a key has been revealed it cannot be refunded, as digital keys are non-returnable. If there is a technical issue with the key itself, we will replace it free of charge.",
  },
  {
    q: "Can I buy games as a gift?",
    a: "Yes. At checkout, enter the recipient's Steam profile or Epic Games username in the details form and the key will be for their account.",
  },
  {
    q: "Are prices always in LKR?",
    a: "Yes. All prices are displayed and charged in Sri Lankan Rupees (LKR), with no hidden forex fees.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border rounded-xl overflow-hidden transition-colors duration-200"
      style={{
        borderColor: open ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.07)",
        background: open ? "rgba(251,191,36,0.03)" : "rgba(255,255,255,0.02)",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-sm font-semibold text-white">{q}</span>
        <span
          className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full transition-transform duration-300"
          style={{
            background: open ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.06)",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            color: open ? "#fbbf24" : "rgba(255,255,255,0.4)",
          }}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? "300px" : "0px" }}
      >
        <p className="px-6 pb-5 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          {a}
        </p>
      </div>
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────
function StepCard({
  num,
  icon,
  title,
  desc,
  delay,
  visible,
  accent,
}: {
  num: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: number;
  visible: boolean;
  accent?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center text-center px-4 ${visible ? "step-revealed" : "opacity-0"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Number badge */}
      <div className="relative mb-5">
        <div
          className="step-icon-glow flex items-center justify-center w-20 h-20 rounded-2xl"
          style={{
            background: `rgba(${accent ?? "251,191,36"},0.1)`,
            border: `1.5px solid rgba(${accent ?? "251,191,36"},0.25)`,
          }}
        >
          {icon}
        </div>
        <span
          className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full text-xs font-black text-black"
          style={{ background: accent ? `rgb(${accent})` : "#fbbf24" }}
        >
          {num}
        </span>
      </div>
      <h3 className="text-base font-black text-white tracking-wide uppercase mb-2">{title}</h3>
      <p className="text-sm leading-relaxed max-w-[180px]" style={{ color: "rgba(255,255,255,0.45)" }}>
        {desc}
      </p>
    </div>
  );
}

// ── Arrow ─────────────────────────────────────────────────────
function Arrow({ visible, down = false }: { visible: boolean; down?: boolean }) {
  if (down) {
    return (
      <div className={`flex justify-center my-1 ${visible ? "step-arrow-down" : "opacity-0"}`}>
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
          <path d="M12 5v14M5 15l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`flex items-center px-2 mt-[-28px] ${visible ? "step-arrow" : "opacity-0"}`}>
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Trust badge ───────────────────────────────────────────────
function TrustBadge({
  icon,
  title,
  sub,
  delay,
  visible,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  delay: number;
  visible: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center text-center p-6 rounded-2xl border ${visible ? "trust-badge-in" : "opacity-0"}`}
      style={{
        animationDelay: `${delay}ms`,
        background: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="flex items-center justify-center w-12 h-12 rounded-xl mb-4"
        style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}
      >
        {icon}
      </div>
      <p className="text-sm font-bold text-white mb-1">{title}</p>
      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function HelpPage() {
  const [stepsRef, stepsVisible] = useReveal<HTMLDivElement>();
  const [trustRef, trustVisible] = useReveal<HTMLDivElement>();
  const [faqRef, faqVisible] = useReveal<HTMLDivElement>();
  const [contactRef, contactVisible] = useReveal<HTMLDivElement>();

  return (
    <div className="min-h-screen" style={{ background: "#080810" }}>
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 45% at 50% 0%, rgba(251,191,36,0.07) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10">

        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 mb-5 rounded-full px-4 py-1.5 border"
            style={{ borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.06)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#fbbf24", boxShadow: "0 0 6px #fbbf24" }} />
            <span className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: "#fbbf24" }}>
              Help Center
            </span>
          </div>
          <h1
            className="font-black text-white mb-5"
            style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1 }}
          >
            How Pay-Bee
            <span style={{ color: "#fbbf24" }}> Works</span>
          </h1>
          <p className="text-base leading-relaxed mx-auto" style={{ color: "rgba(255,255,255,0.45)", maxWidth: "520px" }}>
            Sri Lanka&apos;s easiest way to buy PC games in LKR — browse, pay locally, and play instantly.
            No forex fees, no waiting.
          </p>
        </section>

        {/* ── How It Works Steps ────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-8 h-px" style={{ background: "rgba(251,191,36,0.3)" }} />
              <span className="text-xs font-bold tracking-[0.35em] uppercase" style={{ color: "rgba(251,191,36,0.7)" }}>
                Simple 4-Step Process
              </span>
              <div className="w-8 h-px" style={{ background: "rgba(251,191,36,0.3)" }} />
            </div>
          </div>

          {/* Steps row — responsive */}
          <div ref={stepsRef}>
            {/* Desktop: horizontal */}
            <div className="hidden md:flex items-start justify-center gap-0">
              <StepCard
                num={1}
                visible={stepsVisible}
                delay={0}
                title="Browse"
                desc="Explore hundreds of PC game titles — filter by genre, price, or new releases"
                icon={
                  <svg className="w-9 h-9" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                  </svg>
                }
              />
              <Arrow visible={stepsVisible} />
              <StepCard
                num={2}
                visible={stepsVisible}
                delay={120}
                title="Add to Cart"
                desc="Add games to your cart or hit Buy Now for a single-game express checkout"
                icon={
                  <svg className="w-9 h-9" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              />
              <Arrow visible={stepsVisible} />
              <StepCard
                num={3}
                visible={stepsVisible}
                delay={240}
                title="Pay in LKR"
                desc="Checkout securely via Payzy or Koko — pay in rupees with installment options"
                accent="251,191,36"
                icon={
                  <svg className="w-9 h-9" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" strokeLinecap="round" />
                    <path d="M6 15h4" strokeLinecap="round" />
                  </svg>
                }
              />
              <Arrow visible={stepsVisible} />
              <StepCard
                num={4}
                visible={stepsVisible}
                delay={360}
                title="Play Instantly"
                desc="Get your game key the moment payment confirms — redeem on Steam or Epic and play"
                accent="34,197,94"
                icon={
                  <svg className="w-9 h-9" style={{ color: "#4ade80" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="2" y="8" width="20" height="12" rx="2" />
                    <path d="M8 12v4M6 14h4" strokeLinecap="round" />
                    <circle cx="16" cy="14" r="1" fill="currentColor" />
                    <circle cx="19" cy="12" r="1" fill="currentColor" />
                  </svg>
                }
              />
            </div>

            {/* Mobile: vertical */}
            <div className="flex flex-col items-center md:hidden gap-0">
              <StepCard num={1} visible={stepsVisible} delay={0}
                title="Browse"
                desc="Explore hundreds of PC game titles — filter by genre, price, or new releases"
                icon={<svg className="w-9 h-9" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>}
              />
              <Arrow visible={stepsVisible} down />
              <StepCard num={2} visible={stepsVisible} delay={120}
                title="Add to Cart"
                desc="Add games to your cart or hit Buy Now for a single-game express checkout"
                icon={<svg className="w-9 h-9" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
              />
              <Arrow visible={stepsVisible} down />
              <StepCard num={3} visible={stepsVisible} delay={240}
                title="Pay in LKR"
                desc="Checkout securely via Payzy or Koko — pay in rupees with installment options"
                icon={<svg className="w-9 h-9" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" strokeLinecap="round" /><path d="M6 15h4" strokeLinecap="round" /></svg>}
              />
              <Arrow visible={stepsVisible} down />
              <StepCard num={4} visible={stepsVisible} delay={360}
                title="Play Instantly"
                desc="Get your game key the moment payment confirms — redeem on Steam or Epic and play"
                accent="34,197,94"
                icon={<svg className="w-9 h-9" style={{ color: "#4ade80" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="8" width="20" height="12" rx="2" /><path d="M8 12v4M6 14h4" strokeLinecap="round" /><circle cx="16" cy="14" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></svg>}
              />
            </div>
          </div>

          {/* Payment logos strip */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-16">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
              Accepted payments
            </p>
            <div className="flex items-center gap-3">
              {[
                { name: "Payzy", src: "/payment-opt/payzy.png" },
                { name: "Koko", src: "/payment-opt/koko.png" },
              ].map(({ name, src }) => (
                <div
                  key={name}
                  className="rounded-xl px-4 py-2 border flex items-center"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
                >
                  <img src={src} alt={name} className="h-6 w-auto object-contain" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust Signals ─────────────────────────────────── */}
        <section
          className="py-20"
          style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-black text-white tracking-wide uppercase mb-3">
                Why Gamers <span style={{ color: "#fbbf24" }}>Trust Us</span>
              </h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                Built for Sri Lankan gamers, with local payments and instant delivery
              </p>
            </div>

            <div ref={trustRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <TrustBadge
                visible={trustVisible} delay={0}
                title="Secure Checkout"
                sub="HTTPS + encrypted payment processing via Payzy & Koko"
                icon={<svg className="w-5 h-5" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>}
              />
              <TrustBadge
                visible={trustVisible} delay={80}
                title="Instant Keys"
                sub="Your game key is ready the moment payment confirms"
                icon={<svg className="w-5 h-5" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              />
              <TrustBadge
                visible={trustVisible} delay={160}
                title="LKR Pricing"
                sub="All prices in Sri Lankan Rupees — no hidden forex charges"
                icon={<svg className="w-5 h-5" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              />
              <TrustBadge
                visible={trustVisible} delay={240}
                title="Local Support"
                sub="Real humans behind paybee.store@gmail.com — respond within 24h"
                icon={<svg className="w-5 h-5" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              />
            </div>

            {/* Social proof strip */}
            <div
              className="mt-10 rounded-2xl p-6 border flex flex-col sm:flex-row items-center justify-around gap-6 text-center"
              style={{ background: "rgba(251,191,36,0.03)", borderColor: "rgba(251,191,36,0.12)" }}
            >
              {[
                { stat: "100%", label: "LKR Payments" },
                { stat: "Instant", label: "Key Delivery" },
                { stat: "24h", label: "Support Response" },
                { stat: "🇱🇰", label: "Made for Sri Lanka" },
              ].map(({ stat, label }) => (
                <div key={label}>
                  <p className="text-2xl font-black text-white mb-1">{stat}</p>
                  <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-6 py-24">
          <div ref={faqRef} className={faqVisible ? "step-revealed" : "opacity-0"}>
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-8 h-px" style={{ background: "rgba(251,191,36,0.3)" }} />
                <span className="text-xs font-bold tracking-[0.35em] uppercase" style={{ color: "rgba(251,191,36,0.7)" }}>
                  FAQ
                </span>
                <div className="w-8 h-px" style={{ background: "rgba(251,191,36,0.3)" }} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">
                Common <span style={{ color: "#fbbf24" }}>Questions</span>
              </h2>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Contact ───────────────────────────────────────── */}
        <section
          className="py-20"
          style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div
            ref={contactRef}
            className={`mx-auto max-w-lg px-6 text-center ${contactVisible ? "step-revealed" : "opacity-0"}`}
          >
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
              style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}
            >
              <svg className="w-7 h-7" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wide mb-3">
              Still Need <span style={{ color: "#fbbf24" }}>Help?</span>
            </h2>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
              Can&apos;t find the answer you&apos;re looking for? Send us an email — our team responds within 24 hours.
            </p>

            <a
              href="mailto:paybee.store@gmail.com"
              className="inline-flex items-center gap-3 rounded-xl px-8 py-4 text-sm font-black tracking-widest uppercase text-black transition-all hover:scale-[1.03]"
              style={{
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                boxShadow: "0 6px 24px rgba(251,191,36,0.35)",
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              paybee.store@gmail.com
            </a>

            <p className="mt-6 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
              Or browse the{" "}
              <Link href="/catalog" className="underline transition-colors" style={{ color: "rgba(251,191,36,0.6)" }}>
                Game Store
              </Link>{" "}
              to find your next title
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
