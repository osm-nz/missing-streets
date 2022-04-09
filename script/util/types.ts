import { Geometry } from "geojson";

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

export type LinzStreet = BaseStreet & {
  geometry: Geometry;
  streetLength: number;
};

export type LinzPlanet = {
  [sector: string]: LinzStreet[];
};

export type RawCsvStreet = {
  WKT: string;
  full_road_name?: string;
  /** if this field is missing, it's probably a water address */
  road_name_type?: string;
};

export type Coord = [lng: number, lat: number];
