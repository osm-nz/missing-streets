import { memo, useMemo, useRef, useState } from "react";
import copy from "copy-text-to-clipboard";
import { Popup as LeafletPopup, type LatLngExpression } from "leaflet";
import { Polyline, Popup } from "react-leaflet";
import { MissingStreet, type RegionMetadata } from "../types";
import { QuickFixModal } from "../components";
import { calcBBox } from "../util";
import iDLogo from "../assets/iD.svg?url";
import JosmLogo from "../assets/JOSM.png?url";
import OsmLogo from "../assets/OSM.svg?url";

interface App {
  title: string;
  icon: string;
  onClick(): void;
}

interface Props {
  region: RegionMetadata;
  street: MissingStreet;
}

export const Street = memo<Props>(({ region, street }) => {
  const [showQuickFixModal, setShowQuickFixModal] = useState(false);
  const popupRef = useRef<LeafletPopup>(null);

  const coords = useMemo(() => {
    if (
      street.geometry.type !== "MultiLineString" &&
      street.geometry.type !== "LineString"
    ) {
      return undefined;
    }

    const coordsRaw =
      street.geometry.type === "LineString"
        ? [street.geometry.coordinates]
        : street.geometry.coordinates;

    return coordsRaw.map((members) =>
      members.map((latLng) => latLng.toReversed() as LatLngExpression)
    );
  }, [street.geometry]);

  const APPS = useMemo<App[]>(
    () => [
      {
        title: "Edit in iD",
        icon: iDLogo,
        onClick() {
          const { lat, lng } = popupRef.current!.getLatLng()!;
          const qs = new URLSearchParams({
            map: `18/${lat}/${lng}`,
          });
          if (region.defaultImagery) {
            qs.append("background", region.defaultImagery);
          }
          if (region.defaultImageryOverlays) {
            qs.append("overlays", region.defaultImageryOverlays.join(","));
          }
          window.open(`https://kyle.kiwi/iD#${qs}`);
        },
      },
      {
        title: "Edit in JOSM",
        icon: JosmLogo,
        async onClick() {
          // no need for a loading indicator, since calling a localhost API
          // shoud be an instantaneous sucess or failure.
          try {
            const [minLat, minLon, maxLat, maxLon] = calcBBox(street.geometry);
            // docs: https://josm.openstreetmap.de/wiki/Help/RemoteControlCommands
            const qs = new URLSearchParams({
              left: `${minLon}`,
              right: `${maxLon}`,
              top: `${maxLat}`,
              bottom: `${minLat}`,
            });
            // based on https://github.com/openstreetmap/openstreetmap-website/blob/97d908/app/assets/javascripts/index.js#L247
            await fetch(`http://127.0.0.1:8111/load_and_zoom?${qs}`, {
              mode: "no-cors",
              signal: AbortSignal.timeout(5000),
            });
          } catch {
            // eslint-disable-next-line no-alert
            alert("Failed to connect to JOSM, is it running?");
          }
        },
      },
      {
        title: "Open on OSM.org",
        icon: OsmLogo,
        onClick() {
          const { lat, lng } = popupRef.current!.getLatLng()!;
          window.open(
            `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`
          );
        },
      },
    ],
    [region, street]
  );

  // will never happen, just to keep TS happy
  if (!coords) return null;

  const { name } = street.properties;

  return (
    <Polyline
      positions={coords}
      color={street.properties.nearMatchName ? "orange" : "red"}
      weight={5}
    >
      <Popup ref={popupRef} offset={[0, -10]}>
        <span className="popup-text">{name}</span>
        {street.properties.nearMatchName && (
          <div className="warning">
            Close match to existing OSM name:
            <span className="nearmatchname">
              {street.properties.nearMatchName}
            </span>
          </div>
        )}
        <div style={{ display: "flex", gap: 4 }}>
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
            title="Quick Rename"
            onClick={() => setShowQuickFixModal(true)}
          >
            🔄️
          </button>
          {/* eslint-disable-next-line react-hooks/refs */}
          {APPS.map((app) => (
            <button
              key={app.title}
              className="nice"
              type="button"
              title={app.title}
              onClick={app.onClick}
              style={{ padding: "4px 6px " }}
            >
              <img src={app.icon} height={17} width={17} alt={app.title} />
            </button>
          ))}
        </div>

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
