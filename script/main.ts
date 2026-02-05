import { conflate } from "./conflate";
import { downloadPlanet } from "./downloadPlanet";
import { preprocessPlanet } from "./2preprocess";
import { REGIONS } from "./regions";

const COMMANDS = <const>[
  "requestExport",
  "downloadPlanet",
  "downloadSourceData",
  "preprocessPlanet",
  "preprocessSourceData",
  "conflate",
];

async function main() {
  const selectedRegions = process.argv[2]?.split(",") || [];
  const selectedCommands = process.argv[3]?.split(",") || [];
  console.log({ selectedRegions, selectedCommands });

  for (const region of REGIONS) {
    if (
      !selectedRegions.includes(region.metadata.code) &&
      !selectedRegions.includes("*")
    ) {
      continue;
    }
    for (const command of COMMANDS) {
      if (
        !selectedCommands.includes(command) &&
        !selectedCommands.includes("*")
      ) {
        continue;
      }

      // run this command in this region
      const key = `[${region.metadata.code}] ${command}`;
      console.log(key);
      console.time(key);

      switch (command) {
        case "requestExport": {
          await region.requestExport?.();
          break;
        }

        case "downloadPlanet": {
          await downloadPlanet(region);
          break;
        }

        case "downloadSourceData": {
          await region.downloadSourceData();
          break;
        }

        case "preprocessPlanet": {
          await preprocessPlanet(region);
          break;
        }

        case "preprocessSourceData": {
          await region.preprocess();
          break;
        }

        case "conflate": {
          await conflate(region);
          break;
        }

        default: {
          command satisfies never; // exhaustivity check
        }
      }
      console.timeEnd(key);
    }
  }
}

main();
