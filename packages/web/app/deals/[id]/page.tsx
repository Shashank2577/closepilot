'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { fetchDeal } from '@/lib/api';
import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { ApprovalHistory } from '@/components/approvals/ApprovalHistory';
import { Badge } from '@/components/ui/badge';
import { DealStage } from '@closepilot/core';

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

function getStageVariant(stage: DealStage): 'success' | 'warning' | 'danger' | 'info' {
  switch (stage) {
    case DealStage.INGESTION:
    case DealStage.ENRICHMENT:
    case DealStage.QUALIFIED:
    case DealStage.OUTREACH_SENT:
    case DealStage.MEETING_BOOKED:
      return 'info';
    case DealStage.SCOPING:
    case DealStage.PROPOSAL:
    case DealStage.PROPOSAL_SENT:
    case DealStage.FOLLOW_UP_1:
    case DealStage.FOLLOW_UP_2:
    case DealStage.NEGOTIATING:
    case DealStage.PROPOSAL_REVISED:
      return 'warning';
    case DealStage.CRM_SYNC:
    case DealStage.CLOSED_WON:
    case DealStage.COMPLETED:
      return 'success';
    case DealStage.CLOSED_LOST:
    case DealStage.STALLED:
    case DealStage.FAILED:
      return 'danger';
    default:
      return 'info';
  }
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: deal, isLoading, error } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => fetchDeal(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
          <p className="mt-4 text-gray-600">Loading deal...</p>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4">
          <a href="/" className="text-blue-600 hover:text-blue-800">
            &larr; Back to Dashboard
          </a>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-red-700">
            {error instanceof Error ? error.message : 'Failed to load deal.'}
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <motion.div
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Back link */}
      <motion.div variants={fadeInUp} className="mb-4">
        <a href="/" className="text-primary-600 hover:text-primary-800 text-sm font-medium">
          &larr; Back to Dashboard
        </a>
      </motion.div>

      {/* Header */}
      <motion.div variants={fadeInUp} className="bg-surface-raised rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">{deal.leadName}</h1>
            {deal.leadCompany && (
              <p className="text-lg text-text-secondary mt-1">{deal.leadCompany}</p>
            )}
          </div>
          <Badge variant={getStageVariant(deal.stage)}>
            {deal.stage.replace('_', ' ')}
          </Badge>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead Information */}
          <div className="bg-surface-raised rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-500">Email</span>
                <p className="text-gray-900">{deal.leadEmail}</p>
              </div>
              <div>
                <span className="font-medium text-gray-500">Title</span>
                <p className="text-gray-900">{deal.leadTitle || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-500">Source</span>
                <p className="text-gray-900 capitalize">{deal.source}</p>
              </div>
              <div>
                <span className="font-medium text-gray-500">Created</span>
                <p className="text-gray-900">{formatDate(deal.createdAt)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-500">Last Updated</span>
                <p className="text-gray-900">{formatDate(deal.updatedAt)}</p>
              </div>
              {deal.assignedAgent && (
                <div>
                  <span className="font-medium text-gray-500">Assigned Agent</span>
                  <p className="text-gray-900">{deal.assignedAgent}</p>
                </div>
              )}
            </div>
          </div>

          {/* Company Research */}
          {deal.companyResearch && (
            <div className="bg-surface-raised rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Research</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Industry</span>
                  <p className="text-gray-900">{deal.companyResearch.industry || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Size</span>
                  <p className="text-gray-900">{deal.companyResearch.size || 'N/A'}</p>
                </div>
                {deal.companyResearch.website && (
                  <div>
                    <span className="font-medium text-gray-500">Website</span>
                    <a
                      href={deal.companyResearch.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline block"
                    >
                      {deal.companyResearch.website}
                    </a>
                  </div>
                )}
                {deal.companyResearch.description && (
                  <div>
                    <span className="font-medium text-gray-500">Description</span>
                    <p className="text-gray-900">{deal.companyResearch.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project Scope */}
          {deal.projectScope && (
            <div className="bg-surface-raised rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Scope</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Title</span>
                  <p className="text-gray-900 font-medium">{deal.projectScope.title}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Description</span>
                  <p className="text-gray-900">{deal.projectScope.description}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="font-medium text-gray-500">Timeline</span>
                    <p className="text-gray-900">{deal.projectScope.timeline || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Budget Range</span>
                    <p className="text-gray-900">{deal.projectScope.budgetRange || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Complexity</span>
                    <p className="text-gray-900 capitalize">{deal.projectScope.complexity}</p>
                  </div>
                </div>
                {deal.projectScope.services?.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-500">Services</span>
                    <ul className="list-disc list-inside text-gray-900 mt-1">
                      {deal.projectScope.services.map((service: string, idx: number) => (
                        <li key={idx}>{service}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Proposal */}
          {deal.proposal && (
            <div className="bg-surface-raised rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Proposal</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Title</span>
                  <p className="text-gray-900 font-medium">{deal.proposal.title}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Executive Summary</span>
                  <p className="text-gray-900">{deal.proposal.executiveSummary}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-500">Total Amount</span>
                    <p className="text-gray-900 font-semibold">
                      {deal.proposal.pricing.currency}{' '}
                      {deal.proposal.pricing.total.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Timeline</span>
                    <p className="text-gray-900">{deal.proposal.timeline}</p>
                  </div>
                </div>
                {deal.proposal.pricing.breakdown?.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-500">Pricing Breakdown</span>
                    <ul className="space-y-1 mt-2">
                      {deal.proposal.pricing.breakdown.map((item: { service: string; amount: number }, idx: number) => (
                        <li key={idx} className="flex justify-between text-gray-900">
                          <span>{item.service}</span>
                          <span className="font-medium">
                            {deal.proposal?.pricing.currency} {item.amount}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="bg-surface-raised rounded-xl border border-border p-6">
            <ActivityTimeline dealId={Number(deal.id)} />
          </div>
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-6">
          {/* Deal Status */}
          <div className="bg-surface-raised rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Status</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Stage</span>
                <Badge variant={getStageVariant(deal.stage)}>
                  {deal.stage.replace('_', ' ')}
                </Badge>
              </div>
              {deal.approvalStatus && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Approval</span>
                  <Badge
                    variant={
                      deal.approvalStatus === 'approved'
                        ? 'success'
                        : deal.approvalStatus === 'rejected'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {deal.approvalStatus}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Approval History */}
          <div className="bg-surface-raised rounded-xl border border-border p-6">
            <ApprovalHistory dealId={Number(deal.id)} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
