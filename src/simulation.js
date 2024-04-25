export async function runSimulation(parameters) {
  const { run_simulation } = await import('../public/simulation.js');
  return run_simulation(
    parameters.nEpochs,
    parameters.nNodes,
    parameters.nMeasurements,
    parameters.dMax,
    // Pass other parameters
  );
}