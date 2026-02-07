import whichPolygon, { type Coordinates } from "which-polygon";
import type { FeatureCollection, Geometry } from "geojson";
import type { ELI } from "./eli.def";

const isValid = (x: ELI) =>
  (x.type === "tms" ||
    (x.type === "wms" && x.available_projections?.includes("EPSG:3857"))) &&
  !x.url.includes("{apikey}");

type ELIDataset = FeatureCollection<Geometry, ELI>;

/** if true, we only return worldwide layers */
type ELIQuery = {
  (coords: Coordinates | true): ELI[];
  raw: ELIDataset;
};

async function getELIQuerier(): Promise<ELIQuery> {
  const geojson: ELIDataset = await fetch(
    "https://osmlab.github.io/editor-layer-index/imagery.geojson"
  ).then((r) => r.json());

  const world = geojson.features
    .filter((x) => !x.geometry)
    .map((x) => x.properties)
    .filter(isValid)
    .filter((l) => l.category !== "qa" && l.category !== "osmbasedmap");

  const nonWorld: ELIDataset = {
    features: geojson.features.filter((x) => x.geometry),
    type: "FeatureCollection",
  };

  const query = whichPolygon<ELI>(nonWorld);

  // the returned function is called on every query
  const wrappedQuery: ELIQuery = (coords) => {
    if (coords === true) return world;

    const local = query(coords, true) || [];
    return [...local.filter(isValid), ...world];
  };
  wrappedQuery.raw = geojson;
  return wrappedQuery;
}

/**
 * A cached querier function to get local imagery from ELI
 */
export const eliQueryPromise = getELIQuerier();
