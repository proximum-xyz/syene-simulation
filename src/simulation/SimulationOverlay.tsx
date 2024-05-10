import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useSearchParams } from 'react-router-dom';
import SimulationForm from './SimulationForm';
import Stats from './Stats';
import { CompilerParams, Simulation, SimulationParams } from '../types';
import { InitOutput, get_compile_parameters } from 'rust-proximum-simulation';

const OverlayWrapper = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 100000;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 10px;
  border-radius: 4px;
  max-width: 400px;
`;

const ToggleButton = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 10px;
`;

interface SimulationOverlayProps {
  runSimulation: (params: SimulationParams) => void;
  simulation: Simulation | undefined;
  wasm: InitOutput;
}

const SimulationOverlay: React.FC<SimulationOverlayProps> = ({
  runSimulation,
  wasm,
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

    return (<>
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
    </>)
  }

  const stats = () => {
    if (!simulation?.stats) {
      return null
    }
    return (
      <>
        <ToggleButton onClick={() => { setIsStatsCollapsed(!isStatsCollapsed) }}>
          {isStatsCollapsed ? 'Show Stats' : 'Hide Stats'}
        </ToggleButton>
        < Stats stats={simulation.stats} />
      </>
    )
  }

  return (
    <OverlayWrapper>
      {form()}
      {stats()}
    </OverlayWrapper>
  );
};

export default SimulationOverlay;