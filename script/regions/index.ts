import type { Region } from "../util";
import AU_NSW from "./AU_NSW";
import AU_TAS from "./AU_TAS";
import AU_VIC from "./AU_VIC";
import NZ from "./NZ";
import US_UT from "./US_UT";

export const REGIONS: Region[] = [
  // the order affects the dropdown selector on the website
  NZ,
  AU_NSW,
  AU_TAS,
  AU_VIC,
  US_UT,
];
