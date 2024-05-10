import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Simulation } from '../types';

export interface SimulationStats {
  rmsError: number;
}

const Stats = ({ stats }: { stats: Simulation["stats"] }) => {
  const data = [];
  for (let i = 0; i < stats.estimation_rms_error.length; i++) {
    data.push({
      epoch: i,
      rmsError: stats.estimation_rms_error[i],
      assertionStddev: stats.assertion_stddev[i],
    });
  }

  const formatTooltipValue = (value: number) => {
    return `${Math.round(value)} m`;
  };

  return (
    <div style={{ backgroundColor: '#222', padding: '20px' }}>
      <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '20px' }}>Simulation Statistics</h2>
      <ResponsiveContainer width="inherit" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid stroke="#444" strokeDasharray="5 5" />
          <XAxis dataKey="epoch" tick={{ fill: '#fff' }} />
          <YAxis tick={{ fill: '#fff' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#333', color: '#fff' }}
            formatter={formatTooltipValue}
          />
          <Legend wrapperStyle={{ color: '#fff' }} />
          <Line
            type="monotone"
            dataKey="rmsError"
            stroke="blue"
            name="Estimation RMS error (meters)"
            dot={{ fill: '#333' }}
            activeDot={{ fill: 'blue', stroke: 'blue', strokeWidth: 2, r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="assertionStddev"
            stroke="orange"
            name="Assertion Std. Dev. (meters) "
            dot={{ fill: '#333' }}
            activeDot={{ fill: 'orange', stroke: 'orange', strokeWidth: 2, r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Stats;