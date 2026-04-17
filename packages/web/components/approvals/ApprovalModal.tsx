'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Approval {
  id: number;
  dealId: number;
  approverEmail: string;
  itemType: string;
  itemId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestComment?: string;
  responseComment?: string;
  respondedAt?: string;
  createdAt: string;
  deal?: {
    id: number;
    leadName: string;
    leadCompany?: string;
    leadEmail: string;
    stage: string;
    proposal?: any;
  };
}

interface ApprovalModalProps {
  approval: Approval;
  onClose: () => void;
  onUpdate: (approvalId: number, status: 'approved' | 'rejected') => void;
}

export function ApprovalModal({ approval, onClose, onUpdate }: ApprovalModalProps) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !comment.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const endpoint = action === 'approve' ? '/approve' : '/reject';
      const body = action === 'approve'
        ? { approverComment: comment || null }
        : { reason: comment };

      const response = await fetch(`/api/approvals/${approval.id}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit response');
      }

      onUpdate(approval.id, action);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Review Approval Request
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700">Deal Information</h4>
              <dl className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Company</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {approval.deal?.leadCompany || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Contact</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {approval.deal?.leadName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Email</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {approval.deal?.leadEmail}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Stage</dt>
                  <dd className="text-sm font-medium text-gray-900 capitalize">
                    {approval.deal?.stage}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700">Request Details</h4>
              <dl className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Type</dt>
                  <dd className="text-sm font-medium text-gray-900 capitalize">
                    {approval.itemType}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Requested</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {new Date(approval.createdAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
              {approval.requestComment && (
                <div className="mt-2">
                  <dt className="text-sm text-gray-500">Comment</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {approval.requestComment}
                  </dd>
                </div>
              )}
            </div>

            {approval.deal?.proposal && (
              <div>
                <h4 className="text-sm font-medium text-gray-700">Proposal Preview</h4>
                <div className="mt-2 p-4 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-900">
                    {approval.deal.proposal.title}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Total: {approval.deal.proposal.pricing.currency}{' '}
                    {approval.deal.proposal.pricing.total.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                Comment {!comment.trim() ? '(required for rejection)' : '(optional)'}
              </label>
              <textarea
                id="comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                placeholder="Add your comments here..."
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button onClick={onClose} variant="outline" disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit('reject')}
                variant="destructive"
                disabled={submitting}
              >
                Reject
              </Button>
              <Button
                onClick={() => handleSubmit('approve')}
                disabled={submitting}
              >
                Approve
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
