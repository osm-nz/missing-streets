import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { LayersControl, TileLayer, useMap } from "react-leaflet";

type Imagery = { name: string; url: string; attribution: string };

const imageryList: Imagery[] = [
  {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    name: "LINZ Aerial Imagery",
    url: "https://basemaps.linz.govt.nz/v1/tiles/aerial/EPSG:3857/{z}/{x}/{y}.jpg?api=d01egend5f8dv4zcbfj6z2t7rs3",
    attribution:
      '<a href="https://www.linz.govt.nz/data/licensing-and-using-data/attributing-elevation-or-aerial-imagery-data">Sourced from LINZ CC-BY 4.0</a>',
  },
  {
    name: "LINZ Topo50",
    url: "https://map.cazzaserver.com/linz_topo/{z}/{x}/{y}.png",
    attribution:
      '<a href="https://www.linz.govt.nz/data/licensing-and-using-data/attributing-elevation-or-aerial-imagery-data">Sourced from LINZ CC-BY 4.0</a>',
  },
];

export const Imagery: React.VFC = () => {
  const map = useMap();
  const allLayers = useRef<L.TileLayer[]>([]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "b") {
        const activeLayers: L.TileLayer[] = [];
        map.eachLayer((layer) => {
          if (layer instanceof L.TileLayer) activeLayers.push(layer);
        });

        const isCarto =
          activeLayers[0].getAttribution!() === imageryList[0].attribution;

        map.removeLayer(activeLayers[0]);
        map.addLayer(isCarto ? allLayers.current[1] : allLayers.current[0]);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  return (
    <LayersControl position="topright">
      {imageryList.map((imagery, i) => (
        <LayersControl.BaseLayer
          checked={i === 0}
          name={imagery.name}
          key={imagery.name}
        >
          <TileLayer
            attribution={imagery.attribution}
            url={imagery.url}
            ref={(l) => {
              if (l) allLayers.current[i] = l;
            }}
          />
        </LayersControl.BaseLayer>
      ))}
    </LayersControl>
  );
};
