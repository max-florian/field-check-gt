import { type Coordinates, distanceKm } from "@/lib/geo";

export const TIME_ZONE = "America/Guatemala";

export type Station = {
  id: string;
  coordinates: Coordinates;
};

export type FieldLocation = {
  slug: string;
  name: string;
  area: string;
  coordinates: Coordinates;
  /** Wunderground PWS stations to try in order; Open-Meteo is used if all fail. */
  stations: Station[];
};

export const LOCATIONS: FieldLocation[] = [
  {
    slug: "campo-marte",
    name: "Campo Marte",
    area: "Zona 5, Ciudad de Guatemala",
    coordinates: { lat: 14.618175, lon: -90.505893 },
    stations: [{ id: "IGUATE37", coordinates: { lat: 14.618175, lon: -90.505893 } }],
  },
  {
    slug: "las-charcas",
    name: "Las Charcas",
    area: "Zona 11, Ciudad de Guatemala",
    coordinates: { lat: 14.5988574, lon: -90.5642887 },
    stations: [
      { id: "IGUATE56", coordinates: { lat: 14.58775, lon: -90.55289 } },
      { id: "IGUATE57", coordinates: { lat: 14.62791, lon: -90.54848 } },
    ],
  },
];

export function getLocation(slug: string): FieldLocation | undefined {
  return LOCATIONS.find((location) => location.slug === slug);
}

export function stationDistanceKm(location: FieldLocation, station: Station): number {
  return distanceKm(location.coordinates, station.coordinates);
}

export const wundergroundStationUrl = (stationId: string) =>
  `https://www.wunderground.com/dashboard/pws/${stationId}`;

export const openMeteoUrl = ({ lat, lon }: Coordinates) =>
  `https://open-meteo.com/en/docs?latitude=${lat}&longitude=${lon}`;
