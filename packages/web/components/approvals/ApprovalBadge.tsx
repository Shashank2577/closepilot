import React from 'react';

interface ApprovalBadgeProps {
  status: string;
}

export default function ApprovalBadge({ status }: ApprovalBadgeProps) {
  let colorClasses = 'bg-gray-100 text-gray-800'; // default / pending

  if (status === 'approved') {
    colorClasses = 'bg-green-100 text-green-800';
  } else if (status === 'rejected') {
    colorClasses = 'bg-red-100 text-red-800';
  } else if (status === 'pending') {
    colorClasses = 'bg-yellow-100 text-yellow-800';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClasses}`}>
      {status}
    </span>
  );
}
