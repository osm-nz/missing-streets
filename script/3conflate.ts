import { promises as fs } from "fs";
import { FeatureCollection, MultiLineString } from "geojson";
import {
  ConflatedStreet,
  conflationResult,
  distanceBetween,
  linzJsonFile,
  LinzPlanet,
  LinzStreet,
  OsmPlanet,
  OsmStreet,
  planetJsonFile,
} from "./util";
import { calcBBox } from "./util/calcBbox";

// only used for comparing names
const stripMacrons = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const checkIfMatches = (linzStreet: LinzStreet) => (osmStreet: OsmStreet) => {
  const namesMatch =
    osmStreet.nameCode === linzStreet.nameCode ||
    osmStreet.otherNameCodes?.includes(linzStreet.nameCode) ||
    // the next two checks allow the OSM feature to have macrons, even
    // if the LINZ feature doesn't have them
    stripMacrons(osmStreet.nameCode) === linzStreet.nameCode ||
    osmStreet.otherNameCodes?.some(
      (altName) => stripMacrons(altName) === linzStreet.nameCode
    );

  // higher tolerance for long roads
  const closeEnough =
    distanceBetween(
      osmStreet.lat,
      osmStreet.lng,
      linzStreet.lat,
      linzStreet.lng
    ) <
    10_000 + 2 * linzStreet.streetLength;

  return namesMatch && closeEnough;
};

async function main() {
  console.log("Reading LINZ json...");
  const linzDB: LinzPlanet = JSON.parse(
    await fs.readFile(linzJsonFile, "utf8")
  );

  console.log("Reading OSM json...");
  const osmDB: OsmPlanet = JSON.parse(
    await fs.readFile(planetJsonFile, "utf8")
  );

  console.log("Confating...");
  const missing: FeatureCollection<MultiLineString, ConflatedStreet> = {
    type: "FeatureCollection",
    features: [],
  };

  for (const sector in linzDB) {
    const allLinz = linzDB[sector];
    const osmGrouped = osmDB[sector] || {};
    const allOsm = Object.values(osmGrouped).flat();

    for (const [i, linzStreet] of allLinz.entries()) {
      // 1. if we're lucky we can find an exact match within this group
      let possibleOsmMatches = osmGrouped[linzStreet.nameCode]?.filter(
        checkIfMatches(linzStreet)
      );

      if (!possibleOsmMatches?.length) {
        // 2. If not, we try again by searching thru the full list.
        possibleOsmMatches = allOsm.filter(checkIfMatches(linzStreet));
      }

      if (!possibleOsmMatches.length) {
        // 3. If there are still no matches, do a final check if it's a state highway
        const skip =
          linzStreet.name.includes("State Highway") ||
          linzStreet.name.includes("Motorway");

        if (!skip) {
          // 4. If we get to this point, flag the street as missing
          missing.features.push({
            type: "Feature",
            id: `${sector}_${i}`,
            bbox: calcBBox(linzStreet.geometry),
            geometry: linzStreet.geometry,
            properties: {
              roadId: linzStreet.roadId,
              name: linzStreet.name,
            },
          });
        }
      }
    }
  }

  console.log(`Saving ${missing.features.length} issues...`);
  await fs.writeFile(conflationResult, JSON.stringify(missing, null, 2));
}
main();
