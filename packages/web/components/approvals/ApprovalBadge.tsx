'use client';

import { Badge } from '@/components/ui/badge';

interface ApprovalBadgeProps {
  status?: 'pending' | 'approved' | 'rejected';
}

export function ApprovalBadge({ status }: ApprovalBadgeProps) {
  if (!status) {
    return null;
  }

  const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
    pending: 'default',
    approved: 'secondary',
    rejected: 'destructive',
  };

  const labels: Record<string, string> = {
    pending: 'Approval Required',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  return (
    <Badge variant={variants[status] || 'default'}>
      {labels[status] || status}
    </Badge>
  );
}
