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
    DealStage.QUALIFIED,
    DealStage.OUTREACH_SENT,
    DealStage.MEETING_BOOKED,
    DealStage.SCOPING,
    DealStage.PROPOSAL,
    DealStage.PROPOSAL_SENT,
    DealStage.FOLLOW_UP_1,
    DealStage.FOLLOW_UP_2,
    DealStage.NEGOTIATING,
    DealStage.PROPOSAL_REVISED,
    DealStage.CRM_SYNC,
    DealStage.CLOSED_WON,
    DealStage.CLOSED_LOST,
    DealStage.STALLED,
    DealStage.COMPLETED,
    DealStage.FAILED,
  ];

  const stageLabels: Record<DealStage | 'all', string> = {
    all: 'All Stages',
    [DealStage.INGESTION]: 'Ingestion',
    [DealStage.ENRICHMENT]: 'Enrichment',
    [DealStage.QUALIFIED]: 'Qualified',
    [DealStage.OUTREACH_SENT]: 'Outreach Sent',
    [DealStage.MEETING_BOOKED]: 'Meeting Booked',
    [DealStage.SCOPING]: 'Scoping',
    [DealStage.PROPOSAL]: 'Proposal',
    [DealStage.PROPOSAL_SENT]: 'Proposal Sent',
    [DealStage.FOLLOW_UP_1]: 'Follow-up 1',
    [DealStage.FOLLOW_UP_2]: 'Follow-up 2',
    [DealStage.NEGOTIATING]: 'Negotiating',
    [DealStage.PROPOSAL_REVISED]: 'Proposal Revised',
    [DealStage.CRM_SYNC]: 'CRM Sync',
    [DealStage.CLOSED_WON]: 'Closed Won',
    [DealStage.CLOSED_LOST]: 'Closed Lost',
    [DealStage.STALLED]: 'Stalled',
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
