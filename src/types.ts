import type { Feature, MultiLineString } from "geojson";
import type { ConflatedStreet, RawCsvStreet } from "../script/util/types";

export type MissingStreet = Feature<MultiLineString, ConflatedStreet>;

export type LinzApiStreet = Feature<MultiLineString, RawCsvStreet>;

export { RawCsvStreet };
