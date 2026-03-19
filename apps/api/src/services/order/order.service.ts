import pool from "../../db/db";
import { getGameById } from "../catalog/catalog.service";
import { CreateOrderRequest, Order, OrderItem, OrderStatus, OrdersListResponse } from "shared";

// ── Create order ───────────────────────────────────────────────
export async function createOrder(
  customerId: number,
  data: CreateOrderRequest
): Promise<{ orderId: number }> {
  if (!data.game_ids || data.game_ids.length === 0) {
    throw new Error("At least one game_id is required");
  }

  // Fetch all games and validate they exist
  const games = await Promise.all(data.game_ids.map((id) => getGameById(id)));
  for (let i = 0; i < games.length; i++) {
    if (!games[i]) throw new Error(`Game not found: ${data.game_ids[i]}`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `INSERT INTO orders
         (customer_id, status,
          billing_first_name, billing_last_name, billing_mobile,
          billing_address, billing_city, billing_state, billing_zip,
          steam_profile, steam_friend_code)
       VALUES ($1, 'PENDING', $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        customerId,
        data.billing_first_name,
        data.billing_last_name,
        data.billing_mobile,
        data.billing_address,
        data.billing_city,
        data.billing_state,
        data.billing_zip,
        data.steam_profile,
        data.steam_friend_code,
      ]
    );

    const orderId = Number(orderResult.rows[0].id);

    for (let i = 0; i < data.game_ids.length; i++) {
      const game = games[i]!;
      await client.query(
        `INSERT INTO order_items
           (order_id, game_id, price_usd, price_lkr, discount_percent)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, data.game_ids[i], game.price_usd, game.price_lkr, game.discount_percent]
      );
    }

    await client.query("COMMIT");
    return { orderId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ── Get orders by customer (paginated) ────────────────────────
export async function getOrdersByCustomer(
  customerId: number,
  page: number,
  pageSize: number
): Promise<OrdersListResponse> {
  const offset = (page - 1) * pageSize;

  // Total count
  const { rows: countRows } = await pool.query(
    "SELECT COUNT(*) AS total FROM orders WHERE customer_id = $1 AND active = TRUE",
    [customerId]
  );
  const total = Number(countRows[0].total);

  if (total === 0) return { orders: [], total: 0, page, pageSize };

  const { rows: orderRows } = await pool.query(
    `SELECT id, customer_id, status,
            billing_first_name, billing_last_name, billing_mobile,
            billing_address, billing_city, billing_state, billing_zip,
            steam_profile, steam_friend_code,
            created_at, updated_at
     FROM orders
     WHERE customer_id = $1 AND active = TRUE
     ORDER BY created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [customerId]
  );

  if (orderRows.length === 0) return { orders: [], total, page, pageSize };

  const orderIds = orderRows.map((r) => r.id as number);
  const placeholders = orderIds.map((_, i) => `$${i + 1}`).join(",");

  const { rows: itemRows } = await pool.query(
    `SELECT oi.id, oi.order_id, oi.game_id, oi.price_usd, oi.price_lkr, oi.discount_percent, oi.created_at,
            g.title, g.cover_img_url
     FROM order_items oi
     JOIN games g ON g.id = oi.game_id
     WHERE oi.order_id IN (${placeholders})`,
    orderIds
  );

  const itemsByOrder = new Map<number, OrderItem[]>();
  for (const r of itemRows) {
    const oid = Number(r.order_id);
    if (!itemsByOrder.has(oid)) itemsByOrder.set(oid, []);
    itemsByOrder.get(oid)!.push({
      id: Number(r.id),
      order_id: oid,
      game_id: Number(r.game_id),
      price_usd: Number(r.price_usd),
      price_lkr: Number(r.price_lkr),
      discount_percent: Number(r.discount_percent),
      title: r.title as string,
      cover_img_url: (r.cover_img_url as string | null) ?? null,
      created_at: r.created_at as Date,
    });
  }

  const orders: Order[] = orderRows.map((r) => ({
    id: Number(r.id),
    customer_id: Number(r.customer_id),
    status: r.status as Order["status"],
    billing_first_name: r.billing_first_name as string,
    billing_last_name: r.billing_last_name as string,
    billing_mobile: r.billing_mobile as string,
    billing_address: r.billing_address as string,
    billing_city: r.billing_city as string,
    billing_state: r.billing_state as string,
    billing_zip: r.billing_zip as string,
    steam_profile: r.steam_profile as string,
    steam_friend_code: r.steam_friend_code as string,
    created_at: r.created_at as Date,
    updated_at: r.updated_at as Date,
    items: itemsByOrder.get(Number(r.id)) ?? [],
  }));

  return { orders, total, page, pageSize };
}

// ── Update order status (admin / webhook) ─────────────────────
export async function updateOrderStatus(
  orderId: number,
  status: Order["status"]
): Promise<void> {
  await pool.query(
    "UPDATE orders SET status = $1 WHERE id = $2",
    [status, orderId]
  );
}

// ── Soft-delete order (customer — DONE/CANCELED only) ─────────
export async function deleteOrder(
  orderId: number,
  customerId: number
): Promise<{ ok: boolean; error?: string }> {
  const { rows } = await pool.query(
    "SELECT status FROM orders WHERE id = $1 AND customer_id = $2 AND active = TRUE",
    [orderId, customerId]
  );
  if (rows.length === 0) return { ok: false, error: "Order not found" };
  const status = rows[0].status as OrderStatus;
  if (status !== "DONE" && status !== "CANCELED") {
    return { ok: false, error: "Only DONE or CANCELED orders can be removed" };
  }
  await pool.query(
    "UPDATE orders SET active = FALSE WHERE id = $1 AND customer_id = $2",
    [orderId, customerId]
  );
  return { ok: true };
}
