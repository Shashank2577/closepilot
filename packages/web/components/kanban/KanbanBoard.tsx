'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Deal, DealStage } from '@closepilot/core/src/types/deal';
import { KanbanColumn } from './KanbanColumn';
import { DealCard } from '../deals/DealCard';
import { DealModal } from '../deals/DealModal';
import { FilterBar, Filters } from '../filters/FilterBar';
import { DealStats } from '../deals/DealStats';
import { fetchDeals, updateDealStage } from '../../lib/api';

const COLUMNS = [
  { id: DealStage.INGESTION, title: 'Ingestion' },
  { id: DealStage.ENRICHMENT, title: 'Enrichment' },
  { id: DealStage.SCOPING, title: 'Scoping' },
  { id: DealStage.PROPOSAL, title: 'Proposal' },
  { id: DealStage.CRM_SYNC, title: 'CRM Sync' },
  { id: DealStage.COMPLETED, title: 'Completed' },
];

export function KanbanBoard() {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    assignee: '',
    stage: '',
  });

  const queryClient = useQueryClient();

  const { data: deals = [], isLoading, error } = useQuery({
    queryKey: ['deals'],
    queryFn: fetchDeals,
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ dealId, stage }: { dealId: string; stage: string }) =>
      updateDealStage(dealId, stage),
    onMutate: async ({ dealId, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['deals'] });
      const previousDeals = queryClient.getQueryData<Deal[]>(['deals']);

      if (previousDeals) {
        queryClient.setQueryData<Deal[]>(
          ['deals'],
          previousDeals.map((deal) =>
            deal.id === dealId ? { ...deal, stage: stage as DealStage } : deal
          )
        );
      }

      return { previousDeals };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(['deals'], context.previousDeals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  useEffect(() => {
    // Listen to SSE updates
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const eventSource = new EventSource(`${API_URL}/activities/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.entityType === 'deal') {
            queryClient.invalidateQueries({ queryKey: ['deals'] });
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // Search filter
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        filters.search === '' ||
        deal.leadName?.toLowerCase().includes(searchLower) ||
        deal.leadCompany?.toLowerCase().includes(searchLower) ||
        deal.leadEmail?.toLowerCase().includes(searchLower);

      // Assignee filter
      const matchesAssignee =
        filters.assignee === '' || deal.assignedAgent === filters.assignee;

      // Stage filter
      const matchesStage = filters.stage === '' || deal.stage === filters.stage;

      return matchesSearch && matchesAssignee && matchesStage;
    });
  }, [deals, filters]);

  const assignees = useMemo(() => {
    const agents = deals.map((d) => d.assignedAgent).filter(Boolean) as string[];
    return Array.from(new Set(agents));
  }, [deals]);

  const stages = useMemo(() => {
     return COLUMNS.map(col => ({ value: col.id, label: col.title }));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const deal = deals.find((d) => d.id === active.id);
    if (deal) {
      setActiveDeal(deal);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;

    if (!over) return;

    const dealId = active.id as string;
    const overId = over.id;

    // Check if dropping on a column
    const overColumn = COLUMNS.find((col) => col.id === overId);

    // Check if dropping on another deal
    const overDeal = deals.find(d => d.id === overId);

    const newStage = overColumn ? overColumn.id : (overDeal ? overDeal.stage : null);

    const activeDeal = deals.find((d) => d.id === dealId);

    if (activeDeal && newStage && activeDeal.stage !== newStage) {
      updateStageMutation.mutate({ dealId, stage: newStage });
    }
  };

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading deals...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error loading deals: {(error as Error).message}</div>;
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <DealStats deals={filteredDeals} />

      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        assignees={assignees}
        stages={stages}
      />

      <div className="flex-1 overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex space-x-6 min-h-[500px]">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                deals={filteredDeals.filter((d) => d.stage === col.id)}
                onDealClick={handleDealClick}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDeal ? (
              <DealCard deal={activeDeal} onClick={handleDealClick} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <DealModal
        deal={selectedDeal}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}