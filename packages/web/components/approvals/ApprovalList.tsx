import React, { useState } from 'react';
import ApprovalModal from './ApprovalModal';
import ApprovalBadge from './ApprovalBadge';

type ApprovalItem = {
  id: number;
  dealId: number;
  approverEmail: string;
  itemType: string;
  itemId: string;
  status: string;
  requestComment: string | null;
  createdAt: string;
};

interface ApprovalListProps {
  approvals: ApprovalItem[];
  onApprovalUpdated: () => void;
}

export default function ApprovalList({ approvals, onApprovalUpdated }: ApprovalListProps) {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);

  if (!approvals || approvals.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <p className="text-gray-500 text-center">No pending approvals found!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Deal ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Item Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Approver
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {approvals.map((approval) => (
            <tr key={approval.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                #{approval.dealId}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                {approval.itemType}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {approval.approverEmail}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <ApprovalBadge status={approval.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(approval.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => setSelectedApproval(approval)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedApproval && (
        <ApprovalModal
          approval={selectedApproval}
          onClose={() => setSelectedApproval(null)}
          onSuccess={() => {
            setSelectedApproval(null);
            onApprovalUpdated();
          }}
        />
      )}
    </div>
  );
}
