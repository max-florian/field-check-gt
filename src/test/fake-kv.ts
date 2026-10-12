import { vi } from "vitest";

export const FAKE_KV_URL = "https://kv.example.com";

/**
 * In-memory stand-in for the Upstash REST API. Stubs the KV environment variables;
 * call vi.unstubAllEnvs() after each test.
 */
export function fakeKv({ down = false } = {}) {
  vi.stubEnv("KV_REST_API_URL", FAKE_KV_URL);
  vi.stubEnv("KV_REST_API_TOKEN", "token");
  const data = new Map<string, string>();
  const commands: string[] = [];

  return {
    data,
    commands,
    handles: (input: string | URL | Request) => String(input).startsWith(FAKE_KV_URL),
    respond(init?: RequestInit): Response {
      if (down) return new Response("down", { status: 500 });
      const [command, key, value] = JSON.parse(String(init?.body)) as string[];
      commands.push(command);
      if (command === "SET") data.set(key, value);
      return Response.json({ result: command === "GET" ? (data.get(key) ?? null) : "OK" });
    },
  };
}
