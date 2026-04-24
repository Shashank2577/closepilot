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

const stageAccents: Record<DealStage, { bg: string; text: string; badge: string }> = {
  [DealStage.INGESTION]: { bg: 'bg-blue-50/60', text: 'text-primary-700', badge: 'bg-primary-100 text-primary-700' },
  [DealStage.ENRICHMENT]: { bg: 'bg-indigo-50/60', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700' },
  [DealStage.QUALIFIED]: { bg: 'bg-cyan-50/60', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700' },
  [DealStage.OUTREACH_SENT]: { bg: 'bg-sky-50/60', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-700' },
  [DealStage.MEETING_BOOKED]: { bg: 'bg-violet-50/60', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
  [DealStage.SCOPING]: { bg: 'bg-amber-50/60', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  [DealStage.PROPOSAL]: { bg: 'bg-orange-50/60', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  [DealStage.PROPOSAL_SENT]: { bg: 'bg-yellow-50/60', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
  [DealStage.FOLLOW_UP_1]: { bg: 'bg-lime-50/60', text: 'text-lime-700', badge: 'bg-lime-100 text-lime-700' },
  [DealStage.FOLLOW_UP_2]: { bg: 'bg-green-50/60', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
  [DealStage.NEGOTIATING]: { bg: 'bg-fuchsia-50/60', text: 'text-fuchsia-700', badge: 'bg-fuchsia-100 text-fuchsia-700' },
  [DealStage.PROPOSAL_REVISED]: { bg: 'bg-pink-50/60', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-700' },
  [DealStage.CRM_SYNC]: { bg: 'bg-teal-50/60', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-700' },
  [DealStage.CLOSED_WON]: { bg: 'bg-emerald-50/60', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  [DealStage.CLOSED_LOST]: { bg: 'bg-stone-50/60', text: 'text-stone-700', badge: 'bg-stone-100 text-stone-700' },
  [DealStage.STALLED]: { bg: 'bg-rose-50/60', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700' },
  [DealStage.COMPLETED]: { bg: 'bg-emerald-50/60', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  [DealStage.FAILED]: { bg: 'bg-red-50/60', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
};

export function KanbanColumn({ stage, deals, onDealClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: stage,
  });

  const accent = stageAccents[stage];

  return (
    <div className={`flex-shrink-0 w-80 ${accent.bg} rounded-xl border border-border/50 p-4`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`font-semibold text-sm ${accent.text}`}>{stageTitles[stage]}</h2>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${accent.badge}`}>
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
