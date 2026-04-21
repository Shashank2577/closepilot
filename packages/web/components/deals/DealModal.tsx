'use client';

import React from 'react';
import { Deal, DealStage, UserRole } from '@closepilot/core';
import { Badge } from '../ui/badge';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useRBAC } from '../../lib/auth/roles';

interface DealModalProps {
  deal: Deal;
  onClose: () => void;
}

export function DealModal({ deal, onClose }: DealModalProps) {
  const { hasAccess: canDelete } = useRBAC(UserRole.MANAGER);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{deal.leadName}</h2>
            {deal.leadCompany && (
              <p className="text-lg text-gray-600 mt-1">{deal.leadCompany}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Basic Information</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{deal.leadEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="text-gray-900">{deal.leadTitle || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Stage</label>
                  <div className="mt-1">
                    <Badge variant={getStageVariant(deal.stage)}>
                      {deal.stage.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Created
                  </label>
                  <p className="text-gray-900">{formatDate(deal.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Source</label>
                  <p className="text-gray-900 capitalize">{deal.source}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Last Updated
                  </label>
                  <p className="text-gray-900">{formatDate(deal.updatedAt)}</p>
                </div>
              </div>

              {deal.assignedAgent && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Assigned Agent
                  </label>
                  <p className="text-gray-900">{deal.assignedAgent}</p>
                </div>
              )}

              {deal.approvalStatus && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Approval Status
                  </label>
                  <div className="mt-1">
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
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Research */}
          {deal.companyResearch && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Company Research</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Industry
                  </label>
                  <p className="text-gray-900">
                    {deal.companyResearch.industry || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Size</label>
                  <p className="text-gray-900">
                    {deal.companyResearch.size || 'N/A'}
                  </p>
                </div>
                {deal.companyResearch.website && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Website
                    </label>
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
                    <label className="text-sm font-medium text-gray-500">
                      Description
                    </label>
                    <p className="text-gray-900">
                      {deal.companyResearch.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Project Scope */}
          {deal.projectScope && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Project Scope</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="text-gray-900 font-medium">
                    {deal.projectScope.title}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Description
                  </label>
                  <p className="text-gray-900">{deal.projectScope.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Timeline
                    </label>
                    <p className="text-gray-900">
                      {deal.projectScope.timeline || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Budget Range
                    </label>
                    <p className="text-gray-900">
                      {deal.projectScope.budgetRange || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Complexity
                    </label>
                    <p className="text-gray-900 capitalize">
                      {deal.projectScope.complexity}
                    </p>
                  </div>
                </div>
                {deal.projectScope.services?.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Services
                    </label>
                    <ul className="list-disc list-inside text-gray-900 mt-1">
                      {deal.projectScope.services.map((service, idx) => (
                        <li key={idx}>{service}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Proposal */}
          {deal.proposal && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Proposal</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="text-gray-900 font-medium">{deal.proposal.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Executive Summary
                  </label>
                  <p className="text-gray-900">{deal.proposal.executiveSummary}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Total Amount
                    </label>
                    <p className="text-gray-900 font-semibold">
                      {deal.proposal?.pricing.currency}{' '}
                      {deal.proposal?.pricing.total.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Timeline
                    </label>
                    <p className="text-gray-900">{deal.proposal.timeline}</p>
                  </div>
                </div>
                {deal.proposal?.pricing.breakdown?.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Pricing Breakdown
                    </label>
                    <ul className="space-y-1 mt-2">
                      {deal.proposal.pricing.breakdown.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex justify-between text-sm text-gray-900"
                        >
                          <span>{item.service}</span>
                          <span className="font-medium">
                            {deal.proposal?.pricing.currency} {item.amount}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            {canDelete && (
              <Button variant="danger" onClick={() => console.log('Delete logic goes here')}>
                Delete Deal
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStageVariant(
  stage: DealStage
): 'success' | 'warning' | 'danger' | 'info' {
  switch (stage) {
    case DealStage.INGESTION:
    case DealStage.ENRICHMENT:
      return 'info';
    case DealStage.SCOPING:
    case DealStage.PROPOSAL:
      return 'warning';
    case DealStage.CRM_SYNC:
    case DealStage.COMPLETED:
      return 'success';
    case DealStage.FAILED:
      return 'danger';
    default:
      return 'info';
  }
}
