import { describe, expect, it, vi } from "vitest";
import { getLocation } from "@/config/locations";
import { getFieldStatus } from "./status";

const campoMarte = getLocation("campo-marte")!;

describe("getFieldStatus", () => {
  it("serializes the weather of a field", async () => {
    const now = new Date("2026-10-08T14:30:00-06:00");
    const end = now.getTime() / 1000;
    // No Wunderground key in the page, so it falls back to Open-Meteo.
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
      String(input).includes("open-meteo")
        ? Response.json({
            minutely_15: {
              time: [end - 1800, end - 900, end, end + 900],
              precipitation: [0, 0.6, 0.8, 0.4],
            },
          })
        : new Response("<html></html>"),
    );

    const status = await getFieldStatus(campoMarte, { now, fetch });

    expect(status).toEqual({
      slug: "campo-marte",
      name: "Campo Marte",
      area: "Zona 5, Ciudad de Guatemala",
      ok: true,
      source: { kind: "open-meteo", url: expect.stringContaining("open-meteo.com") },
      isRaining: true,
      lastEpisode: {
        start: "2026-10-08T20:00:00.000Z",
        end: "2026-10-08T20:30:00.000Z",
        mm: 1.4,
      },
      todayMm: 1.4,
      recentMm: 1.4,
      playability: "unplayable",
      observedAt: "2026-10-08T20:30:00.000Z",
      forecast: {
        until: "2026-10-08T20:45:00.000Z",
        rainStartsAt: null,
        rainStopsAt: "2026-10-08T20:30:00.000Z",
        totalMm: 0.4,
        maxProbability: null,
        url: expect.stringContaining("open-meteo.com"),
      },
      skipped: [expect.stringMatching(/^IGUATE37: No Wunderground API key was authorized/)],
    });
    expect(JSON.parse(JSON.stringify(status))).toEqual(status);
  });

  it("reports an error instead of throwing when every source fails", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response("down", { status: 503 }),
    );
    expect(await getFieldStatus(campoMarte, { fetch })).toEqual({
      slug: "campo-marte",
      name: "Campo Marte",
      area: "Zona 5, Ciudad de Guatemala",
      ok: false,
      error: "Open-Meteo returned 503",
    });
  });
});
