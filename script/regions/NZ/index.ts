import type { Region } from "../../util";
import { downloadSourceData } from "./download";
import { preprocess } from "./preprocess";
import { api } from "./api";

export default {
  metadata: {
    code: "NZ",
    name: "New Zealand",
    icon: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Flag_of_New_Zealand.svg",
    source: "https://data.linz.govt.nz/layer/53382",
    centroid: { lat: -36.818, lon: 174.716 },
  },
  PLANET_URL:
    "http://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf",
  async requestExport() {
    const response = await api.generateExport(53382);
    console.log(`Requested export #${response.id}`);
  },
  downloadSourceData,
  preprocess,
} satisfies Region;
