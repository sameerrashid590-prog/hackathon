const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env"), quiet: true });
function validateEnv(env = process.env) {
  for (const key of ["MONGODB_URI", "JWT_SECRET", "FRONTEND_URL"]) {
    if (!env[key]?.trim()) throw new Error(key + " is missing");
  }
  if (!/^mongodb(\+srv)?:\/\//.test(env.MONGODB_URI)) throw new Error("MONGODB_URI must be a MongoDB connection URL");
  if (env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
  const origin = new URL(env.FRONTEND_URL);
  if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL must be an HTTP(S) origin without a trailing slash or path");
  }
  const port = Number(env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535");
  return { port };
}
module.exports = validateEnv;
