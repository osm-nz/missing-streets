export enum Surface {
  UnknownSurface,
  SealedSurface,
  UnsealedSurface,
}

export enum LaneCount {
  Unknown,
  OneLane,
  TwoOrMoreLanes,
}

export enum OperationalStatus {
  Operational = 1,
  Proposed = 3,
  Disused = 4,
}

export interface RawNswData {
  roadnamebase: string | null;
  roadnametype: string | null;
  roadnamesuffix: string | null;
  surface: Surface;
  lanecount: LaneCount;
  operationalstatus: OperationalStatus;

  objectid: number;
  topoid: number;
  createdate: number;
  objectmoddate: number;
  featuremoddate: null;
  classsubtype: number;
  featurereliabilitydate: number;
  attributereliabilitydate: number;
  capturesourcecode: number;
  capturemethodcode: number;
  planimetricaccuracy: number;
  verticalaccuracy: null;
  roadnameoid: null;
  functionhierarchy: number;
  roadontype: number;
  roadnameextentoid: null;
  relevance: number;
  startdate: number;
  enddate: number;
  lastupdate: number;
  msoid: number;
  centroidid: null;
  shapeuuid: string;
  changetype: "M";
  processstate: null;
  urbanity: "S";
  Shape__Length: number;
}
