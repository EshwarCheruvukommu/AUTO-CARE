import React, { useState, useEffect } from 'react';
import { X, Wrench, Plus, Gauge, Calendar, Sparkles, Check, Edit2 } from 'lucide-react';
import { CustomMaintenanceRule } from '../../types';

interface CustomRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRule: (rule: Omit<CustomMaintenanceRule, 'id' | 'createdAt' | 'userId' | 'updatedAt'>) => Promise<void> | void;
  initialData?: CustomMaintenanceRule | null;
  vehicleId?: string;
  vehicleName?: string;
  currentVehicleOdometer?: number;
}

const CATEGORIES: Array<CustomMaintenanceRule['category']> = [
  'Fluids',
  'Filters',
  'Tyres & Brakes',
  'Electrical',
  'Engine & Transmission',
  'General',
];

const SOURCES: Array<CustomMaintenanceRule['source']> = [
  'Personal',
  'Custom',
  'Service Center',
  'Manufacturer',
];

export const CustomRuleModal: React.FC<CustomRuleModalProps> = ({
  isOpen,
  onClose,
  onSaveRule,
  initialData,
  vehicleId,
  vehicleName,
  currentVehicleOdometer = 0,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CustomMaintenanceRule['category']>('General');
  const [intervalKm, setIntervalKm] = useState<string>('10000');
  const [intervalMonths, setIntervalMonths] = useState<string>('12');
  const [startingOdometer, setStartingOdometer] = useState<string>('0');
  const [source, setSource] = useState<CustomMaintenanceRule['source']>('Custom');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setCategory(initialData.category || 'General');
      setIntervalKm(String(initialData.intervalKm || 10000));
      setIntervalMonths(initialData.intervalMonths ? String(initialData.intervalMonths) : '');
      setStartingOdometer(
        initialData.startingOdometer !== undefined && initialData.startingOdometer !== null
          ? String(initialData.startingOdometer)
          : String(currentVehicleOdometer ?? 0)
      );
      setSource(initialData.source || 'Custom');
      setDescription(initialData.description || '');
      setEnabled(initialData.enabled !== undefined ? initialData.enabled : true);
    } else {
      setName('');
      setCategory('General');
      setIntervalKm('10000');
      setIntervalMonths('12');
      setStartingOdometer(String(currentVehicleOdometer ?? 0));
      setSource('Custom');
      setDescription('');
      setEnabled(true);
    }
    setError(null);
    setIsSubmitting(false);
  }, [initialData, isOpen, currentVehicleOdometer]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please provide a maintenance item name (e.g. "AC Service", "Brake Inspection", "Tyre Rotation").');
      return;
    }

    const km = parseInt(intervalKm, 10);
    if (isNaN(km) || km <= 0) {
      setError('Interval in kilometers must be a positive number greater than 0.');
      return;
    }

    const months = intervalMonths.trim() ? parseInt(intervalMonths, 10) : undefined;
    if (months !== undefined && (isNaN(months) || months <= 0)) {
      setError('Interval in months must be a positive number if provided.');
      return;
    }

    const startOdo = parseInt(startingOdometer, 10);
    const validStartOdo = isNaN(startOdo) || startOdo < 0 ? 0 : startOdo;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSaveRule({
        name: trimmedName,
        category,
        intervalKm: km,
        intervalMonths: months,
        startingOdometer: validStartOdo,
        source,
        ruleType: 'whichever_first',
        description: description.trim() || undefined,
        enabled,
        vehicleId,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to save custom rule:', err);
      setError(err?.message || 'Failed to save maintenance rule. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEdit = Boolean(initialData);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-[#0e121c] border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-gray-800/80 bg-[#121624] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400">
              {isEdit ? <Edit2 className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{isEdit ? 'Edit Custom Maintenance Rule' : 'Add Custom Maintenance Rule'}</span>
              </h3>
              <p className="text-xs text-gray-400">
                {vehicleName ? `Configuring rule for ${vehicleName}` : 'Personal vehicle maintenance interval'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg bg-gray-900 text-gray-400 hover:text-white border border-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-semibold text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Maintenance Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AC Service, Brake Inspection, Tyre Rotation, Coolant Flush"
              className="w-full bg-[#141926] border border-gray-800 focus:border-purple-500/50 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                disabled={isSubmitting}
                className="w-full bg-[#141926] border border-gray-800 focus:border-purple-500/50 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                disabled={isSubmitting}
                className="w-full bg-[#141926] border border-gray-800 focus:border-purple-500/50 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>Interval (KM) *</span>
              </label>
              <input
                type="number"
                min="100"
                step="500"
                value={intervalKm}
                onChange={(e) => setIntervalKm(e.target.value)}
                placeholder="10000"
                className="w-full bg-[#141926] border border-gray-800 focus:border-cyan-500/50 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none font-mono"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Interval (Months, Optional)</span>
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={intervalMonths}
                onChange={(e) => setIntervalMonths(e.target.value)}
                placeholder="e.g. 6 or 12"
                className="w-full bg-[#141926] border border-gray-800 focus:border-emerald-500/50 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none font-mono"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-purple-400" />
              <span>Starting / Baseline Odometer (KM)</span>
            </label>
            <input
              type="number"
              min="0"
              value={startingOdometer}
              onChange={(e) => setStartingOdometer(e.target.value)}
              placeholder="0"
              className="w-full bg-[#141926] border border-gray-800 focus:border-purple-500/50 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none font-mono"
              disabled={isSubmitting}
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Next Due will be calculated as Baseline Odometer + Interval (e.g. {Number(startingOdometer || 0) + Number(intervalKm || 10000)} KM).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Clean condenser, check refrigerant pressure"
              disabled={isSubmitting}
              className="w-full bg-[#141926] border border-gray-800 focus:border-purple-500/50 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="enabledRule"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 rounded text-purple-500 focus:ring-purple-400 bg-gray-900 border-gray-700"
            />
            <label htmlFor="enabledRule" className="text-xs text-gray-300 cursor-pointer">
              Active rule (calculate next due and track maintenance status)
            </label>
          </div>

          {/* Modal Buttons */}
          <div className="pt-4 border-t border-gray-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isEdit ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{isSubmitting ? 'Saving...' : isEdit ? 'Update Rule' : 'Save Maintenance Rule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
