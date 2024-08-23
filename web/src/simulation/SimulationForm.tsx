import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CompilerParams, SimulationParamFields, SimulationConfig } from '../types';
import { FormField, HelpTextPopup, titleTexts, helpTexts } from './SimulationFormComponents';

const defaultSimulationConfig = {
  nNodes: 100,
  nMeasurements: 10,
  nEpochs: 100,
  h3Resolution: 7,
  // km
  assertedPositionStddev: 1000,
  // %c
  betaRange: [0.2, 0.8],
  // %c
  betaStddev: 0.001,
  // ms
  tauRange: [2, 30],
  // ms
  tauStddev: 1,
  // km
  messageDistanceMax: 13_000.0,
  // km
  modelPositionStddev: 10,
  // %c
  modelBeta: 0.5,
  // %c
  modelBetaStddev: 0.001,
  // ms
  modelTau: 15,
  // ms
  modelTauStddev: 0.01,
  // ms
  modelTofObservationStddev: 1,
  // count
  leastSquaresIterations: 1,
};


interface SimulationFormProps {
  runSimulation: (params: SimulationConfig) => void;
  resetSimulation: (params: SimulationConfig) => void;
  compilerParams: CompilerParams;
  progress: number;
}

const SimulationForm: React.FC<SimulationFormProps> = ({
  runSimulation,
  resetSimulation,
  compilerParams,
  progress
}) => {
  // set up the form including URL params if present 
  const { control, handleSubmit, watch } = useForm<SimulationParamFields>({
    // Compiler parameters cannot be changed in the form.
    defaultValues: { ...defaultSimulationConfig as any, nMeasurements: compilerParams.n_measurements },
  });

  const [canEditForm, setCanEditForm] = useState(true);
  const [hasSimulated, setHasSimulated] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHelp, setShowHelp] = useState<keyof SimulationParamFields>();

  const parseFields = (params: SimulationParamFields): SimulationConfig => {
    // convert all form string params to SI units: m, s, and variance. The form uses km, ms, and std dev!
    // TODO: rename, becauase the stddev variables are now 
    const betaRange = (params.betaRange as any as string[]).map(parseFloat) as [number, number];
    const tauRange = (params.tauRange as any as string[]).map(a => (parseFloat(a) / 1000)) as [number, number];

    const parsedParams: SimulationConfig = {
      n_nodes: parseInt(params.nNodes),
      // n_measurements: parseInt(params.nMeasurements),
      n_epochs: parseInt(params.nEpochs),
      h3_resolution: parseInt(params.h3Resolution),
      // accuracy of position assertions: convert km stddev to meters^2 variance
      asserted_position_variance: (parseFloat(params.assertedPositionStddev) * 1000) ** 2,
      // fraction of a speed of light
      beta_min: betaRange[0],
      beta_max: betaRange[1],
      // convert std dev to variance
      beta_variance: parseFloat(params.betaStddev) ** 2,
      // convert ms to s
      tau_min: tauRange[0],
      tau_max: tauRange[1],
      // convert ms stddev to s variance
      tau_variance: (parseFloat(params.tauStddev) / 1000) ** 2,
      // convert km to meters
      message_distance_max: parseFloat(params.messageDistanceMax) * 1000,

      // least squares parameters
      ls_model_beta: parseFloat(params.modelBeta),
      // convert ms to s
      ls_model_tau: parseFloat(params.modelTau) / 1000,
      ls_iterations: parseFloat(params.leastSquaresIterations),
      ls_tolerance: 1,
      // convert km stdev to m variance
      kf_model_position_variance: (parseFloat(params.modelPositionStddev) * 1000) ** 2,

      // initial model message speed as a fraction of the speed of light
      kf_model_beta: parseFloat(params.modelBeta),

      // model message speed variance: convert stddev to variance
      kf_model_beta_variance: parseFloat(params.modelBetaStddev) ** 2,
      // iniital model latency: convert ms to s
      kf_model_tau: parseFloat(params.modelTau) / 1000,
      // conver ms stddev to s variance
      kf_model_tau_variance: (parseFloat(params.modelTauStddev) / 1000) ** 2,
      // time of flight observation variance: convert ms stddev to s variance
      kf_model_tof_observation_variance: (parseFloat(params.modelTofObservationStddev) / 1000) ** 2,
    };

    return parsedParams;
  }

  const onSubmit = async (formFields: SimulationParamFields) => {
    setIsSimulating(true);
    setHasSimulated(true);
    // once a simulation has started the form fields will not cause any effects until the simulation is reset
    setCanEditForm(false);
    // wait for a bit to let the button update
    await new Promise(resolve => setTimeout(resolve, 10));

    const parsedParams = parseFields(formFields);

    try {
      console.log('*** running simulation with params', { formFields, parsedParams });

      await runSimulation(parsedParams);
    } catch (e) {
      console.error(e);
      alert(e);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetSimulation = () => {
    setCanEditForm(true);
    const currentParams = watch();
    const config: SimulationConfig = parseFields(currentParams);
    resetSimulation(config);
  };

  return (
    <div className="bg-gray-900 bg-opacity-80 p-4 rounded-lg shadow-lg text-white w-full">
      <h2 className="text-xl font-bold mb-2">Proximum Simulation</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <FormField name='nNodes' control={control} watch={watch} setShowHelp={setShowHelp} disabled={!canEditForm} options={{ min: parseInt(compilerParams.n_measurements) + 1 }} />
          <FormField name='nEpochs' control={control} watch={watch} setShowHelp={setShowHelp} disabled={!canEditForm} options={{ min: 1, max: 10000 }} />
        </div>
        {/* <FormField name='nMeasurements' control={control} watch={watch} setShowHelp={setShowHelp} options={{ readonly: true }} disabled={!canEditForm} /> */}


        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-custom-blue hover:text-custom-blue/80 transition-colors duration-150 ease-in-out mt-2 focus:outline-none"
        >
          {showAdvanced ? '▲ Hide Advanced' : '▼ Show Advanced'}
        </button>

        {showAdvanced && (
          <>
            <h3 className="text-lg font-semibold mt-2 mb-1 text-white/60">Physical Parameters</h3>
            <div className="grid grid-cols-2 gap-2">
              <FormField name='assertedPositionStddev' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0, max: 10000 }} disabled={!canEditForm} />
              <FormField name='messageDistanceMax' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 100, max: 13000 }} disabled={!canEditForm} />
            </div>
            <FormField name='betaRange' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0, max: 1, step: 0.01, slider: true }} disabled={!canEditForm} />
            <FormField name='tauRange' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0, max: 100, step: 0.001, slider: true }} disabled={!canEditForm} />

            <h3 className="text-lg font-semibold mt-2 mb-1 text-white/60">Estimation Parameters</h3>
            <div className="grid grid-cols-2 gap-2">
              <FormField name='modelTau' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0, max: 100000, step: 0.001 }} disabled={!canEditForm} />
              <FormField name='modelBeta' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0, max: 1, step: 0.01 }} disabled={!canEditForm} />
            </div>
          </>
        )}

        <div className="flex items-center justify-between mt-4 space-x-2">
          <button
            type="submit"
            disabled={isSimulating}
            className={`
              px-3 py-1 rounded text-sm font-medium transition-all duration-150 ease-in-out
              ${isSimulating
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'text-custom-green hover:text-custom-green/80 border-custom-green hover:border-custom-green/80 border'
              }
            `}
          >
            {isSimulating ? 'Simulating...' : 'Run Simulation'}
          </button>
          {hasSimulated && (
            <button
              type="button"
              disabled={isSimulating}
              onClick={handleResetSimulation}
              className={`
                px-3 py-1 rounded text-sm font-medium transition-all duration-150 ease-in-out
                ${isSimulating
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : ' text-custom-pink hover:text-custom-pink/80 border border-custom-pink hover:border-custom-pink/80'
                }
              `}
            >
              Reset
            </button>
          )}
        </div>
        {isSimulating && (
          <div className="mt-2 bg-gray-700 rounded-full h-2">
            <div className="bg-custom-green h-2 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </form>
      {showHelp && (
        <HelpTextPopup
          title={titleTexts[showHelp]}
          content={helpTexts[showHelp]}
          onClose={() => setShowHelp(undefined)}
        />
      )}
    </div>
  );
};

export default SimulationForm;