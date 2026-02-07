import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { LayersControl, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useKeyboardShortcut } from "../util";
import { eliQueryPromise } from "../api/eli";
import { ELI } from "../api/eli.def";

const DEFAULT_IMAGERY: ELI = {
  id: "MAPNIK",
  type: "tms",
  name: "OpenStreetMap",
  best: true,
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: {
    html: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
  },
};

export const Imagery: React.FC = () => {
  const map = useMap();
  const allLayersRef = useRef<
    [latest?: L.TileLayer, secondLatest?: L.TileLayer]
  >([]);

  const [imageryList, setImageryList] = useState<ELI[]>([DEFAULT_IMAGERY]);

  // store the 2nd-last used imagery layer
  useMapEvents({
    layeradd(event) {
      if (!(event.layer instanceof L.TileLayer)) return;
      allLayersRef.current[1] = allLayersRef.current[0];
      allLayersRef.current[0] = event.layer;
    },
  });

  // check every 5 seconds if the list of available layers
  // in this location has changed.
  useEffect(() => {
    async function updateImagery() {
      try {
        const { lat, lng } = map.getCenter();

        const matched = (await eliQueryPromise)([lng, lat]);
        const updated = matched.filter(
          (layer) => layer.type === "tms" && layer.id !== DEFAULT_IMAGERY.id
        );
        updated.unshift(DEFAULT_IMAGERY);

        setImageryList((current) => {
          // check if there were actually any changes to avoid
          // pointless re-renders.
          const oldKey = current.map((l) => l.id).join(",");
          const newKey = updated.map((l) => l.id).join(",");
          return oldKey === newKey ? current : updated;
        });
      } catch (ex) {
        console.error(ex);
      }
    }
    updateImagery();
    const id = setInterval(updateImagery, 5000);
    return () => clearInterval(id);
  }, [map]);

  // toggle between the last and 2nd-last used imagery layers
  useKeyboardShortcut("b", () => {
    const [latest, secondLatest] = allLayersRef.current;
    if (!latest || !secondLatest) return;

    map.removeLayer(latest);
    map.addLayer(secondLatest);
  });

  return (
    <LayersControl position="topright">
      {imageryList.map((imagery, i) => (
        <LayersControl.BaseLayer
          checked={i === 0}
          name={(imagery.best ? "⭐️ " : "") + imagery.name}
          key={imagery.name}
        >
          <TileLayer
            attribution={imagery.attribution?.html || imagery.attribution?.text}
            url={imagery.url
              .replace("{zoom}", "{z}")
              .replace(/{switch:([^}]+)}/, (_, m) => m.split(",")[0])}
            ref={(l) => {
              if (l) allLayersRef.current[0] ||= l;
            }}
          />
        </LayersControl.BaseLayer>
      ))}
    </LayersControl>
  );
};
