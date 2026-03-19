import pool from "../../db/db";

export async function createGameRequest(
  customerId: number,
  requestText: string
): Promise<void> {
  await pool.query(
    "INSERT INTO game_requests (customer_id, request_text) VALUES ($1, $2)",
    [customerId, requestText.trim()]
  );
}
