import { useCallback, useEffect, useState } from "react";
import TimeAgo from "react-timeago-i18n";
import { MapContainer, ScaleControl } from "react-leaflet";
import { MapHook, Imagery, Streets, WholeNetwork } from "./map-layers";
import type { MissingStreet } from "./types";
import { useKeyboardShortcut } from "./util";
import { HelpModal, Modal } from "./components";

import "./index.css";
import "leaflet/dist/leaflet.css";

const home = (() => {
  try {
    const [z, lat, lng] = localStorage.mapExtent.split("/").map(Number);
    if (Number.isNaN(z + lat + lng)) throw new Error(z);
    return { z, lat, lng };
  } catch {
    return { z: 12, lat: -41.2835, lng: 174.7427 };
  }
})();

export const App: React.FC = () => {
  const [data, setData] = useState<MissingStreet[]>();
  const [error, setError] = useState<unknown>();
  const [lastUpdated, setLastUpdated] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const toggleHidden = useCallback(() => setHidden((c) => !c), []);

  useKeyboardShortcut("h", toggleHidden);

  useEffect(() => {
    fetch("/missing-streets/conflationResult.geo.json")
      .then((r) => r.json())
      .then((geojson) => {
        setData(geojson.features);
        setLastUpdated(geojson.lastUpdated);
      })
      .catch(setError);
  }, []);

  if (error) return <>Failed to load list of missing streets.</>;
  if (!data) return <>Loading...</>;

  return (
    <>
      {modalOpen && <HelpModal onClose={() => setModalOpen(false)} />}
      {infoModalOpen && (
        <Modal onClose={() => setInfoModalOpen(false)}>
          Running the sync should happen automatically on Wednesday morning. If
          the data hasn’t been updated recently,{" "}
          <a
            href="https://osm.org/message/new/❤️‍🔥_import"
            target="_blank"
            rel="noreferrer noopener"
          >
            send me a message on OpenStreetMap
          </a>
          .
        </Modal>
      )}
      <aside>
        <div className="side-by-side">
          <div>
            <h3>Missing Streets in New Zealand</h3>
            {lastUpdated && (
              <small>
                Data updated <TimeAgo date={lastUpdated} />
                <button
                  className="small"
                  type="button"
                  onClick={() => setInfoModalOpen(true)}
                >
                  ?
                </button>
              </small>
            )}
          </div>
          <div>
            <button
              className="nice"
              type="button"
              onClick={() => setModalOpen(true)}
            >
              Keyboard Shortcuts
            </button>{" "}
            <button
              className="nice"
              type="button"
              onClick={() =>
                window.open(
                  "https://wiki.osm.org/New_Zealand/Missing_Streets",
                  "_blank",
                  "noopener noreferrer"
                )
              }
            >
              Documentation
            </button>
          </div>
        </div>
        <div id="inject" />
        <div id="inject-modal" />
      </aside>
      <MapContainer
        id="map"
        center={[home.lat, home.lng]}
        zoom={home.z}
        scrollWheelZoom
        zoomSnap={0}
        zoomDelta={0.2}
      >
        <ScaleControl position="bottomleft" />
        <MapHook />
        <Imagery />
        <Streets data={data} hidden={hidden} />
        <WholeNetwork missingStreets={data} hidden={hidden} />
      </MapContainer>
    </>
  );
};
