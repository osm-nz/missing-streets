import { createReadStream, promises as fs } from "node:fs";
import { join } from "node:path";
import type { Feature, Geometry } from "geojson";
import { JSONParser } from "@streamparser/json-node";
import {
  getNameCode,
  processGeoJson,
  sourceDataFile,
  tempFolder,
  type Region,
  type SourceData,
  type SourceDataStreet,
} from "../../util";
import { curl } from "../../util/curl";
import { mergeIntoMultiLineString } from "../../util/mergeIntoMultiLineString";
import { getDownloadUrlFromArcgisApi } from "./arcgisDownloadApi";
import { normaliseStreetName } from "./normaliseStreetName";

const rawFile = join(tempFolder, "tmp-US_UT.geo.json");

const SKIP =
  / (Ramp|Apartments|Apts|Complex|[NSEW]b|Freeway|Expressway|Access)$/;

interface UtahRoad {
  OBJECTID: number;
  STATUS: string;
  CARTOCODE: `${number}`;
  FULLNAME: string;
  FROMADDR_L: number;
  TOADDR_L: number;
  FROMADDR_R: number;
  TOADDR_R: number;
  PARITY_L: null;
  PARITY_R: null;
  PREDIR: string;
  NAME: string;
  POSTTYPE: string;
  POSTDIR: string;
  AN_NAME: string;
  AN_POSTDIR: string;
  A1_PREDIR: string;
  A1_NAME: string;
  A1_POSTTYPE: string;
  A1_POSTDIR: string;
  A2_PREDIR: string;
  A2_NAME: string;
  A2_POSTTYPE: string;
  A2_POSTDIR: string;
  QUADRANT_L: string;
  QUADRANT_R: string;
  STATE_L: string;
  STATE_R: string;
  COUNTY_L: `${number}`;
  COUNTY_R: `${number}`;
  ADDRSYS_L: string;
  ADDRSYS_R: string;
  POSTCOMM_L: string;
  POSTCOMM_R: string;
  ZIPCODE_L: `${number}`;
  ZIPCODE_R: `${number}`;
  INCMUNI_L: string;
  INCMUNI_R: string;
  UNINCCOM_L: string;
  UNINCCOM_R: string;
  NBRHDCOM_L: null;
  NBRHDCOM_R: null;
  ER_CAD_ZONES: null;
  ESN_L: null;
  ESN_R: null;
  MSAGCOMM_L: null;
  MSAGCOMM_R: null;
  ONEWAY: `${number}`;
  VERT_LEVEL: `${number}`;
  SPEED_LMT: number;
  ACCESSCODE: string;
  DOT_HWYNAM: string;
  DOT_RTNAME: string;
  DOT_RTPART: string;
  DOT_F_MILE: null;
  DOT_T_MILE: null;
  DOT_FCLASS: null;
  DOT_SRFTYP: string;
  DOT_CLASS: null;
  DOT_OWN_L: string;
  DOT_OWN_R: string;
  DOT_AADT: null;
  DOT_AADTYR: string;
  DOT_THRULANES: null;
  BIKE_L: string;
  BIKE_R: string;
  BIKE_PLN_L: string;
  BIKE_PLN_R: string;
  BIKE_REGPR: null;
  BIKE_NOTES: string;
  UNIQUE_ID: string;
  LOCAL_UID: string;
  UTAHRD_UID: string;
  SOURCE: string;
  UPDATED: null;
  EFFECTIVE: null;
  EXPIRE: null;
  CREATED: string;
  CREATOR: string;
  EDITOR: string;
  CUSTOMTAGS: string;
  GlobalID: string;
  TDMNET_L: null;
  TDMNET_R: null;
  PED_L: null;
  PED_R: null;
}

export const requestExport = () =>
  getDownloadUrlFromArcgisApi("478fbef62481427f95a3510a4707b24a", 0);

export default {
  metadata: {
    code: "US_UT",
    name: "USA – Utah",
    icon: "https://upload.wikimedia.org/wikipedia/commons/f/f6/Flag_of_Utah.svg",
    centroid: { lat: 40.6129, lon: -111.9026 },
    source:
      "https://arcgis.com/home/item.html?id=478fbef62481427f95a3510a4707b24a",
  },
  PLANET_URL:
    "https://download.geofabrik.de/north-america/us/utah-latest.osm.pbf",

  requestExport,

  // OSM uses these prefixes everywhere, but the dataset does not.
  transformOsmName: (name) => name.replace(/^(North|South|West|East) /i, ""),

  async downloadSourceData() {
    // query the same API to see if the export is ready
    const { resultUrl, message } = await requestExport();
    if (!resultUrl) throw new Error(message);

    // if it's ready, download it.
    await curl(resultUrl, rawFile);
  },

  async preprocess() {
    console.log("reading massive JSON file…");
    const out: SourceData = {};
    let i = 0;

    await new Promise<void>((resolve) => {
      const parser = new JSONParser({ paths: ["$.features.*"] });
      createReadStream(rawFile).pipe(parser);
      parser.on("data", (chunk: { value: Feature<Geometry, UtahRoad> }) => {
        const road = chunk.value;
        if (
          road.geometry.type !== "LineString" &&
          road.geometry.type !== "MultiLineString"
        ) {
          return;
        }

        let name = road.properties.FULLNAME || road.properties.NAME;
        if (!name) return;

        name = normaliseStreetName(name, true);

        if (name === "Driveway") return;
        if (SKIP.test(name)) return;

        const parsed = processGeoJson(road.geometry);
        if (!parsed) return; // skip invalid
        const { sector, firstLat, firstLng } = parsed;

        const street: SourceDataStreet = {
          roadId: road.properties.OBJECTID,
          name,
          nameCode: getNameCode(name),
          streetLength: 0, // TODO:
          geometry: road.geometry,
          lat: firstLat,
          lng: firstLng,
        };

        out[sector] ||= [];
        out[sector].push(street);
        i++;
      });
      parser.on("end", resolve);
    });

    for (const sector in out) {
      out[sector] = mergeIntoMultiLineString(out[sector]);
    }

    console.log(`Read ${i.toLocaleString()} roads`);
    await fs.writeFile(sourceDataFile(this), JSON.stringify(out, null, 2));
  },
} satisfies Region;
