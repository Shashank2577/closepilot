'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Deal } from '@closepilot/core/src/types/deal';
import { format } from 'date-fns';

interface DealCardProps {
  deal: Deal;
  onClick: (deal: Deal) => void;
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, data: { type: 'Deal', deal } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(deal)}
      className="bg-white p-4 rounded-md shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow mb-3"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 line-clamp-1">{deal.leadCompany || 'No Company'}</h4>
      </div>
      <p className="text-sm text-gray-600 mb-1 line-clamp-1">{deal.leadName}</p>
      <p className="text-xs text-gray-500 mb-3 line-clamp-1">{deal.leadEmail}</p>

      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{format(new Date(deal.createdAt), 'MMM d')}</span>
        {deal.assignedAgent && (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-[10px]">
            {deal.assignedAgent}
          </span>
        )}
      </div>
    </div>
  );
}