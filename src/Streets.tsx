import React, { memo, useCallback, useState } from "react";
import ReactDOM from "react-dom";
import copy from "copy-text-to-clipboard";
import { BBox, Feature } from "geojson";
import { LatLngBounds, LatLngTuple } from "leaflet";
import { Polyline, Popup, useMap, useMapEvents } from "react-leaflet";

const TooBigError: React.VFC = () => (
  <div style={{ padding: 10, background: "#f2bf05", marginTop: 4 }}>
    Zoom in to see issues
  </div>
);

const TooBigErrorWrapper: React.VFC = () =>
  ReactDOM.createPortal(<TooBigError />, document.querySelector("#inject")!);

const [minLat, minLng, maxLat, maxLng] = [0, 1, 2, 3];

const normalBbox = (bounds: LatLngBounds): BBox => [
  bounds.getSouth(), // minLat
  bounds.getWest(), // minLng
  bounds.getNorth(), // maxLat
  bounds.getEast(), // maxLng
];

export const Streets = memo<{ data: Feature[] }>(({ data }) => {
  const map = useMap();

  const [bbox, setBbox] = useState<BBox>(normalBbox(map.getBounds()));

  const onMove = useCallback(() => {
    setBbox(normalBbox(map.getBounds()));
  }, [map]);

  useMapEvents({ dragend: onMove, zoomend: onMove });

  const onClickEdit = useCallback(() => {
    const pos = map.getCenter();
    window.open(
      `https://www.openstreetmap.org/edit#map=18/${pos.lat}/${pos.lng}`
    );
  }, [map]);

  if (!bbox) return null;

  const visibleStreets = data.filter((feature) => {
    return (
      feature.bbox![minLat] > bbox[minLat] &&
      feature.bbox![maxLat] < bbox[maxLat] &&
      feature.bbox![minLng] > bbox[minLng] &&
      feature.bbox![maxLng] < bbox[maxLng]
    );
  });

  if (visibleStreets.length > 200) return <TooBigErrorWrapper />;

  return (
    <>
      {visibleStreets.map((street) => {
        // will never happen, just to keep TS happy
        if (street.geometry.type !== "MultiLineString") return null;

        const { name } = street.properties!;

        const coords = street.geometry.coordinates.map((members) =>
          members.map((latLng) => [...latLng].reverse() as LatLngTuple)
        );
        return (
          <Polyline key={street.id} positions={coords} color="red" weight={5}>
            <Popup>
              {name}
              <br />
              <button
                type="button"
                title="Copy to Clipboard"
                onClick={() => copy(name)}
              >
                📋
              </button>{" "}
              <button
                type="button"
                title="Edit in OpenStreetMap"
                onClick={onClickEdit}
              >
                ✏️
              </button>
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
});
