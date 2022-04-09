import { promises as fs, createReadStream } from "fs";
import csv from "csv-parser";
import pbf2json, { Item } from "pbf2json";
import through from "through2";
import { parse as wktToGeoJson } from "wellknown";
import { Geometry, Position } from "geojson";
import {
  distanceBetween,
  getNameCode,
  getSector,
  linzJsonFile,
  LinzPlanet,
  linzRawFile,
  LinzStreet,
  OsmPlanet,
  OsmStreet,
  planetJsonFile,
  planetRawFile,
  RawCsvStreet,
} from "./util";

// baseline is 70 seconds
async function readFromPlanet(): Promise<OsmPlanet> {
  return new Promise((resolve, reject) => {
    console.log("Reading OSM Planet...");
    const out: OsmPlanet = {};
    let i = 0;

    pbf2json
      .createReadStream({
        file: planetRawFile,
        tags: ["highway"],
        leveldb: "/tmp",
      })
      .pipe(
        through.obj((item: Item, _e, next) => {
          i += 1;
          if (!(i % 100)) process.stdout.write(".");

          if (item.type === "node" || !item.tags?.name) {
            next();
            return;
          }

          const {
            name,
            old_name,
            alt_name,
            official_name,
            "not:name": not_name,
          } = item.tags;
          const sector = getSector(item.centroid.lat, item.centroid.lon);
          const nameCode = getNameCode(name);

          const otherNames = [];
          if (old_name) otherNames.push(...old_name.split(";"));
          if (alt_name) otherNames.push(...alt_name.split(";"));
          if (official_name) otherNames.push(...official_name.split(";"));
          if (not_name) otherNames.push(...not_name.split(";"));

          const street: OsmStreet = {
            wayId: item.id,
            name,
            nameCode: getNameCode(name),
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
}

function getEnds(geometry: Geometry): [Position, Position] | [null, null] {
  if (geometry.type === "LineString") {
    return [
      geometry.coordinates[0],
      geometry.coordinates[geometry.coordinates.length - 1],
    ];
  }
  if (geometry.type === "MultiLineString") {
    // assuming the members are ordered logically
    const x = geometry.coordinates[geometry.coordinates.length - 1];
    return [geometry.coordinates[0][0], x[x.length - 1]];
  }
  return [null, null];
}

async function readFromLinz() {
  return new Promise((resolve, reject) => {
    console.log("Reading LINZ csv...");
    const out: LinzPlanet = {};
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

        const [first, last] = getEnds(geometry);
        if (!first || !last) return;

        const [firstLng, firstLat] = first;
        const [lastLng, lastLat] = last;

        const [firstSector, lastSector] = [
          getSector(firstLat, firstLng),
          getSector(lastLat, lastLng),
        ];

        if (firstSector !== lastSector) return; // TEMP: skip big roads

        // when processing a LINZ street that exists in two sectors: add it to the smallest sector.
        const sector = firstSector; // Math.min(firstSector, lastSector);

        const street: LinzStreet = {
          name,
          nameCode: getNameCode(name),
          streetLength: distanceBetween(firstLat, firstLng, lastLat, lastLng),
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
}

async function main() {
  const linzList = await readFromLinz();
  await fs.writeFile(linzJsonFile, JSON.stringify(linzList, null, 2));

  const osmPlanet = await readFromPlanet();
  await fs.writeFile(planetJsonFile, JSON.stringify(osmPlanet, null, 2));
}

main();
