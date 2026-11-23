import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import { dirname } from "node:path";
import { JSONParser } from "@streamparser/json-node";
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
} from "./util";
import { calcBBox } from "./util/calcBbox";

export type GeoJsonOutput = FeatureCollection<
  MultiLineString | LineString,
  ConflatedStreet
> & {
  lastUpdated: string;
  totals: { dataset: number; osm: number };
};

type JsonEntry<T> = { key: string; value: T };

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

async function readJsonObject<T>(
  filePath: string,
  onEntry: (key: string, value: T) => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const parser = new JSONParser({
      keepStack: false,
      paths: ["$.*"],
    });
    const input = createReadStream(filePath);

    input.on("error", reject);
    parser.on("error", reject);
    parser.on("data", (entry: JsonEntry<T>) => {
      onEntry(entry.key, entry.value);
    });
    parser.on("end", resolve);
    input.pipe(parser);
  });
}

const writeChunk = (
  stream: ReturnType<typeof createWriteStream>,
  chunk: string
) =>
  new Promise<void>((resolve, reject) => {
    stream.write(chunk, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const finishStream = (stream: ReturnType<typeof createWriteStream>) =>
  new Promise<void>((resolve, reject) => {
    stream.once("error", reject);
    stream.end(resolve);
  });

export async function conflate(region: Region) {
  const osmDB: OsmPlanet = {};
  await readJsonObject<OsmPlanet[string]>(
    planetJsonFile(region),
    (sector, roads) => {
      osmDB[sector] = roads;
    }
  );

  const totals = { dataset: 0, osm: 0 };
  const foundRoadIds = new Set<number>();
  const missingRoadIds = new Set<number>();
  const missingFeatures: GeoJsonOutput["features"] = [];

  await readJsonObject<SourceData[string]>(
    sourceDataFile(region),
    (sector, allLinz) => {
      const osmGrouped = osmDB[sector] || {};
      const allOsm = Object.values(osmGrouped).flat();

      totals.dataset += allLinz.length;
      totals.osm += allOsm.length;

      for (const [i, linzStreet] of allLinz.entries()) {
        let possibleOsmMatches = osmGrouped[linzStreet.nameCode]?.filter(
          checkIfMatches(linzStreet)
        );

        if (!possibleOsmMatches?.length) {
          possibleOsmMatches = allOsm.filter(checkIfMatches(linzStreet));
        }

        if (possibleOsmMatches.length) {
          foundRoadIds.add(linzStreet.roadId);
        } else if (
          !foundRoadIds.has(linzStreet.roadId) &&
          !missingRoadIds.has(linzStreet.roadId)
        ) {
          missingRoadIds.add(linzStreet.roadId);
          missingFeatures.push({
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
  );

  const outputFilePath = conflationResult(region);
  await fs.mkdir(dirname(outputFilePath), { recursive: true });

  const output = createWriteStream(outputFilePath);
  let written = 0;

  try {
    await writeChunk(output, '{"type":"FeatureCollection","features":[');
    for (const feature of missingFeatures) {
      if (foundRoadIds.has(feature.properties.roadId)) continue;
      if (written > 0) await writeChunk(output, ",");
      await writeChunk(output, JSON.stringify(feature));
      written++;
    }
    await writeChunk(
      output,
      `],"lastUpdated":${JSON.stringify(new Date().toISOString())},"totals":${JSON.stringify(totals)}}\n`
    );
    await finishStream(output);
  } catch (error) {
    output.destroy();
    throw error;
  }

  console.log(`Saved ${written.toLocaleString()} issues to ${outputFilePath}`);
}
