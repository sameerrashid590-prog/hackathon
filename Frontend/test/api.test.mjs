import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
const source = fs.readFileSync(fileURLToPath(new URL("../src/lib/api.ts", import.meta.url)), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function load(fetch) {
  const context = { exports: {}, process: { env: { NEXT_PUBLIC_API_URL: "http://localhost:5000/api/" } }, Headers, fetch };
  vm.runInNewContext(code, context);
  return context.exports;
}
test("merges Headers and tuple headers, includes credentials, and normalizes URL", async () => {
  for (const supplied of [new Headers({ "X-Test": "yes" }), [["X-Test", "yes"]]]) {
    const { apiFetch } = load(async (url, options) => {
      assert.equal(url, "http://localhost:5000/api/auth/login");
      assert.equal(options.credentials, "include");
      assert.equal(options.headers.get("X-Test"), "yes");
      assert.equal(options.headers.get("Content-Type"), "application/json");
      return Response.json({ success: true });
    });
    assert.equal((await apiFetch("/auth/login", { method: "POST", headers: supplied, body: "{}" })).success, true);
  }
});
test("preserves API status and structured field errors", async () => {
  const { apiFetch, ApiError } = load(async () => Response.json({ message: "Validation failed", errors: [{ field: "email", message: "Invalid email" }] }, { status: 400 }));
  await assert.rejects(apiFetch("/auth/signup"), (error) => error instanceof ApiError && error.status === 400 && error.errors[0].field === "email");
});
test("rejects malformed successful responses instead of returning an empty object", async () => {
  for (const body of ["", "<html>Error</html>", "null", "[]"]) {
    const { apiFetch } = load(async () => new Response(body));
    await assert.rejects(apiFetch("/auth/me"), /invalid response/);
  }
});
test("supports explicit no-content responses", async () => {
  const { apiFetch } = load(async () => new Response(null, { status: 204 }));
  assert.equal(await apiFetch("/auth/logout"), undefined);
});
test("non-JSON failures keep their HTTP status", async () => {
  const { apiFetch } = load(async () => new Response("Bad gateway", { status: 502 }));
  await assert.rejects(apiFetch("/auth/me"), (error) => error.status === 502);
});
