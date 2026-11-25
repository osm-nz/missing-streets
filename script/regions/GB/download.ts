import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tempFolder } from "../../util";
import { curl } from "../../util/curl";

const DOWNLOAD_URL =
  "https://api.os.uk/downloads/v1/products/OpenRoads/downloads?area=GB&format=ESRI%C2%AE+Shapefile&redirect";

export const rawFile = join(tempFolder, "tmp-GB.zip");

export async function downloadSourceData(): Promise<void> {
  await fs.mkdir(tempFolder, { recursive: true });
  await curl(DOWNLOAD_URL, rawFile);
}
