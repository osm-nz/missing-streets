import type { BBox, Geometry } from "geojson";
import type { LatLngTuple } from "leaflet";

const [minLat, minLng, maxLat, maxLng] = [0, 1, 2, 3] as const;

export function calcBBox(geometry: Geometry): BBox {
  const bbox: BBox = [Infinity, Infinity, -Infinity, -Infinity];

  function visit([lng, lat]: LatLngTuple) {
    if (lat < bbox[minLat]) bbox[minLat] = lat;
    if (lng < bbox[minLng]) bbox[minLng] = lng;
    if (lat > bbox[maxLat]) bbox[maxLat] = lat;
    if (lng > bbox[maxLng]) bbox[maxLng] = lng;
  }

  if (geometry.type === "LineString") {
    (geometry.coordinates as LatLngTuple[]).forEach(visit);
  }
  if (geometry.type === "MultiLineString") {
    (geometry.coordinates as LatLngTuple[][]).forEach((member) =>
      member.forEach(visit)
    );
  }

  return bbox;
}
