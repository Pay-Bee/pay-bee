"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import api from "../../../lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function RegisterContent() {
  const params = useSearchParams();
  const returnTo = params.get("returnTo") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match. Try again.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", { email, password });
      window.location.href = returnTo;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center px-4 py-12">
      {/* Radial glow behind card */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(139,92,246,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md auth-card">
        {/* Logo */}
        <div className="text-center mb-10 auth-logo">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 mb-4">
            <svg
              className="w-8 h-8 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-widest text-yellow-400 uppercase">
            PayBee
          </h1>
          <p
            className="text-xs tracking-[0.3em] uppercase mt-1"
            style={{ color: "rgba(251,191,36,0.4)" }}
          >
            Gaming Marketplace
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 border"
          style={{
            background: "rgba(10, 10, 20, 0.85)",
            backdropFilter: "blur(24px)",
            borderColor: "rgba(255,255,255,0.08)",
            boxShadow: "0 0 40px rgba(139,92,246,0.12)",
          }}
        >
          <h2 className="text-2xl font-bold text-white mb-1">
            Create Your Legend
          </h2>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
            Join the arena — your adventure starts here
          </p>

          {error && (
            <div
              className="rounded-lg px-4 py-3 text-sm mb-5 border"
              style={{
                background: "rgba(239,68,68,0.08)",
                borderColor: "rgba(239,68,68,0.25)",
                color: "#f87171",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold tracking-widest uppercase mb-1.5"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Player Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="input-field w-full rounded-xl px-4 py-3 text-sm"
                style={{ color: "white" }}
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold tracking-widest uppercase mb-1.5"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Security Code
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Min 8 characters"
                className="input-field w-full rounded-xl px-4 py-3 text-sm"
                style={{ color: "white" }}
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold tracking-widest uppercase mb-1.5"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Confirm Code
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                className="input-field w-full rounded-xl px-4 py-3 text-sm"
                style={{ color: "white" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="shimmer-btn w-full rounded-xl py-3.5 text-sm font-black tracking-widest uppercase text-black mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "Creating Account..." : "Start Your Journey"}
            </button>
          </form>

          <p
            className="text-center text-sm mt-5"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Already enlisted?{" "}
            <Link
              href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
              className="font-semibold transition-colors"
              style={{ color: "#fbbf24" }}
            >
              Sign in
            </Link>
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
            <span
              className="text-xs tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              or
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
          </div>

          {/* Google */}
          <a
            href={`${API_BASE}/auth/google?returnTo=${encodeURIComponent(returnTo)}`}
            className="flex items-center justify-center gap-3 w-full rounded-xl py-3.5 text-sm font-semibold border transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.85)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "rgba(255,255,255,0.18)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "rgba(255,255,255,0.04)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "rgba(255,255,255,0.1)";
            }}
          >
            <GoogleIcon />
            Sign up with Google
          </a>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>}>
      <RegisterContent />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
