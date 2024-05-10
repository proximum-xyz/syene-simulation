import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Simulation } from '../types';
import styled from 'styled-components';

export interface SimulationStats {
  rmsError: number;
}

const StatsContainer = styled.div`
background-color: #1f1f1fdd;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
`;

const StatsTitle = styled.h2`
  color: #fff;
  margin-bottom: 20px;
`;

const Stats = ({ stats }: { stats: Simulation['stats'] }) => {
  const data = [];
  for (let i = 0; i < stats.estimation_rms_error.length; i++) {
    data.push({
      epoch: i,
      rmsError: stats.estimation_rms_error[i],
      assertionStddev: stats.assertion_stddev[i],
    });
  }

  const formatTooltipValue = (value: number) => {
    return `${Math.round(value / 1000)} km`;
  };

  return (
    <StatsContainer>
      <StatsTitle>Simulation Statistics</StatsTitle>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid stroke="#444" strokeDasharray="5 5" />
          {/* <XAxis dataKey="epoch" tick={{ fill: '#fff' }} /> */}
          <YAxis tick={{ fill: '#fff' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1d1d1d', color: '#fff' }}
            formatter={formatTooltipValue}
          />
          {/* <Legend wrapperStyle={{ color: '#fff' }} /> */}
          <Line
            type="monotone"
            dataKey="rmsError"
            stroke="#00b8ff"
            name="Estimated Position RMS Error"
            dot={{ fill: '#333' }}
            activeDot={{ fill: '#00b8ff', stroke: '#00b8ff', strokeWidth: 2, r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="assertionStddev"
            stroke="#8b00ff"
            name="Asserted Position Std. Dev."
            dot={{ fill: '#333' }}
            activeDot={{ fill: '#8b00ff', stroke: '#8b00ff', strokeWidth: 2, r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </StatsContainer>
  );
};

export default Stats;