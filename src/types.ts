export interface WGS84 {
  latitude: number;
  longitude: number;
  altitude: number;
}

export interface CompileParameters {
  n_nodes: number;
  n_measurements: number;
}

export interface Node {
  id: number;
  true_index: number;
  asserted_index: number;
  estimated_index: number;
  true_position: [number, number, number];
  estimated_position: [number, number, number];
  true_wgs84: WGS84;
  estimated_wgs84: WGS84;
  channel_speed: number;
  latency: number;
}

export interface Stats {
  rms_error: number[];
}

export interface Simulation {
  nodes: Node[];
  h3_resolution: number;
  real_channel_speed_min: number;
  real_channel_speed_max: number;
  real_latency_min: number;
  real_latency_max: number;
  model_distance_max: number;
  model_state_variance: number;
  model_measurement_variance: number;
  model_signal_speed_fraction: number;
  model_node_latency: number;
  stats: Stats,
  n_epochs: number;
}