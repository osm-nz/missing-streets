import { existsSync } from "node:fs";
import { join } from "node:path";
import { Koordinates } from "koordinates-api";

const envFile = join(import.meta.dirname, "../../../.env.local");
if (!process.env.CI && existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export const api = new Koordinates({
  host: "https://data.linz.govt.nz",
  apiKey: process.env.REACT_APP_LDS_KEY!,
});
