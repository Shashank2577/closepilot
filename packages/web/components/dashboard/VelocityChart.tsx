'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { StageVelocity } from '@closepilot/core';

async function fetchVelocity(): Promise<StageVelocity[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/analytics/velocity`);
  if (!response.ok) {
    throw new Error('Failed to fetch velocity data');
  }
  return response.json();
}

export default function VelocityChart() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics-velocity'],
    queryFn: fetchVelocity,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="w-full h-64 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-gray-500">Loading chart...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-64 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
        <span className="text-red-500">Failed to load velocity data</span>
      </div>
    );
  }

  // Convert avgDurationMs to days for the chart
  const chartData = data?.map((item) => ({
    stage: item.stage.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    days: Number((item.avgDurationMs / (1000 * 60 * 60 * 24)).toFixed(2)),
    count: item.count,
  })) || [];

  return (
    <div className="w-full h-80 p-4 bg-white shadow rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Average Time in Stage (Days)</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="stage" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" />
            <YAxis allowDecimals={false} />
            <Tooltip
              formatter={(value: any) => [`${value} days`, 'Average Time']}
              labelStyle={{ color: '#111827' }}
            />
            <Bar dataKey="days" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
