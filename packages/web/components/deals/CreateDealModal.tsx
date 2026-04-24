'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { createDeal } from '../../lib/api';

interface CreateDealModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateDealModal({ onClose, onSuccess }: CreateDealModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    leadEmail: '',
    leadName: '',
    leadCompany: '',
    leadTitle: '',
    source: 'manual' as 'gmail' | 'manual' | 'other',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.leadEmail || !form.leadName) {
      setError('Name and email are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createDeal({
        leadEmail: form.leadEmail,
        leadName: form.leadName,
        leadCompany: form.leadCompany || undefined,
        leadTitle: form.leadTitle || undefined,
        source: form.source,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50 p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="bg-surface-raised rounded-2xl max-w-lg w-full border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <div className="border-b p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">New Deal</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.leadName}
              onChange={(e) => setForm({ ...form, leadName: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={form.leadEmail}
              onChange={(e) => setForm({ ...form, leadEmail: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="john@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              value={form.leadCompany}
              onChange={(e) => setForm({ ...form, leadCompany: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Acme Inc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={form.leadTitle}
              onChange={(e) => setForm({ ...form, leadTitle: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="VP of Engineering"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value as 'gmail' | 'manual' | 'other' })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="manual">Manual</option>
              <option value="gmail">Gmail</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
