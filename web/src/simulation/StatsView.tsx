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

const StatsView = ({ stats }: { stats: Simulation['stats'] }) => {
  const data = stats.kf_estimation_rms_error.map((_, i) => ({
    epoch: i + 1,
    // convert from m to km
    kfError: stats.kf_estimation_rms_error[i] / 1000,
    lsError: stats.ls_estimation_rms_error[i] / 1000,
    assertedError: stats.assertion_rms_error[i] / 1000,
  }));

  const formatTooltipValue = (value: number) => `${value.toFixed(2)} km`;

  return (
    <div className="bg-gray-900 bg-opacity-80 p-5 w-full box-border min-w-[350px]">
      <h2 className="text-white text-xl font-bold mb-5">Position Error</h2>
      <div className="w-full h-[400px]">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid stroke="#444" strokeDasharray="5 5" />
            <XAxis dataKey="epoch" tick={{ fill: '#fff' }}>
              <Label value="Epoch" position="insideBottom" offset={-10} style={{ fill: '#fff' }} />
            </XAxis>
            <YAxis tick={{ fill: '#fff' }}>
              <Label value="RMS Error (km)" position="insideLeft" angle={-90} offset={0} style={{ fill: '#fff' }} />
            </YAxis>
            <Tooltip
              contentStyle={{ backgroundColor: '#1d1d1d', color: '#fff' }}
              formatter={formatTooltipValue}
            />
            <Line
              type="monotone"
              dataKey="lsError"
              stroke={COLORS.green}
              name="Least Squares Err."
              dot={{ fill: '#00000000', radius: 0, stroke: "#00000000" }}
            />
            <Line
              type="monotone"
              dataKey="assertedError"
              stroke={COLORS.pink}
              name="Asserted Position Err."
              dot={{ fill: '#00000000', radius: 0, stroke: "#00000000" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsView;