import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CompilerParams, SimulationParams } from '../types';
import { SectionHeader1, FormWrapper, FormField, Button, ProgressIndicator } from './SimulationFormComponents';

type SimulationParamFields = {
  [k in keyof SimulationParams]: string;
}

export const defaultSimulationParams: SimulationParams = {
  nNodes: 2,
  nMeasurements: 10,
  nEpochs: 1,
  h3Resolution: 7,
  // km
  assertedPositionStddev: 100,
  // %c
  beta: [0.9, 0.9],
  // %c
  betaStddev: 0.01,
  // µs
  tau: [0, 0],
  // µs
  tauStddev: 0.01,
  // km
  messageDistanceMax: 13_000.0,
  // km
  modelPositionStddev: 1,
  // %c
  modelBeta: 0.9,
  // %c
  modelBetaStddev: 0.01,
  // µs
  modelTau: 1000,
  // µs
  modelTauStddev: 1000,
  // µs
  modelTofObservationStddev: 1
};


// export const defaultSimulationParams: SimulationParams = {
//   nNodes: 2,
//   nMeasurements: 10,
//   nEpochs: 1,
//   h3Resolution: 7,
//   // km
//   assertedPositionStddev: 100,
//   // %c
//   beta: [0.5, 0.7],
//   // %c
//   betaStddev: 0.1,
//   // µs
//   tau: [5000, 10000],
//   // µs
//   tauStddev: 10000,
//   // km
//   messageDistanceMax: 5_000.0,
//   // km
//   modelPositionStddev: 100,
//   // %c
//   modelBeta: 0.5,
//   // %c
//   modelBetaStddev: 0.2,
//   // µs
//   modelTau: 10000,
//   // µs
//   modelTauStddev: 5000,
//   // µs
//   modelTofObservationStddev: 1000
// };

interface SimulationFormProps {
  runSimulation: (params: SimulationParams) => void;
  compilerParams: CompilerParams;
}

const SimulationForm: React.FC<SimulationFormProps> = ({
  runSimulation,
  compilerParams,
}) => {
  // get simulation parameters from URL
  // const [searchParams, setSearchParams] = useSearchParams();

  // const loadURLParams = () => {
  //   const params = Object.fromEntries(searchParams.entries());
  //   return params as any as Partial<SimulationParamFields>;
  // };

  // const combineParams = (): SimulationParamFields => ({ ...defaultSimulationParams as any, nMeasurements: compilerParams.n_measurements, ...loadURLParams() })

  // set up the form including URL params if present 
  const { control, handleSubmit, watch } = useForm<SimulationParams>({
    // Compiler parameters cannot be changed in the form.
    defaultValues: { ...defaultSimulationParams as any, nMeasurements: compilerParams.n_measurements },
  });

  // run the simulation when the component loads
  // useEffect(() => {
  //   onSubmit({ ...defaultSimulationParams as any, nMeasurements: compilerParams.n_measurements });
  // }, [null]);

  const [isSimulating, setIsSimulating] = useState(false);

  const onSubmit = async (params: SimulationParamFields) => {
    setIsSimulating(true);
    // wait for a bit to let the button update
    await new Promise(resolve => setTimeout(resolve, 50));

    // this will lock up the thread: TODO: background
    try {
      const parsedParams: SimulationParams = {
        nNodes: parseInt(params.nNodes),
        nMeasurements: parseInt(params.nMeasurements),
        nEpochs: parseInt(params.nEpochs),
        h3Resolution: parseInt(params.h3Resolution),
        assertedPositionStddev: parseFloat(params.assertedPositionStddev),
        beta: (params.beta as any as string[]).map(parseFloat) as [number, number],
        betaStddev: parseFloat(params.betaStddev),
        tau: (params.tau as any as string[]).map(parseFloat) as [number, number],
        tauStddev: parseFloat(params.tauStddev),
        messageDistanceMax: parseFloat(params.messageDistanceMax),
        modelPositionStddev: parseFloat(params.modelPositionStddev),
        modelBeta: parseFloat(params.modelBeta),
        modelBetaStddev: parseFloat(params.modelBetaStddev),
        modelTau: parseFloat(params.modelTau),
        modelTauStddev: parseFloat(params.modelTauStddev),
        modelTofObservationStddev: parseFloat(params.modelTofObservationStddev),
      };
      runSimulation(parsedParams);
    } catch (e) {
      console.error(e);
      alert(e);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <FormWrapper>
      <h2>Proximum Simulation</h2>
      <form onSubmit={handleSubmit(onSubmit as any)}>
        <FormField name='nNodes' control={control} watch={watch} />
        <FormField name='nEpochs' control={control} watch={watch} />
        <FormField name='nMeasurements' control={control} watch={watch} options={{ readonly: true }} />

        <SectionHeader1>Physical Parameters</SectionHeader1>
        <FormField name='assertedPositionStddev' control={control} watch={watch} options={{ min: 0, max: 13000 }} />
        <FormField name='beta' control={control} watch={watch} options={{ min: 0, max: 1, step: 0.01, slider: true }} />
        <FormField name='betaStddev' control={control} watch={watch} options={{ min: 0.01, max: 1, step: 0.01 }} />
        <FormField name='tau' control={control} watch={watch} options={{ min: 0, max: 30000, slider: true }} />
        <FormField name='tauStddev' control={control} watch={watch} options={{ min: 0.01, max: 10000, step: 0.01 }} />
        <FormField name='messageDistanceMax' control={control} watch={watch} options={{ min: 10, max: 13000 }} />

        <SectionHeader1>Model Parameters</SectionHeader1>
        <FormField name='modelPositionStddev' control={control} watch={watch} options={{ min: 0.0, step: 0.001 }} />
        <FormField name='modelBeta' control={control} watch={watch} options={{ min: 0, max: 1, step: 0.01 }} />
        <FormField name='modelBetaStddev' control={control} watch={watch} options={{ min: 0, max: 0.5, step: 0.01 }} />
        <FormField name='modelTau' control={control} watch={watch} options={{ min: 0, max: 30000 }} />
        <FormField name='modelTauStddev' control={control} watch={watch} options={{ min: 0, max: 10000 }} />
        <FormField name='modelTofObservationStddev' control={control} watch={watch} options={{ min: 0.0, max: 10000, step: 1 }} />

        {isSimulating ? <ProgressIndicator /> : <Button type="submit" disabled={isSimulating}>Simulate</Button>}

      </form>
    </FormWrapper >
  );
};

export default SimulationForm;