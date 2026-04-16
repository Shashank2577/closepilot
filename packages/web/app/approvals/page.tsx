import { ApprovalList } from '@/components/approvals/ApprovalList';

export default function ApprovalsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Approval Queue
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Review and approve or reject pending requests
          </p>
        </div>
        <div className="px-6 py-4">
          <ApprovalList />
        </div>
      </div>
    </div>
  );
}
