import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import shp from "shpjs";
import type { Feature, Geometry } from "geojson";
import {
  getNameCode,
  processGeoJson,
  sourceDataFile,
  tempFolder,
  type Region,
  type SourceData,
  type SourceDataStreet,
} from "../../util";
import { mergeIntoMultiLineString } from "../../util/mergeIntoMultiLineString";

export const rawFile = join(tempFolder, "tmp-AU_TAS.geo.jsonl");

/** from https://github.com/andrewharvey/tas-listdata2osm/blob/abbd67/download.sh#L23 */
const LOCALITIES = [
  "BREAK_O_DAY",
  "BRIGHTON",
  "BURNIE",
  "CENTRAL_COAST",
  "CENTRAL_HIGHLANDS",
  "CIRCULAR_HEAD",
  "CLARENCE",
  "DERWENT_VALLEY",
  "DEVONPORT",
  "DORSET",
  "FLINDERS",
  "GEORGE_TOWN",
  "GLAMORGAN_SPRING_BAY",
  "GLENORCHY",
  "HOBART",
  "HUON_VALLEY",
  "KENTISH",
  "KING_ISLAND",
  "KINGBOROUGH",
  "LATROBE",
  "LAUNCESTON",
  "MEANDER_VALLEY",
  "NORTHERN_MIDLANDS",
  "SORELL",
  "SOUTHERN_MIDLANDS",
  "TASMAN",
  "WARATAH_WYNYARD",
  "WEST_COAST",
  "WEST_TAMAR",
];

interface TasRoad {
  TRANSEG_ID: number;
  TRANS_TYPE: "Road" | "Track";
  TSEG_FEAT: string;
  STATUS: "Open";
  TRAFF_DIR: string;
  TRAN_CLASS: string;
  USER_TYPE: string;
  TOUR_CLASS: string;
  SURFACE_TY: string;
  PRI_NAME: string;
  PRI_NOMREG: string;
  SEC_NAME: string;
  SEC_NOMREG: string;
  BRIDGE_TUN: string;
  BRIDGE_T_1: string;
  AUTHORITY: string;
  FOREIGN_ID: string;
  COMP_LEN: number;
  UFI: string;
  FMP: string;
  CREATED_ON: string;
  LIST_GUID: string;
  TC_NOMREG: string;
  QTR_NOMREG: string;
  QTR_NAME: string;
  SHAPE_LEN: number;
}

export default {
  metadata: {
    code: "AU_TAS",
    name: "Australia – Tasmania",
    icon: "https://upload.wikimedia.org/wikipedia/commons/4/46/Flag_of_Tasmania.svg",
    centroid: { lat: -41.18796, lon: 146.37548 },
    source:
      "https://listdata.thelist.tas.gov.au/opendata/#ds_LIST_Transport_Segments",
  },
  PLANET_URL:
    "https://download.geofabrik.de/australia-oceania/australia-latest.osm.pbf",

  async downloadSourceData() {
    const fileStream = createWriteStream(rawFile);
    let total = 0;

    for (const locality of LOCALITIES) {
      console.log(locality);
      let subtotal = 0;

      // 1. download .zip into an ArrayBuffer
      const response = await fetch(
        `https://listdata.thelist.tas.gov.au/opendata/data/LIST_TRANSPORT_SEGMENTS_${locality}.zip`
      );
      const buffer = await response.arrayBuffer();

      // 2. extract all shapefiles from the .zip, and convert to .geo.json
      const geojson = await shp(buffer);

      // 3. stream each road into the .geo.jsonl file
      const array = Array.isArray(geojson) ? geojson : [geojson];
      for (const featureCollection of array) {
        if (featureCollection.fileName?.startsWith("list_transport_segments")) {
          for (const feature of featureCollection.features) {
            fileStream.write(JSON.stringify(feature));
            fileStream.write("\n");
            subtotal++;
          }
        }
      }
      console.log("\t", subtotal);
      total += subtotal;
    }

    fileStream.end();
    console.log(`Downloaded ${total.toLocaleString()} roads.`);
  },

  async preprocess() {
    console.log("reading massive JSON file…");
    const out: SourceData = {};
    let count = 0;

    const stream = createReadStream(rawFile);
    stream.on("error", console.error);
    const rl = createInterface({
      input: stream,
    });

    rl.on("line", (line) => {
      if (!line) return; // empty line

      const road: Feature<Geometry, TasRoad> = JSON.parse(line);

      if (
        road.geometry.type !== "LineString" &&
        road.geometry.type !== "MultiLineString"
      ) {
        return;
      }

      if (road.properties.TRANS_TYPE !== "Road") return;

      const name = road.properties.PRI_NAME;
      if (!name) return;

      const parsed = processGeoJson(road.geometry);
      if (!parsed) return; // skip invalid
      const { sector, firstLat, firstLng } = parsed;

      const street: SourceDataStreet = {
        roadId: road.properties.TRANSEG_ID,
        name,
        nameCode: getNameCode(name),
        streetLength: road.properties.SHAPE_LEN,
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

    await fs.writeFile(sourceDataFile(this), JSON.stringify(out, null, 2));
  },
} satisfies Region;
