import { memo, useCallback, useRef, useState } from "react";
import copy from "copy-text-to-clipboard";
import { LatLngTuple, Popup as LeafletPopup } from "leaflet";
import { Polyline, Popup } from "react-leaflet";
import { MissingStreet } from "../types";
import { QuickFixModal } from "../components";

export const Street = memo<{ street: MissingStreet }>(({ street }) => {
  const [showQuickFixModal, setShowQuickFixModal] = useState(false);
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
        </button>{" "}
        <button
          className="nice"
          type="button"
          title="Quick Rename"
          onClick={() => setShowQuickFixModal(true)}
        >
          🔄️
        </button>
        {showQuickFixModal && (
          <QuickFixModal
            street={street}
            onClose={() => setShowQuickFixModal(false)}
          />
        )}
      </Popup>
    </Polyline>
  );
});
