import { join } from "node:path";
import type { Region } from "./types";

const __dirname = import.meta.dirname;

export const tempFolder = join(__dirname, "../../tmp");

export const sourceDataFile = (region: Region) =>
  join(tempFolder, `source-data-${region.metadata.code}.json`);

export const planetRawFile = (region: Region) =>
  join(tempFolder, `osm-${region.metadata.code}.pbf`);

export const planetJsonFile = (region: Region) =>
  join(tempFolder, `osm-${region.metadata.code}.json`);

export const conflationResult = (region: Region) =>
  join(
    __dirname,
    `../../public/conflationResult-${region.metadata.code}.geo.json`
  );
