import React, { useEffect, useState } from 'react';
import SimulationForm from './SimulationForm';
import StatsView from './StatsView';
import { CompilerParams, PATHS, SimulationConfig, Stats } from '../types';
import { InitOutput, get_compile_parameters } from 'rust-proximum-simulation';
import { useNavigate } from 'react-router-dom';

interface SimulationOverlayProps {
  runSimulation: (params: SimulationConfig) => void;
  resetSimulation: (params: SimulationConfig) => void;
  stats: Stats | undefined;
  wasm: InitOutput;
  progress: number;
}

const SimulationOverlay = ({
  stats,
  runSimulation,
  resetSimulation,
  wasm,
  progress
}: SimulationOverlayProps) => {
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const [compilerParams, setCompilerParams] = useState<CompilerParams>();
  const navigate = useNavigate();

  useEffect(() => {
    const paramString = get_compile_parameters();
    setCompilerParams(JSON.parse(paramString));
  }, []);

  const toggleForm = () => setIsFormCollapsed(!isFormCollapsed);
  const toggleStats = () => setIsStatsCollapsed(!isStatsCollapsed);

  return (
    <div className="fixed top-0 left-0 z-50 max-h-screen overflow-y-auto">
      <div className="w-full sm:w-96 md:w-[500px] p-4">
        <button
          onClick={() => navigate(PATHS.home)}
          className="text-5xl text-white hover:text-white/80 mb-4"
        >
          ᚼ
        </button>
        <div className="space-y-4">
          <button
            onClick={toggleForm}
            className="w-full text-left px-3 text-sm font-medium text-white hover:text-white/80 transition-all duration-150 ease-in-out"
          >
            {isFormCollapsed ? '▼ Show Controls' : '▲ Hide Controls'}
          </button>

          {!isFormCollapsed && compilerParams && (
            <SimulationForm
              runSimulation={runSimulation}
              resetSimulation={resetSimulation}
              compilerParams={compilerParams}
              progress={progress}
            />
          )}

          {stats && (
            <>
              <button
                onClick={toggleStats}
                className="w-full text-left px-3 text-sm font-medium text-white hover:text-white/80 transition-all duration-150 ease-in-out"
              >
                {isStatsCollapsed ? '▼ Show Stats' : '▲ Hide Stats'}
              </button>

              {!isStatsCollapsed && (
                <StatsView stats={stats} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulationOverlay;