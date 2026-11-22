import type { Region } from "../../util";
import { downloadSourceData } from "./download";
import { preprocess } from "./preprocess";

export default {
  metadata: {
    code: "GB",
    name: "Great Britain",
    icon: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Flag_of_Great_Britain_%281707%E2%80%931800%29.svg",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/f/f2/Flag_of_Great_Britain_%281707%E2%80%931800%29.svg",
    source: "https://osdatahub.os.uk/data/downloads/open/OpenRoads",
    centroid: { lat: 54.430607, lon: -2.26057 },
  },
  PLANET_URL:
    "https://download.geofabrik.de/europe/united-kingdom-latest.osm.pbf",
  downloadSourceData,
  preprocess,
} satisfies Region;
