import type { BBox } from "geojson";
import type { MissingStreet } from "../types";

const CELL_SIZE = 0.1;
const MAX_CELLS_PER_FEATURE = 256;

interface CellRange {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface StreetSpatialIndex {
  buckets: Map<string, number[]>;
  largeFeatureIndexes: number[];
  allFeatureIndexes: number[];
  minLatCell: number;
  maxLatCell: number;
  minLngCell: number;
  maxLngCell: number;
}

const getCellRange = (bbox: BBox): CellRange => ({
  minLat: Math.floor(bbox[0] / CELL_SIZE),
  maxLat: Math.floor(bbox[2] / CELL_SIZE),
  minLng: Math.floor(bbox[1] / CELL_SIZE),
  maxLng: Math.floor(bbox[3] / CELL_SIZE),
});

const getCellKey = (lat: number, lng: number) => `${lat}:${lng}`;

export function createStreetSpatialIndex(
  features: MissingStreet[]
): StreetSpatialIndex {
  const index: StreetSpatialIndex = {
    buckets: new Map(),
    largeFeatureIndexes: [],
    allFeatureIndexes: features.map((_, i) => i),
    minLatCell: Infinity,
    maxLatCell: -Infinity,
    minLngCell: Infinity,
    maxLngCell: -Infinity,
  };

  for (const [featureIndex, feature] of features.entries()) {
    const range = getCellRange(feature.bbox!);
    const cellCount =
      (range.maxLat - range.minLat + 1) * (range.maxLng - range.minLng + 1);

    if (cellCount > MAX_CELLS_PER_FEATURE) {
      index.largeFeatureIndexes.push(featureIndex);
      continue;
    }

    index.minLatCell = Math.min(index.minLatCell, range.minLat);
    index.maxLatCell = Math.max(index.maxLatCell, range.maxLat);
    index.minLngCell = Math.min(index.minLngCell, range.minLng);
    index.maxLngCell = Math.max(index.maxLngCell, range.maxLng);

    for (let lat = range.minLat; lat <= range.maxLat; lat++) {
      for (let lng = range.minLng; lng <= range.maxLng; lng++) {
        const key = getCellKey(lat, lng);
        const bucket = index.buckets.get(key);
        if (bucket) {
          bucket.push(featureIndex);
        } else {
          index.buckets.set(key, [featureIndex]);
        }
      }
    }
  }

  return index;
}

export function getStreetCandidateIndexes(
  index: StreetSpatialIndex,
  bbox: BBox
): number[] {
  if (!index.buckets.size) return index.allFeatureIndexes;

  const range = getCellRange(bbox);
  const minLat = Math.max(range.minLat, index.minLatCell);
  const maxLat = Math.min(range.maxLat, index.maxLatCell);
  const minLng = Math.max(range.minLng, index.minLngCell);
  const maxLng = Math.min(range.maxLng, index.maxLngCell);
  const queriedCellCount =
    Math.max(0, maxLat - minLat + 1) * Math.max(0, maxLng - minLng + 1);

  if (queriedCellCount > index.buckets.size * 2) {
    return index.allFeatureIndexes;
  }

  const candidates = new Set(index.largeFeatureIndexes);
  for (let lat = minLat; lat <= maxLat; lat++) {
    for (let lng = minLng; lng <= maxLng; lng++) {
      for (const featureIndex of index.buckets.get(getCellKey(lat, lng)) ||
        []) {
        candidates.add(featureIndex);
      }
    }
  }

  return [...candidates].toSorted((a, b) => a - b);
}
