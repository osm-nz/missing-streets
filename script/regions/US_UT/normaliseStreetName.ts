// copied from this fork: https://github.com/dknelson9876/missing-streets-ut

const ABBREVIATIONS: Record<string, string> = {
  ALY: "Alley",
  AVE: "Avenue",
  BAY: "Bay",
  BLVD: "Boulevard",
  CIR: "Circle",
  COR: "Corner",
  CRES: "Crescent",
  CRK: "Creek",
  CT: "Court",
  CTR: "Center",
  CV: "Cove",
  CYN: "Canyon",
  DR: "Drive",
  EST: "Estate",
  ESTS: "Estates",
  EXPY: "Expressway",
  FLT: "Flat",
  FRK: "Fork",
  FWY: "Freeway",
  GLN: "Glen",
  GRV: "Grove",
  GTWY: "Gateway",
  HL: "Hill",
  HOLW: "Hollow",
  HTS: "Heights",
  HWY: "Highway",
  JCT: "Junction",
  LN: "Lane",
  LNDG: "Landing",
  LOOP: "Loop",
  MDW: "Meadow",
  MDWS: "Meadows",
  MHP: "Mobile Home Park",
  MNR: "Manor",
  PARK: "Park",
  PASS: "Pass",
  PATH: "Path",
  PKWY: "Parkway",
  PL: "Place",
  PLZ: "Plaza",
  PT: "Point",
  RD: "Road",
  RDG: "Ridge",
  RNCH: "Ranch",
  ROW: "Row",
  RTE: "Route",
  RUN: "Run",
  SPUR: "Spur",
  SQ: "Square",
  ST: "Street",
  TER: "Terrace",
  TRCE: "Trace",
  TRL: "Trail",
  VIS: "Vista",
  VLG: "Village",
  VW: "View",
  WAY: "Way",
  XING: "Crossing",
  S: "South",
  N: "North",
  E: "East",
  W: "West",
};

/**
 * Given a fully uppercase street name, try to normalise
 * it using common English rules.
 *
 * This doesn't affect conflation (which is case-insensitive),
 * but it does affect the display in the website, and the
 * suggested tag value when creating/editing through the
 * website's UI.
 */
export function normaliseStreetName(
  uppercase: string,
  considerAbbreviations?: boolean
) {
  const words = uppercase.split(/\s+/).map((w) => w.trim());
  const expanded = words.map((w) => {
    if (considerAbbreviations) {
      const mapped = ABBREVIATIONS[w.toUpperCase()];
      if (mapped) return mapped;
    }
    return w.toLowerCase();
  });
  return expanded.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
