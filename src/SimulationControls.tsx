import React, { Dispatch, SetStateAction } from 'react';
import { useForm, Controller } from 'react-hook-form';
import styled from 'styled-components';

export interface SimulationParams {
  h3Resolution: number;
  nNodes: number;
  realChannelSpeedMin: number;
  realChannelSpeedMax: number;
  realLatencyMin: number;
  realLatencyMax: number;
  modelDistanceMax: number;
  modelStateNoiseScale: number;
  modelMeasurementVariance: number;
  modelSignalSpeedFraction: number;
  modelNodeLatency: number;
  nEpochs: number;
  nMeasurements: number;
}

const defaultSimulationParams: SimulationParams = {
  h3Resolution: 7,
  nNodes: 100,
  realChannelSpeedMin: 0.7,
  realChannelSpeedMax: 1.0,
  realLatencyMin: 10.0,
  realLatencyMax: 50.0,
  modelDistanceMax: 1000_000_000.0,
  modelStateNoiseScale: 0.1,
  modelMeasurementVariance: 1.0,
  modelSignalSpeedFraction: 0.8,
  modelNodeLatency: 20.0,
  nEpochs: 1,
  nMeasurements: 10,
}

const ControlsWrapper = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Button = styled.button`
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

const SimulationControls = ({ runSimulation }: { runSimulation: (params: SimulationParams) => void }) => {
  const { control, handleSubmit } = useForm({
    defaultValues: defaultSimulationParams,
  });

  const onSubmit = (params: SimulationParams) => {
    const parsedParams: SimulationParams = Object.fromEntries(
      Object.entries(params).map(([key, value]) => {
        const parsedValue = ['nNodes', 'nEpochs', 'nMeasurements'].includes(key) ? parseInt(value as string) : parseFloat(value as string);
        return [key, parsedValue];
      })
    ) as unknown as SimulationParams;

    console.log('***', { parsedParams });
    runSimulation(parsedParams);
    console.log('*** sim done', {});
  };

  return (
    <ControlsWrapper>
      <h3>Simulation Parameters</h3>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormGroup>
          <Label>H3 Resolution:</Label>
          <Controller
            name="h3Resolution"
            control={control}
            render={({ field }) => <Input type="number" {...field} />}
          />
        </FormGroup>
        <FormGroup>
          <Label>Number of Nodes:</Label>
          <Controller
            name="nNodes"
            control={control}
            render={({ field }) => <Input type="number" {...field} />}
          />
        </FormGroup>
        <FormGroup>
          <Label>Real Channel Speed Min:</Label>
          <Controller
            name="realChannelSpeedMin"
            control={control}
            render={({ field }) => <Input type="number" step="0.1" {...field} />}
          />
        </FormGroup>
        <FormGroup>
          <Label>Real Channel Speed Max:</Label>
          <Controller
            name="realChannelSpeedMax"
            control={control}
            render={({ field }) => <Input type="number" step="0.1" {...field} />}
          />
        </FormGroup>
        <FormGroup>
          <Label>Real Latency Min:</Label>
          <Controller
            name="realLatencyMin"
            control={control}
            render={({ field }) => <Input type="number" step="0.1" {...field} />}
          />
        </FormGroup>
        <FormGroup>
          <Label>Real Latency Max:</Label>
          <Controller
            name="realLatencyMax"
            control={control}
            render={({ field }) => <Input type="number" step="0.1" {...field} />}
          />
        </FormGroup>
        <FormGroup>
          <Label>Model State Noise Scale:</Label>
          <Controller
            name="modelStateNoiseScale"
            control={control}
            render={({ field }) => <Input type="number" step="0.1" {...field} />}
          />
        </FormGroup>
        <FormGroup>
          <Label>Model Measurement Variance:</Label>
          <Controller
            name="modelMeasurementVariance"
            control={control}
            render={({ field }) => <Input type="number" step="0.1" {...field} />}
          />
        </FormGroup>
        <FormGroup>
          <Label>Model Signal Speed Fraction:</Label>
          <Controller
            name="modelSignalSpeedFraction"
            control={control}
            render={({ field }) => <Input type="number" step="0.1" {...field} />}
          />
        </FormGroup>
        <FormGroup>
          <Label>Model Node Latency:</Label>
          <Controller
            name="modelNodeLatency"
            control={control}
            render={({ field }) => <Input type="number" step="0.1" {...field} />}
          />
        </FormGroup>
        <Button type="submit">Simulate</Button>
      </form>
    </ControlsWrapper>
  );
};

export default SimulationControls;