import { useCallback, useMemo, useState } from "react";
import { Polyline, Popup, useMap } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import type { FeatureCollection, MultiLineString } from "geojson";
import type { LinzApiStreet, RawCsvStreet, MissingStreet } from "../types";
import { LINZ_LAYER, useKeyboardShortcut } from "../util";

type LINZQueryResp = {
  vectorQuery: {
    layers: {
      [LINZ_LAYER]: FeatureCollection<MultiLineString, RawCsvStreet>;
    };
  };
};
type Fetched = {
  [roadId: number]: LinzApiStreet;
};

const stringifyObj = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, `${v}`]));

export const WholeNetwork: React.FC<{
  missingStreets: MissingStreet[];
  hidden: boolean;
}> = ({ missingStreets, hidden }) => {
  const map = useMap();
  const [fetched, setFetched] = useState<Fetched>([]);

  // object of IDs that are already shown on the map in red
  const conflatedRoadIds = useMemo(() => {
    const seen: Record<number, true> = {};
    for (const f of missingStreets) {
      seen[f.properties.roadId] = true;
    }
    return seen;
  }, [missingStreets]);

  const queryFullDataset = useCallback(async () => {
    const key = process.env.REACT_APP_LDS_KEY;

    if (!key) {
      console.error("No LINZ Key configured");
      return;
    }

    const pos = map.getCenter();
    const qs = new URLSearchParams(
      stringifyObj({
        key,
        layer: LINZ_LAYER,
        x: pos.lng,
        y: pos.lat,
        max_results: 100,
        radius: 1000, // 1km?
        geometry: true,
        with_field_names: true,
      })
    );
    const json: LINZQueryResp = await fetch(
      `https://data.linz.govt.nz/services/query/v1/vector.json?${qs.toString()}`
    ).then((r) => r.json());

    const toKeep: Fetched = {};
    for (const f of json.vectorQuery.layers[LINZ_LAYER].features) {
      const roadId = f.properties.road_id;
      if (!(roadId in conflatedRoadIds)) {
        // avoid drawing a blue line over a red one
        toKeep[roadId] = f;
      }
    }
    setFetched((existing) => ({ ...existing, ...toKeep }));
  }, [map, conflatedRoadIds]);

  useKeyboardShortcut("n", queryFullDataset);

  if (hidden) return null;

  return (
    <>
      {Object.values(fetched).map((street) => {
        const coords = street.geometry.coordinates.map((members) =>
          members.map((latLng) => [...latLng].reverse() as LatLngTuple)
        );

        return (
          <Polyline
            key={street.properties.road_id}
            positions={coords}
            color="blue"
            weight={4}
          >
            <Popup>
              <span className="popup-text">
                {street.properties.full_road_name}
              </span>
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
};
