import React from 'react';
import ApprovalBadge from './ApprovalBadge';

type ApprovalItem = {
  id: number;
  dealId: number;
  approverEmail: string;
  itemType: string;
  itemId: string;
  status: string;
  requestComment: string | null;
  responseComment: string | null;
  respondedAt: string | null;
  createdAt: string;
};

interface ApprovalHistoryProps {
  approvals: ApprovalItem[];
}

export default function ApprovalHistory({ approvals }: ApprovalHistoryProps) {
  if (!approvals || approvals.length === 0) {
    return (
      <div className="text-gray-500 text-sm mt-4">
        No approval history available.
      </div>
    );
  }

  return (
    <div className="mt-6 flow-root">
      <ul className="-mb-8">
        {approvals.map((approval, approvalIdx) => (
          <li key={approval.id}>
            <div className="relative pb-8">
              {approvalIdx !== approvals.length - 1 ? (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white bg-gray-100">
                    {/* Simple icon based on status */}
                    {approval.status === 'approved' ? '✓' : approval.status === 'rejected' ? '✕' : '⏳'}
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-900">
                        {approval.approverEmail}
                      </span>{' '}
                      reviewed <span>{approval.itemType}</span>
                    </p>
                    <div className="mt-2">
                      <ApprovalBadge status={approval.status} />
                    </div>
                    {approval.responseComment && (
                      <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                        "{approval.responseComment}"
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                    <time dateTime={approval.createdAt}>
                      {new Date(approval.respondedAt || approval.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
