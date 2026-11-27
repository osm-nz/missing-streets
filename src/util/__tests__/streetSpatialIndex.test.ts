import { describe, expect, it } from "vitest";
import type { BBox, LineString } from "geojson";
import type { MissingStreet } from "../../types";
import {
  createStreetSpatialIndex,
  getStreetCandidateIndexes,
} from "../streetSpatialIndex";

const makeStreet = (id: number, bbox: BBox): MissingStreet => ({
  type: "Feature",
  id,
  bbox,
  geometry: {
    type: "LineString",
    coordinates: [
      [bbox[1], bbox[0]],
      [bbox[3], bbox[2]],
    ],
  } satisfies LineString,
  properties: { roadId: id, name: `Street ${id}` },
});

const isInside = (feature: MissingStreet, bbox: BBox) =>
  feature.bbox![0] > bbox[0] &&
  feature.bbox![2] < bbox[2] &&
  feature.bbox![1] > bbox[1] &&
  feature.bbox![3] < bbox[3];

describe("street spatial index", () => {
  it("returns exactly the streets inside a viewport, in source order", () => {
    const features = [
      makeStreet(1, [0.01, 0.01, 0.09, 0.09]),
      makeStreet(2, [0.11, 0.11, 0.19, 0.19]),
      makeStreet(3, [-0.19, -0.19, -0.11, -0.11]),
      makeStreet(4, [0.09, 0.09, 0.11, 0.11]),
      makeStreet(5, [0, 0, 2, 2]),
      makeStreet(6, [2, 2, 2.1, 2.1]),
    ];
    const index = createStreetSpatialIndex(features);
    const viewports: BBox[] = [
      [0, 0, 0.2, 0.2],
      [-0.2, -0.2, 0, 0],
      [-1, -1, 2.2, 2.2],
      [3, 3, 4, 4],
    ];

    for (const viewport of viewports) {
      const actual = getStreetCandidateIndexes(index, viewport)
        .filter((featureIndex) => isInside(features[featureIndex], viewport))
        .map((featureIndex) => featureIndex);
      const expected = features
        .map((feature, featureIndex) =>
          isInside(feature, viewport) ? featureIndex : undefined
        )
        .filter((featureIndex) => featureIndex !== undefined);

      expect(actual).toStrictEqual(expected);
    }
  });
});
