import { promises as fs } from "node:fs";
import pbf2json, { Item } from "pbf2json";
import through from "through2";
import {
  getSector,
  getNameCode,
  type OsmPlanet,
  planetRawFile,
  type OsmStreet,
  planetJsonFile,
  type Region,
} from "./util";

// baseline is 70 seconds
export async function preprocessPlanet(region: Region) {
  const result = await new Promise((resolve, reject) => {
    console.log("Reading OSM Planet...");
    const out: OsmPlanet = {};
    let i = 0;

    pbf2json
      .createReadStream({
        file: planetRawFile(region),
        tags: ["highway"],
        leveldb: "/tmp",
      })
      .pipe(
        through.obj((item: Item, _e, next) => {
          i += 1;
          if (!(i % 100)) process.stdout.write(".");

          const {
            name,
            old_name,
            alt_name,
            official_name,
            "not:name": not_name,
          } = item.tags || {};

          // it's possible that a road has no name, but does have an old_name
          const mainName = name || alt_name || old_name || not_name;

          if (item.type === "node" || !mainName) {
            next();
            return;
          }

          const sector = getSector(item.centroid.lat, item.centroid.lon);
          const nameCode = getNameCode(mainName);

          const otherNames: string[] = [];
          if (old_name) otherNames.push(...old_name.split(";"));
          if (alt_name) otherNames.push(...alt_name.split(";"));
          if (official_name) otherNames.push(...official_name.split(";"));
          if (not_name) otherNames.push(...not_name.split(";"));

          const street: OsmStreet = {
            wayId: item.id,
            name: mainName,
            nameCode,
            lat: item.centroid.lat,
            lng: item.centroid.lon,
          };

          if (otherNames.length) {
            street.otherNameCodes = otherNames.map(getNameCode);
          }

          out[sector] ||= {};
          out[sector][nameCode] ||= [];
          out[sector][nameCode].push(street);

          next();
        })
      )
      .on("finish", () => {
        console.log("Finished OSM planet");
        resolve(out);
      })
      .on("error", reject);
  });

  await fs.writeFile(planetJsonFile(region), JSON.stringify(result));
}
