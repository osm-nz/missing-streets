import fs from "node:fs";
import { rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

import axios from "axios";
import AdmZip from "adm-zip";

import { tempFolder } from "../../util";

const execFileAsync = promisify(execFile);

export const OSMRawFile = join(tempFolder, "tmp-GB.geojson");
const OSMZipFile = join(tempFolder, "tmp-GB.zip");

interface DownloadInfo {
    area: string;
    format: string;
    url: string;
}

/* ============================================================
   Download file as stream
============================================================ */
async function downloadFile(
    url: string,
    filename: string
): Promise<void> {
    const response = await axios({
        url,
        responseType: "stream",
    });

    await new Promise<void>((resolve, reject) => {
        response.data
            .pipe(fs.createWriteStream(filename))
            .on("finish", resolve)
            .on("error", reject);
    });
}

/* ============================================================
   Download GB GeoPackage
============================================================ */
async function downloadOpenRoads(): Promise<void> {
    console.log("Fetching OS Open Roads download information...");

    const { data } = await axios.get<DownloadInfo[]>(
        "https://api.os.uk/downloads/v1/products/OpenRoads/downloads"
    );

    const gbDownload = data.find(
        (download) =>
            download.area === "GB" &&
            download.format === "GeoPackage"
    );

    if (!gbDownload) {
        throw new Error(
            "Unable to find GB GeoPackage download."
        );
    }

    console.log("Downloading GeoPackage ZIP...");

    await downloadFile(
        gbDownload.url,
        OSMZipFile
    );

    console.log("Inspecting ZIP contents...");

    const zip = new AdmZip(OSMZipFile);

    const gpkgFile = zip
        .getEntries()
        .find((entry) =>
            entry.entryName.toLowerCase().endsWith(".gpkg")
        );

    if (!gpkgFile) {
        throw new Error(
            "No GeoPackage file found in ZIP."
        );
    }

    const sourcePath = `/vsizip/${OSMZipFile}/${gpkgFile.entryName}`;

    console.log(
        `Converting ${gpkgFile.entryName} to GeoJSON...`
    );

    await execFileAsync("ogr2ogr", [
        "-f",
        "GeoJSON",
        OSMRawFile,
        sourcePath,
    ]);

    console.log("Cleaning up...");

    await rm(OSMZipFile, { force: true });

    console.log(`GeoJSON written to: ${OSMRawFile}`);
}

/* ============================================================
   Entry point
============================================================ */
void downloadOpenRoads().catch((error) => {
    console.error(error);
    