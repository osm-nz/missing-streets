export interface ExportRequestResponse {
  message: string;
  status: "ExportingData";
  created: string;
  modified: string;
  progressInPercent: number;
  recordCount: number;

  resultUrl?: string;
}

export async function getDownloadUrlFromArcgisApi(
  datasetId: string,
  layerIndex: number
) {
  const qs = new URLSearchParams({
    redirect: "false",
    layers: `${layerIndex}`,
    spatialRefId: "4326",
  });
  const result: ExportRequestResponse = await fetch(
    `https://hub.arcgis.com/api/download/v1/items/${datasetId}/geojson?${qs}`
  ).then((r) => r.json());
  console.log(result.message);

  return result;
}
