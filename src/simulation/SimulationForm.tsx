import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CompilerParams, SimulationParams } from '../types';
import { SectionHeader1, FormWrapper, FormField, Button, ProgressIndicator } from './SimulationFormComponents';

type SimulationParamFields = {
  [k in keyof SimulationParams]: string;
}

export const defaultSimulationParams: SimulationParams = {
  nNodes: 100,
  nMeasurements: 10,
  nEpochs: 25,
  h3Resolution: 7,
  // km
  realAssertedPositionStddev: 100,
  // c
  realChannelSpeed: [0.5, 0.7],
  // µs
  realLatency: [5000, 10000],
  // km
  modelDistanceMax: 5_000.0,
  // km
  modelStateStddev: 10,
  // km
  modelMeasurementStddev: 1000,
  // c
  modelSignalSpeedFraction: 0.6,
  // µs
  modelNodeLatency: 15000,
};

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
        realAssertedPositionStddev: parseFloat(params.realAssertedPositionStddev),
        realChannelSpeed: (params.realChannelSpeed as any as string[]).map(parseFloat) as [number, number],
        realLatency: (params.realLatency as any as string[]).map(parseFloat) as [number, number],
        modelDistanceMax: parseFloat(params.modelDistanceMax),
        modelStateStddev: parseFloat(params.modelStateStddev),
        modelMeasurementStddev: parseFloat(params.modelMeasurementStddev),
        modelSignalSpeedFraction: parseFloat(params.modelSignalSpeedFraction),
        modelNodeLatency: parseFloat(params.modelNodeLatency),
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
        <FormField name='realAssertedPositionStddev' control={control} watch={watch} options={{ min: 0, max: 13000 }} />
        <FormField name='realChannelSpeed' control={control} watch={watch} options={{ min: 0, max: 1, step: 0.01, slider: true }} />
        <FormField name='realLatency' control={control} watch={watch} options={{ min: 0, max: 30000, slider: true }} />
        <FormField name='modelDistanceMax' control={control} watch={watch} options={{ min: 10, max: 13000 }} />

        <SectionHeader1>Model Parameters</SectionHeader1>
        <FormField name='modelSignalSpeedFraction' control={control} watch={watch} options={{ min: 0, max: 1, step: 0.01 }} />
        <FormField name='modelNodeLatency' control={control} watch={watch} options={{ min: 0, max: 30000 }} />
        <FormField name='modelStateStddev' control={control} watch={watch} options={{ min: 0.0, step: 0.001 }} />
        <FormField name='modelMeasurementStddev' control={control} watch={watch} options={{ min: 0.0, step: 0.001 }} />

        {isSimulating ? <ProgressIndicator /> : <Button type="submit" disabled={isSimulating}>Simulate</Button>}

      </form>
    </FormWrapper >
  );
};

export default SimulationForm;