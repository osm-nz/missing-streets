import { BlobServiceClient } from "@azure/storage-blob";
import { config as dotenv } from "dotenv";
import { join } from "path";
import { conflationResult } from "./util";

dotenv({ path: join(__dirname, "../.env.secret") });

async function main() {
  const { AZ_CON } = process.env;

  if (!AZ_CON) {
    throw new Error(
      'You need to create a file called ".env.secret" in the root of the repository, and add the AZ_CON="..." variable'
    );
  }

  console.log("Uploading...");

  const az = BlobServiceClient.fromConnectionString(AZ_CON);
  const azContainer = az.getContainerClient("$web");

  const fileClient = azContainer.getBlockBlobClient("missing-streets.json");
  await fileClient.uploadFile(conflationResult);
  await fileClient.setHTTPHeaders({
    blobContentType: "application/json",
  });

  console.log("Done.");
}

main();
