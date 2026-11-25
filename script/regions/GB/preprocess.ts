import { promises as fs } from "node:fs";
import Unzip from "adm-zip";
import type { Feature, LineString, MultiLineString, Position } from "geojson";
import { combine, parseDbf, parseShp } from "shpjs";
import {
  getNameCode,
  processGeoJson,
  sourceDataFile,
  type Region,
  type SourceData,
  type SourceDataStreet,
} from "../../util";
import { DisjointSet } from "../../util/DisjointSet";
import { rawFile } from "./download";

interface RawLink {
  fictitious: string;
  name1: string;
  name2: string;
  length: number;
  startNode: string;
  endNode: string;
  nameTOID: string;
}
type RawLinkFeature = Feature<LineString | MultiLineString, RawLink>;

interface ParsedLink {
  roadId: number;
  names: string[];
  lines: Position[][];
  length: number;
}

const round = ([lng, lat]: Position) => [+lng.toFixed(5), +lat.toFixed(5)];

/** reads tile-by-tile */
function* readRoadLinks(): Generator<RawLinkFeature[], void, void> {
  const zip = new Unzip(rawFile);
  for (const entry of zip.getEntries()) {
    if (!entry.entryName.endsWith("_RoadLink.shp")) continue;

    const basename = entry.entryName.slice(0, -4);

    const shp = zip.readFile(`${basename}.shp`)!;
    const prj = zip.readFile(`${basename}.prj`)!;
    const dbf = zip.readFile(`${basename}.dbf`)!;
    const cpg = Buffer.from("windows-1252");

    const merged = combine([parseShp(shp, prj), parseDbf(dbf, cpg)]);
    yield merged.features as RawLinkFeature[];
  }
}

export async function preprocess(this: Region): Promise<void> {
  // the dataset splits roads at every junction, so we need to
  // rejoin adjoining links with the same name.
  const links = new DisjointSet<ParsedLink>();

  for (const tile of readRoadLinks()) {
    for (const road of tile) {
      if (road.properties.fictitious === "true") continue;

      const names = [road.properties.name1, road.properties.name2].filter(
        Boolean
      );
      if (!names.length) continue;

      const lines =
        road.geometry.type === "LineString"
          ? [road.geometry.coordinates]
          : road.geometry.coordinates;

      const nameCode = getNameCode(names[0]);
      const link: ParsedLink = {
        roadId: +road.properties.nameTOID.replace("osgb", ""),
        names,
        lines: lines.map((line) => line.map(round)),
        length: road.properties.length,
      };
      links.add(link, [
        `${nameCode}␞${road.properties.startNode}`,
        `${nameCode}␞${road.properties.endNode}`,
      ]);
    }
  }

  const streets = links.dump();

  let fallbackTOID = 0;
  const out: SourceData = {};
  for (const street of streets) {
    const geometry: MultiLineString = {
      type: "MultiLineString",
      coordinates: street.flatMap((link) => link.lines),
    };
    const parsed = processGeoJson(geometry, this);
    if (!parsed) continue; // skip invalid
    const { sectors, firstLat, firstLng } = parsed;

    // usually every link has the same TOID, but not always
    const roadIds = new Set(street.map((link) => link.roadId).filter(Boolean));
    const roadId = roadIds.size ? Math.min(...roadIds) : --fallbackTOID;

    // localised names:
    const names = new Set(street.flatMap((link) => link.names));
    for (const name of names) {
      const entry: SourceDataStreet = {
        roadId,
        name,
        nameCode: getNameCode(name),
        streetLength: street.reduce((sum, link) => sum + link.length, 0),
        geometry,
        lat: firstLat,
        lng: firstLng,
      };
      for (const sector of sectors) {
        out[sector] ||= [];
        out[sector].push(entry);
      }
    }
  }

  console.log(
    `Merged ${links.size.toLocaleString()} road links into ${streets.length.toLocaleString()} streets`
  );
  await fs.writeFile(sourceDataFile(this), JSON.stringify(out));
}
