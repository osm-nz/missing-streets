import { createWriteStream } from "node:fs";
import type { FeatureCollection } from "geojson";

/**
 * Makes a random request with the page size set to a
 * huge number, to see how many items the API will
 * return per page. There might be a better way of
 * getting this info…
 */
async function getPageSizeLimit(url: string) {
  const qs2 = new URLSearchParams({
    where: "1=1",
    outFields: "*",
    f: "geojson",
    resultRecordCount: `${1e9}`,
  });
  const result: FeatureCollection = await fetch(`${url}/query?${qs2}`).then(
    (r) => r.json()
  );

  return result.features.length;
}

/**
 * Gets every single object_id in the dataset.
 * Fetching by primary key is much more efficient
 * (and thereby faster) than cursor-based pagination.
 */
async function listAllObjectIds(url: string) {
  const metadata: { objectIds: number[] } = await fetch(
    `${url}/query?${new URLSearchParams({ where: "1=1", returnIdsOnly: "true", f: "json" })}`
  ).then((r) => r.json());
  return metadata;
}

/**
 * Queries every item from a FeatureServer's dataset,
 * in chunks of usually 2000 rows, then streams the
 * result to a jsonl file.
 * {@link https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/ docs}
 */
export async function arcgisFeatureServerDownloader(
  url: string,
  outputFile: string
) {
  const perPage = await getPageSizeLimit(url);
  const { objectIds } = await listAllObjectIds(url);
  const count = objectIds.length;
  console.log(`Expecting ${count.toLocaleString()} features.`);

  const fileStream = createWriteStream(outputFile);

  const startTime = Date.now();
  for (let i = 0; i < count; i += perPage) {
    const page = i / perPage;
    const totalPages = (count / perPage) | 0;

    const timePerChunk = (Date.now() - startTime) / (i / perPage) / 1e3; // seconds
    const timeRemaining = (((count - i) / perPage) * timePerChunk) | 0; // seconds
    const timeRemainingMMSS = new Date(timeRemaining * 1e3)
      .toISOString()
      .slice(14, 19);

    console.log(
      `Fetching page ${page} of ${totalPages}… (~${timeRemainingMMSS}s remaining)`
    );

    const qs = new URLSearchParams({
      where: "1=1",
      outFields: "*",
      f: "geojson",
      objectIds: objectIds.slice(i, i + perPage).join(","),
    });
    const result: FeatureCollection = await fetch(`${url}/query`, {
      method: "POST",
      body: qs,
    }).then((r) => r.json());
    console.log("\tgot", result.features.length);

    for (const row of result.features) {
      fileStream.write(JSON.stringify(row));
      fileStream.write("\n");
    }
  }

  fileStream.end();

  await new Promise((resolve) => fileStream.on("finish", resolve));
}
