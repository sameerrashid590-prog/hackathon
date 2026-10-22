const dns = require("node:dns");

if (process.env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}
const validateEnv = require("./config/env");
const mongoose = require("mongoose");
async function startServer() {
  const { port } = validateEnv();
  const app = require("./app");
  const connectDB = require("./config/db");
  await connectDB();
  const server = app.listen(port, "0.0.0.0", () => console.log("Server running on port " + port));
  let stopping = false;
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    server.close(async () => {
      try { await mongoose.disconnect(); clearTimeout(deadline); }
      catch { process.exitCode = 1; }
    });
    server.closeIdleConnections();
  }
  server.on("error", async (error) => {
    console.error("HTTP server failed:", error.code || error.name);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return server;
}
if (require.main === module) {
  startServer().catch(async (error) => {
    console.error("Startup failed:", error.name === "Error" ? error.message : error.name);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}
module.exports = startServer;
