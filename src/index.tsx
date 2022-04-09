import { StrictMode, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { MapContainer, ScaleControl } from "react-leaflet";
import { Feature } from "geojson";
import { MapHook } from "./MapHook";
import { Imagery } from "./Imagery";
import { Streets } from "./Streets";

import "./index.css";
import "leaflet/dist/leaflet.css";

export const App: React.VFC = () => {
  const [data, setData] = useState<Feature[]>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    fetch(
      window.location.search.includes("dev")
        ? "../missing-streets/conflationResult.geo.json"
        : "https://linz-addr-cdn.kyle.kiwi/missing-streets.json"
    )
      .then((r) => r.json())
      .then((geojson) => setData(geojson.features))
      .catch(setError);
  }, []);

  if (error) return <>Failed to load list of missing streets.</>;
  if (!data) return <>Loading...</>;

  return (
    <>
      <aside>
        <h3>Missing Streets in New Zealand</h3>
        Press <kbd>b</kbd> to switch imagery.&nbsp;
        <a
          href="https://wiki.osm.org/New_Zealand/Missing_Streets"
          target="_blank"
          rel="noreferrer noopener"
        >
          View documentation
        </a>
        .
        <div id="inject" />
      </aside>
      <MapContainer
        id="map"
        center={[-41.2835, 174.7427]}
        zoom={12}
        scrollWheelZoom
        editable
      >
        <ScaleControl position="bottomleft" />
        <MapHook />
        <Imagery />
        <Streets data={data} />
      </MapContainer>
    </>
  );
};

ReactDOM.render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.querySelector("main")
);
