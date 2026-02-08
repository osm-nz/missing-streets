import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { FeatureCollection, MultiLineString, type LineString } from "geojson";
import {
  ConflatedStreet,
  conflationResult,
  distanceBetween,
  SourceData,
  SourceDataStreet,
  OsmPlanet,
  OsmStreet,
  planetJsonFile,
  sourceDataFile,
  type Region,
} from "./util";
import { calcBBox } from "./util/calcBbox";

type GeoJsonOutput = FeatureCollection<
  MultiLineString | LineString,
  ConflatedStreet
> & {
  lastUpdated: string;
};

// only used for comparing names
const stripMacrons = (str: string) =>
  str.normalize("NFD").replaceAll(/[\u0300-\u036F]/g, "");

// prettier-ignore
const checkIfMatches = (linzStreet: SourceDataStreet) => (osmStreet: OsmStreet) => {
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

export async function conflate(region: Region) {
  console.log("Reading SourceData json...");
  const linzDB: SourceData = JSON.parse(
    await fs.readFile(sourceDataFile(region), "utf8")
  );

  console.log("Reading OSM json...");
  const osmDB: OsmPlanet = JSON.parse(
    await fs.readFile(planetJsonFile(region), "utf8")
  );

  console.log("Conflating…");
  const missing: GeoJsonOutput = {
    type: "FeatureCollection",
    features: [],
    lastUpdated: new Date().toISOString(),
  };

  const foundRoadIds = new Set<number>();
  const missingRoadIds = new Set<number>();

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

      if (possibleOsmMatches.length) {
        // we found a match. Store all the matches, in case this is
        // a long feature and we encounter it again in another sector
        foundRoadIds.add(linzStreet.roadId);
      } else {
        if (
          !foundRoadIds.has(linzStreet.roadId) &&
          !missingRoadIds.has(linzStreet.roadId)
        ) {
          // 4. If we get to this point, flag the street as missing
          missingRoadIds.add(linzStreet.roadId);
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

  // for long roads that appear in multiple sectors,
  // remove them if we already found a perfect match
  // in a different sector, or if they were already
  // reported by a different sector.
  missing.features = missing.features.filter(
    (f) => !foundRoadIds.has(f.properties.roadId)
  );

  console.log(`Saving ${missing.features.length} issues...`);

  const outputFilePath = conflationResult(region);
  await fs.mkdir(dirname(outputFilePath), { recursive: true });
  await fs.writeFile(outputFilePath, JSON.stringify(missing, null, 2));
}
