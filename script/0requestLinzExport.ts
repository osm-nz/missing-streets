import { LINZ_LAYER } from "../src/util";
import { api } from "./util/api";

async function main() {
  const response = await api.generateExport(LINZ_LAYER);
  console.log(`Requested export #${response.id}`);
}
main();
