export default {
  metadata: {
    code: "GB",
    name: "Great Britain",
    icon: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Flag_of_Great_Britain_%281707%E2%80%931800%29.svg",
    source: "https://osdatahub.os.uk/data/downloads/open/OpenRoads",
    centroid: { lat: 54.430607, lon: -2.260570 },
  },
  PLANET_URL:
    "https://download.geofabrik.de/europe/united-kingdom-latest.osm.pbf",
  async requestExport() {
    const response = await api.generateExport(123110);
    console.log(`Requested export #${response.id}`);
  },
  downloadFiles,
  preprocess,
} satisfies Region;