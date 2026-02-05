import { promises as fs } from "node:fs";
import { join } from "node:path";
import { REGIONS } from "./regions";

// to avoid hardcoding this stuff in the FE and BE,
// this script copies the metadata into the FE folder.

const picked = REGIONS.map((r) => r.metadata);

const code = `/* eslint-disable quote-props, prettier/prettier */
import { RegionMetadata } from './types';

export const REGION_METADATA: RegionMetadata[] = ${JSON.stringify(picked, null, 2)};
`;

await fs.writeFile(join(import.meta.dirname, "../src/auto-generated.ts"), code);
