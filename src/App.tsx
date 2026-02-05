import { useCallback, useEffect, useMemo, useState } from "react";
import TimeAgo from "react-timeago-i18n";
import { MapContainer, ScaleControl } from "react-leaflet";
import userRegion from "get-region";
import { MapHook, Imagery, Streets, WholeNetwork } from "./map-layers";
import type { MissingStreet, RegionMetadata } from "./types";
import { useKeyboardShortcut } from "./util";
import { HelpModal, Modal } from "./components";
import { REGION_METADATA } from "./auto-generated";

import "./index.css";
import "leaflet/dist/leaflet.css";
import { SYNC_TIME } from "./util/date";

const qsRegion = new URLSearchParams(window.location.search).get("region");
const DEFAULT_REGION =
  // prefer the region from the URL
  REGION_METADATA.find((region) => region.code === qsRegion) ||
  // fallback to the user's current country
  REGION_METADATA.find((region) =>
    userRegion.country.some((code) => region.code.startsWith(code))
  ) ||
  // fallback to the first country in the list
  REGION_METADATA[0];

export const App: React.FC = () => {
  const [region, setRegion] = useState<RegionMetadata>(DEFAULT_REGION);
  const [data, setData] = useState<MissingStreet[]>();
  const [error, setError] = useState<unknown>();
  const [lastUpdated, setLastUpdated] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // write to the URL's ?region=* param
    const url = new URL(window.location.href);
    url.searchParams.set("region", region.code);
    window.history.replaceState("", "", url);
  }, [region]);

  const home = useMemo(() => {
    try {
      const [z, lat, lon] = localStorage
        .getItem(`mapExtent-${region.code}`)!
        .split("/")
        .map(Number);
      if (Number.isNaN(z + lat + lon)) throw new Error(".");
      return { z, lat, lon };
    } catch {
      return { z: 12, ...region.centroid };
    }
  }, [region]);

  const toggleHidden = useCallback(() => setHidden((c) => !c), []);

  useKeyboardShortcut("h", toggleHidden);

  useEffect(() => {
    fetch(`/missing-streets/conflationResult-${region.code}.geo.json`)
      .then((r) => r.json())
      .then((geojson) => {
        setData(geojson.features);
        setLastUpdated(geojson.lastUpdated);
      })
      .catch(setError);
  }, [region]);

  if (error) return <>Failed to load list of missing streets.</>;
  if (!data) return <>Loading {region.name}…</>;

  return (
    <>
      {modalOpen && (
        <HelpModal region={region} onClose={() => setModalOpen(false)} />
      )}
      {infoModalOpen && (
        <Modal onClose={() => setInfoModalOpen(false)}>
          Running the sync should happen automatically at {SYNC_TIME}. If the
          data hasn’t been updated recently,{" "}
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
            <h3>
              Missing Streets in{" "}
              <a
                href={region.source}
                target="_blank"
                rel="noopener"
                title="View data source"
              >
                <img
                  src={region.icon}
                  alt="flag"
                  style={{ height: 20, verticalAlign: "middle" }}
                />
              </a>{" "}
              <select
                value={region.code}
                onChange={(event) => {
                  const regionId = event.target.value;
                  const newRegion = REGION_METADATA.find(
                    (item) => item.code === regionId
                  )!;
                  setRegion(newRegion);
                  setData(undefined);
                }}
              >
                {REGION_METADATA.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </h3>
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
        center={[home.lat, home.lon]}
        zoom={home.z}
        scrollWheelZoom
        zoomSnap={0}
        zoomDelta={0.2}
      >
        <ScaleControl position="bottomleft" />
        <MapHook region={region} />
        <Imagery />
        <Streets data={data} hidden={hidden} region={region} />
        {region.code === "NZ" && (
          <WholeNetwork missingStreets={data} hidden={hidden} />
        )}
      </MapContainer>
    </>
  );
};
