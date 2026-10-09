import { describe, expect, it, vi } from "vitest";
import { getLocation } from "@/config/locations";
import { fetchOpenMeteo } from "./open-meteo";

const charcas = getLocation("las-charcas")!;
const epoch = (hhmm: string) => new Date(`2026-10-08T${hhmm}:00-06:00`).getTime() / 1000;

describe("fetchOpenMeteo", () => {
  it("splits past and forecast intervals around now", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({
        minutely_15: {
          time: [epoch("22:00"), epoch("22:15"), epoch("22:30"), epoch("22:45"), epoch("23:15")],
          precipitation: [0.3, 0.2, null, 0.6, 0.1],
        },
        hourly: {
          time: [epoch("22:00"), epoch("23:00"), epoch("24:00")],
          precipitation_probability: [90, 70, 40],
        },
      }),
    );
    const { series, forecast } = await fetchOpenMeteo(charcas, {
      now: new Date(epoch("22:20") * 1000),
      fetch,
    });

    expect(series.source).toEqual({
      kind: "open-meteo",
      url: "https://open-meteo.com/en/docs?latitude=14.5988574&longitude=-90.5642887",
    });
    expect(series.samples.map((s) => s.mm)).toEqual([0.3, 0.2]);
    expect(series.samples[0].start).toEqual(new Date(epoch("21:45") * 1000));
    expect(series.observedAt).toEqual(new Date(epoch("22:15") * 1000));

    // 22:30 and 22:45 fall in the hour ending at 23:00; 23:15 in the one ending at 24:00.
    expect(forecast.map((s) => [s.mm, s.probability])).toEqual([
      [0, 70],
      [0.6, 70],
      [0.1, 40],
    ]);

    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.searchParams.get("latitude")).toBe("14.5988574");
    expect(url.searchParams.get("timeformat")).toBe("unixtime");
    expect(url.searchParams.get("hourly")).toBe("precipitation_probability");
  });

  it("fails on an error response", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response("down", { status: 503 }));
    await expect(fetchOpenMeteo(charcas, { fetch })).rejects.toThrow("503");
  });
});
