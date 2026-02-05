import { promises as fs } from "node:fs";
import { planetRawFile, tempFolder, type Region } from "./util";
import { curl } from "./util/curl";

export async function downloadPlanet(region: Region) {
  await fs.mkdir(tempFolder, { recursive: true });
  const planetUrl = region.PLANET_URL;

  await curl(planetUrl, planetRawFile(region));
}
