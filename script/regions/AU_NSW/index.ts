import { createReadStream, createWriteStream } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type { Feature, LineString, MultiLineString } from "geojson";
import {
  getNameCode,
  processGeoJson,
  sourceDataFile,
  tempFolder,
  type Region,
  type SourceData,
  type SourceDataStreet,
} from "../../util";
import { normaliseStreetName } from "../US_UT/normaliseStreetName";
import { mergeIntoMultiLineString } from "../../util/mergeIntoMultiLineString";
import type { RawNswData } from "./types.def";
import { arcgisFeatureServerDownloader } from "./arcgisFeatureServerDownloader";

export const rawFile = join(tempFolder, "tmp-AU_NSW.jsonl");

const SKIP_SUFFIXES = new Set([
  // we only want streets, not Fire Trails etc.
  "ACCESS",
  "FIRE ROAD",
  "FIRE TRAIL",
  "FIRETRAIL",
  "LOOKOUT",
  "NATIONAL TRAIL",
  "PATH",
  "PATHWAY",
  "POWERLINE ACCESS",
  "TRACK",
  "TRAIL",
  "WALK",
  "WALKWAY",
  "WALKING ROUTE",
  "WALKING TRACK",

  // also exclude features that are usually very long
  // and extremely unlikely to be missing.
  "FREEWAY",
  "HIGHWAY",
  "MOTORWAY",
  "TRANSITWAY",
]);

export default {
  metadata: {
    code: "AU_NSW",
    name: "Australia – New South Wales",
    icon: "https://upload.wikimedia.org/wikipedia/commons/0/00/Flag_of_New_South_Wales.svg",
    centroid: { lat: -33.85, lon: 151.21 },
    source:
      "https://portal.spatial.nsw.gov.au/portal/home/webmap/viewer.html?useExisting=1&layers=66fabd8c23074ecc85883e0086419adc",
  },
  PLANET_URL:
    "https://download.geofabrik.de/australia-oceania/australia-latest.osm.pbf",
  // the dataset also covers ACT and Jervis Bay, not just NSW.
  // So we can't use the state-level dataset
  // "https://download.openstreetmap.fr/extracts/oceania/australia/new_south_wales.osm.pbf",

  async downloadSourceData() {
    await arcgisFeatureServerDownloader(
      "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Transport_Theme/FeatureServer/5",
      rawFile
    );
  },

  async preprocess() {
    const out: SourceData = {};
    let count = 0;

    const stream = createReadStream(rawFile);
    stream.on("error", console.error);
    const rl = createInterface({
      input: stream,
    });

    rl.on("line", (line) => {
      if (!line) return; // empty line

      const road: Feature<MultiLineString | LineString, RawNswData> =
        JSON.parse(line);

      const basename = road.properties.roadnamebase;
      const type = road.properties.roadnametype;
      const suffix = road.properties.roadnamesuffix;

      if (!basename) return;
      if (type && SKIP_SUFFIXES.has(type)) return;

      const name = normaliseStreetName(
        [basename, type, suffix].filter(Boolean).join(" ")
      );

      const parsed = processGeoJson(road.geometry);
      if (!parsed) return; // skip invalid
      const { sector, firstLat, firstLng } = parsed;

      const street: SourceDataStreet = {
        roadId: road.properties.objectid,
        name,
        nameCode: getNameCode(name),
        streetLength: road.properties.Shape__Length,
        geometry: road.geometry,
        lat: firstLat,
        lng: firstLng,
      };

      out[sector] ||= [];
      out[sector].push(street);
      count++;
    });
    await new Promise((resolve) => rl.on("close", resolve));

    for (const sector in out) {
      out[sector] = mergeIntoMultiLineString(out[sector]);
    }

    console.log(`Processed ${count.toLocaleString()} roads`);

    const output = createWriteStream(sourceDataFile(this));
    output.write("{\n");
    let isFirst = true;
    for (const sector in out) {
      if (!isFirst) output.write(",");
      isFirst = false;
      output.write(` "${sector}": ${JSON.stringify(out[sector])}\n`);
    }
    output.write("}\n");
    await new Promise((resolve) => output.end(resolve));
  },
} satisfies Region;
