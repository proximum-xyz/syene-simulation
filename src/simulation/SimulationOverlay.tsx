import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useSearchParams } from 'react-router-dom';
import SimulationForm from './SimulationForm';
import Stats from './Stats';
import { CompilerParams, Simulation, SimulationParams } from '../types';
import { InitOutput, get_compile_parameters } from 'rust-proximum-simulation';

const ToggleButton = styled.button`
  background-color: transparent;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 10px;
  transition: background-color 0.3s ease;
  font-size: 14px;
  // text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: rgba(255, 255, 255, 0.6);

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    text-decoration-color: rgba(255, 255, 255, 0.8);
  }
`;

const OverlayWrapper = styled.div`
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100vw;
  height: 100vh;
  z-index: 100000;
  padding: 10px;
  border-radius: 4px;
  max-width: 800px;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: space-between;
`;

const Column = styled.div`
  flex: 2;
`;


const Column2 = styled.div`
  flex: 3;
`;

interface SimulationOverlayProps {
  runSimulation: (params: SimulationParams) => void;
  simulation: Simulation | undefined;
  wasm: InitOutput;
}

const SimulationOverlay: React.FC<SimulationOverlayProps> = ({
  runSimulation,
  simulation,
}) => {
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Get the compiler params once
  const [compilerParams, setCompilerParams] = useState<CompilerParams>();

  useEffect(() => {
    const paramString = get_compile_parameters();
    setCompilerParams(JSON.parse(paramString));
  }, []);


  const handleSimulationRun = (params: SimulationParams) => {
    setSearchParams(params as any);
    runSimulation(params);
  };

  const loadSimulationParams = () => {
    const params = Object.fromEntries(searchParams.entries());
    return params as any as SimulationParams;
  };

  const form = () => {

    if (!compilerParams) return null;

    return (
      <Column>
        <ToggleButton onClick={() => { setIsFormCollapsed(!isFormCollapsed) }}>
          {isFormCollapsed ? 'Show Controls' : 'Hide Controls'}
        </ToggleButton>
        {
          !isFormCollapsed && (
            <>
              <SimulationForm
                runSimulation={handleSimulationRun}
                compilerParams={compilerParams}
                initialParams={loadSimulationParams()}
              />
            </>
          )
        }
      </Column>)
  }

  const stats = () => {
    if (!simulation?.stats) {
      return null
    }
    return (
      <Column2>
        <ToggleButton onClick={() => { setIsStatsCollapsed(!isStatsCollapsed) }}>
          {isStatsCollapsed ? 'Show Stats' : 'Hide Stats'}
        </ToggleButton>
        {!isStatsCollapsed && < Stats stats={simulation.stats} />}
      </Column2>
    )
  }

  return (
    <OverlayWrapper>
      {form()}
      {stats()}
    </OverlayWrapper >
  );
};

export default SimulationOverlay;