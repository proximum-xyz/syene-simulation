import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Node, Simulation } from '../types';

export interface SimulationStats {
  epoch: number;
  rmsError: number;
}

export interface SimulationStats {
  rmsError: number;
}

const Stats = ({ simulation }: { simulation: Simulation }) => {

  console.log('***', { simulation });


  const rms_error = simulation.stats.rms_error;
  return (
    <div>
      {/* Other simulation controls */}
      <div>
        <label>RMS Error:</label>
        <span>{rms_error[rms_error.length - 1]?.toFixed(2) || 0}</span>
      </div>
      <div>
        <LineChart width={500} height={300} data={rms_error}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="epoch" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="rmsError" stroke="#8884d8" activeDot={{ r: 8 }} />
        </LineChart>
      </div>
    </div>
  );
};

export default Stats;