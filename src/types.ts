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
  estimation_variance: [number, number, number];
  en_variance_semimajor_axis: [number, number],
  en_variance_semiminor_axis: [number, number],
  en_variance_semimajor_axis_length: number,
  en_variance_semiminor_axis_length: number,
  true_wgs84: WGS84;
  estimated_wgs84: WGS84;
  asserted_wgs84: WGS84;
  channel_speed: number;
  latency: number;
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
  // accuracy at which nodes assert position (km stddev)
  assertedPositionStddev: number;
  // message speed range [min, max] as a fraction of c, the speed of light 
  beta: [number, number];
  // per-message message speed stddev as a fraction of c
  betaStddev: number
  // latency range [min, max] (µs)
  tau: [number, number];
  // per-message latency stddev (µs)
  tauStddev: number;
  // max message range (km)
  messageDistanceMax: number;
  // model position state update standard deviation
  modelPositionStddev: number;
  // initial model for message speed: fraction of c
  modelBeta: number;
  // model message speed state update standard deviation
  modelBetaStddev: number;
  // initial model latency (µs)
  modelTau: number;
  // model latency state update standard deviation
  modelTauStddev: number;
  // model time of flight observation standard devation (µs)
  modelTofObservationStddev: number;
}

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