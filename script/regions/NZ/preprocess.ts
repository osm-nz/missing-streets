import { promises as fs, createReadStream } from "node:fs";
import csv from "csv-parser";
import { parse as wktToGeoJson } from "wellknown";
import {
  getNameCode,
  SourceData,
  SourceDataStreet,
  sourceDataFile,
  processGeoJson,
  distanceBetween,
  type Region,
} from "../../util";
import { linzRawFile, type RawCsvStreet } from "./const";

export async function preprocess(this: Region) {
  const linzList = await new Promise((resolve, reject) => {
    console.log("Reading LINZ csv...");
    const out: SourceData = {};
    createReadStream(linzRawFile)
      .pipe(csv())
      .on("data", (item: RawCsvStreet) => {
        const name = item.full_road_name;
        if (!name || !item.road_name_type) return;

        // we have to do this because of a special character at position 0,0 in every linz CSV file
        const wktField = <"WKT">Object.keys(item)[0];

        const geometry = wktToGeoJson(item[wktField]);
        if (!geometry) {
          console.log("Invalid geometry", name);
          return;
        }
        if (geometry.type !== "MultiLineString") {
          console.warn("Unexpected geometry type", geometry.type);
          return; // there's no reason why we can't allow other geometry types
        }

        // 3. If there are still no matches, do a final check if it's a state highway
        const skip =
          name.includes("State Highway") || name.includes("Motorway");
        if (skip) return;

        const parsed = processGeoJson(geometry);
        if (!parsed) return; // skip invalid
        const { sector, firstLat, firstLng, lastLat, lastLng } = parsed;

        /** shortest path between start and end */
        const streetLength = distanceBetween(
          firstLat,
          firstLng,
          lastLat,
          lastLng
        );

        const street: SourceDataStreet = {
          roadId: +item.road_id,
          name,
          nameCode: getNameCode(name),
          streetLength,
          geometry,
          lat: firstLat,
          lng: firstLng,
        };

        out[sector] ||= [];
        out[sector].push(street);
      })
      .on("end", () => {
        console.log("Finished LINZ csv");
        resolve(out);
      })
      .on("error", reject);
  });
  await fs.writeFile(sourceDataFile(this), JSON.stringify(linzList, null, 2));
}
