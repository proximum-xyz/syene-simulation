/* tslint:disable */
/* eslint-disable */
/**
* @param {number} n_epochs
* @param {number} n_nodes
* @param {number} n_measurements
* @param {number} d_max
* @returns {any}
*/
export function run_simulation(n_epochs: number, n_nodes: number, n_measurements: number, d_max: number): any;
/**
*/
export class Location {
  free(): void;
/**
* @param {number} x
* @param {number} y
*/
  constructor(x: number, y: number);
/**
*/
  x: number;
/**
*/
  y: number;
}
/**
*/
export class Node {
  free(): void;
/**
*/
  asserted_location: Location;
/**
*/
  estimated_location: Location;
/**
*/
  true_location: Location;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_location_free: (a: number) => void;
  readonly __wbg_get_location_x: (a: number) => number;
  readonly __wbg_set_location_x: (a: number, b: number) => void;
  readonly __wbg_get_location_y: (a: number) => number;
  readonly __wbg_set_location_y: (a: number, b: number) => void;
  readonly location_new: (a: number, b: number) => number;
  readonly __wbg_node_free: (a: number) => void;
  readonly __wbg_get_node_true_location: (a: number) => number;
  readonly __wbg_set_node_true_location: (a: number, b: number) => void;
  readonly __wbg_get_node_asserted_location: (a: number) => number;
  readonly __wbg_set_node_asserted_location: (a: number, b: number) => void;
  readonly __wbg_get_node_estimated_location: (a: number) => number;
  readonly __wbg_set_node_estimated_location: (a: number, b: number) => void;
  readonly run_simulation: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
