import { promises as fs } from "node:fs";
import { parse } from "node:path";
import Unzip from "adm-zip";
import { LINZ_LAYER_NAME_SUBSTR } from "../src/util";
import { api } from "./util/api";
import { linzRawFile } from "./util";

async function main() {
  const allExports = await api.listExports();
  const recentExports = allExports
    .filter(
      (item) =>
        item.created_at &&
        item.state !== "gone" &&
        item.state !== "cancelled" &&
        item.name.includes(LINZ_LAYER_NAME_SUBSTR)
    )
    .toSorted((a, b) => +new Date(b.created_at!) - +new Date(a.created_at!));

  const mostRecent = recentExports[0];
  if (!mostRecent) {
    throw new Error("No recent exports found.");
  }

  console.log(
    `Most recent export is #${mostRecent.id}, created at ${mostRecent.created_at}`
  );

  if (!mostRecent.download_url) {
    throw new Error("Export has no download_url yet");
  }

  console.log(`Downloading from ${mostRecent.download_url} …`);

  const tempFilePath = await api.downloadExport(mostRecent.download_url);
  console.log(`Saved to ${tempFilePath}`);

  const zip = new Unzip(tempFilePath);
  const zipEntries = zip.getEntries();

  const csvFile = zipEntries.find((file) => file.entryName.endsWith(".csv"));

  if (!csvFile) {
    throw new Error("No csv file in zip");
  }

  console.log(`Extracting ${csvFile.entryName}…`);

  zip.extractEntryTo(
    csvFile.entryName,
    parse(linzRawFile).dir,
    /* maintainEntryPath */ false,
    /* overwrite */ true,
    /* keepOriginalPermission */ undefined,
    parse(linzRawFile).base
  );

  console.log("Deleting temp file…");
  await fs.rm(tempFilePath, { force: true });

  console.log("Done!");
}

main();
