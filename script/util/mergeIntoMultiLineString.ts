import type { MultiLineString } from "geojson";
import type { SourceDataStreet } from "./types";

/**
 * Some datasets split a street at each junction, which is a bit
 * unhelpful. We want to merge it into a single MultiLineString
 * feature, representing a single 'problem'.
 *
 * Currently this assumes that a road name can only exist once
 * per sector, which is a poor assumption.
 * TODO: optimise with distance-based clustering
 */
export function mergeIntoMultiLineString(
  sector: SourceDataStreet[]
): SourceDataStreet[] {
  const byKey: { [key: string]: SourceDataStreet[] } = {};
  for (const road of sector) {
    byKey[road.nameCode] ||= [];
    byKey[road.nameCode].push(road);
  }

  const out: SourceDataStreet[] = [];
  for (const key in byKey) {
    const duplicates = byKey[key];
    if (duplicates.length === 1) {
      out.push(duplicates[0]);
      continue; // no merging required
    }

    const newGeometry: MultiLineString = {
      type: "MultiLineString",
      coordinates: [],
    };
    for (const duplicate of duplicates) {
      if (duplicate.geometry.type === "MultiLineString") {
        for (const ring of duplicate.geometry.coordinates) {
          newGeometry.coordinates.push(ring);
        }
      } else {
        // LineString
        newGeometry.coordinates.push(duplicate.geometry.coordinates);
      }
    }

    duplicates[0].geometry = newGeometry;
    out.push(duplicates[0]);
  }
  return out;
}
