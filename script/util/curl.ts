import { spawn } from "node:child_process";
import { basename, dirname } from "node:path";
import { HEADERS } from "./const";

export async function curl(url: string, outputFile: string) {
  await new Promise<void>((resolve, reject) => {
    const headerArgs = Object.entries(HEADERS).flatMap(([key, value]) => [
      "-H",
      `${key}: ${value}`,
    ]);
    const child = spawn(
      "curl",
      ["-L", ...headerArgs, url, "--output", basename(outputFile)],
      { cwd: dirname(outputFile) }
    );
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);

    child.on("close", (code) => (code ? reject(code) : resolve()));
  });
}
