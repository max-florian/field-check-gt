import { describe, expect, it } from "vitest";
import { formatDay, formatDistance, formatDuration, formatMm, formatTime } from "./format";

/** The formatters use non-breaking spaces; tests are written with plain ones. */
const plain = (text: string) => text.replaceAll("\u00a0", " ");

describe("formatTime", () => {
  it("formats Guatemala time with a 12-hour clock", () => {
    expect(plain(formatTime("2026-10-08T20:05:00Z"))).toBe("2:05 p. m.");
    expect(plain(formatTime("2026-10-08T06:00:00Z"))).toBe("12:00 a. m.");
    expect(plain(formatTime("2026-10-08T18:30:00Z"))).toBe("12:30 p. m.");
    expect(plain(formatTime("2026-10-08T15:09:00Z"))).toBe("9:09 a. m.");
  });
});

describe("formatDuration", () => {
  it.each([
    [20_000, "menos de 1 min"],
    [45 * 60_000, "45 min"],
    [60 * 60_000, "1 h"],
    [130 * 60_000, "2 h 10 min"],
  ])("formats %d ms as %s", (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});

describe("formatMm", () => {
  it("rounds to one decimal", () => {
    expect(plain(formatMm(18.03))).toBe("18 mm");
    expect(plain(formatMm(1.78))).toBe("1.8 mm");
    expect(plain(formatMm(0))).toBe("0 mm");
  });
});

describe("formatDay", () => {
  const now = new Date("2026-10-08T22:00:00-06:00");
  it("names today and yesterday in Guatemala time", () => {
    expect(formatDay("2026-10-08T00:10:00-06:00", now)).toBe("hoy");
    expect(formatDay("2026-10-07T23:50:00-06:00", now)).toBe("ayer");
    expect(formatDay("2026-10-06T12:00:00-06:00", now)).toBe("el 6/10");
  });
});

describe("formatDistance", () => {
  it("describes how far the station is", () => {
    expect(formatDistance(0)).toBe("junto al campo");
    expect(formatDistance(1.74)).toBe("a 1.7 km");
  });
});
