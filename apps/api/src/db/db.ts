import { Pool } from "pg";

const isLocal = (process.env.DATABASE_URL ?? "").includes("localhost");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:@localhost:5432/pay_bee",
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export default pool;
