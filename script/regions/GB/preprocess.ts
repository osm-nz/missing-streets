import { createReadStream, createWriteStream } from "node:fs";
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

  await new Promise<void>((resolve, reject) => {
    const parser = new JSONParser({ paths: ["$.features.*"] });
    const input = createReadStream(geoJsonFile);

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

  const sectors = Object.keys(out);
  for (const sector of sectors) {
    out[sector] = mergeIntoMultiLineString(out[sector]);
  }

  const output = createWriteStream(sourceDataFile(this));

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
    }
    await writeChunk("}\n");
    await new Promise<void>((resolve, reject) => {
      output.once("error", reject);
      output.end(resolve);
    });
  } catch (error) {
    output.destroy();
    throw error;
  }

  console.log(`Processed ${count.toLocaleString()} named road links.`);
}
