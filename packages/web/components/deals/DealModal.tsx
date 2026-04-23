'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Deal, DealStage } from '@closepilot/core';
import { Badge } from '../ui/badge';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { canDeleteDeal } from '../../lib/auth/roles';
import { useUserRole } from '../../lib/auth/UserRoleContext';
import { deleteDeal, updateDeal } from '../../lib/api';

interface DealModalProps {
  deal: Deal;
  onClose: () => void;
  onDealDeleted?: () => void;
  onDealUpdated?: () => void;
}

export function DealModal({ deal, onClose, onDealDeleted, onDealUpdated }: DealModalProps) {
  const { role } = useUserRole();
  const canDelete = canDeleteDeal(role);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    leadName: deal.leadName,
    leadCompany: deal.leadCompany || '',
    leadTitle: deal.leadTitle || '',
    leadEmail: deal.leadEmail,
  });

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
    <motion.div
      className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50 p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="bg-surface-raised rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                {!isEditing && (
                  <Button variant="secondary" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <input
                      type="text"
                      value={editData.leadName}
                      onChange={(e) => setEditData({ ...editData, leadName: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <input
                      type="email"
                      value={editData.leadEmail}
                      onChange={(e) => setEditData({ ...editData, leadEmail: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Company</label>
                    <input
                      type="text"
                      value={editData.leadCompany}
                      onChange={(e) => setEditData({ ...editData, leadCompany: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Title</label>
                    <input
                      type="text"
                      value={editData.leadTitle}
                      onChange={(e) => setEditData({ ...editData, leadTitle: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => {
                      setIsEditing(false);
                      setEditData({ leadName: deal.leadName, leadCompany: deal.leadCompany || '', leadTitle: deal.leadTitle || '', leadEmail: deal.leadEmail });
                    }}>
                      Cancel
                    </Button>
                    <Button
                      disabled={isSaving}
                      onClick={async () => {
                        setIsSaving(true);
                        try {
                          await updateDeal(String(deal.id), {
                            leadName: editData.leadName,
                            leadEmail: editData.leadEmail,
                            leadCompany: editData.leadCompany || undefined,
                            leadTitle: editData.leadTitle || undefined,
                          });
                          setIsEditing(false);
                          onDealUpdated?.();
                        } catch (err) {
                          console.error('Failed to update deal:', err);
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
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
              )}

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
            {canDelete && !confirmDelete && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete Deal
              </Button>
            )}
            {canDelete && confirmDelete && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-red-600 font-medium">Are you sure?</span>
                <Button
                  variant="danger"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    try {
                      await deleteDeal(String(deal.id));
                      onDealDeleted?.();
                      onClose();
                    } catch (err) {
                      console.error('Failed to delete deal:', err);
                      setIsDeleting(false);
                      setConfirmDelete(false);
                    }
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </Button>
                <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            )}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function getStageVariant(
  stage: DealStage
): 'success' | 'warning' | 'danger' | 'info' {
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
