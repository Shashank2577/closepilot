'use client';

import React, { useState } from 'react';
import { Deal, DealStage } from '@closepilot/core';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { DealCard } from '../deals/DealCard';
import { DealModal } from '../deals/DealModal';
import { updateDealStage } from '../../lib/api';

interface KanbanBoardProps {
  deals: Deal[];
  onDealUpdate?: () => void;
}

const STAGES: DealStage[] = [
  DealStage.INGESTION,
  DealStage.ENRICHMENT,
  DealStage.SCOPING,
  DealStage.PROPOSAL,
  DealStage.CRM_SYNC,
  DealStage.COMPLETED,
];

export function KanbanBoard({ deals, onDealUpdate }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const dealsByStage = React.useMemo(() => {
    const grouped: Record<DealStage, Deal[]> = {
      [DealStage.INGESTION]: [],
      [DealStage.ENRICHMENT]: [],
      [DealStage.SCOPING]: [],
      [DealStage.PROPOSAL]: [],
      [DealStage.CRM_SYNC]: [],
      [DealStage.COMPLETED]: [],
      [DealStage.FAILED]: [],
    };

    deals.forEach((deal) => {
      if (grouped[deal.stage]) {
        grouped[deal.stage].push(deal);
      }
    });

    return grouped;
  }, [deals]);

  const activeDeal = deals.find((d) => d.id === activeId);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const dealId = active.id as string;
    const newStage = over.id as DealStage;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    try {
      await updateDealStage(dealId, newStage);
      onDealUpdate?.();
    } catch (error) {
      console.error('Failed to update deal stage:', error);
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              deals={dealsByStage[stage]}
              onDealClick={setSelectedDeal}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? (
            <DealCard deal={activeDeal} onClick={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedDeal && (
        <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}
    </>
  );
}
