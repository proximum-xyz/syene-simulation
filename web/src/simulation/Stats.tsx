import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { COLORS, Simulation } from '../types';
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
      // convert from m to km
      rmsError: stats.estimation_rms_error[i] / 1000,
      assertionStddev: stats.assertion_rms_error[i] / 1000,
    });
  }

  const formatTooltipValue = (value: number) => {
    return `${value.toFixed(2)} km`;
  };

  return (
    <StatsContainer>
      <StatsTitle>Position Error</StatsTitle>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <CartesianGrid stroke="#444" strokeDasharray="5 5" />
          <XAxis dataKey="epoch" tick={{ fill: '#fff' }}>
            <Label value="Epoch" position="insideBottom" offset={-10} style={{ fill: '#fff' }} />
          </XAxis>
          <YAxis tick={{ fill: '#fff' }}>
            <Label value="RMS Error (km)" position="insideBottom" angle={-90} offset={20} style={{ fill: '#fff' }} />
          </YAxis>
          <Tooltip
            contentStyle={{ backgroundColor: '#1d1d1d', color: '#fff' }}
            formatter={formatTooltipValue}
          />
          {/* <Legend wrapperStyle={{ color: '#fff' }} /> */}
          <Line
            type="monotone"
            dataKey="rmsError"
            stroke="#00b8ff"
            name="Estimation"
            dot={{ fill: '#333' }}
          // activeDot={{ fill: '#00b8ff', stroke: '#00b8ff', strokeWidth: 2, r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="assertionStddev"
            stroke={COLORS.pink}
            name="Assertion"
            dot={{ fill: '#00000000', radius: 0, stroke: "#00000000" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </StatsContainer>
  );
};

export default Stats;