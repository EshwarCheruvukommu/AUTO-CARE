import React, { useState, useEffect } from 'react';
import { ExpenseCategory, ExpenseRecord } from '../../types';
import { AlertCircle, X, Loader2, Receipt } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ExpenseRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialData?: ExpenseRecord | null;
  vehicleId: string;
  title?: string;
}

const CATEGORIES: ExpenseCategory[] = [
  'Fuel',
  'Service',
  'Repair',
  'Insurance',
  'PUC',
  'Tyres',
  'Battery',
  'Accessories',
  'Washing / Detailing',
  'Parking',
  'Toll',
  'Other',
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  vehicleId,
  title,
}) => {
  const [category, setCategory] = useState<ExpenseCategory>('Fuel');
  const [amount, setAmount] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState<string>('');
  const [vendor, setVendor] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      const cat = initialData.category === 'Washing' ? 'Washing / Detailing' : initialData.category;
      setCategory(cat);
      setAmount(initialData.amount !== undefined ? String(initialData.amount) : '');
      setExpenseDate(
        initialData.expenseDate || initialData.date || new Date().toISOString().split('T')[0]
      );
      setDescription(initialData.description || '');
      setVendor(initialData.vendor || '');
      setNotes(initialData.notes || '');
    } else {
      setCategory('Fuel');
      setAmount('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setVendor('');
      setNotes('');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!category || !CATEGORIES.includes(category)) {
      setError('Please select a valid expense category');
      return;
    }

    if (!expenseDate) {
      setError('Please select the expense date');
      return;
    }

    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('Please enter a valid expense amount greater than 0');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description for this expense');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        vehicleId,
        category,
        amount: amtNum,
        expenseDate,
        date: expenseDate,
        description: description.trim(),
        vendor: vendor.trim() ? vendor.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      });
      onClose();
    } catch (err: any) {
      console.error('Error submitting expense:', err);
      setError(err?.message || 'Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#121620] border border-cyan-500/20 rounded-2xl shadow-2xl p-6 z-10 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {title || (initialData ? 'Edit Expense Record' : 'Record New Expense')}
              </h3>
              <p className="text-xs text-gray-400">
                Log and categorize automotive expenses for this vehicle
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Expense Date *
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Amount & Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="e.g. 2500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Vendor / Merchant <span className="text-gray-500 font-normal lowercase">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Fastag, Shell, 3M Car Care"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Description *
            </label>
            <input
              type="text"
              placeholder="e.g. Synthetic 5W30 engine oil + oil filter replacement"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Additional Notes <span className="text-gray-500 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Invoice #48291, paid via credit card, warranty valid for 1 year"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors resize-none custom-scrollbar"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{initialData ? 'Update Expense' : 'Save Expense'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
