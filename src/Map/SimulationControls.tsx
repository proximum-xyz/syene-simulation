import React, { useState } from 'react';
import { useForm, Controller, set } from 'react-hook-form';
import styled from 'styled-components';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import ReactMarkdown from 'react-markdown';
import { time } from 'console';

export interface SimulationParams {
  h3Resolution: number;
  realChannelSpeed: [number, number];
  realLatency: [number, number];
  modelDistanceMax: number;
  modelStateNoiseScale: number;
  modelMeasurementVariance: number;
  modelSignalSpeedFraction: number;
  modelNodeLatency: number;
  nEpochs: number;
}

const defaultSimulationParams: SimulationParams = {
  h3Resolution: 7,
  // c
  realChannelSpeed: [0.7, 1],
  // µs
  realLatency: [20000, 30000],
  // km
  modelDistanceMax: 1_000_000.0,
  // m²
  modelStateNoiseScale: 0.1,
  // m²
  modelMeasurementVariance: 1.0,
  // c
  modelSignalSpeedFraction: 0.85,
  // µs
  modelNodeLatency: 25000,
  nEpochs: 1,
};

const ControlsWrapper = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #1f1f1f;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  color: #ffffff;
  max-width: 300px;
  width: 100%;
  box-sizing: border-box;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
`;

const ReadOnlyValue = styled.div`
  padding: 6px 12px;
  background-color: #222222;
  border-radius: 4px;
  color: #ffffff;
  cursor: default !important;
`;

const Input = styled.input`
  width: 100%;
  padding: 6px 12px;
  border: 1px solid #555555;
  border-radius: 4px;
  background-color: #333333;
  color: #ffffff;
  box-sizing: border-box;
`;

const Button = styled.button`
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

const HelpIcon = styled.span`
  margin-left: 5px;
  cursor: pointer;
  color: #007bff;
`;

const SliderWrapper = styled.div`
  margin-top: 8px;
`;

const SliderInput = styled.input`
  width: 90%;
  padding: 4px;
  border: 1px solid #555555;
  border-radius: 4px;
  background-color: #333333;
  color: #ffffff;
  box-sizing: border-box;
  margin-left: 8px;
`;

const SectionHeader = styled.h4`
  font-size: 1rem;
  margin-top: 24px;
  margin-bottom: 16px;
  color: #bbbbbb;
`;

const HelpTextPopup = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #1f1f1f;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  color: #ffffff;
  max-width: 400px;
  width: 100%;
  box-sizing: border-box;
`;

const HelpTextTitle = styled.h4`
  margin-top: 0;
`;

const HelpTextContent = styled.p`
  margin-bottom: 0;
`;

const CloseButton = styled.button`
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 16px;
`;

const ProgressIndicator = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #007bff;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
  margin-left: 8px;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const CustomSlider = styled(Slider)`
  .rc-slider-rail {
    background-color: #444444;
  }

  .rc-slider-track {
    background-color: #1e88e5;
  }

  .rc-slider-handle {
    border-color: #1e88e5;
    background-color: #1e88e5;
  }

  .rc-slider-handle:hover {
    border-color: #1565c0;
  }

  .rc-slider-handle:active {
    border-color: #1565c0;
    box-shadow: 0 0 5px #1565c0;
  }
`;

const SliderInputWrapper = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

interface SimulationControlsProps {
  runSimulation: (params: SimulationParams) => void;
  nNodes: number;
  nMeasurements: number;
}


type FieldKeys = keyof SimulationParams | 'nNodes' | 'nMeasurements';

type FormDescriptor = {
  [key in FieldKeys]: string;
};

const titleTexts: FormDescriptor = {
  nNodes: 'Nodes',
  nMeasurements: 'Measurements',
  h3Resolution: 'H3 Resolution',
  realChannelSpeed: 'Real Message Speed (c)',
  realLatency: 'Real Latency (µs)',
  modelDistanceMax: 'Message Range (km)',
  modelStateNoiseScale: 'Estimator State Variance (m²)',
  modelMeasurementVariance: 'Estimator Measurement Variance (m²)',
  modelSignalSpeedFraction: 'Estimator Message Speed (c)',
  modelNodeLatency: 'Estimator Latency (c)',
  nEpochs: 'Epochs',
}

const helpTexts: FormDescriptor = {
  nNodes: `
  The number of nodes participating in the simulation.
  
  Each node asserts a unique position and measures distances to other nodes using a trustless time-of-flight algorithm.

  Increasing the number of nodes improves position accuracy and computational difficulty.

  This parameter is set during compilation and cannot be changed here currently.
  `,
  nMeasurements: `
  The number of distance measurements between node pairs used within each position estimation.
  
  Increasing the number of measurements improves position accuracy and computational difficulty.

  This parameter is set during compilation and cannot be changed here currently.
  `,
  h3Resolution: `
  The resolution of the H3 grid used by nodes asserting a position. Explore H3 resolutions [here](https://wolf-h3-viewer.glitch.me/).
  `,
  realChannelSpeed: `
  Nodes send each other messages to measure distances. These messages propagate at different speeds depending on the communication medium. This simulation draws each message speed from a uniform distribution over the specified range.
  
  General message speeds (c = speed of light) are as follows:
  * General IP networks: ~0.1c
  * fiber: 0.66c
  * copper: 0.66c
  * radio: 0.99c
  * microwave: 0.99c.
  * laser: 0.99c
  
  As the Proximum network matures, ASICs using EM communication channels may push average message speeds toward the upper bound of 1c. Proximum models message speed as a constant value internally (see the *Model Message Speed* parameter). This value may increase over time to incentivize nodes to improve message speed and position resolution.
  `,
  realLatency: `
  Nodes take time to process and respond to messages beyond the raw message propagation time. This simulation draws node latency from a uniform distribution over the specified range.

  Reference latencies:
  * General IP networks: 20,000-40,000 µs
  * High frequency trading: 1-10 µs
  
  As the Proximum network matures, ASICs may push latencies toward a lower bound of ~1 µs. Proximum models latency as a constant value internally (see the *Latency* parameter) which may drop over time to incentivize nodes to improve latency and position resolution.
  `,
  modelDistanceMax: `
  Nodes can only reach other nodes within this range (e.g. because radio signals only travel so far). Set it to a value > 13,000 km to simulate all nodes being able to reach each other.
  `,
  modelStateNoiseScale: `
  Proximum models all nodes as stationary but its confidence in the position of each node decreases over time (until new distance measurements are made). This parameter controls the rate at which the confidence decreases.

  This state noise variance is added to the estimated state of the node positions within the Extended Kalman Filter at each epoch.  
  `,
  modelMeasurementVariance: `
  Proximum models distance measurements as noisy but unbiased.
  
  This parameter controls the amount of noise added to the true distance measurements: more noise means measurements are less reliable.

  This measurement variance is added to distance measurements within the Extended Kalman Filter measurement update.`,
  modelSignalSpeedFraction: `
  This parameter controls how Proximum will estimate the distance between nodes based on node response time.

  It should be a value within the range of the *Real Message Speed* parameter.

  Proximum models message propagation speed within the network as a constant fraction of the speed of light when estimating distances within the Extended Kalman Filter.
  `,
  modelNodeLatency: `
  This parameter controls how Proximum will estimate the distance between nodes based on node response time.
  
  It should be a value within the range of the *Real Latency* parameter.

  Proximum models node latency as a constant value when estimating distances within the Extended Kalman Filter.
  `,
  nEpochs: `
  The number of epochs for which to run the simulation.
  
  Each epoch consists of a set of distance measurements defined by the *Measurements* parameter and a position estimation step. Increasing the number of epochs improves position accuracy but also increases computational difficulty.

  You can think of each epoch as a single block on the blockchain (although in practice they may not map 1:1).
  `,
};

const SimulationControls: React.FC<SimulationControlsProps> = ({
  runSimulation,
  nNodes,
  nMeasurements,
}) => {
  const { control, handleSubmit, watch } = useForm({
    defaultValues: defaultSimulationParams,
  });

  const [isSimulating, setIsSimulating] = useState(false);

  const [helpParameterName, setHelpParameterName] = useState<FieldKeys | null>(null);

  const onSubmit = async (params: SimulationParams) => {
    setIsSimulating(true);
    runSimulation(params);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSimulating(false);
  };

  const showHelpText = (parameterName: FieldKeys) => {
    // Implement help text display logic here
    // const text = helpTexts[parameterName];
    setHelpParameterName(parameterName);
  };

  const closeHelpText = () => {
    setHelpParameterName(null);
  };

  const renderSliderInput = (name: keyof SimulationParams, min: number, max: number, step: number) => {
    const [minValue, maxValue] = watch(name) as any;
    return (
      <>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <SliderWrapper>
              <CustomSlider
                range
                min={min}
                max={max}
                step={step}
                value={[minValue, maxValue]}
                onChange={field.onChange}
              />
              <SliderInputWrapper>
                <SliderInput
                  type="number"
                  min={min}
                  max={maxValue}
                  step={step}
                  value={minValue}
                  onChange={(e) => {
                    const newMinValue = parseFloat(e.target.value);
                    if (newMinValue >= min) {
                      field.onChange([newMinValue, maxValue]);
                    }
                  }}
                />
                <SliderInput
                  type="number"
                  min={minValue}
                  max={max}
                  step={step}
                  value={maxValue}
                  onChange={(e) => {
                    const newMaxValue = parseFloat(e.target.value);
                    if (newMaxValue <= max) {
                      field.onChange([minValue, newMaxValue]);
                    }
                  }}
                />
              </SliderInputWrapper>
            </SliderWrapper>
          )}
        />
      </>
    );
  };

  return (
    <>
      <ControlsWrapper>
        <h2>Proximum Simulation</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label>
              {titleTexts['nEpochs']}
              <HelpIcon onClick={() => showHelpText('nEpochs')}>&#9432;</HelpIcon>
            </Label>
            <Controller
              name="nEpochs"
              control={control}
              render={({ field }) => <Input type="number" step="1" {...field} />}
            />
          </FormGroup>

          <SectionHeader>Physical Parameters</SectionHeader>
          <FormGroup>
            <Label>
              {titleTexts['nNodes']}
              <HelpIcon onClick={() => showHelpText('nNodes')}>&#9432;</HelpIcon>
            </Label>
            <ReadOnlyValue>{nNodes}</ReadOnlyValue>
          </FormGroup>
          <FormGroup>
            <Label>
              {titleTexts['nMeasurements']}
              <HelpIcon onClick={() => showHelpText('nMeasurements')}>&#9432;</HelpIcon>
            </Label>
            <ReadOnlyValue>{nMeasurements}</ReadOnlyValue>
          </FormGroup>
          {/* <FormGroup>
            <Label>
              {titleTexts['h3Resolution']}
              <HelpIcon onClick={() => showHelpText('h3Resolution')}>&#9432;</HelpIcon>
            </Label>
            <Controller
              name="h3Resolution"
              control={control}
              render={({ field }) => <Input type="number" step="1" {...field} />}
            />
          </FormGroup> */}
          <FormGroup>
            <Label>
              {titleTexts['realChannelSpeed']}
              <HelpIcon onClick={() => showHelpText('realChannelSpeed')}>&#9432;</HelpIcon>
            </Label>
            {renderSliderInput('realChannelSpeed', 0.1, 1, 0.01)}
          </FormGroup>
          <FormGroup>
            <Label>
              {titleTexts['realLatency']}
              <HelpIcon onClick={() => showHelpText('realLatency')}>&#9432;</HelpIcon>
            </Label>
            {renderSliderInput('realLatency', 0, 30000, 1)}
          </FormGroup>
          <FormGroup>
            <Label>
              {titleTexts['modelDistanceMax']}
              <HelpIcon onClick={() => showHelpText('modelDistanceMax')}>&#9432;</HelpIcon>
            </Label>
            <Controller
              name="modelDistanceMax"
              control={control}
              render={({ field }) => <Input type="number" step="1" {...field} />}
            />
          </FormGroup>

          <SectionHeader>Model Parameters</SectionHeader>

          <FormGroup>
            <Label>
              {titleTexts['modelSignalSpeedFraction']}
              <HelpIcon onClick={() => showHelpText('modelSignalSpeedFraction')}>&#9432;</HelpIcon>
            </Label>
            <Controller
              name="modelSignalSpeedFraction"
              control={control}
              render={({ field }) => <Input type="number" step="0.1" {...field} />}
            />
          </FormGroup>
          <FormGroup>
            <Label>
              {titleTexts['modelNodeLatency']}
              <HelpIcon onClick={() => showHelpText('modelNodeLatency')}>&#9432;</HelpIcon>
            </Label>
            <Controller
              name="modelNodeLatency"
              control={control}
              render={({ field }) => <Input type="number" step="0.1" {...field} />}
            />
          </FormGroup>

          <FormGroup>
            <Label>
              {titleTexts['modelStateNoiseScale']}
              <HelpIcon onClick={() => showHelpText('modelStateNoiseScale')}>&#9432;</HelpIcon>
            </Label>
            <Controller
              name="modelStateNoiseScale"
              control={control}
              render={({ field }) => <Input type="number" step="0.1" {...field} />}
            />
          </FormGroup>
          <FormGroup>
            <Label>
              {titleTexts['modelMeasurementVariance']}
              <HelpIcon onClick={() => showHelpText('modelMeasurementVariance')}>&#9432;</HelpIcon>
            </Label>
            <Controller
              name="modelMeasurementVariance"
              control={control}
              render={({ field }) => <Input type="number" step="0.1" {...field} />}
            />
          </FormGroup>

          {isSimulating ? <ProgressIndicator /> : <Button type="submit" disabled={isSimulating}>Simulate</Button>}

        </form>
      </ControlsWrapper>
      {helpParameterName && (
        <HelpTextPopup>
          <HelpTextTitle>{titleTexts[helpParameterName]}</HelpTextTitle>
          <HelpTextContent>
            <ReactMarkdown>
              {helpTexts[helpParameterName] + "\n\nSee the [Proximum lightpaper](https://www.proximum.xyz/proximum-lightpaper.pdf) for more information."}
            </ReactMarkdown>
          </HelpTextContent>
          <CloseButton onClick={closeHelpText}>Close</CloseButton>
        </HelpTextPopup>
      )}
    </>
  );
};

export default SimulationControls;