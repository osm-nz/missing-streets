import { join } from "node:path";
import { Koordinates } from "koordinates-api";

if (!process.env.CI) {
  process.loadEnvFile(join(import.meta.dirname, "../../../.env.local"));
}

export const api = new Koordinates({
  host: "https://data.linz.govt.nz",
  apiKey: process.env.REACT_APP_LDS_KEY!,
});
