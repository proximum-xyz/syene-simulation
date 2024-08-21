export enum PATHS {
  home = '/',
  simulation = 'simulation',
  register = 'register'
}

export interface WGS84 {
  latitude: number;
  longitude: number;
  altitude: number;
}

export enum COLORS {
  green = "#00ff9f",
  blue = "#00b8ff",
  orange = "#ff4f00",
  pink = "#ff0060",
  purple = "#8b00ff",
  grey = "#808080",
  white = "#ffffff"
}

export interface CompilerParams {
  n_measurements: string;
}

export interface Node {
  id: number;
  true_index: number;
  true_position: [number, number, number];
  true_wgs84: WGS84;
  true_beta: number;
  true_tau: number;
  asserted_index: string;
  asserted_position: [number, number, number];
  asserted_wgs84: WGS84;
  ls_estimated_index: string;
  ls_estimated_position: [number, number, number];
  ls_estimated_wgs84: WGS84;
  kf_estimated_index: string;
  kf_estimated_position: [number, number, number];
  kf_estimated_wgs84: WGS84;
  kf_estimated_beta: number,
  kf_estimated_tau: number,
  kf_estimation_variance: [number, number, number];
  kf_en_variance_semimajor_axis: [number, number],
  kf_en_variance_semiminor_axis: [number, number],
  kf_en_variance_semimajor_axis_length: number,
  kf_en_variance_semiminor_axis_length: number,
}

export interface Stats {
  ls_estimation_rms_error: number[];
  kf_estimation_rms_error: number[];
  assertion_rms_error: number[];
}

// These are the parameters we set for a new simulation
export interface SimulationConfig {
  // we define these
  // number of nodes in the simulation
  n_nodes: number;
  // number of times to run the kalman filter step
  n_epochs: number;
  // position resolution at which nodes assert location
  h3_resolution: number;
  // accuracy at which nodes assert position (m^2)
  asserted_position_variance: number;
  // message speed range [min, max] as a fraction of c, the speed of light 
  beta_min: number
  beta_max: number
  // per-message message speed variance as a fraction of c
  beta_variance: number
  // latency range [min, max] (µs)
  tau_min: number
  tau_max: number
  // per-message latency stddev (s^2)
  tau_variance: number;
  // max message range (m)
  message_distance_max: number;
  ls_model_beta: number;
  ls_model_tau: number;
  ls_tolerance: number;
  ls_iterations: number;
  // model position state update varians (m^2)
  kf_model_position_variance: number;
  // initial model for message speed: fraction of c
  kf_model_beta: number;
  // model message speed state update variance
  kf_model_beta_variance: number;
  // initial model latency (s)
  kf_model_tau: number;
  // model latency state update standard deviation
  kf_model_tau_variance: number;
  // model time of flight observation variance (s^2)
  kf_model_tof_observation_variance: number;
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
  // count
  leastSquaresIterations: string
};

// this is what we get back from the Rust simulate call
export interface Simulation {
  n_nodes: number;
  n_epochs: number;
  h3_resolution: number;
  asserted_position_variance: number;
  beta_min: number;
  beta_max: number;
  beta_variance: number,
  tau_min: number;
  tau_max: number;
  tau_variance: number;
  message_distance_max: number;
  kf_model_position_variance: number;
  kf_model_tof_observation_variance: number;
  kf_model_beta: number;
  kf_model_tau: number;
  nodes: Node[];
  stats: Stats,
}