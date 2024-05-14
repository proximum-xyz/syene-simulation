
import React, { useState } from 'react';
import { COLORS, SimulationParams } from '../types';
import styled from 'styled-components';
import Slider from 'rc-slider';
import { Controller, Control, UseFormWatch } from 'react-hook-form';
import ReactMarkdown from 'react-markdown';
import 'rc-slider/assets/index.css';

type FieldKeys = keyof SimulationParams;

type FormDescriptor = {
  [x in FieldKeys]: string;
};

export const SectionHeader1 = styled.h4`
  font-size: 1rem;
  margin-top: 16px;
  margin-bottom: 8px;
  color: #00ff9f;
`;


export const SectionHeader2 = styled.h4`
  font-size: 1rem;
  margin-top: 16px;
  margin-bottom: 8px;
  color: #ff4081;
`;

export const FormWrapper = styled.div`
  background-color: #1f1f1fdd;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  color: #ffffff;
  max-width: 300px;
  width: 100%;
  box-sizing: border-box;
`;

export const Button = styled.button`
  padding: 6px 12px;
  background-color: ${COLORS.pink};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

export const ProgressIndicator = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #ff4081;
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

const FormGroup = styled.div`
  margin-bottom: 12px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 4px;
  font-weight: bold;
  color: #ffffff;
`;

const ReadOnlyValue = styled.div`
  padding: 4px 8px;
  background-color: #222222;
  border-radius: 4px;
  color: #ffffff;
  cursor: default !important;
`;

const Input = styled.input`
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #555555;
  border-radius: 4px;
  background-color: #333333;
  color: #ffffff;
  box-sizing: border-box;
`;

const HelpIcon = styled.span`
  margin-left: 5px;
  cursor: pointer;
  color: #00b8ff;
`;

const SliderWrapper = styled.div`
  margin-top: 4px;
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

const HelpTextPopup = styled.div`
  position: fixed;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #1f1f1f;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  color: #ffffff;
  max-width: 600px;
  width: 100%;
  box-sizing: border-box;
`;

const HelpTextTitle = styled.h2`
  margin-top: 0;
  color: #00ff9f;
`;

const HelpTextContent = styled.div`
  margin-bottom: 0;
  font-size:1rem;
`;

const CloseButton = styled.button`
  padding: 6px 12px;
  background-color: ${COLORS.pink};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 12px;
`;

const CustomSlider = styled(Slider)`
  .rc-slider-rail {
    background-color: #444444;
  }

  .rc-slider-track {
    background-color: #00ff9f;
  }

  .rc-slider-handle {
    border-color: #00ff9f;
    background-color: #00ff9f;
  }

  .rc-slider-handle:hover {
    border-color: #00aacc;
  }

  .rc-slider-handle:active {
    border-color: #00aacc;
    box-shadow: 0 0 5px #00aacc;
  }
`;

const SliderInputWrapper = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
`;


const titleTexts: FormDescriptor = {
  nNodes: 'Nodes',
  nMeasurements: 'Measurements',
  nEpochs: 'Epochs',
  h3Resolution: 'H3 Resolution',
  assertedPositionStddev: 'Asserted Position Std. Dev. (km)',
  beta: 'Mean Message Speed Range (c)',
  betaStddev: 'Message Speed Std. Dev.',
  tau: 'Mean Latency Range (µs)',
  tauStddev: "Latency Std. Dev. (µs)",
  messageDistanceMax: 'Message Range (km)',
  modelPositionStddev: 'Estimator State Std. Dev. (km)',
  modelBeta: 'Model Message Speed (% c)',
  modelBetaStddev: 'Model Message Speed Std. Dev. (% c)',
  modelTau: 'Model Latency (µs)',
  modelTauStddev: 'Model Latency Std. Dev. (µs)',
  modelTofObservationStddev: 'Model Time-of-Flight Std. Dev. (µs)',
}

const helpTexts: FormDescriptor = {
  nNodes: `
  The number of nodes participating in the simulation.
  
  Each node asserts a unique position and measures distances to other nodes using a trustless time-of-flight algorithm.

  Increasing the number of nodes improves position accuracy and computational difficulty.

  This parameter is set during compilation and cannot be changed here currently.
  `,
  nMeasurements: `
  The number of distance measurements between node pairs used within each position estimation. For each measurement, one node pings another node and waits for a signed pong response. The response time puts an upper bound on the distance to the other node.
  
  Increasing the number of measurements improves position accuracy (and computational difficulty).

  This parameter is set during compilation and cannot be changed here.
  `,
  nEpochs: `
  The number of times to estimate the position of each node in the simulation.
  
  Each epoch consists of a set of distance measurements defined by the *Measurements* parameter and a position estimation step. Increasing the number of epochs improves position accuracy but also increases computational difficulty.

 Think of each epoch as a single block on the blockchain (although in practice they may not map 1:1).
  `,
  h3Resolution: `
  The resolution of the H3 grid used by nodes asserting a position. Explore H3 resolutions [here](https://wolf-h3-viewer.glitch.me/).
  `,
  assertedPositionStddev: `
  Adversarial nodes can attempt to deceive the network by asserting a location other than their true position!
  
  We model this by assuming all asserted node positions are drawn from a normal distribution centered around the node's true position with a standard deviation in km specified by this parameter.

  Can the Proximum network detect adversarial nodes reporting false locations? Run the simulation to find out!
  `,
  beta: `
  Nodes send each other messages to measure distances. These messages propagate at different speeds depending on the communication medium. This simulation assumes each node always uses a single communication channel and selects a fixed message speed for that node from a uniform distribution over the specified range.
  
  General message speeds (c = speed of light) are as follows:
  * General IP networks: ~0.1c
  * fiber: 0.66c
  * copper: 0.66c
  * radio: 0.99c
  * microwave: 0.99c.
  * laser: 0.99c
  
  As the Proximum network matures, ASICs using EM communication channels may push average message speeds toward the upper bound of 1c. Proximum estimates the message speed for each node (see the *Model Message Speed* parameter). The lower bound on permitted message speed may increase over time to incentivize nodes to improve message speed and position resolution.
  `,
  betaStddev: `
  Each message travels at a slightly different speed depending on routing, etc. This simulation adds noise drawn from the normal distribution to a node's mean message speed when making each distance measurement.
  
  Note that the final message speed for each message is always bounded to the range (0c, 1c).
  `,
  tau: `
  Nodes have an internal latency: it takes them time to process and respond to messages after they receive the message. This simulation assumes each node has a fixed mean latency drawn from a uniform distribution over the specified range.

  Reference latencies:
  * General IP networks: 20,000-40,000 µs
  * High frequency trading: 1-10 µs
  
  Proximum estimates the mean latency for each node.
  
  As the Proximum network matures, ASICs may push latencies toward a lower bound of ~1 µs. Permitted latency may drop over time to incentivize nodes to improve latency and position resolution.
  `,
  tauStddev: `
  The time it takes for a node to respond to a given message varies slightly depending on processor load, etc. This simulation adds noise drawn from the lognormal distribution to a node's mean latency when making each distance measurement.
  `,
  messageDistanceMax: `
  Nodes can only reach other nodes within this range (e.g. because radio signals or other communication meethods only travel so far). Set it to a value > 13,000 km to simulate all nodes being able to reach each other.

  In practice this value will likely be < ~1000km but the number of nodes will be > 1000 (this is just too slow to simulate easily).
  `,
  modelPositionStddev: `
  Proximum estimates the position of each nodes. It models all nodes as stationary but its confidence in the location of each node decreases over time until new distance measurements are made. This parameter controls the rate at which the confidence decreases.

  This state noise standard deviation is added to the estimated state of the node positions within the Extended Kalman Filter at each epoch.  
  `,
  modelBeta: `
  Proximum estimates the mean message speed of each node based on time-of-flight distance measurements. This parameter sets Proximum's initial mean message speed estimate for each node.

  It should be a value within the range of the *Real Message Speed* parameter.

  The estimated mean message speed is used within the Extended Kalman Filter to refine the filter's location estimate for each node.
  `,
  modelBetaStddev: `
  Proximum's confidence in a node's mean message speed decreases over time until a new measurement is made. This parameter controls the rate at which its confidence decreases.
  `,
  modelTau: `
  Proximum estimates the mean latency for each node based on time-of-flight distance measurements. This parameter set's Proximum's mean latency estimate for each  node.
  
  It should be a value within the range of the *Latency* parameter.

  The estimated mean latency is used within the Extended Kalman Filter to refine the filter's location estimate for each node.
  `,
  modelTauStddev: `
  Proximum's confidence in a node's mean latency decreases over time until a new measurement is made. This parameter controls the rate at which its confidence decreases.
  `,
  modelTofObservationStddev: `
  Proximum measures distance using time-of-flight measurements that take into account message speed and latency for each node.
  
  This parameter controls the amount of additional unmodeled noise to expect for each time-of-flight measurement: more noise means measurements are less reliable.

  This measurement standard deviation is added to distance measurements within the Extended Kalman Filter measurement update.`,
};


interface FieldOptions {
  min?: number,
  max?: number,
  step?: number,
  slider?: boolean,
  readonly?: boolean
}

export const FormField = ({
  name,
  control,
  watch,
  options = {
    step: 0.01,
    slider: false,
    readonly: false
  }
}: {
  name: FieldKeys
  control: Control<SimulationParams, any>,
  watch: UseFormWatch<SimulationParams>,
  options?: FieldOptions
}) => {

  const [showHelp, setShowHelp] = useState<boolean>(false);

  const numericController = () => (
    options.readonly ? <ReadOnlyValue>{watch(name)}</ReadOnlyValue>
      :
      <Controller
        name={name}
        control={control}
        render={({ field }) => <Input type="number" min={options.min} max={options.max} step={options.step} {...field as any} />}
      />);

  const sliderController = () => {
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
                min={options.min}
                max={options.max}
                step={options.step}
                value={[minValue, maxValue]}
                onChange={field.onChange}
              />
              <SliderInputWrapper>
                <SliderInput
                  type="number"
                  min={options.min}
                  max={maxValue}
                  step={options.step}
                  value={minValue}
                  onChange={(e) => {
                    const newMinValue = parseFloat(e.target.value);
                    if (!options.min || newMinValue >= options.min) {
                      field.onChange([newMinValue, maxValue]);
                    }
                  }}
                />
                <SliderInput
                  type="number"
                  min={minValue}
                  max={options.max}
                  step={options.step}
                  value={maxValue}
                  onChange={(e) => {
                    const newMaxValue = parseFloat(e.target.value);
                    if (!options.max || newMaxValue <= options.max) {
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
      <FormGroup>
        <Label>
          {titleTexts[name]}
          <HelpIcon onClick={() => setShowHelp(true)}>&#9432;</HelpIcon>
        </Label>
        {options.slider ? sliderController() : numericController()}
      </FormGroup>
      {showHelp && <HelpTextPopup>
        <HelpTextTitle>{titleTexts[name]}</HelpTextTitle>
        <HelpTextContent>
          <ReactMarkdown>
            {helpTexts[name] + "\n\nSee the [Proximum lightpaper](https://www.proximum.xyz/proximum-lightpaper.pdf) for more information."}
          </ReactMarkdown>
        </HelpTextContent>
        <CloseButton onClick={() => setShowHelp(false)}>Close</CloseButton>
      </HelpTextPopup>
      }
    </>
  )
}
