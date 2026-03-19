import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { RowDataPacket } from "mysql2/promise";
import pool from "../../db/mysql";
import { GoogleProfile, JWTPayload, TokenPair } from "shared";

const ACCESS_TTL = parseInt(process.env.JWT_ACCESS_TTL ?? "900", 10);
const REFRESH_TTL = parseInt(process.env.JWT_REFRESH_TTL ?? "604800", 10);

// ── Google OAuth ───────────────────────────────────────────────
// STUB: In production, exchange code for ID token via google-auth-library.
export async function handleGoogleCallback(code: string): Promise<GoogleProfile> {
  if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    code !== "stub"
  ) {
    const { OAuth2Client } = await import("google-auth-library");
    const oauthClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    const { tokens } = await oauthClient.getToken(code);
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload()!;
    return {
      google_id: payload.sub,
      email: payload.email!,
      avatar_url: payload.picture ?? "",
    };
  }

  return {
    google_id: "stub-google-id-001",
    email: "demo@paybee.lk",
    avatar_url: "https://via.placeholder.com/96",
  };
}

// ── Upsert customer (Google sign-in) ──────────────────────────
export async function upsertUser(profile: GoogleProfile): Promise<{ id: number; email: string }> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM customers WHERE provider_user_id = ? AND active = TRUE",
    [profile.google_id]
  );

  if (rows.length > 0) {
    await pool.execute(
      "UPDATE customers SET avatar = ?, updated_at = NOW() WHERE provider_user_id = ?",
      [profile.avatar_url, profile.google_id]
    );
    return { id: Number(rows[0].id), email: profile.email };
  }

  const [result] = await pool.execute(
    `INSERT INTO customers (email, registration_type, provider_user_id, avatar)
     VALUES (?, 'GOOGLE', ?, ?)`,
    [profile.email, profile.google_id, profile.avatar_url]
  ) as any;

  return { id: result.insertId as number, email: profile.email };
}

// ── Issue JWT + refresh token ──────────────────────────────────
export async function issueTokens(customerId: number, email: string): Promise<TokenPair> {
  const secret = process.env.JWT_SECRET!;

  const accessToken = jwt.sign(
    { sub: String(customerId), email } satisfies JWTPayload,
    secret,
    { expiresIn: ACCESS_TTL }
  );

  const rawRefresh = crypto.randomBytes(48).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawRefresh).digest("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000);

  await pool.execute(
    "INSERT INTO refresh_tokens (customer_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [customerId, tokenHash, expiresAt]
  );

  return { accessToken, refreshToken: rawRefresh };
}

// ── Refresh access token ───────────────────────────────────────
export async function refreshAccessToken(rawRefreshToken: string): Promise<string | null> {
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT rt.customer_id, rt.expires_at, c.email
     FROM refresh_tokens rt
     JOIN customers c ON c.id = rt.customer_id
     WHERE rt.token_hash = ? AND rt.revoked = 0 AND rt.deleted_at IS NULL`,
    [tokenHash]
  );

  if (rows.length === 0) return null;

  const record = rows[0];
  if (new Date(record.expires_at as string) < new Date()) return null;

  return jwt.sign(
    { sub: String(record.customer_id), email: record.email as string } satisfies JWTPayload,
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TTL }
  );
}

// ── Custom register ────────────────────────────────────────────
export async function registerCustomer(
  email: string,
  password: string
): Promise<{ id: number; email: string }> {
  const [existing] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM customers WHERE email = ?",
    [email]
  );
  if ((existing as RowDataPacket[]).length > 0) {
    throw new Error("Email already registered");
  }
  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute(
    "INSERT INTO customers (email, password, registration_type) VALUES (?, ?, 'CUSTOM')",
    [email, hash]
  ) as any;
  return { id: result.insertId as number, email };
}

// ── Custom login ───────────────────────────────────────────────
export async function loginCustomer(
  email: string,
  password: string
): Promise<{ id: number; email: string }> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id, email, password FROM customers WHERE email = ? AND registration_type = 'CUSTOM' AND active = TRUE",
    [email]
  );
  if (rows.length === 0) throw new Error("Invalid credentials");
  const valid = await bcrypt.compare(password, rows[0].password as string);
  if (!valid) throw new Error("Invalid credentials");
  return { id: Number(rows[0].id), email: rows[0].email as string };
}

// ── Get customer profile ───────────────────────────────────────
export async function getCustomerProfile(customerId: number): Promise<{
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  registration_type: string;
}> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id, email, name, avatar, registration_type FROM customers WHERE id = ? AND active = TRUE",
    [customerId]
  );
  if (rows.length === 0) throw new Error("Customer not found");
  const r = rows[0];
  return {
    id: Number(r.id),
    email: r.email as string,
    name: (r.name as string | null) ?? null,
    avatar: (r.avatar as string | null) ?? null,
    registration_type: r.registration_type as string,
  };
}

// ── Update customer profile (name + email) ────────────────────
export async function updateCustomerProfile(
  customerId: number,
  data: { name?: string; email?: string }
): Promise<void> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT email FROM customers WHERE id = ? AND active = TRUE",
    [customerId]
  );
  if (rows.length === 0) throw new Error("Customer not found");
  const current = rows[0];

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name || null);
  }

  if (data.email && data.email !== current.email) {
    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM customers WHERE email = ? AND id != ?",
      [data.email, customerId]
    );
    if ((existing as RowDataPacket[]).length > 0) throw new Error("Email already in use");
    fields.push("email = ?");
    values.push(data.email);
  }

  if (fields.length === 0) return;

  values.push(customerId);
  await pool.execute(
    `UPDATE customers SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`,
    values as string[]
  );
}

// ── Change password ────────────────────────────────────────────
export async function changePassword(
  customerId: number,
  data: { currentPassword: string; newPassword: string }
): Promise<void> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT password, registration_type FROM customers WHERE id = ? AND active = TRUE",
    [customerId]
  );
  if (rows.length === 0) throw new Error("Customer not found");
  const current = rows[0];

  if (current.registration_type === "GOOGLE") {
    throw new Error("Cannot set password for Google accounts");
  }
  if (!data.currentPassword) throw new Error("Current password is required");
  const valid = await bcrypt.compare(data.currentPassword, current.password as string);
  if (!valid) throw new Error("Current password is incorrect");

  const hash = await bcrypt.hash(data.newPassword, 12);
  await pool.execute(
    "UPDATE customers SET password = ?, updated_at = NOW() WHERE id = ?",
    [hash, customerId]
  );
}

// ── Logout ─────────────────────────────────────────────────────
export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  await pool.execute(
    "UPDATE refresh_tokens SET deleted_at = NOW(), revoked = 1 WHERE token_hash = ?",
    [tokenHash]
  );
}
