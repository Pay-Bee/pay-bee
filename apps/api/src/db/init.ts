import "dotenv/config";
import fs from "fs";
import path from "path";
import { Client } from "pg";

async function init() {
  const url = process.env.DATABASE_URL ?? "postgresql://postgres:@localhost:5432/pay_bee";
  const isLocal = url.includes("localhost");

  const client = new Client({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

  try {
    await client.query(sql);
    console.log("[db] schema initialised successfully");
  } finally {
    await client.end();
  }
}

init().catch((err) => {
  console.error("[db] init failed:", err);
  process.exit(1);
});
