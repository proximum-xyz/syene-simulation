import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CompilerParams, SimulationParamFields, SimulationParams } from '../types';
import { SectionHeader1, FormWrapper, FormField, Button, ProgressIndicator } from './SimulationFormComponents';

const defaultSimulationParams = {
  nNodes: 25,
  nMeasurements: 10,
  nEpochs: 250,
  h3Resolution: 7,
  // km
  assertedPositionStddev: 1000,
  // %c
  betaRange: [0.66, 0.99],
  // %c
  betaStddev: 0.1,
  // ms
  tauRange: [10, 30],
  // ms
  tauStddev: 1,
  // km
  messageDistanceMax: 13_000.0,
  // km
  modelPositionStddev: 100,
  // %c
  modelBeta: 0.85,
  // %c
  modelBetaStddev: 0.1,
  // ms
  modelTau: 15,
  // ms
  modelTauStddev: 1,
  // ms
  modelTofObservationStddev: 1
};


interface SimulationFormProps {
  runSimulation: (params: SimulationParams) => void;
  compilerParams: CompilerParams;
}

const SimulationForm: React.FC<SimulationFormProps> = ({
  runSimulation,
  compilerParams,
}) => {
  // set up the form including URL params if present 
  const { control, handleSubmit, watch } = useForm<SimulationParamFields>({
    // Compiler parameters cannot be changed in the form.
    defaultValues: { ...defaultSimulationParams as any, nMeasurements: compilerParams.n_measurements },
  });

  const [isSimulating, setIsSimulating] = useState(false);

  const onSubmit = async (params: SimulationParamFields) => {
    setIsSimulating(true);
    // wait for a bit to let the button update
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // convert all form string params to SI units: m, s, and variance. The form uses km, ms, and std dev!
      // TODO: rename, becauase the stddev variables are now 
      const betaRange = (params.betaRange as any as string[]).map(parseFloat) as [number, number];
      const tauRange = (params.tauRange as any as string[]).map(a => (parseFloat(a) / 1000)) as [number, number];

      const parsedParams: SimulationParams = {
        nNodes: parseInt(params.nNodes),
        nMeasurements: parseInt(params.nMeasurements),
        nEpochs: parseInt(params.nEpochs),
        h3Resolution: parseInt(params.h3Resolution),
        // accuracy of position assertions: convert km stddev to meters^2 variance
        assertedPositionVariance: (parseFloat(params.assertedPositionStddev) * 1000) ** 2,
        // fraction of a speed of light
        betaMin: betaRange[0],
        betaMax: betaRange[1],
        // convert std dev to variance
        betaVariance: parseFloat(params.betaStddev) ** 2,
        // convert ms to s
        tauMin: tauRange[0],
        tauMax: tauRange[1],
        // convert ms stddev to s variance
        tauVariance: (parseFloat(params.tauStddev) / 1000) ** 2,
        // convert km to meters
        messageDistanceMax: parseFloat(params.messageDistanceMax) * 1000,
        // convert km stdev to m variance
        modelPositionVariance: (parseFloat(params.modelPositionStddev) * 1000) ** 2,

        // initial model message speed as a fraction of the speed of light
        modelBeta: parseFloat(params.modelBeta),

        // model message speed variance: convert stddev to variance
        modelBetaVariance: parseFloat(params.modelBetaStddev) ** 2,
        // iniital model latency: convert ms to s
        modelTau: parseFloat(params.modelTau) / 1000,
        // conver ms stddev to s variance
        modelTauVariance: (parseFloat(params.modelTauStddev) / 1000) ** 2,
        // time of flight observation variance: convert ms stddev to s variance
        modelTofObservationVariance: (parseFloat(params.modelTofObservationStddev) / 1000) ** 2,
      };

      console.log('*** running simulation with params', { params, parsedParams });

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
        <FormField name='assertedPositionStddev' control={control} watch={watch} options={{ min: 0, max: 10000 }} />
        <FormField name='betaRange' control={control} watch={watch} options={{ min: 0, max: 1, step: 0.01, slider: true }} />
        {/* <FormField name='betaStddev' control={control} watch={watch} options={{ min: 0.01, max: 1, step: 0.01 }} /> */}
        <FormField name='tauRange' control={control} watch={watch} options={{ min: 0, max: 100, step: 0.001, slider: true }} />
        {/* <FormField name='tauStddev' control={control} watch={watch} options={{ min: 0.001, max: 10000, step: 0.001 }} /> */}
        <FormField name='messageDistanceMax' control={control} watch={watch} options={{ min: 100, max: 13000 }} />

        {/* <SectionHeader1>Model Parameters</SectionHeader1>
        <FormField name='modelPositionStddev' control={control} watch={watch} options={{ min: 0.0, step: 0.001 }} />
        <FormField name='modelBeta' control={control} watch={watch} options={{ min: 0, max: 1, step: 0.01 }} />
        <FormField name='modelBetaStddev' control={control} watch={watch} options={{ min: 0, max: 0.5, step: 0.01 }} />
        <FormField name='modelTau' control={control} watch={watch} options={{ min: 0, max: 100000, step: 0.001 }} />
        <FormField name='modelTauStddev' control={control} watch={watch} options={{ min: 0, max: 100000, step: 0.001 }} />
        <FormField name='modelTofObservationStddev' control={control} watch={watch} options={{ min: 0.0, step: 0.001 }} /> */}

        {isSimulating ? <ProgressIndicator /> : <Button type="submit" disabled={isSimulating}>Simulate</Button>}

      </form>
    </FormWrapper >
  );
};

export default SimulationForm;