import { join } from "path";

export const planetRawFile = join(__dirname, "../../tmp/osm.pbf");
export const planetJsonFile = join(__dirname, "../../tmp/osm.json");

export const linzRawFile = join(__dirname, "../../tmp/linz.csv");
export const linzJsonFile = join(__dirname, "../../tmp/linz.json");

export const conflationResult = join(
  __dirname,
  "../../public/conflationResult.geo.json"
);
