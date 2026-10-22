const { test, before, after, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
process.env.JWT_SECRET = "test-only-secret-that-is-longer-than-32-characters";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.NODE_ENV = "production";
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");
const app = require("../src/app");
const { signupSchema, loginSchema } = require("../src/schemas/auth.schema");
const validateEnv = require("../src/config/env");
const rateLimit = require("../src/middleware/rate-limit");
let server, base;
const id = "507f1f77bcf86cd799439011";
const account = { _id: id, name: "Test User", email: "user@example.com" };
before(async () => {
  server = await new Promise((resolve) => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
  base = "http://127.0.0.1:" + server.address().port;
});
after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });
afterEach(() => mock.restoreAll());
function post(route, body) { return fetch(base + "/api/auth/" + route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
test("environment rejects missing and invalid configuration", () => {
  assert.throws(() => validateEnv({}), /MONGODB_URI/);
  const valid = { MONGODB_URI: "mongodb://localhost/test", JWT_SECRET: "x".repeat(32), FRONTEND_URL: "http://localhost:3000" };
  assert.equal(validateEnv(valid).port, 5000);
  assert.throws(() => validateEnv({ ...valid, JWT_SECRET: "short" }), /32/);
  assert.throws(() => validateEnv({ ...valid, FRONTEND_URL: "http://localhost:3000/" }), /origin/);
});
test("password validation counts UTF-8 bytes", () => {
  const values = { name: "Test", email: "user@example.com" };
  assert.ok(signupSchema.safeParse({ ...values, password: "a".repeat(72) }).success);
  assert.ok(!signupSchema.safeParse({ ...values, password: "a".repeat(73) }).success);
  assert.ok(!loginSchema.safeParse({ email: values.email, password: "😀".repeat(19) }).success);
});
test("signup normalizes input, hashes password, and excludes hash", async () => {
  mock.method(User, "findOne", async (query) => { assert.equal(query.email, account.email); return null; });
  mock.method(User, "create", async (data) => {
    assert.equal(data.name, account.name);
    assert.ok(await bcrypt.compare("password123", data.password));
    return { ...account, password: data.password };
  });
  const response = await post("signup", { name: "  Test User  ", email: "USER@example.com", password: "password123" });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.user.email, account.email);
  assert.ok(!("password" in body.user));
});
test("concurrent signup unique-index conflicts return a safe 409", async () => {
  mock.method(User, "findOne", async () => null);
  mock.method(User, "create", async () => { throw Object.assign(new Error("database internals"), { code: 11000 }); });
  const response = await post("signup", { name: "Test", email: account.email, password: "password123" });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).message, "Email already registered");
});
test("invalid login retains a useful production message", async () => {
  mock.method(User, "findOne", () => ({ select: async () => null }));
  const response = await post("login", { email: account.email, password: "password123" });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).message, "Invalid email or password");
});
test("login cookie authenticates me and logout clears it", async () => {
  const hash = await bcrypt.hash("password123", 4);
  mock.method(User, "findOne", () => ({ select: async () => ({ ...account, password: hash }) }));
  mock.method(User, "findById", () => ({ select: async () => account }));
  const response = await post("login", { email: account.email, password: "password123" });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i); assert.match(cookie, /Secure/i); assert.match(cookie, /SameSite=Lax/i);
  const me = await fetch(base + "/api/auth/me", { headers: { Cookie: cookie.split(";")[0] } });
  assert.equal(me.status, 200); assert.equal((await me.json()).user.id, id);
  const logout = await post("logout", {});
  assert.equal(logout.status, 200); assert.match(logout.headers.get("set-cookie"), /Expires=Thu, 01 Jan 1970/i);
});
test("unauthenticated and malformed tokens return 401", async () => {
  assert.equal((await fetch(base + "/api/auth/me")).status, 401);
  assert.equal((await fetch(base + "/api/auth/me", { headers: { Cookie: "token=invalid" } })).status, 401);
});
test("validation includes field errors and malformed JSON returns 400", async () => {
  const response = await post("signup", { name: "x", email: "invalid", password: "short" });
  assert.equal(response.status, 400); assert.ok((await response.json()).errors.some((item) => item.field === "password"));
  const malformed = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400); assert.equal((await malformed.json()).message, "Invalid JSON request body");
});
test("limiter blocks repeats, separates clients, and resets", () => {
  let time = 0, passed = 0;
  const middleware = rateLimit({ limit: 2, windowMs: 1000, now: () => time });
  const response = { statusCode: 200, headers: {}, set(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json() { return this; } };
  const request = (ip) => middleware({ ip }, response, () => passed++);
  request("a"); request("a"); request("a");
  assert.equal(passed, 2); assert.equal(response.statusCode, 429); assert.equal(response.headers["Retry-After"], "1");
  request("b"); assert.equal(passed, 3);
  time = 1001; request("a"); assert.equal(passed, 4);
});
