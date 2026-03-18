import "dotenv/config";
import fs from "fs";
import path from "path";
import pool from "./mysql";

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

  // Split on semicolons, filter blanks, run each statement
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  const conn = await pool.getConnection();
  try {
    for (const stmt of statements) {
      await conn.execute(stmt);
    }
    console.log("[db] schema initialised successfully");
  } finally {
    conn.release();
    await pool.end();
  }
}

init().catch((err) => {
  console.error("[db] init failed:", err);
  process.exit(1);
});
