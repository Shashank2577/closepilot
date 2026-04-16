'use client';

import React from 'react';
import { Deal, DealStage } from '@closepilot/core';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DealCard } from '../deals/DealCard';

interface KanbanColumnProps {
  stage: DealStage;
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
}

const stageTitles: Record<DealStage, string> = {
  [DealStage.INGESTION]: 'Ingestion',
  [DealStage.ENRICHMENT]: 'Enrichment',
  [DealStage.SCOPING]: 'Scoping',
  [DealStage.PROPOSAL]: 'Proposal',
  [DealStage.CRM_SYNC]: 'CRM Sync',
  [DealStage.COMPLETED]: 'Completed',
  [DealStage.FAILED]: 'Failed',
};

export function KanbanColumn({ stage, deals, onDealClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: stage,
  });

  return (
    <div className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">{stageTitles[stage]}</h2>
        <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
          {deals.length}
        </span>
      </div>

      <div ref={setNodeRef} className="space-y-3 min-h-[200px]">
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={() => onDealClick(deal)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
