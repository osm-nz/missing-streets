import { promises as fs } from "node:fs";
import { join } from "node:path";
import { homepage } from "../package.json" with { type: "json" };
import type { GeoJsonOutput } from "./conflate";
import { REGIONS } from "./regions";
import type { RegionMetadata } from "./util";

//
// this script is only designed to work in github actions
//
const { GITHUB_ACTOR, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;

interface StatsRow {
  /** ISO Date */
  date: string;
  regions: {
    [region: string]: {
      issues: number;
      totalDataset: number;
      totalOsm: number;
    };
  };
}

interface StatsFile {
  /** ISO Date */
  lastUpdated: string;
  operator: string;
  rows: StatsRow[];
  metadata: RegionMetadata[];
}

const STATS_FILE_NAME = "stats.json";

//
// generate the new stats
//
const folder = join(import.meta.dirname, "../public");
const fileNames = await fs.readdir(folder);
const newRow: StatsRow = {
  date: new Date().toISOString(),
  regions: {},
};
for (const fileName of fileNames) {
  const PREFIX = "conflationResult-";
  const SUFFIX = ".geo.json";
  if (!fileName.startsWith(PREFIX) || !fileName.endsWith(SUFFIX)) continue;

  const region = fileName.replace(PREFIX, "").replace(SUFFIX, "");

  const fileContent: GeoJsonOutput = JSON.parse(
    await fs.readFile(join(folder, fileName), "utf8")
  );

  newRow.regions[region] = {
    issues: fileContent.features.length,
    totalDataset: fileContent.totals.dataset,
    totalOsm: fileContent.totals.osm,
  };
}

//
// add the new stats row to the existing file
//
const existingStats: StatsFile = await fetch(
  `${homepage}/${STATS_FILE_NAME}`
).then((r) => r.json());

existingStats.lastUpdated = newRow.date;
existingStats.operator = `https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}#${GITHUB_ACTOR}`;
existingStats.rows.push(newRow);
existingStats.metadata = REGIONS.map((r) => r.metadata);

await fs.writeFile(
  join(folder, STATS_FILE_NAME),
  JSON.stringify(existingStats)
);
