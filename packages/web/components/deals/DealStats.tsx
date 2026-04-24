'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Deal, DealStage } from '@closepilot/core';

interface DealStatsProps {
  deals: Deal[];
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

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
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <StatCard label="Total Deals" value={stats.total} icon={<TotalIcon />} />
      <StatCard label="New This Week" value={stats.newThisWeek} trend="up" icon={<TrendUpIcon />} />
      <StatCard label="Pending" value={stats.pending} trend="neutral" icon={<PendingIcon />} />
      <StatCard label="Completed" value={stats.completed} trend="success" icon={<CheckIcon />} />
    </motion.div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  trend?: 'up' | 'down' | 'neutral' | 'success';
  icon?: React.ReactNode;
}

function StatCard({ label, value, trend, icon }: StatCardProps) {
  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-red-600',
    neutral: 'text-text-secondary',
    success: 'text-primary-600',
  };

  const iconBg = {
    up: 'bg-emerald-50 text-emerald-600',
    down: 'bg-red-50 text-red-600',
    neutral: 'bg-gray-100 text-text-secondary',
    success: 'bg-primary-50 text-primary-600',
  };

  return (
    <motion.div
      variants={item}
      className="bg-surface-raised rounded-xl border border-border p-5 hover:shadow-md hover:border-border-hover transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${trend ? iconBg[trend] : 'bg-gray-100 text-text-secondary'}`}>
          {icon}
        </div>
      </div>
      <div className={`text-2xl font-bold tracking-tight ${trend ? trendColors[trend] : 'text-text-primary'}`}>
        {value}
      </div>
      <div className="text-sm text-text-secondary mt-0.5">{label}</div>
    </motion.div>
  );
}

function TotalIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
