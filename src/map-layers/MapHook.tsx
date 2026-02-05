import { memo, useEffect } from "react";
import { Polyline } from "leaflet";
import { useMap, useMapEvent } from "react-leaflet";

// any side-effects that need access to the map context can go in here
export const MapHook = memo(() => {
  const map = useMap();

  useMapEvent("popupopen", (e) => {
    // @ts-expect-error --- sneaky
    const line = e.popup._source as Polyline;
    line.setStyle({ opacity: 0.3 });
  });

  useMapEvent("popupclose", (e) => {
    // @ts-expect-error --- sneaky
    const line = e.popup._source as Polyline;
    line.setStyle({ opacity: 1 });
  });

  useEffect(() => {
    const id = setInterval(() => {
      // save the current map location to localStorage every 5 seconds
      const pos = [
        map.getZoom().toFixed(2),
        map.getCenter().lat.toFixed(5),
        map.getCenter().lng.toFixed(5),
      ].join("/");

      localStorage.setItem("mapExtent", pos);
    }, 5000);

    return () => clearInterval(id);
  });

  return null;
});
MapHook.displayName = "MapHook";
