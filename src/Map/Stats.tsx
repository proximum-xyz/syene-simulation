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

const Stats = ({ stats }: { stats: Simulation["stats"] }) => {

  console.log('***', { stats });

  const data = [];

  for (let i = 0; i < stats.estimation_rms_error.length; i++) {
    data.push({
      name: '${i}',
      epoch: i,
      rmsError: stats.estimation_rms_error[i],
      assertionStddev: stats.assertion_stddev[i],
    });
  }

  return (
    <>
      <div>
      </div>
      <div>
        <LineChart width={500} height={250} data={data}>
          <CartesianGrid stroke="#333333" strokeDasharray="5 5" />
          <XAxis dataKey="epoch" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="rmsError" stroke="blue" />
          <Line type="monotone" dataKey="assertionStddev" stroke="orange" />
        </LineChart>
      </div>
    </>
  );
};

export default Stats;