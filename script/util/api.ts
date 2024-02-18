import { join } from "node:path";
import { config as dotenv } from "dotenv";
import { Koordinates } from "koordinates-api";

dotenv({ path: join(__dirname, "../../.env.local") });

export const api = new Koordinates({
  host: "https://data.linz.govt.nz",
  apiKey: process.env.REACT_APP_LDS_KEY!,
});
