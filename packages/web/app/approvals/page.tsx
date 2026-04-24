import { ApprovalList } from '@/components/approvals/ApprovalList';

export default function ApprovalsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="bg-surface-raised rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">
            Approval Queue
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
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
