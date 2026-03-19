"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import type { UserProfile } from "shared";

function SuccessBanner({ msg }: { msg: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm border flex items-center gap-2"
      style={{
        background: "rgba(34,197,94,0.08)",
        borderColor: "rgba(34,197,94,0.25)",
        color: "#4ade80",
      }}
    >
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {msg}
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm border flex items-center gap-2"
      style={{
        background: "rgba(239,68,68,0.08)",
        borderColor: "rgba(239,68,68,0.25)",
        color: "#f87171",
      }}
    >
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
      </svg>
      {msg}
    </div>
  );
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  readOnly,
  autoComplete,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        className="block text-xs font-semibold tracking-widest uppercase mb-1.5"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors"
        style={{
          background: readOnly ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: readOnly ? "rgba(255,255,255,0.35)" : "white",
          cursor: readOnly ? "not-allowed" : undefined,
        }}
        onFocus={(e) => {
          if (!readOnly) e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        }}
      />
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Personal details state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");
  const profileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const passwordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api
      .get<{ user: UserProfile }>("/auth/me")
      .then((r) => {
        const u = r.data.user;
        setProfile(u);
        setName(u.name ?? "");
        setEmail(u.email);
      })
      .catch((err) => {
        if (err?.response?.status === 401) router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const isGoogle = profile?.registration_type === "GOOGLE";

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);

    if (!email.trim()) {
      setProfileError("Email is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setProfileError("Please enter a valid email address.");
      return;
    }

    setProfileSaving(true);
    try {
      await api.patch("/auth/profile", {
        name: name.trim() || null,
        email: email.trim(),
      });
      setProfileSuccess(true);
      if (profileTimer.current) clearTimeout(profileTimer.current);
      profileTimer.current = setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      setProfileError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Failed to update profile."
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (!newPassword) {
      setPasswordError("New password is required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await api.patch("/auth/password", { currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (passwordTimer.current) clearTimeout(passwordTimer.current);
      passwordTimer.current = setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      setPasswordError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Failed to change password."
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "#080810" }}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-yellow-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#080810" }}>
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(251,191,36,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-14">
        {/* Header */}
        <div className="mb-10 flex items-center gap-4">
          <div
            className="w-1 rounded-full self-stretch"
            style={{ background: "#fbbf24", minHeight: "48px" }}
          />
          <div>
            <h1 className="text-3xl font-black tracking-wider text-white uppercase">
              My Account
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
              Manage your personal details and security settings
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── Personal Details ─────────────────────────────── */}
          <div
            className="rounded-2xl p-7 border"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            {/* Section header */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-xl"
                style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}
              >
                <svg className="w-4 h-4" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Personal Details</h2>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Update your display name and email address
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <InputField
                label="Display Name"
                value={name}
                onChange={setName}
                placeholder="Your name"
                autoComplete="name"
              />

              {isGoogle ? (
                <div>
                  <label
                    className="block text-xs font-semibold tracking-widest uppercase mb-1.5"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    Email
                  </label>
                  <div className="flex items-center gap-3">
                    <InputField
                      label=""
                      value={email}
                      readOnly
                    />
                    <span
                      className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold border"
                      style={{
                        borderColor: "rgba(66,133,244,0.3)",
                        color: "rgba(66,133,244,0.8)",
                        background: "rgba(66,133,244,0.08)",
                      }}
                    >
                      Google
                    </span>
                  </div>
                </div>
              ) : (
                <InputField
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              )}

              {profileError && <ErrorBanner msg={profileError} />}
              {profileSuccess && <SuccessBanner msg="Personal details updated successfully." />}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="rounded-xl px-6 py-3 text-sm font-black tracking-widest uppercase text-black transition-all disabled:opacity-50"
                  style={{ background: "#fbbf24" }}
                  onMouseEnter={(e) => { if (!profileSaving) (e.currentTarget as HTMLButtonElement).style.background = "#fcd34d"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fbbf24"; }}
                >
                  {profileSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                      Saving…
                    </span>
                  ) : (
                    "Update Details"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ── Change Password ──────────────────────────────── */}
          {!isGoogle && (
            <div
              className="rounded-2xl p-7 border"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              {/* Section header */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-xl"
                  style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}
                >
                  <svg className="w-4 h-4" style={{ color: "#fbbf24" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Change Password</h2>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Must be at least 8 characters long
                  </p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <InputField
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <InputField
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <InputField
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />

                {/* Strength hint */}
                {newPassword.length > 0 && (
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map((level) => {
                      const strength =
                        newPassword.length >= 12 &&
                        /[A-Z]/.test(newPassword) &&
                        /[0-9]/.test(newPassword) &&
                        /[^A-Za-z0-9]/.test(newPassword)
                          ? 4
                          : newPassword.length >= 10 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)
                          ? 3
                          : newPassword.length >= 8
                          ? 2
                          : 1;
                      return (
                        <div
                          key={level}
                          className="h-1 flex-1 rounded-full transition-all"
                          style={{
                            background:
                              level <= strength
                                ? strength === 4
                                  ? "#4ade80"
                                  : strength === 3
                                  ? "#fbbf24"
                                  : strength === 2
                                  ? "#fb923c"
                                  : "#f87171"
                                : "rgba(255,255,255,0.08)",
                          }}
                        />
                      );
                    })}
                    <span className="text-xs ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {newPassword.length >= 12 &&
                      /[A-Z]/.test(newPassword) &&
                      /[0-9]/.test(newPassword) &&
                      /[^A-Za-z0-9]/.test(newPassword)
                        ? "Strong"
                        : newPassword.length >= 10 &&
                          /[A-Z]/.test(newPassword) &&
                          /[0-9]/.test(newPassword)
                        ? "Good"
                        : newPassword.length >= 8
                        ? "Fair"
                        : "Weak"}
                    </span>
                  </div>
                )}

                {passwordError && <ErrorBanner msg={passwordError} />}
                {passwordSuccess && <SuccessBanner msg="Password changed successfully." />}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="rounded-xl px-6 py-3 text-sm font-black tracking-widest uppercase text-black transition-all disabled:opacity-50"
                    style={{ background: "#fbbf24" }}
                    onMouseEnter={(e) => { if (!passwordSaving) (e.currentTarget as HTMLButtonElement).style.background = "#fcd34d"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fbbf24"; }}
                  >
                    {passwordSaving ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                        Saving…
                      </span>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Google account note */}
          {isGoogle && (
            <div
              className="rounded-2xl p-5 border flex items-center gap-3"
              style={{
                background: "rgba(66,133,244,0.05)",
                borderColor: "rgba(66,133,244,0.15)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                Your account is managed by Google. Password changes are not available.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
