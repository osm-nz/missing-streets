import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import type { Feature, Geometry } from "geojson";
import { JSONParser } from "@streamparser/json-node";
import {
  getNameCode,
  processGeoJson,
  sourceDataFile,
  type Region,
  type SourceData,
  type SourceDataStreet,
} from "../../util";
import { createProgressBar } from "../../util/progress";
import { mergeIntoMultiLineString } from "../../util/mergeIntoMultiLineString";
import { geoJsonFile } from "./download";

interface GbRoad {
  name1: string | null;
  name2: string | null;
  length: number | null;
}

export async function preprocess(this: Region): Promise<void> {
  const out: SourceData = {};
  let count = 0;
  const inputProgress = createProgressBar(
    "Preprocessing GB GeoJSON",
    (await fs.stat(geoJsonFile)).size
  );
  inputProgress.update(0);
  let bytesRead = 0;

  try {
    await new Promise<void>((resolve, reject) => {
      const parser = new JSONParser({ paths: ["$.features.*"] });
      const input = createReadStream(geoJsonFile);

      input.on("data", (chunk: Buffer) => {
        bytesRead += chunk.length;
        inputProgress.update(bytesRead);
      });
      input.on("error", reject);
      parser.on("error", reject);
      parser.on("data", (chunk: { value: Feature<Geometry, GbRoad> }) => {
        const road = chunk.value;
        const { geometry, properties } = road;
        if (!properties) return;
        if (
          geometry.type !== "LineString" &&
          geometry.type !== "MultiLineString"
        ) {
          return;
        }
        if (typeof properties.length !== "number") return;

        const names = new Set(
          [properties.name1, properties.name2]
            .filter((name): name is string => Boolean(name?.trim()))
            .map((name) => name.trim())
        );
        if (names.size === 0) return;

        const parsed = processGeoJson(geometry, this);
        if (!parsed) return;
        const { sectors, firstLat, firstLng } = parsed;
        const roadId = ++count;

        for (const name of names) {
          const street: SourceDataStreet = {
            roadId,
            name,
            nameCode: getNameCode(name),
            streetLength: properties.length,
            geometry,
            lat: firstLat,
            lng: firstLng,
          };

          for (const sector of sectors) {
            out[sector] ||= [];
            out[sector].push(street);
          }
        }
      });
      parser.on("end", resolve);
      input.pipe(parser);
    });
    inputProgress.complete();
  } catch (error) {
    inputProgress.fail();
    throw error;
  }

  const sectors = Object.keys(out);
  const mergeProgress = createProgressBar(
    "Merging road segments",
    sectors.length
  );
  mergeProgress.update(0);
  for (const [index, sector] of sectors.entries()) {
    out[sector] = mergeIntoMultiLineString(out[sector]);
    mergeProgress.update(index + 1);
  }
  mergeProgress.complete();

  const output = createWriteStream(sourceDataFile(this));
  const outputProgress = createProgressBar(
    "Writing source data",
    sectors.length
  );
  outputProgress.update(0);

  const writeChunk = (chunk: string) =>
    new Promise<void>((resolve, reject) => {
      output.write(chunk, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

  try {
    await writeChunk("{");
    for (const [index, sector] of sectors.entries()) {
      const separator = index === 0 ? "" : ",";
      await writeChunk(
        `${separator}${JSON.stringify(sector)}:${JSON.stringify(out[sector])}`
      );
      outputProgress.update(index + 1);
    }
    await writeChunk("}\n");
    await new Promise<void>((resolve, reject) => {
      output.once("error", reject);
      output.end(resolve);
    });
    outputProgress.complete();
  } catch (error) {
    outputProgress.fail();
    output.destroy();
    throw error;
  }

  console.log(`Processed ${count.toLocaleString()} named road links.`);
}
