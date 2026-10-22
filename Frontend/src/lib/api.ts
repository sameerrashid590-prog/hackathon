const API_URL = process.env.NEXT_PUBLIC_API_URL;
export type FieldError = { field: string; message: string };
export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly errors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
  }
}
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is missing");
  const headers = new Headers(options.headers);
  if (typeof options.body === "string" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(API_URL.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, ""), {
    ...options, headers, credentials: "include",
  });
  if (response.status === 204 && response.ok) return undefined as T;
  const text = await response.text();
  let data: unknown;
  try { data = JSON.parse(text); }
  catch { throw new ApiError(response.ok ? "The server returned an invalid response" : "Request failed (" + response.status + ")", response.status); }
  if (!response.ok) {
    const payload = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const errors = Array.isArray(payload.errors) ? payload.errors.filter((item): item is FieldError =>
      !!item && typeof item === "object" && typeof item.field === "string" && typeof item.message === "string") : [];
    throw new ApiError(typeof payload.message === "string" ? payload.message : "Request failed", response.status, errors);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new ApiError("The server returned an invalid response", response.status);
  return data as T;
}
