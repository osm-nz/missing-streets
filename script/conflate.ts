import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { FeatureCollection, MultiLineString, type LineString } from "geojson";
import {
  ConflatedStreet,
  conflationResult,
  distanceBetween,
  OsmPlanet,
  OsmStreet,
  planetJsonFile,
  SourceData,
  sourceDataFile,
  SourceDataStreet,
  type Region,
  isWithinEditDistance,
} from "./util";
import { calcBBox } from "./util/calcBbox";

export type GeoJsonOutput = FeatureCollection<
  MultiLineString | LineString,
  ConflatedStreet
> & {
  lastUpdated: string;
  totals: { dataset: number; osm: number };
};
type GeoJsonFeature = GeoJsonOutput["features"][number];

// only used for comparing names
const stripMacrons = (str: string) =>
  str.normalize("NFD").replaceAll(/[\u0300-\u036F]/g, "");

const isCloseEnough = (linzStreet: SourceDataStreet, osmStreet: OsmStreet) =>
  distanceBetween(
    osmStreet.lat,
    osmStreet.lng,
    linzStreet.lat,
    linzStreet.lng
  ) <
  10_000 + 2 * linzStreet.streetLength;

const isVeryClose = (linzStreet: SourceDataStreet, osmStreet: OsmStreet) =>
  distanceBetween(
    osmStreet.lat,
    osmStreet.lng,
    linzStreet.lat,
    linzStreet.lng
  ) <
  1000 + linzStreet.streetLength;

// lower threshold for short names
const getMaxEditDistance = (nameCode: string) => (nameCode.length < 12 ? 1 : 2);

/**
 * Perf optimisation trick: This function returns every string that
 * can be created by deleting up to N characters.
 * Given two strings with an edit distance of N, they must share at
 * least one member of their sets
 */
export function getDeleteVariants(str: string, maxDeletions: 1 | 2 = 2) {
  const variants = new Set([str]);
  for (let i = 0; i < str.length; i++) {
    const once = str.slice(0, i) + str.slice(i + 1);
    variants.add(once);
    if (maxDeletions < 2) continue;
    for (let j = i; j < once.length; j++) {
      variants.add(once.slice(0, j) + once.slice(j + 1));
    }
  }
  return variants;
}

function groupOsmNames(allOsm: OsmStreet[]) {
  /** Record<name-key, indexes in allOsm> */
  const byStrippedName: Record<string, number[]> = {};
  const byName: Record<string, OsmStreet[]> = {};

  for (const [index, osmStreet] of allOsm.entries()) {
    const names = new Set<string>();
    const strippedNames = new Set<string>();
    for (const nameCode of [
      osmStreet.nameCode,
      ...(osmStreet.otherNameCodes || []),
    ]) {
      const stripped = stripMacrons(nameCode);
      names.add(nameCode).add(stripped);
      strippedNames.add(stripped);
    }

    for (const name of names) {
      byName[name] ||= [];
      byName[name].push(osmStreet);
    }
    for (const name of strippedNames) {
      byStrippedName[name] ||= [];
      byStrippedName[name].push(index);
    }
  }

  /** see {@link getDeleteVariants} */
  const byDeletion: Record<string, string[]> = {};
  for (const name in byStrippedName) {
    for (const variant of getDeleteVariants(name)) {
      byDeletion[variant] ||= [];
      byDeletion[variant].push(name);
    }
  }

  return { allOsm, byName, byStrippedName, byDeletion };
}
type SectorIndex = ReturnType<typeof groupOsmNames>;

function findNearMatch(
  linzStreet: SourceDataStreet,
  { allOsm, byStrippedName, byDeletion }: SectorIndex,
  exactlyMatchedOsm: Set<OsmStreet>
) {
  const sourceNameCode = stripMacrons(linzStreet.nameCode);

  const variants = getDeleteVariants(
    sourceNameCode,
    getMaxEditDistance(sourceNameCode)
  );
  const candidates = new Set<string>();
  for (const variant of variants) {
    for (const name of byDeletion[variant] || []) {
      candidates.add(name);
    }
  }

  let firstIndex = Infinity;
  for (const nameCode of candidates) {
    const maxEdits = getMaxEditDistance(nameCode);
    if (!isWithinEditDistance(sourceNameCode, nameCode, maxEdits)) continue;

    for (const index of byStrippedName[nameCode]) {
      if (index >= firstIndex) break;
      const osmStreet = allOsm[index];
      if (
        !exactlyMatchedOsm.has(osmStreet) &&
        isVeryClose(linzStreet, osmStreet)
      ) {
        firstIndex = index;
        break;
      }
    }
  }

  if (firstIndex === Infinity) return undefined;

  return allOsm[firstIndex];
}

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
    totals: { dataset: 0, osm: 0 },
  };

  const foundRoadIds = new Set<number>();
  const missingFeaturesByRoadId = new Map<number, GeoJsonFeature>();

  for (const sector in linzDB) {
    const allLinz = linzDB[sector];
    const osmGrouped = osmDB[sector] || {};
    const allOsm = Object.values(osmGrouped).flat();
    const sectorIndex = groupOsmNames(allOsm);

    missing.totals.dataset += allLinz.length;
    missing.totals.osm += allOsm.length;

    const exactMatches = allLinz.map(
      (linzStreet) =>
        sectorIndex.byName[linzStreet.nameCode]?.filter((osmStreet) =>
          isCloseEnough(linzStreet, osmStreet)
        ) || []
    );
    const exactlyMatchedOsm = new Set(exactMatches.flat());

    for (const [i, linzStreet] of allLinz.entries()) {
      if (exactMatches[i].length) {
        // we found a match. Store all the matches, in case this is
        // a long feature and we encounter it again in another sector
        foundRoadIds.add(linzStreet.roadId);
      } else {
        if (!foundRoadIds.has(linzStreet.roadId)) {
          const existingFeature = missingFeaturesByRoadId.get(
            linzStreet.roadId
          );

          if (existingFeature) {
            if (!existingFeature.properties.nearMatchName) {
              const similarOsmStreet = findNearMatch(
                linzStreet,
                sectorIndex,
                exactlyMatchedOsm
              );
              if (similarOsmStreet) {
                existingFeature.properties.nearMatchName =
                  similarOsmStreet.name;
              }
            }
          } else {
            const similarOsmStreet = findNearMatch(
              linzStreet,
              sectorIndex,
              exactlyMatchedOsm
            );
            // 4. If we get to this point, flag the street as missing
            const feature: GeoJsonFeature = {
              type: "Feature",
              id: `${sector}_${i}`,
              bbox: calcBBox(linzStreet.geometry),
              geometry: linzStreet.geometry,
              properties: {
                roadId: linzStreet.roadId,
                name: linzStreet.name,
                ...(similarOsmStreet
                  ? { nearMatchName: similarOsmStreet.name }
                  : {}),
              },
            };
            missing.features.push(feature);
            missingFeaturesByRoadId.set(linzStreet.roadId, feature);
          }
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
