'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Deal } from '@closepilot/core/src/types/deal';
import { X } from 'lucide-react';
import { format } from 'date-fns';

interface DealModalProps {
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DealModal({ deal, isOpen, onClose }: DealModalProps) {
  if (!deal) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 transition-opacity" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] bg-white p-6 shadow-lg sm:rounded-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-bold text-gray-900">
              {deal.leadCompany || 'Deal Details'}
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Lead Information</h3>
              <div className="bg-gray-50 p-3 rounded-md space-y-2">
                <div>
                  <span className="text-xs text-gray-500 block">Name</span>
                  <span className="text-sm text-gray-900">{deal.leadName}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Email</span>
                  <span className="text-sm text-gray-900">{deal.leadEmail}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Title</span>
                  <span className="text-sm text-gray-900">{deal.leadTitle || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Deal Status</h3>
              <div className="bg-gray-50 p-3 rounded-md space-y-2">
                <div>
                  <span className="text-xs text-gray-500 block">Stage</span>
                  <span className="text-sm font-medium capitalize px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {deal.stage.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Created At</span>
                  <span className="text-sm text-gray-900">
                    {format(new Date(deal.createdAt), 'PPP')}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Source</span>
                  <span className="text-sm text-gray-900 capitalize">{deal.source}</span>
                </div>
              </div>
            </div>

            {deal.companyResearch && (
              <div className="col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Company Research</h3>
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <p className="mb-2"><strong>Industry:</strong> {deal.companyResearch.industry || 'Unknown'}</p>
                  <p className="mb-2"><strong>Size:</strong> {deal.companyResearch.size || 'Unknown'}</p>
                  <p className="mb-2"><strong>Description:</strong> {deal.companyResearch.description || 'No description available.'}</p>
                </div>
              </div>
            )}

             {deal.projectScope && (
              <div className="col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Project Scope</h3>
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <p className="mb-2"><strong>Complexity:</strong> <span className="capitalize">{deal.projectScope.complexity}</span></p>
                  <p className="mb-2"><strong>Description:</strong> {deal.projectScope.description}</p>
                  {deal.projectScope.budgetRange && <p className="mb-2"><strong>Budget:</strong> {deal.projectScope.budgetRange}</p>}
                </div>
              </div>
            )}

            {deal.proposal && (
              <div className="col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Proposal</h3>
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <p className="mb-2"><strong>Total:</strong> {deal.proposal.pricing.currency} {deal.proposal.pricing.total}</p>
                  <p><strong>Summary:</strong> {deal.proposal.executiveSummary}</p>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}