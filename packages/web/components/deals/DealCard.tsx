'use client';

import React from 'react';
import { Deal, DealStage } from '@closepilot/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '../ui/badge';

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
}

const stageColors: Record<DealStage, 'success' | 'warning' | 'danger' | 'info'> = {
  [DealStage.INGESTION]: 'info',
  [DealStage.ENRICHMENT]: 'info',
  [DealStage.SCOPING]: 'warning',
  [DealStage.PROPOSAL]: 'warning',
  [DealStage.CRM_SYNC]: 'success',
  [DealStage.COMPLETED]: 'success',
  [DealStage.FAILED]: 'danger',
};

export function DealCard({ deal, onClick }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 truncate flex-1">
          {deal.leadName}
        </h3>
        <Badge variant={stageColors[deal.stage]} className="ml-2">
          {deal.stage.replace('_', ' ')}
        </Badge>
      </div>

      {deal.leadCompany && (
        <p className="text-sm text-gray-600 mb-2 truncate">{deal.leadCompany}</p>
      )}

      <div className="flex items-center text-xs text-gray-500">
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        {deal.leadEmail}
      </div>

      <div className="flex items-center text-xs text-gray-500 mt-1">
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        {formatDate(deal.createdAt)}
      </div>

      {deal.approvalStatus === 'pending' && (
        <div className="mt-2">
          <Badge variant="warning">Awaiting Approval</Badge>
        </div>
      )}
    </div>
  );
}
