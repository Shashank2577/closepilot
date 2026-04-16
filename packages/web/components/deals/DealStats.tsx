import React from 'react';
import { Deal } from '@closepilot/core/src/types/deal';

interface DealStatsProps {
  deals: Deal[];
}

export function DealStats({ deals }: DealStatsProps) {
  const totalValue = deals.reduce((acc, deal) => acc + (deal.proposal?.pricing?.total || 0), 0);
  const totalCount = deals.length;

  return (
    <div className="flex space-x-4 mb-4 text-sm text-gray-600">
      <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 flex items-center">
        <span className="font-medium mr-2">Total Deals:</span>
        <span>{totalCount}</span>
      </div>
      <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 flex items-center">
        <span className="font-medium mr-2">Pipeline Value:</span>
        <span>
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          }).format(totalValue)}
        </span>
      </div>
    </div>
  );
}
