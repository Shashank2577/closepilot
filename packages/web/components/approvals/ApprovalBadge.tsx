'use client';

import { Badge } from '@/components/ui/badge';

interface ApprovalBadgeProps {
  status?: 'pending' | 'approved' | 'rejected';
}

export function ApprovalBadge({ status }: ApprovalBadgeProps) {
  if (!status) {
    return null;
  }

  const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | undefined> = {
    pending: undefined,
    approved: 'warning',
    rejected: 'danger',
  };

  const labels: Record<string, string> = {
    pending: 'Approval Required',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  return (
    <Badge variant={variants[status]}>
      {labels[status] || status}
    </Badge>
  );
}
