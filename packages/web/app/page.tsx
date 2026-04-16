'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Deal, DealStage } from '@closepilot/core';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { DealStats } from '../components/deals/DealStats';
import { FilterBar } from '../components/filters/FilterBar';
import { SearchBar } from '../components/filters/SearchBar';
import { fetchDeals } from '../lib/api';

export default function HomePage() {
  const [selectedStage, setSelectedStage] = useState<DealStage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: deals = [], isLoading, error, refetch } = useQuery({
    queryKey: ['deals'],
    queryFn: fetchDeals,
    refetchInterval: 30000, // Poll every 30 seconds (will be replaced with SSE)
  });

  const filteredDeals = React.useMemo(() => {
    let filtered = deals;

    // Filter by stage
    if (selectedStage !== 'all') {
      filtered = filtered.filter((d) => d.stage === selectedStage);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.leadName.toLowerCase().includes(query) ||
          d.leadEmail.toLowerCase().includes(query) ||
          d.leadCompany?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [deals, selectedStage, searchQuery]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading deals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-red-700">
            Failed to load deals. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Deal Pipeline Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage and track your B2B deals through the sales pipeline
        </p>
      </div>

      {/* Statistics */}
      <div className="mb-8">
        <DealStats deals={deals} />
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        <FilterBar
          selectedStage={selectedStage}
          onStageChange={setSelectedStage}
        />
        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Search by name, company, or email..."
        />
      </div>

      {/* Kanban Board */}
      <div>
        {filteredDeals.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No deals</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedStage !== 'all'
                ? `No deals in ${selectedStage.replace('_', ' ')} stage`
                : searchQuery
                ? 'No deals match your search'
                : 'Get started by creating your first deal'}
            </p>
          </div>
        ) : (
          <KanbanBoard deals={filteredDeals} onDealUpdate={() => refetch()} />
        )}
      </div>
    </div>
  );
}
