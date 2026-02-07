import { MultiLineString, type LineString } from "geojson";

export type BaseStreet = {
  name: string;
  nameCode: string;
  lat: number;
  lng: number;
};
export type OsmStreet = BaseStreet & {
  wayId: number;
  otherNameCodes?: string[];
};

export type OsmPlanet = {
  [sector: string]: {
    [nameCode: string]: OsmStreet[];
  };
};

export type SourceDataStreet = BaseStreet & {
  roadId: number;
  geometry: MultiLineString | LineString;
  streetLength: number;
};

export type SourceData = {
  [sector: string]: SourceDataStreet[];
};

export type Coord = [lng: number, lat: number];

/** the final output that gets published */
export type ConflatedStreet = {
  roadId: number;
  name: string;
};

export interface RegionMetadata {
  code: string;
  name: string;
  icon: string;
  source: string;
  centroid: { lat: number; lon: number };
  defaultImagery?: string;
  defaultImageryOverlays?: string[];
}

export interface Region {
  metadata: RegionMetadata;
  PLANET_URL: string;

  /**
   * Optional, if you want to transform the OSM
   * while preprocessing the planet file
   */
  transformOsmName?(name: string): string;

  /**
   * Optional, if the dataset needs an export to be
   * generated a few hours before trying to download it.
   *
   * This is called by a seperate CI job before the main
   * conflation job.
   */
  requestExport?(): Promise<unknown>;

  /**
   * region-specific code to download the dataset and
   * store it in a temp file (usually unaltered)
   */
  downloadSourceData(): Promise<unknown>;

  /**
   * region-specific code to convert the raw dataset
   * into the standardised format.
   */
  preprocess(): Promise<unknown>;
}
