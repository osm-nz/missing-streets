import type { Geometry, Position } from "geojson";

const { sin, cos, sqrt, PI: π, atan2 } = Math;

const R = 6371; // radius of the earth in km
const K = π / 180; // marginal performance boost by pre-calculating this

/** deg to rad */
const ᐤ = (deg: number) => deg * K;

/** returns the distance in metres between two coordinates */
export function distanceBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = ᐤ(lat2 - lat1);
  const dLon = ᐤ(lng2 - lng1);
  const a =
    sin(dLat / 2) * sin(dLat / 2) +
    cos(ᐤ(lat1)) * cos(ᐤ(lat2)) * sin(dLon / 2) * sin(dLon / 2);
  const c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return 1000 * R * c;
}

/** measured in units of lat/lon */
// higher values will make the script faster, but causes more
// false-positives for roads that cross a boundary
const SECTOR_SIZE = 2;

/**
 * for performance reasons, we split the datasets into "sectors" and
 * process each sector at a time.
 */
export function getSector(lat: number, lng: number): string {
  const column = Math.trunc(lng * SECTOR_SIZE);
  const row = Math.trunc(lat * SECTOR_SIZE);
  return `${column},${row}`;
}

export function getNameCode(name: string) {
  return name
    .toLowerCase()
    .replace(/saint /, "st ")
    .replace(/mount /, "mt ")
    .replace(/number /, "no ")
    .replaceAll(/[^A-Za-z0-9āēīōū]/g, "");
}

/** returns the first & last points of a linear geojson feature */
export function getEnds(
  geometry: Geometry
): [Position, Position] | [null, null] {
  if (geometry.type === "LineString") {
    return [geometry.coordinates[0], geometry.coordinates.at(-1)!];
  }
  if (geometry.type === "MultiLineString") {
    // assuming the members are ordered logically
    const x = geometry.coordinates.at(-1)!;
    return [geometry.coordinates[0][0], x.at(-1)!];
  }
  return [null, null];
}

export function processGeoJson(geometry: Geometry) {
  const [first, last] = getEnds(geometry);
  if (!first || !last) return undefined;

  const [firstLng, firstLat] = first;
  const [lastLng, lastLat] = last;

  const [firstSector, lastSector] = [
    getSector(firstLat, firstLng),
    getSector(lastLat, lastLng),
  ];

  if (firstSector !== lastSector) return undefined; // TEMP: skip big roads. TODO: revist this.

  // when processing a street that exists in two sectors: add it to the smallest sector.
  const sector = firstSector; // Math.min(firstSector, lastSector);

  return { sector, firstLat, firstLng, lastLat, lastLng };
}
