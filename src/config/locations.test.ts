import { describe, expect, it } from "vitest";
import { LOCATIONS, getLocation, stationDistanceKm } from "./locations";

describe("locations", () => {
  it("has unique slugs", () => {
    const slugs = LOCATIONS.map((location) => location.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("finds a location by slug", () => {
    expect(getLocation("las-charcas")?.name).toBe("Las Charcas");
    expect(getLocation("nope")).toBeUndefined();
  });

  it("computes station distances matching Wunderground's", () => {
    const charcas = getLocation("las-charcas")!;
    const [iguate56, iguate57] = charcas.stations;
    expect(stationDistanceKm(charcas, iguate56)).toBeCloseTo(1.73, 1);
    expect(stationDistanceKm(charcas, iguate57)).toBeCloseTo(3.62, 1);
  });

  it("puts the closest station first", () => {
    for (const location of LOCATIONS) {
      const distances = location.stations.map((s) => stationDistanceKm(location, s));
      expect(distances).toEqual([...distances].sort((a, b) => a - b));
    }
  });
});
