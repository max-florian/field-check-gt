import { describe, expect, it, vi } from "vitest";
import { getLocation } from "@/config/locations";
import { fetchOpenMeteoSeries } from "./open-meteo";

const charcas = getLocation("las-charcas")!;
const epoch = (hhmm: string) => new Date(`2026-10-08T${hhmm}:00-06:00`).getTime() / 1000;

describe("fetchOpenMeteoSeries", () => {
  it("splits past and forecast intervals around now", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({
        minutely_15: {
          time: [epoch("22:00"), epoch("22:15"), epoch("22:30"), epoch("22:45")],
          precipitation: [0.3, 0.2, null, 0.6],
        },
      }),
    );
    const series = await fetchOpenMeteoSeries(charcas, {
      now: new Date(epoch("22:20") * 1000),
      fetch,
    });

    expect(series.source).toEqual({
      kind: "open-meteo",
      url: "https://open-meteo.com/en/docs?latitude=14.5988574&longitude=-90.5642887",
    });
    expect(series.samples.map((s) => s.mm)).toEqual([0.3, 0.2]);
    expect(series.samples[0].start).toEqual(new Date(epoch("21:45") * 1000));
    expect(series.forecast.map((s) => s.mm)).toEqual([0, 0.6]);
    expect(series.observedAt).toEqual(new Date(epoch("22:15") * 1000));

    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.searchParams.get("latitude")).toBe("14.5988574");
    expect(url.searchParams.get("timeformat")).toBe("unixtime");
  });

  it("fails on an error response", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response("down", { status: 503 }));
    await expect(fetchOpenMeteoSeries(charcas, { fetch })).rejects.toThrow("503");
  });
});
