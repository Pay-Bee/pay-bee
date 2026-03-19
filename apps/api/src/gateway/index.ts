import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import authRoutes from "../services/auth/auth.routes";
import cartRoutes from "../services/cart/cart.routes";
import catalogRoutes from "../services/catalog/catalog.routes";
import orderRoutes from "../services/order/order.routes";
import webhookRoutes from "../services/order/webhook.routes";
import gameRequestRoutes from "../services/game-requests/game-request.routes";
import { rateLimiter } from "./middleware/rateLimit.middleware";
import pool from "../db/db";

const app = express();
const PORT = process.env.PORT ?? 3000;

async function runMigrations() {
  const schemaPath = path.join(__dirname, "../db/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("[db] schema ready");
  } finally {
    client.release();
  }
}

// ── CORS ──────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  }),
);

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────
app.use(rateLimiter);

// ── Health ────────────────────────────────────────────────────
app.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "pay-bee-api" });
});

// ── Routes ────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/cart", cartRoutes);
app.use("/catalog", catalogRoutes);
app.use("/orders", orderRoutes);
app.use("/game-requests", gameRequestRoutes);
app.use("/webhooks", webhookRoutes);

// ── Global error handler ──────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[pay-bee-api] listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[db] migration failed, server not started:", err);
    process.exit(1);
  });

export default app;
