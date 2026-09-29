import React, { useState, useEffect } from 'react';
import { ServiceType, ServiceRecord } from '../../types';
import { AlertCircle, Info, X, Loader2 } from 'lucide-react';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ServiceRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialData?: ServiceRecord | null;
  vehicleId: string;
  currentVehicleOdometer: number;
  title: string;
}

export const SERVICE_TYPES: ServiceType[] = [
  'General Service',
  'Oil Change',
  'Brake Service',
  'Tyre Service',
  'Battery Replacement',
  'AC Service',
  'Engine Repair',
  'Electrical Repair',
  'Suspension',
  'Wheel Alignment',
  'Wheel Balancing',
  'Car Wash / Detailing',
  'Other',
];

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  vehicleId,
  currentVehicleOdometer,
  title,
}) => {
  const [serviceType, setServiceType] = useState<ServiceType>(
    initialData?.serviceType || 'General Service'
  );
  const [serviceDate, setServiceDate] = useState(
    initialData?.serviceDate || initialData?.date || new Date().toISOString().split('T')[0]
  );
  const [odometer, setOdometer] = useState<string>(
    initialData ? String(initialData.odometer) : String(currentVehicleOdometer || 0)
  );
  const [cost, setCost] = useState<string>(
    initialData ? String(initialData.cost) : ''
  );
  const [serviceCenter, setServiceCenter] = useState(
    initialData?.serviceCenter || ''
  );
  const [description, setDescription] = useState(
    initialData?.description || initialData?.workPerformed || ''
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setServiceType(initialData.serviceType);
      setServiceDate(initialData.serviceDate || initialData.date || new Date().toISOString().split('T')[0]);
      setOdometer(String(initialData.odometer));
      setCost(String(initialData.cost));
      setServiceCenter(initialData.serviceCenter || '');
      setDescription(initialData.description || initialData.workPerformed || '');
      setNotes(initialData.notes || '');
    } else {
      setServiceType('General Service');
      setServiceDate(new Date().toISOString().split('T')[0]);
      setOdometer(String(currentVehicleOdometer || 0));
      setCost('');
      setServiceCenter('');
      setDescription('');
      setNotes('');
    }
    setError(null);
    setIsSubmitting(false);
  }, [initialData, isOpen, currentVehicleOdometer]);

  if (!isOpen) return null;

  const numOdometer = Number(odometer);
  const isHistoricalOdometer =
    !isNaN(numOdometer) &&
    numOdometer >= 0 &&
    currentVehicleOdometer > 0 &&
    numOdometer < currentVehicleOdometer;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vehicleId) {
      setError('No vehicle selected.');
      return;
    }

    if (!serviceType || !SERVICE_TYPES.includes(serviceType)) {
      setError('Please select a valid Service Type.');
      return;
    }

    if (!serviceDate) {
      setError('Please provide the Service Date.');
      return;
    }

    if (isNaN(numOdometer) || numOdometer < 0) {
      setError('Please provide a valid, non-negative odometer reading.');
      return;
    }

    const costNum = parseFloat(cost);
    if (isNaN(costNum) || costNum < 0) {
      setError('Please enter a valid, non-negative service cost.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        vehicleId,
        serviceType,
        serviceDate,
        odometer: Math.round(numOdometer),
        cost: costNum,
        serviceCenter: serviceCenter.trim() ? serviceCenter.trim() : null,
        description: description.trim() ? description.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      });
      onClose();
    } catch (err: any) {
      console.error('Service save failed:', err);
      setError(
        err?.message?.includes('permission')
          ? "You don't have permission to perform this action."
          : err?.message || 'Failed to save service record. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="fixed inset-0" onClick={isSubmitting ? undefined : onClose} />
      <div className="relative w-full max-w-lg bg-[#121620] border border-cyan-500/20 rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🔧</span> {title}
          </h3>
          {!isSubmitting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Service Type *
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                disabled={isSubmitting}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
              >
                {SERVICE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Service Date *
              </label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Odometer Reading (KM) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 20640"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-gray-500 focus:outline-none transition-colors"
              />
              {isHistoricalOdometer && (
                <p className="text-[11px] text-amber-400/90 mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>This service record is from an earlier odometer reading.</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Cost (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 2500"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Service Center (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Hyundai Authorized Service Center, MG Road"
              value={serviceCenter}
              onChange={(e) => setServiceCenter(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Description / Work Performed (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Engine oil and oil filter replaced, 40-point safety inspection done"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Next service recommended after 10,000 km"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : (initialData ? 'Update Record' : 'Save Record')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
