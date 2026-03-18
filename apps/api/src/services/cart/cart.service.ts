import { RowDataPacket } from "mysql2/promise";
import pool from "../../db/mysql";
import { CartItem } from "shared";

// ── Add item to cart (upsert — reactivates if soft-deleted) ──
export async function addToCart(customerId: number, gameId: number): Promise<void> {
  await pool.execute(
    `INSERT INTO cart_items (customer_id, game_id, active)
     VALUES (?, ?, TRUE)
     ON DUPLICATE KEY UPDATE active = TRUE, updated_at = NOW()`,
    [customerId, gameId]
  );
}

// ── Soft-delete: mark item inactive ──────────────────────────
export async function removeFromCart(customerId: number, gameId: number): Promise<void> {
  await pool.execute(
    `UPDATE cart_items SET active = FALSE, updated_at = NOW()
     WHERE customer_id = ? AND game_id = ?`,
    [customerId, gameId]
  );
}

// ── Fetch all active cart items with game details ─────────────
export async function getCart(customerId: number): Promise<CartItem[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ci.game_id, g.title, g.slug, g.price_lkr, g.cover_img_url, g.discount_percent, g.short_description
     FROM cart_items ci
     JOIN games g ON g.id = ci.game_id
     WHERE ci.customer_id = ? AND ci.active = TRUE AND g.active = TRUE
     ORDER BY ci.updated_at DESC`,
    [customerId]
  );

  return (rows as RowDataPacket[]).map((r) => ({
    game_id: Number(r.game_id),
    title: r.title as string,
    slug: r.slug as string,
    price_lkr: Number(r.price_lkr),
    cover_img_url: r.cover_img_url as string | null,
    discount_percent: Number(r.discount_percent),
    short_description: r.short_description as string | null,
  }));
}
