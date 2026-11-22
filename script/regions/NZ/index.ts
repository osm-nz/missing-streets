import type { Region } from "../../util";
import { downloadSourceData } from "./download";
import { preprocess } from "./preprocess";
import { api } from "./api";

export default {
  metadata: {
    code: "NZ",
    name: "New Zealand",
    icon: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Flag_of_New_Zealand.svg",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/d/d3/Hicks_Bay%2C_East_Coast%2C_New_Zealand%2C_13th._Dec._2010_-_Flickr_-_PhillipC.jpg",
    source: "https://data.linz.govt.nz/layer/123110",
    centroid: { lat: -36.818, lon: 174.716 },
    defaultImagery: "LINZ_NZ_Aerial_Imagery",
    defaultImageryOverlays: [
      "linz-50772-parcels-overlay-transparent",
      "linz-123110-roads-overlay",
    ],
  },
  PLANET_URL:
    "http://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf",
  async requestExport() {
    const response = await api.generateExport(123110);
    console.log(`Requested export #${response.id}`);
  },
  downloadSourceData,
  preprocess,
} satisfies Region;
