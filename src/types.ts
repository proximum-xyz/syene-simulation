export interface WGS84 {
  latitude: number;
  longitude: number;
  altitude: number;
}

export interface CompilerParams {
  n_measurements: number;
}

export interface Node {
  id: number;
  true_index: number;
  asserted_index: number;
  estimated_index: number;
  true_position: [number, number, number];
  estimated_position: [number, number, number];
  estimation_variance: [number, number, number];
  true_wgs84: WGS84;
  estimated_wgs84: WGS84;
  asserted_wgs84: WGS84;
  channel_speed: number;
  latency: number;
}

export interface Stats {
  estimation_rms_error: number[];
  assertion_stddev: number[];
}

// These are the parameters we set for a new simulation
export interface SimulationParams {
  nNodes: number;
  nMeasurements: number,
  nEpochs: number;
  h3Resolution: number;
  realAssertedPositionStddev: number;
  realChannelSpeed: [number, number];
  realLatency: [number, number];
  modelDistanceMax: number;
  modelStateStddev: number;
  modelMeasurementStddev: number;
  modelSignalSpeedFraction: number;
  modelNodeLatency: number;
}

// this is what we get back from the Rust simulate call
export interface Simulation {
  n_nodes: number;
  n_epochs: number;
  h3_resolution: number;
  real_asserted_position_variance: number;
  real_channel_speed_min: number;
  real_channel_speed_max: number;
  real_latency_min: number;
  real_latency_max: number;
  model_distance_max: number;
  model_state_variance: number;
  model_measurement_variance: number;
  model_signal_speed_fraction: number;
  model_node_latency: number;
  nodes: Node[];
  stats: Stats,
}