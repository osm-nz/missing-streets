import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import shp from "shpjs";
import { tempFolder } from "../../util";

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
    }

    if (bytesDownloaded !== archive.length) {
      throw new Error(
        `The GB shapefile download was incomplete: received ${bytesDownloaded} of ${archive.length} bytes.`
      );
    }
  } finally {
    reader.releaseLock();
  }

  const featureCollections = await shp(archive.buffer);
  const collections = Array.isArray(featureCollections)
    ? featureCollections
    : [featureCollections];

  await mkdir(tempFolder, { recursive: true });
  const output = createWriteStream(geoJsonFile);
  let count = 0;
  try {
    await writeChunk(output, '{"type":"FeatureCollection","features":[\n');

    for (const collection of collections) {
      for (const feature of collection.features) {
        if (count > 0) await writeChunk(output, ",\n");
        await writeChunk(output, JSON.stringify(feature));
        count++;
      }
    }

    await writeChunk(output, "\n]}\n");
    await new Promise<void>((resolve, reject) => {
      output.once("error", reject);
      output.end(resolve);
    });
  } catch (error) {
    output.destroy();
    throw error;
  }
  console.log(`GeoJSON written to ${geoJsonFile}`);
}
