import type { Feature, LineString, MultiLineString } from "geojson";
import type { ConflatedStreet, RegionMetadata } from "../script/util/types";
import type { RawCsvStreet } from "../script/regions/NZ/const";

export type MissingStreet = Feature<
  LineString | MultiLineString,
  ConflatedStreet
>;

export type LinzApiStreet = Feature<MultiLineString, RawCsvStreet>;

export type { RawCsvStreet, RegionMetadata };
