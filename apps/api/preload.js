// Loaded via ts-node -r before any TypeScript modules are evaluated.
// This ensures DATABASE_URL and other env vars are set before mysql pool is created.
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
