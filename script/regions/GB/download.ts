import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import shp from "shpjs";
import { tempFolder } from "../../util";
import { createProgressBar, withSpinner } from "../../util/progress";

const DOWNLOADS_URL =
  "https://api.os.uk/downloads/v1/products/OpenRoads/downloads";

export const geoJsonFile = join(tempFolder, "tmp-GB.geojson");

interface DownloadInfo {
  area: string;
  format: string;
  size: number;
  url: string;
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

export async function downloadSourceData(): Promise<void> {
  const downloadsResponse = await fetch(DOWNLOADS_URL);
  if (!downloadsResponse.ok) {
    throw new Error(
      `Failed to fetch Open Roads downloads: ${downloadsResponse.status} ${downloadsResponse.statusText}`
    );
  }

  const downloads = (await downloadsResponse.json()) as DownloadInfo[];
  const gbDownload = downloads.find(
    (download) =>
      download.area === "GB" &&
      download.format.toLowerCase().includes("shapefile")
  );
  if (!gbDownload) {
    throw new Error("Unable to find the GB Open Roads shapefile download.");
  }

  const archiveResponse = await fetch(gbDownload.url);
  if (!archiveResponse.ok) {
    throw new Error(
      `Failed to download the GB shapefile: ${archiveResponse.status} ${archiveResponse.statusText}`
    );
  }

  if (!Number.isSafeInteger(gbDownload.size) || gbDownload.size <= 0) {
    throw new Error("The GB shapefile download has an invalid file size.");
  }
  const reader = archiveResponse.body?.getReader();
  if (!reader) {
    throw new Error("The GB shapefile download has no response body.");
  }

  const archive = new Uint8Array(gbDownload.size);
  const downloadProgress = createProgressBar(
    "Downloading GB shapefile",
    archive.length
  );
  downloadProgress.update(0);
  let bytesDownloaded = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (bytesDownloaded + value.length > archive.length) {
        throw new Error(
          "The GB shapefile download exceeded its expected size."
        );
      }

      archive.set(value, bytesDownloaded);
      bytesDownloaded += value.length;
      downloadProgress.update(bytesDownloaded);
    }

    if (bytesDownloaded !== archive.length) {
      throw new Error(
        `The GB shapefile download was incomplete: received ${bytesDownloaded} of ${archive.length} bytes.`
      );
    }
    downloadProgress.complete();
  } catch (error) {
    downloadProgress.fail();
    throw error;
  } finally {
    reader.releaseLock();
  }

  const featureCollections = await withSpinner("Converting shapefile", () =>
    shp(archive.buffer)
  );
  const collections = Array.isArray(featureCollections)
    ? featureCollections
    : [featureCollections];
  const featureCount = collections.reduce(
    (total, collection) => total + collection.features.length,
    0
  );

  await mkdir(tempFolder, { recursive: true });
  const output = createWriteStream(geoJsonFile);
  const outputProgress = createProgressBar("Writing GeoJSON", featureCount);
  outputProgress.update(0);
  let count = 0;
  try {
    await writeChunk(output, '{"type":"FeatureCollection","features":[\n');

    for (const collection of collections) {
      for (const feature of collection.features) {
        if (count > 0) await writeChunk(output, ",\n");
        await writeChunk(output, JSON.stringify(feature));
        outputProgress.update(++count);
      }
    }

    await writeChunk(output, "\n]}\n");
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
  console.log(`GeoJSON written to ${geoJsonFile}`);
}
