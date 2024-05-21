export interface WGS84 {
  latitude: number;
  longitude: number;
  altitude: number;
}

export enum COLORS {
  green = "#00ff9f",
  blue = "#00b8ff",
  orange = "#ff8c00",
  pink = "#ff0060",
  purple = "#8b00ff"
}

export interface CompilerParams {
  n_measurements: string;
}

export interface Node {
  id: number;
  true_index: number;
  asserted_index: string;
  estimated_index: string;
  true_position: [number, number, number];
  asserted_position: [number, number, number];
  estimated_position: [number, number, number];
  estimated_beta: number,
  estimated_tau: number,
  estimation_variance: [number, number, number];
  en_variance_semimajor_axis: [number, number],
  en_variance_semiminor_axis: [number, number],
  en_variance_semimajor_axis_length: number,
  en_variance_semiminor_axis_length: number,
  true_wgs84: WGS84;
  estimated_wgs84: WGS84;
  asserted_wgs84: WGS84;
  beta: number;
  tau: number;
}

export interface Stats {
  estimation_rms_error: number[];
  assertion_rms_error: number[];
}

// These are the parameters we set for a new simulation
export interface SimulationParams {
  // preset by compiler
  nMeasurements: number,

  // we define these
  // number of nodes in the simulation
  nNodes: number;
  // number of times to run the kalman filter step
  nEpochs: number;
  // position resolution at which nodes assert location
  h3Resolution: number;
  // accuracy at which nodes assert position (m^2)
  assertedPositionVariance: number;
  // message speed range [min, max] as a fraction of c, the speed of light 
  betaMin: number
  betaMax: number
  // per-message message speed variance as a fraction of c
  betaVariance: number
  // latency range [min, max] (µs)
  tauMin: number
  tauMax: number
  // per-message latency stddev (s^2)
  tauVariance: number;
  // max message range (m)
  messageDistanceMax: number;
  // model position state update varians (m^2)
  modelPositionVariance: number;
  // initial model for message speed: fraction of c
  modelBeta: number;
  // model message speed state update variance
  modelBetaVariance: number;
  // initial model latency (s)
  modelTau: number;
  // model latency state update standard deviation
  modelTauVariance: number;
  // model time of flight observation variance (s^2)
  modelTofObservationVariance: number;
}

// units are in km, ms, and std deviation
export type SimulationParamFields = {
  nNodes: string
  nMeasurements: string
  nEpochs: string
  h3Resolution: string
  // km
  assertedPositionStddev: string
  // %c
  betaRange: string
  // %c
  betaStddev: string
  // ms
  tauRange: string
  // ms
  tauStddev: string
  // km
  messageDistanceMax: string
  // km
  modelPositionStddev: string
  // %c
  modelBeta: string
  // %c
  modelBetaStddev: string
  // ms
  modelTau: string
  // ms
  modelTauStddev: string
  // 
  modelTofObservationStddev: string
};

// this is what we get back from the Rust simulate call
export interface Simulation {
  n_nodes: number;
  n_epochs: number;
  h3_resolution: number;
  asserted_position_variance: number;
  beta_min: number;
  beta_max: number;
  tau_min: number;
  tau_max: number;
  message_distance_max: number;
  model_position_variance: number;
  model_tof_observation_variance: number;
  model_beta: number;
  model_tau: number;
  nodes: Node[];
  stats: Stats,
}