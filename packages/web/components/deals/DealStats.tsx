'use client';

import React from 'react';
import { Deal, DealStage } from '@closepilot/core';

interface DealStatsProps {
  deals: Deal[];
}

export function DealStats({ deals }: DealStatsProps) {
  const stats = React.useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const newThisWeek = deals.filter((d) => new Date(d.createdAt) >= weekAgo)
      .length;
    const pending = deals.filter(
      (d) =>
        d.stage !== DealStage.COMPLETED && d.stage !== DealStage.FAILED
    ).length;
    const completed = deals.filter(
      (d) => d.stage === DealStage.COMPLETED
    ).length;

    return {
      total: deals.length,
      newThisWeek,
      pending,
      completed,
    };
  }, [deals]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Deals" value={stats.total} />
      <StatCard label="New This Week" value={stats.newThisWeek} trend="up" />
      <StatCard label="Pending" value={stats.pending} trend="neutral" />
      <StatCard label="Completed" value={stats.completed} trend="success" />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  trend?: 'up' | 'down' | 'neutral' | 'success';
}

function StatCard({ label, value, trend }: StatCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
    success: 'text-blue-600',
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
