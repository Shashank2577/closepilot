'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Deal } from '@closepilot/core/src/types/deal';
import { DealCard } from '../deals/DealCard';

interface KanbanColumnProps {
  id: string;
  title: string;
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
}

export function KanbanColumn({ id, title, deals, onDealClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'Column',
      columnId: id,
    },
  });

  return (
    <div className="flex flex-col flex-1 min-w-[280px] max-w-[320px] bg-gray-50 rounded-lg shrink-0">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-700">{title}</h3>
          <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
            {deals.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 p-3 overflow-y-auto transition-colors ${
          isOver ? 'bg-blue-50/50' : ''
        }`}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 min-h-[150px]">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} onClick={onDealClick} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}