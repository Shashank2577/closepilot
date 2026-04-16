'use client';

import React from 'react';
import { DealStage } from '@closepilot/core';
import { Button } from '../ui/button';

interface FilterBarProps {
  selectedStage: DealStage | 'all';
  onStageChange: (stage: DealStage | 'all') => void;
  dateFilter?: 'week' | 'month' | 'all';
  onDateFilterChange?: (filter: 'week' | 'month' | 'all') => void;
}

export function FilterBar({
  selectedStage,
  onStageChange,
  dateFilter = 'all',
  onDateFilterChange,
}: FilterBarProps) {
  const stages: (DealStage | 'all')[] = [
    'all',
    DealStage.INGESTION,
    DealStage.ENRICHMENT,
    DealStage.SCOPING,
    DealStage.PROPOSAL,
    DealStage.CRM_SYNC,
    DealStage.COMPLETED,
    DealStage.FAILED,
  ];

  const stageLabels: Record<DealStage | 'all', string> = {
    all: 'All Stages',
    [DealStage.INGESTION]: 'Ingestion',
    [DealStage.ENRICHMENT]: 'Enrichment',
    [DealStage.SCOPING]: 'Scoping',
    [DealStage.PROPOSAL]: 'Proposal',
    [DealStage.CRM_SYNC]: 'CRM Sync',
    [DealStage.COMPLETED]: 'Completed',
    [DealStage.FAILED]: 'Failed',
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Stage:</label>
        <div className="flex flex-wrap gap-2">
          {stages.map((stage) => (
            <Button
              key={stage}
              variant={selectedStage === stage ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onStageChange(stage)}
            >
              {stageLabels[stage]}
            </Button>
          ))}
        </div>
      </div>

      {onDateFilterChange && (
        <div className="flex items-center gap-2 ml-4">
          <label className="text-sm font-medium text-gray-700">Date:</label>
          <div className="flex gap-2">
            <Button
              variant={dateFilter === 'week' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onDateFilterChange('week')}
            >
              This Week
            </Button>
            <Button
              variant={dateFilter === 'month' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onDateFilterChange('month')}
            >
              This Month
            </Button>
            <Button
              variant={dateFilter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onDateFilterChange('all')}
            >
              All Time
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
