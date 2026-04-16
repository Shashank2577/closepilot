import React, { useState } from 'react';

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

interface ApprovalModalProps {
  approval: ApprovalItem;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApprovalModal({ approval, onClose, onSuccess }: ApprovalModalProps) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !comment.trim()) {
      setError('A comment is required when rejecting.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = `http://localhost:3001/api/approvals/${approval.id}/${action}`;
      const payload = action === 'approve'
        ? { approverComment: comment }
        : { reason: comment };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action}`);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                Review Approval Request
              </h3>

              <div className="mt-4 space-y-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-700"><strong>Deal ID:</strong> {approval.dealId}</p>
                  <p className="text-sm text-gray-700"><strong>Item Type:</strong> {approval.itemType}</p>
                  <p className="text-sm text-gray-700"><strong>Item ID:</strong> {approval.itemId}</p>
                  {approval.requestComment && (
                    <div className="mt-2 text-sm text-gray-700">
                      <strong>Request Comment:</strong>
                      <p className="mt-1 text-gray-600 italic">{approval.requestComment}</p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                    Comment {<span className="text-gray-400 font-normal">(Required for rejection)</span>}
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="comment"
                      name="comment"
                      rows={4}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              disabled={loading}
              className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              onClick={() => handleAction('approve')}
            >
              Approve
            </button>
            <button
              type="button"
              disabled={loading}
              className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              onClick={() => handleAction('reject')}
            >
              Reject
            </button>
            <button
              type="button"
              disabled={loading}
              className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
