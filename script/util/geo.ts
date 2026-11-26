import type { Geometry } from "geojson";
import { latLngToCell } from "h3-js";
import type { Region } from "./types";

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

const DEFAULT_SECTOR_RESOLUTION = 3;

/**
 * for performance reasons, we split the datasets into "sectors" and
 * process each sector at a time. The sector size can be tuned for
 * each region.
 */
export function getSector(lat: number, lng: number, region: Region) {
  return latLngToCell(
    lat,
    lng,
    region.sectorResolution ?? DEFAULT_SECTOR_RESOLUTION
  );
}

export function getNameCode(name: string) {
  return name
    .toLowerCase()
    .replace(/saint /, "st ")
    .replace(/mount /, "mt ")
    .replace(/number /, "no ")
    .normalize("NFD")
    .replaceAll(/(?!\u0304)\p{M}/gu, "") // strip all diacritics except macrons
    .normalize("NFC") // strip all remaining characters except these
    .replaceAll(/[^A-Za-z0-9āēīōū]/g, "");
}

/** checks if the edit-distance between two strings is within a certain threshold */
export function isWithinEditDistance(
  a: string,
  b: string,
  maxEditDistance: number
) {
  if (Math.abs(a.length - b.length) > maxEditDistance) return false;

  let previousRow = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const currentRow = [i];
    let rowMinimum = i;

    for (let j = 1; j <= b.length; j++) {
      currentRow[j] = Math.min(
        previousRow[j] + 1,
        currentRow[j - 1] + 1,
        previousRow[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      rowMinimum = Math.min(rowMinimum, currentRow[j]);
    }

    if (rowMinimum > maxEditDistance) return false;
    previousRow = currentRow;
  }

  return previousRow[b.length] <= maxEditDistance;
}

export function processGeoJson(geometry: Geometry, region: Region) {
  const lines =
    geometry.type === "LineString"
      ? [geometry.coordinates]
      : geometry.type === "MultiLineString"
        ? geometry.coordinates
        : undefined;
  if (!lines) return undefined;

  const [[[firstLng, firstLat]]] = lines;

  // TODO: checking every single coordinate is a bit
  // excessive, 17% of total execution time is spent
  // just inside this loop. Maybe we could only check
  // every 10th point, or only check points that are
  // more than hexagon-diameter/some-constant metres
  // away from the last point that we checked?
  const sectors = new Set<string>();
  for (const line of lines) {
    for (const [lon, lat] of line) {
      sectors.add(getSector(lat, lon, region));
    }
  }

  return { sectors, firstLat, firstLng };
}
