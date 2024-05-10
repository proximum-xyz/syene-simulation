import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CompilerParams, SimulationParams } from '../types';
import { SectionHeader1, SectionHeader2, FormWrapper, FormField, Button, ProgressIndicator } from './SimulationFormComponents';
import styled from 'styled-components';

type SimulationParamFields = {
  [k in keyof SimulationParams]: string;
}

const defaultSimulationParams: SimulationParams = {
  nNodes: 25,
  nMeasurements: 1,
  nEpochs: 4,
  h3Resolution: 7,
  // km
  realAssertedPositionStddev: 100,
  // c
  realChannelSpeed: [0.7, 1],
  // µs
  realLatency: [20000, 30000],
  // km
  modelDistanceMax: 13_000.0,
  // km
  modelStateStddev: 0.1,
  // km
  modelMeasurementStddev: 0.1,
  // c
  modelSignalSpeedFraction: 0.85,
  // µs
  modelNodeLatency: 25000,
};

interface SimulationFormProps {
  runSimulation: (params: SimulationParams) => void;
  compilerParams: CompilerParams;
  initialParams?: SimulationParams;
}

const SimulationForm: React.FC<SimulationFormProps> = ({
  runSimulation,
  compilerParams,
}) => {
  const { control, handleSubmit, watch } = useForm<SimulationParams>({
    // Compiler parameters cannot be changed in the form.
    defaultValues: { ...defaultSimulationParams, nMeasurements: compilerParams.n_measurements },
  });

  const [isSimulating, setIsSimulating] = useState(false);

  const onSubmit = async (params: SimulationParamFields) => {
    setIsSimulating(true);
    // wait for a bit to let the button update
    await new Promise(resolve => setTimeout(resolve, 50));

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