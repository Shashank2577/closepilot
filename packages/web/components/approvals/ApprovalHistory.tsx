'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

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
}

interface ApprovalHistoryProps {
  dealId: number;
}

export function ApprovalHistory({ dealId }: ApprovalHistoryProps) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchApprovalHistory();
  }, [dealId]);

  const fetchApprovalHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/approvals/deal/${dealId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch approval history');
      }
      const data = await response.json();
      setApprovals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'default',
      approved: 'secondary',
      rejected: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading approval history...</div>;
  }

  if (error) {
    return (
      <Card className="p-4">
        <p className="text-sm text-red-600">{error}</p>
      </Card>
    );
  }

  if (approvals.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-500">No approval history for this deal.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">Approval History</h4>
      {approvals.map((approval) => (
        <Card key={approval.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {approval.itemType}
                </span>
                {getStatusBadge(approval.status)}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Requested: {new Date(approval.createdAt).toLocaleString()}
              </div>
              {approval.respondedAt && (
                <div className="text-sm text-gray-500">
                  Responded: {new Date(approval.respondedAt).toLocaleString()}
                </div>
              )}
            </div>
            <button
              onClick={() => setExpandedId(expandedId === approval.id ? null : approval.id)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {expandedId === approval.id ? 'Show less' : 'Show more'}
            </button>
          </div>

          {expandedId === approval.id && (
            <div className="mt-3 space-y-2 border-t pt-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Approver:</span>
                <span className="text-sm text-gray-900 ml-2">{approval.approverEmail}</span>
              </div>
              {approval.requestComment && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Request Comment:</span>
                  <p className="text-sm text-gray-900 mt-1">{approval.requestComment}</p>
                </div>
              )}
              {approval.responseComment && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Response Comment:</span>
                  <p className="text-sm text-gray-900 mt-1">{approval.responseComment}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
