import React, { useState, useEffect } from 'react';
import { ReminderType, ReminderPriority, VehicleReminder } from '../../types';
import { useVehicle } from '../../context/VehicleContext';
import { AlertCircle, X, Loader2, Bell } from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<VehicleReminder, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'completedAt'>) => Promise<void>;
  initialData?: VehicleReminder | null;
  defaultVehicleId?: string;
  title?: string;
}

const REMINDER_TYPES: ReminderType[] = [
  'Service',
  'Maintenance',
  'Oil Change',
  'Insurance',
  'PUC',
  'Tyre',
  'Battery',
  'Document Expiry',
  'General',
  'Other',
];

const PRIORITIES: ReminderPriority[] = ['Low', 'Medium', 'High'];

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultVehicleId,
  title,
}) => {
  const { vehicles, selectedVehicle } = useVehicle();

  const [vehicleId, setVehicleId] = useState<string>(
    initialData?.vehicleId || defaultVehicleId || selectedVehicle?.id || ''
  );
  const [reminderTitle, setReminderTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [reminderType, setReminderType] = useState<ReminderType>('Service');
  const [dueDate, setDueDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [priority, setPriority] = useState<ReminderPriority>('Medium');
  const [status, setStatus] = useState<'Pending' | 'Completed'>('Pending');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      setVehicleId(initialData.vehicleId);
      setReminderTitle(initialData.title);
      setDescription(initialData.description || '');
      setReminderType(initialData.reminderType);
      setDueDate(initialData.dueDate);
      setPriority(initialData.priority || 'Medium');
      setStatus(initialData.status || 'Pending');
    } else {
      setVehicleId(defaultVehicleId || selectedVehicle?.id || (vehicles[0]?.id ?? ''));
      setReminderTitle('');
      setDescription('');
      setReminderType('Service');
      setDueDate(new Date().toISOString().split('T')[0]);
      setPriority('Medium');
      setStatus('Pending');
    }
    setError('');
  }, [initialData, isOpen, defaultVehicleId, selectedVehicle, vehicles]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!vehicleId) {
      setError('Please select a vehicle');
      return;
    }

    if (!reminderTitle.trim()) {
      setError('Please enter a reminder title');
      return;
    }

    if (!reminderType || !REMINDER_TYPES.includes(reminderType)) {
      setError('Please select a valid reminder type');
      return;
    }

    if (!dueDate) {
      setError('Please select a due date');
      return;
    }

    if (!priority || !PRIORITIES.includes(priority)) {
      setError('Please select a valid priority');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        vehicleId,
        title: reminderTitle.trim(),
        description: description.trim() ? description.trim() : null,
        reminderType,
        dueDate,
        priority,
        status,
        sourceType: initialData?.sourceType || 'custom',
        sourceId: initialData?.sourceId || null,
      });
      onClose();
    } catch (err: any) {
      console.error('Error submitting reminder:', err);
      setError(err?.message || 'Unable to save reminder. Please try again.');
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
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {title || (initialData ? 'Edit Reminder' : 'Create New Reminder')}
              </h3>
              <p className="text-xs text-gray-400">
                Schedule maintenance, document renewal, or inspection alerts
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
          {/* Vehicle Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Vehicle *
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
              required
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.vehicleNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Reminder Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Next General Service, Test Insurance Renewal"
              value={reminderTitle}
              onChange={(e) => setReminderTitle(e.target.value)}
              required
              className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Reminder Type *
              </label>
              <select
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value as ReminderType)}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
                required
              >
                {REMINDER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ReminderPriority)}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
                required
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p} Priority
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date & (Optional Status if editing) */}
          <div className={`grid grid-cols-1 ${initialData ? 'sm:grid-cols-2' : ''} gap-4`}>
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
              />
            </div>

            {initialData && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Pending' | 'Completed')}
                  className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Description <span className="text-gray-500 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Authorized dealership service, replace engine oil & oil filter"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                <span>{initialData ? 'Update Reminder' : 'Save Reminder'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
