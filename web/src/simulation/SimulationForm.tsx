import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CompilerParams, SimulationParamFields, SimulationConfig } from '../types';
import { SectionHeader1, FormWrapper, FormField, Button, ProgressIndicator, HelpTextPopup, HelpTextTitle, HelpTextContent, CloseButton, titleTexts, helpTexts } from './SimulationFormComponents';

import ReactMarkdown from 'react-markdown';

const defaultSimulationConfig = {
  nNodes: 25,
  nMeasurements: 10,
  nEpochs: 10,
  h3Resolution: 7,
  // km
  assertedPositionStddev: 100,
  // %c
  betaRange: [0.99, 1.00],
  // %c
  betaStddev: 0.001,
  // ms
  tauRange: [0, 1],
  // ms
  tauStddev: 1,
  // km
  messageDistanceMax: 13_000.0,
  // km
  modelPositionStddev: 10,
  // %c
  modelBeta: 0.99,
  // %c
  modelBetaStddev: 0.001,
  // ms
  modelTau: 0,
  // ms
  modelTauStddev: 0.01,
  // ms
  modelTofObservationStddev: 1
};


interface SimulationFormProps {
  runSimulation: (params: SimulationConfig) => void;
  compilerParams: CompilerParams;
}

const SimulationForm: React.FC<SimulationFormProps> = ({
  runSimulation,
  compilerParams,
}) => {
  // set up the form including URL params if present 
  const { control, handleSubmit, watch } = useForm<SimulationParamFields>({
    // Compiler parameters cannot be changed in the form.
    defaultValues: { ...defaultSimulationConfig as any, nMeasurements: compilerParams.n_measurements },
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [showHelp, setShowHelp] = useState<keyof SimulationParamFields>();

  const onSubmit = async (params: SimulationParamFields) => {
    setIsSimulating(true);
    // wait for a bit to let the button update
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
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
        ls_model_beta: 0.01,
        ls_model_tau: 0.01,
        ls_tolerance: 1,
        ls_iterations: 10,
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
        <FormField name='nNodes' control={control} watch={watch} setShowHelp={setShowHelp} />
        <FormField name='nEpochs' control={control} watch={watch} setShowHelp={setShowHelp} />
        <FormField name='nMeasurements' control={control} watch={watch} setShowHelp={setShowHelp} options={{ readonly: true }} />

        <SectionHeader1>Physical Parameters</SectionHeader1>
        <FormField name='assertedPositionStddev' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0, max: 10000 }} />
        <FormField name='betaRange' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0, max: 1, step: 0.01, slider: true }} />
        {/* <FormField name='betaStddev' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0.01, max: 1, step: 0.01 }} /> */}
        <FormField name='tauRange' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0, max: 100, step: 0.001, slider: true }} />
        {/* <FormField name='tauStddev' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0.001, max: 10000, step: 0.001 }} /> */}
        <FormField name='messageDistanceMax' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 100, max: 13000 }} />

        {/* <SectionHeader1>Model Parameters</SectionHeader1>
        <FormField name='modelPositionStddev' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0.0, step: 0.001 }} />
        <FormField name='modelBeta' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0, max: 1, step: 0.01 }} />
        <FormField name='modelBetaStddev' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0, max: 0.5, step: 0.01 }} />
        <FormField name='modelTau' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0, max: 100000, step: 0.001 }} />
        <FormField name='modelTauStddev' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0, max: 100000, step: 0.001 }} />
        <FormField name='modelTofObservationStddev' control={control} watch={watch} setShowHelp={setShowHelp} options={{ min: 0.0, step: 0.001 }} /> */}

        {isSimulating ? <ProgressIndicator /> : <Button type="submit" disabled={isSimulating}>Simulate</Button>}

      </form>
      {showHelp && <HelpTextPopup>
        <HelpTextTitle>{titleTexts[showHelp]}</HelpTextTitle>
        <HelpTextContent>
          <ReactMarkdown>
            {helpTexts[showHelp] + "\n\nSee the [Proximum lightpaper](https://www.proximum.xyz/proximum-lightpaper.pdf) for more information."}
          </ReactMarkdown>
        </HelpTextContent>
        <CloseButton onClick={() => setShowHelp(undefined)}>Close</CloseButton>
      </HelpTextPopup>
      }
    </FormWrapper >
  );
};

export default SimulationForm;