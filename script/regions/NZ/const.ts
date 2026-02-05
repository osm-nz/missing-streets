import { join } from "node:path";
import { tempFolder } from "../../util";

export const linzRawFile = join(tempFolder, "tmp-NZ.json");

export interface RawCsvStreet {
  WKT: string;
  road_id: number;
  full_road_name?: string;
  /** if this field is missing, it's probably a water address */
  road_name_type?: string;
}
