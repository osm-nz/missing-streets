import { memo, useCallback, useRef, useState } from "react";
import copy from "copy-text-to-clipboard";
import { Popup as LeafletPopup, type LatLngExpression } from "leaflet";
import { Polyline, Popup } from "react-leaflet";
import { MissingStreet, type RegionMetadata } from "../types";
import { QuickFixModal } from "../components";

interface Props {
  region: RegionMetadata;
  street: MissingStreet;
}

export const Street = memo<Props>(({ region, street }) => {
  const [showQuickFixModal, setShowQuickFixModal] = useState(false);
  const popupRef = useRef<LeafletPopup>(null);

  const onClickEdit = useCallback(() => {
    const pos = popupRef.current!.getLatLng()!;
    window.open(
      // open a fork of iD which has access to the roads overlay
      `https://kyle.kiwi/iD#map=18/${pos.lat}/${pos.lng}`
    );
  }, []);

  // will never happen, just to keep TS happy
  if (
    street.geometry.type !== "MultiLineString" &&
    street.geometry.type !== "LineString"
  ) {
    return null;
  }

  const { name } = street.properties;

  const coordsRaw =
    street.geometry.type === "LineString"
      ? [street.geometry.coordinates]
      : street.geometry.coordinates;

  const coords = coordsRaw.map((members) =>
    members.map((latLng) => latLng.toReversed() as LatLngExpression)
  );

  return (
    <Polyline positions={coords} color="red" weight={5}>
      <Popup ref={popupRef}>
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
            region={region}
            street={street}
            onClose={() => setShowQuickFixModal(false)}
          />
        )}
      </Popup>
    </Polyline>
  );
});
Street.displayName = "Street";
