'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Deal, DealStage } from '@closepilot/core';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { DealStats } from '../components/deals/DealStats';
import { CreateDealModal } from '../components/deals/CreateDealModal';
import VelocityChart from '../components/dashboard/VelocityChart';
import { ActivityFeed } from '../components/activity/ActivityFeed';
import { FilterBar } from '../components/filters/FilterBar';
import { SearchBar } from '../components/filters/SearchBar';
import { Button } from '../components/ui/button';
import { fetchDeals, searchDeals } from '../lib/api';

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function HomePage() {
  const [selectedStage, setSelectedStage] = useState<DealStage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: deals = [], isLoading, error, refetch } = useQuery<Deal[]>({
    queryKey: ['deals'],
    queryFn: () => fetchDeals(),
    refetchInterval: 30000,
  });

  const { data: searchResults } = useQuery<Deal[]>({
    queryKey: ['deals-search', searchQuery],
    queryFn: () => searchDeals(searchQuery),
    enabled: searchQuery.length >= 3,
  });

  const filteredDeals = React.useMemo(() => {
    if (searchQuery.length >= 3 && searchResults) {
      let filtered = searchResults;
      if (selectedStage !== 'all') {
        filtered = filtered.filter((d) => d.stage === selectedStage);
      }
      return filtered;
    }

    let filtered = deals;

    if (selectedStage !== 'all') {
      filtered = filtered.filter((d) => d.stage === selectedStage);
    }

    if (searchQuery && searchQuery.length < 3) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.leadName.toLowerCase().includes(query) ||
          d.leadEmail.toLowerCase().includes(query) ||
          d.leadCompany?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [deals, searchResults, selectedStage, searchQuery]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent" />
          <p className="mt-4 text-text-secondary">Loading deals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-red-700">
            Failed to load deals. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            Deal Pipeline
          </h1>
          <p className="mt-1 text-text-secondary">
            Manage and track your B2B deals through the sales pipeline
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="md">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Deal
        </Button>
      </motion.div>

      {/* Statistics */}
      <motion.div variants={fadeInUp} className="mb-8">
        <DealStats deals={deals} />
      </motion.div>

      {/* Pipeline Velocity */}
      <motion.section variants={fadeInUp} className="mb-8">
        <h2 className="text-xl font-bold text-text-primary tracking-tight mb-4">Pipeline Velocity</h2>
        <div className="bg-surface-raised rounded-xl border border-border p-6">
          <VelocityChart />
        </div>
      </motion.section>

      {/* Live Activity */}
      <motion.section variants={fadeInUp} className="mb-8">
        <div className="bg-surface-raised rounded-xl border border-border p-6">
          <ActivityFeed limit={20} />
        </div>
      </motion.section>

      {/* Filters and Search */}
      <motion.div variants={fadeInUp} className="mb-6 space-y-4">
        <FilterBar
          selectedStage={selectedStage}
          onStageChange={setSelectedStage}
        />
        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Search by name, company, or email..."
        />
      </motion.div>

      {/* Kanban Board */}
      <motion.div variants={fadeInUp}>
        {filteredDeals.length === 0 ? (
          <div className="bg-surface-raised border border-border rounded-xl p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-text-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-3 text-sm font-semibold text-text-primary">No deals</h3>
            <p className="mt-1 text-sm text-text-secondary">
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
      </motion.div>

      <AnimatePresence>
        {showCreateModal && (
          <CreateDealModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              refetch();
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
