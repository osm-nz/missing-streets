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
import { arcgisFeatureServerDownloader } from "../AU_NSW/arcgisFeatureServerDownloader";
import { mergeIntoMultiLineString } from "../../util/mergeIntoMultiLineString";

// motorway ramps, fire trails, etc.
const SKIP = /(Carpark|Track|Ramp( O[nf]f?)?)$/;

interface VicRoad {
  OBJECTID: number;
  ufi: number;
  pfi: number;
  feature_type_code: "road";
  named_feature_id: null;
  ezi_road_name: string;
  ezi_road_name_label: string;
  road_name: string;
  road_type: string;
  road_suffix: null;
  road_name_use: null;
  road_name_1: null;
  road_type_1: null;
  road_suffix_1: null;
  road_name_use_1: null;
  road_name_2: null;
  road_type_2: null;
  road_suffix_2: null;
  road_name_use_2: null;
  road_name_3: null;
  road_type_3: null;
  road_suffix_3: null;
  road_name_use_3: null;
  road_name_4: null;
  road_type_4: null;
  road_suffix_4: null;
  road_name_use_4: null;
  road_name_5: null;
  road_type_5: null;
  road_suffix_5: null;
  road_name_use_5: null;
  road_name_6: null;
  road_type_6: null;
  road_suffix_6: null;
  road_name_use_6: null;
  road_name_7: null;
  road_type_7: null;
  road_suffix_7: null;
  road_name_use_7: null;
  left_locality: string;
  right_locality: string;
  class_code: number;
  direction_code: string;
  route_no: null;
  structure_name: null;
  height_limit: number;
  restrictions: null;
  physical_condition: null;
  construction_type: null;
  road_seal: string;
  div_rd: string;
  road_status: string;
  vehicular_access: string;
  seasonal_open_date: null;
  seasonal_close_date: null;
  load_limit: null;
  load_limit_assess_date: null;
  construction_material: null;
  length_m: null;
  width_m: null;
  deck_area: null;
  responsible_auth_code: null;
  coordinating_auth_code: null;
  urban: null;
  nre_route: null;
  from_ufi: number;
  to_ufi: number;
  feature_quality_id: number;
  task_id: number;
  create_date_pfi: number;
  superceded_pfi: number;
  create_date_ufi: number;
  Shape__Length: number;
}

const ABBREVIATIONS: Record<string, string> = {
  N: "North",
  W: "West",
  S: "South",
  E: "East",
  Ex: "Extension",
};

const rawFile = join(tempFolder, "AU_VIC.geo.json");

export default {
  metadata: {
    code: "AU_VIC",
    name: "Australia – Victoria",
    icon: "https://upload.wikimedia.org/wikipedia/commons/0/08/Flag_of_Victoria_%28Australia%29.svg",
    centroid: { lat: -37.806, lon: 144.941 },
    source:
      "https://vicmap-data.maps.arcgis.com/home/item.html?id=9642c88db1284027b41a91b0abd72dfe",
  },
  PLANET_URL:
    "https://download.geofabrik.de/australia-oceania/australia-latest.osm.pbf",
  // the dataset also covers a large area on NSW side of the border,
  // all the way to Wagga Wagga and the border with ACT.
  // so we need the entire country's planet file, instead of just VIC.
  // "https://download.openstreetmap.fr/extracts/oceania/australia/victoria.osm.pbf",

  async downloadSourceData() {
    await arcgisFeatureServerDownloader(
      "https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/ArcGIS/rest/services/Vicmap_Transport/FeatureServer/1",
      rawFile
    );
  },

  async preprocess() {
    const out: SourceData = {};
    const count = 0;

    const stream = createReadStream(rawFile);
    stream.on("error", console.error);
    const rl = createInterface({
      input: stream,
    });

    rl.on("line", (line) => {
      if (!line) return; // empty line

      const road: Feature<MultiLineString | LineString, VicRoad> =
        JSON.parse(line);

      if (
        road.geometry.type !== "LineString" &&
        road.geometry.type !== "MultiLineString"
      ) {
        return;
      }

      if (road.properties.feature_type_code !== "road") return;

      let name = road.properties.ezi_road_name_label;
      if (!name) return;

      if (name === "Unnamed" || name === "R O W Y") return;
      if (SKIP.test(name)) return;

      name = name
        .replace(/\b([NSWE]|Ex)$/, (_, g) => ABBREVIATIONS[g]) // cardinal suffixes
        .replace(" - ", "-"); // hyphenated names

      const parsed = processGeoJson(road.geometry);
      if (!parsed) return; // skip invalid
      const { sector, firstLat, firstLng } = parsed;

      const street: SourceDataStreet = {
        roadId: road.properties.OBJECTID,
        name,
        nameCode: getNameCode(name),
        streetLength: road.properties.Shape__Length,
        geometry: road.geometry,
        lat: firstLat,
        lng: firstLng,
      };

      out[sector] ||= [];
      out[sector].push(street);
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
