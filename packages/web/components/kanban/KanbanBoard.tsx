'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    const grouped = Object.values(DealStage).reduce(
      (acc, stage) => ({ ...acc, [stage]: [] }),
      {} as Record<DealStage, Deal[]>
    );

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
        <motion.div
          className="flex gap-4 overflow-x-auto pb-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {STAGES.map((stage) => (
            <motion.div
              key={stage}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
              }}
            >
              <KanbanColumn
                stage={stage}
                deals={dealsByStage[stage]}
                onDealClick={setSelectedDeal}
              />
            </motion.div>
          ))}
        </motion.div>

        <DragOverlay>
          {activeDeal ? (
            <DealCard deal={activeDeal} onClick={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {selectedDeal && (
          <DealModal
            deal={selectedDeal}
            onClose={() => setSelectedDeal(null)}
            onDealDeleted={() => { setSelectedDeal(null); onDealUpdate?.(); }}
            onDealUpdated={() => { setSelectedDeal(null); onDealUpdate?.(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
