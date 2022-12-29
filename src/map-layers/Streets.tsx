import React, { memo, useCallback, useRef, useState } from "react";
import ReactDOM from "react-dom";
import copy from "copy-text-to-clipboard";
import { BBox } from "geojson";
import { LatLngBounds, LatLngTuple, Popup as LeafletPopup } from "leaflet";
import { Polyline, Popup, useMap, useMapEvents } from "react-leaflet";
import { MissingStreet } from "../types";

const TooBigError: React.FC<{ count: number }> = ({ count }) => (
  <div style={{ padding: 10, background: "#f2bf05", marginTop: 4 }}>
    Zoom in to see the {count} issues in this area
  </div>
);

const TooBigErrorWrapper: React.FC<{ count: number }> = ({ count }) =>
  ReactDOM.createPortal(
    <TooBigError count={count} />,
    document.querySelector("#inject")!
  );

const [minLat, minLng, maxLat, maxLng] = [0, 1, 2, 3];

const normalBbox = (bounds: LatLngBounds): BBox => [
  bounds.getSouth(), // minLat
  bounds.getWest(), // minLng
  bounds.getNorth(), // maxLat
  bounds.getEast(), // maxLng
];

export const Street = memo<{ street: MissingStreet }>(({ street }) => {
  const popup = useRef<LeafletPopup>(null);

  const onClickEdit = useCallback(() => {
    const pos = popup.current!.getLatLng()!;
    window.open(
      `https://www.openstreetmap.org/edit#map=18/${pos.lat}/${pos.lng}`
    );
  }, []);

  // will never happen, just to keep TS happy
  if (street.geometry.type !== "MultiLineString") return null;

  const { name } = street.properties;

  const coords = street.geometry.coordinates.map((members) =>
    members.map((latLng) => [...latLng].reverse() as LatLngTuple)
  );

  return (
    <Polyline positions={coords} color="red" weight={5}>
      <Popup ref={popup}>
        <span className="popup-text">{name}</span>
        <br />
        <button
          className="nice"
          type="button"
          title="Copy to Clipboard"
          onClick={() => copy(name)}
        >
          📋
        </button>{" "}
        <button
          className="nice"
          type="button"
          title="Edit in OpenStreetMap"
          onClick={onClickEdit}
        >
          ✏️
        </button>
      </Popup>
    </Polyline>
  );
});

type Props = { data: MissingStreet[]; hidden: boolean };
export const Streets = memo<Props>(({ data, hidden }) => {
  const map = useMap();

  const [bbox, setBbox] = useState<BBox>(normalBbox(map.getBounds()));

  const onMove = useCallback(() => {
    setBbox(normalBbox(map.getBounds()));
  }, [map]);

  useMapEvents({ dragend: onMove, zoomend: onMove });

  if (!bbox || hidden) return null;

  const visibleStreets = data.filter((feature) => {
    return (
      feature.bbox![minLat] > bbox[minLat] &&
      feature.bbox![maxLat] < bbox[maxLat] &&
      feature.bbox![minLng] > bbox[minLng] &&
      feature.bbox![maxLng] < bbox[maxLng]
    );
  });

  if (visibleStreets.length > 200) {
    return <TooBigErrorWrapper count={visibleStreets.length} />;
  }

  return (
    <>
      {visibleStreets.map((street) => (
        <Street key={street.id} street={street} />
      ))}
    </>
  );
});
