import pool from "../../db/mysql";

export async function createGameRequest(
  customerId: number,
  requestText: string
): Promise<void> {
  await pool.execute(
    "INSERT INTO game_requests (customer_id, request_text) VALUES (?, ?)",
    [customerId, requestText.trim()]
  );
}
