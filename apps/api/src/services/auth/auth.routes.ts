import { Request, Response, Router } from "express";
import { requireAuth } from "../../gateway/middleware/auth.middleware";
import {
  changePassword,
  getCustomerProfile,
  handleGoogleCallback,
  issueTokens,
  loginCustomer,
  logout,
  refreshAccessToken,
  registerCustomer,
  updateCustomerProfile,
  upsertUser,
} from "./auth.service";

const router = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

// POST /auth/register — create account with email + password
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const customer = await registerCustomer(email, password);
    const { accessToken, refreshToken } = await issueTokens(customer.id, customer.email);
    res
      .cookie("access_token", accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie("refresh_token", refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// POST /auth/login — sign in with email + password
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const customer = await loginCustomer(email, password);
    const { accessToken, refreshToken } = await issueTokens(customer.id, customer.email);
    res
      .cookie("access_token", accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie("refresh_token", refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({ ok: true });
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
});

// GET /auth/google — redirect to Google consent screen
router.get("/google", (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const callbackUrl =
    process.env.GOOGLE_CALLBACK_URL ??
    "http://localhost:3000/auth/google/callback";

  // returnTo is a relative path like /catalog/some-game — sanitize to relative only
  const rawReturnTo = req.query.returnTo as string | undefined;
  const returnTo =
    rawReturnTo && rawReturnTo.startsWith("/") ? rawReturnTo : "/";

  if (!clientId) {
    // Stub: simulate the callback directly
    res.redirect(`/auth/google/callback?code=stub&state=${encodeURIComponent(returnTo)}`);
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    state: returnTo,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /auth/google/callback — exchange code, set cookies, redirect back
router.get("/google/callback", async (req: Request, res: Response) => {
  try {
    const code = (req.query.code as string) ?? "stub";
    const rawState = req.query.state as string | undefined;
    const returnTo =
      rawState && rawState.startsWith("/") ? rawState : "/catalog";

    const profile = await handleGoogleCallback(code);
    const user = await upsertUser(profile);
    const { accessToken, refreshToken } = await issueTokens(
      user.id,
      user.email,
    );

    const frontendUrl =
      process.env.FRONTEND_URL ?? "http://localhost:3000";

    res
      .cookie("access_token", accessToken, {
        ...COOKIE_OPTS,
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refresh_token", refreshToken, {
        ...COOKIE_OPTS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .redirect(`${frontendUrl}${returnTo}`);
  } catch (err) {
    console.error("[auth] callback error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// POST /auth/refresh — issue new access token
router.post("/refresh", async (req: Request, res: Response) => {
  const raw = req.cookies?.refresh_token;
  if (!raw) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }

  const accessToken = await refreshAccessToken(raw);
  if (!accessToken) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  res
    .cookie("access_token", accessToken, {
      ...COOKIE_OPTS,
      maxAge: 15 * 60 * 1000,
    })
    .json({ ok: true });
});

// POST /auth/logout — always clears cookies regardless of auth state
router.post("/logout", async (req: Request, res: Response) => {
  const raw = req.cookies?.refresh_token ?? "";
  if (raw) await logout(raw).catch(() => {}); // best-effort revoke
  res
    .clearCookie("access_token", COOKIE_OPTS)
    .clearCookie("refresh_token", COOKIE_OPTS)
    .json({ ok: true });
});

// GET /auth/me — current user info (includes name + avatar from DB)
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await getCustomerProfile(Number(req.user!.sub));
    res.json({
      user: {
        sub: req.user!.sub,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
        registration_type: profile.registration_type,
      },
    });
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});

// PATCH /auth/profile — update name and/or email
router.patch("/profile", requireAuth, async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.user!.sub);
    const { name, email } = req.body as { name?: string; email?: string };
    if (email !== undefined && !email.trim()) {
      res.status(400).json({ error: "Email cannot be empty" });
      return;
    }
    await updateCustomerProfile(customerId, { name, email: email?.trim() });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// PATCH /auth/password — change password (CUSTOM accounts only)
router.patch("/password", requireAuth, async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.user!.sub);
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current and new password are required" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters" });
      return;
    }
    await changePassword(customerId, { currentPassword, newPassword });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
