import { Polyline } from "leaflet";
import { memo } from "react";
import { useMapEvent } from "react-leaflet";

export const MapHook = memo(() => {
  useMapEvent("popupopen", (e) => {
    // @ts-expect-error sneaky
    // eslint-disable-next-line no-underscore-dangle
    const line = e.popup._source as Polyline;
    line.setStyle({ opacity: 0.3 });
  });

  useMapEvent("popupclose", (e) => {
    // @ts-expect-error sneaky
    // eslint-disable-next-line no-underscore-dangle
    const line = e.popup._source as Polyline;
    line.setStyle({ opacity: 1 });
  });

  return null;
});
