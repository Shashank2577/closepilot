'use client';

import { useEffect, useState } from 'react';
import ApprovalList from '../../components/approvals/ApprovalList';

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

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/approvals/pending');
      const data = await res.json();
      if (Array.isArray(data)) {
        setApprovals(data);
      }
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();

    // TODO: Real-time SSE updates from J-115
    // const eventSource = new EventSource('/api/events');
    // eventSource.onmessage = (event) => {
    //   if (event.data === 'approvals_updated') {
    //     fetchApprovals();
    //   }
    // };
    // return () => eventSource.close();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Approval Queue</h1>
      {loading ? (
        <div>Loading approvals...</div>
      ) : (
        <ApprovalList approvals={approvals} onApprovalUpdated={fetchApprovals} />
      )}
    </div>
  );
}
