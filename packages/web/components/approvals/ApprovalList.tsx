'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApprovalModal } from './ApprovalModal';
import { fetchPendingApprovals, type Approval } from '../../lib/api';

export function ApprovalList() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const data = await fetchPendingApprovals();
      setApprovals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'danger' | 'success' | 'warning' | 'info'> = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
    };
    return (
      <Badge variant={variants[status] || 'info'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleApprovalUpdate = (approvalId: number, newStatus: 'approved' | 'rejected') => {
    setApprovals((prev) =>
      prev.filter((a) => a.id !== approvalId)
    );
    if (selectedApproval?.id === approvalId) {
      setSelectedApproval(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading approvals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-red-800">{error}</p>
        <Button onClick={fetchApprovals} variant="secondary" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">No items pending approval.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Deal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Requested
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {approvals.map((approval) => (
              <tr key={approval.id} className="hover:bg-surface transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-text-primary">
                    {approval.deal?.leadCompany || approval.deal?.leadName}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {approval.deal?.leadEmail}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-primary capitalize">
                    {approval.itemType}
                  </div>
                  {approval.requestComment && (
                    <div className="text-sm text-text-secondary truncate max-w-xs">
                      {approval.requestComment}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {new Date(approval.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(approval.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    onClick={() => setSelectedApproval(approval)}
                    variant="secondary"
                    size="sm"
                  >
                    Review
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedApproval && (
        <ApprovalModal
          approval={selectedApproval}
          onClose={() => setSelectedApproval(null)}
          onUpdate={handleApprovalUpdate}
        />
      )}
    </>
  );
}
