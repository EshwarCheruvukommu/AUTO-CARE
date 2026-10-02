import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Edit2, 
  Trash2, 
  Check, 
  ExternalLink,
  Wrench, 
  ShieldCheck, 
  FileCheck, 
  Disc, 
  Zap, 
  FileText, 
  Droplet,
  Tag,
  RotateCcw,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { VehicleReminder, ReminderType } from '../../types';
import { useVehicle } from '../../context/VehicleContext';
import { ReminderModal } from './ReminderModal';
import { ConfirmDialog } from '../common/Modal';
import { SectionVisualHeader } from '../common/SectionVisualHeader';
import { formatDate, getReminderStatus } from '../../utils/formatters';

interface RemindersViewProps {
  onNavigateTab: (tab: string) => void;
}

const TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Service: Wrench,
  Maintenance: Wrench,
  'Oil Change': Droplet,
  Insurance: ShieldCheck,
  PUC: FileCheck,
  Tyre: Disc,
  Battery: Zap,
  'Document Expiry': FileText,
  General: Bell,
  Other: Tag,
};

export const RemindersView: React.FC<RemindersViewProps> = ({ onNavigateTab }) => {
  const { 
    selectedVehicle, 
    allReminders, 
    loadingReminders, 
    reminderSummary,
    addReminder, 
    updateReminder, 
    deleteReminder, 
    toggleCompleteReminder 
  } = useVehicle();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'dueSoon' | 'overdue' | 'completed'>('all');
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingReminder, setEditingReminder] = useState<VehicleReminder | null>(null);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'due_asc' | 'due_desc'>('due_asc');

  const handleAdd = async (data: any) => {
    await addReminder(data);
  };

  const handleUpdate = async (data: any) => {
    if (!editingReminder) return;
    await updateReminder(editingReminder.id, data);
    setEditingReminder(null);
  };

  const confirmDelete = async () => {
    if (!deletingReminderId) return;
    try {
      setIsDeleting(true);
      await deleteReminder(deletingReminderId);
      setDeletingReminderId(null);
    } catch (err) {
      console.error('Error deleting reminder:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter reminders based on tab selection, search query, and sort order
  const filteredReminders = useMemo(() => {
    let result = allReminders.filter((r) => {
      const { dynamicStatus } = getReminderStatus(r.dueDate, r.status, r.completedAt);
      if (activeTab === 'pending' && dynamicStatus === 'Completed') return false;
      if (activeTab === 'dueSoon' && dynamicStatus !== 'Due Soon') return false;
      if (activeTab === 'overdue' && dynamicStatus !== 'Overdue') return false;
      if (activeTab === 'completed' && dynamicStatus !== 'Completed') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (r.title || '').toLowerCase().includes(q);
        const descMatch = (r.description || '').toLowerCase().includes(q);
        const typeMatch = (r.reminderType || '').toLowerCase().includes(q);
        return titleMatch || descMatch || typeMatch;
      }

      return true;
    });

    result.sort((a, b) => {
      const dateA = new Date(a.dueDate || '').getTime();
      const dateB = new Date(b.dueDate || '').getTime();
      return sortOrder === 'due_asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [allReminders, activeTab, searchQuery, sortOrder]);

  if (!selectedVehicle) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-[#0d1017] p-12 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto text-2xl mb-4">
          🚗
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Active Vehicle Selected</h3>
        <p className="text-sm text-gray-400 mb-6">
          Please add or select a vehicle first to view and manage in-app reminders and notifications.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 3D Section Visual Header */}
      <SectionVisualHeader
        sectionId="reminders"
        customTitle="Preventative Reminders & Deadlines"
        customTagline="Prioritized telemetry alerts (Overdue, Due Soon, Scheduled) with automatic duplicate prevention."
        activeVehicleInfo={`${selectedVehicle.name} • ${selectedVehicle.vehicleNumber}`}
        rightAction={
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFB020] via-amber-500 to-orange-500 hover:from-[#FFB020] hover:to-amber-400 text-black font-bold text-sm shadow-lg shadow-[#FFB020]/20 transition-all cursor-pointer btn-3d"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>Add Reminder</span>
          </button>
        }
      />

      {/* Summary Metrics Row (Section 13) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pending */}
        <div 
          onClick={() => setActiveTab('pending')}
          className={`p-5 rounded-2xl bg-[#0f131c] border transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'border-cyan-500/60 bg-cyan-950/20 shadow-md shadow-cyan-950/20'
              : 'border-gray-800/80 hover:border-gray-700/80'
          }`}
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pending
            </span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {reminderSummary.pending}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Awaiting action or due
          </span>
        </div>

        {/* Due Soon */}
        <div 
          onClick={() => setActiveTab('dueSoon')}
          className={`p-5 rounded-2xl bg-[#0f131c] border transition-all cursor-pointer ${
            activeTab === 'dueSoon'
              ? 'border-amber-500/60 bg-amber-950/20 shadow-md shadow-amber-950/20'
              : 'border-gray-800/80 hover:border-gray-700/80'
          }`}
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Due Soon
            </span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {reminderSummary.dueSoon}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Due within next 30 days
          </span>
        </div>

        {/* Overdue */}
        <div 
          onClick={() => setActiveTab('overdue')}
          className={`p-5 rounded-2xl bg-[#0f131c] border transition-all cursor-pointer ${
            activeTab === 'overdue'
              ? 'border-red-500/60 bg-red-950/20 shadow-md shadow-red-950/20'
              : 'border-gray-800/80 hover:border-gray-700/80'
          }`}
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Overdue
            </span>
            <span className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-red-400 font-mono">
            {reminderSummary.overdue}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Immediate action required
          </span>
        </div>

        {/* Completed */}
        <div 
          onClick={() => setActiveTab('completed')}
          className={`p-5 rounded-2xl bg-[#0f131c] border transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'border-emerald-500/60 bg-emerald-950/20 shadow-md shadow-emerald-950/20'
              : 'border-gray-800/80 hover:border-gray-700/80'
          }`}
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Completed
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {reminderSummary.completed}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Resolved reminders
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'text-gray-400 hover:text-gray-200 bg-gray-900/80 border border-gray-800'
          }`}
        >
          All ({allReminders.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm shadow-blue-500/10'
              : 'text-gray-400 hover:text-gray-200 bg-gray-900/80 border border-gray-800'
          }`}
        >
          Pending ({reminderSummary.pending})
        </button>
        <button
          onClick={() => setActiveTab('dueSoon')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'dueSoon'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/10'
              : 'text-gray-400 hover:text-gray-200 bg-gray-900/80 border border-gray-800'
          }`}
        >
          Due Soon ({reminderSummary.dueSoon})
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'overdue'
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm shadow-red-500/10'
              : 'text-gray-400 hover:text-gray-200 bg-gray-900/80 border border-gray-800'
          }`}
        >
          Overdue ({reminderSummary.overdue})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
              : 'text-gray-400 hover:text-gray-200 bg-gray-900/80 border border-gray-800'
          }`}
        >
          Completed ({reminderSummary.completed})
        </button>
      </div>

      {/* Search & Sort Bar for Reminders */}
      {allReminders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#0d1017] border border-gray-800">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reminders by title, type, or notes..."
              className="w-full bg-[#121622] border border-gray-800 focus:border-cyan-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder(prev => prev === 'due_asc' ? 'due_desc' : 'due_asc')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Toggle Due Date Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>{sortOrder === 'due_asc' ? 'Due Date: Earliest First' : 'Due Date: Latest First'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Reminder Cards Content */}
      {loadingReminders ? (
        <div className="flex items-center justify-center min-h-[220px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-[#0d1017] p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center mx-auto text-3xl mb-4">
            🛡️
          </div>
          <h3 className="text-lg font-bold text-white mb-2">You're all caught up</h3>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            {activeTab === 'all' 
              ? 'No pending reminders for this vehicle. All insurance, PUC, and service tasks are on schedule.'
              : `No ${activeTab} reminders found for ${selectedVehicle.name}.`}
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            + Add Reminder
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((reminder) => {
            const { dynamicStatus, label } = getReminderStatus(reminder.dueDate, reminder.status, reminder.completedAt);
            const isCompleted = dynamicStatus === 'Completed';
            const isOverdue = dynamicStatus === 'Overdue';
            const isDueSoon = dynamicStatus === 'Due Soon';
            const isUpcoming = dynamicStatus === 'Upcoming';
            const isDocDerived = reminder.sourceType === 'document';

            const IconComponent = TYPE_ICONS[reminder.reminderType] || Bell;

            return (
              <div
                key={reminder.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-[#0b0e14]/70 border-gray-800/60 opacity-80'
                    : isOverdue
                    ? 'bg-red-950/15 border-red-500/40 shadow-sm shadow-red-950/30'
                    : isDueSoon
                    ? 'bg-amber-950/15 border-amber-500/40 shadow-sm shadow-amber-950/30'
                    : 'bg-[#0f131c] border-gray-800/80 hover:border-gray-700/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Icon, Title, Badges, Due Date, Description */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 sm:mt-0 ${
                      isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : isOverdue
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : isDueSoon
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Top badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {/* Dynamic status badge */}
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isOverdue
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : isDueSoon
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
                          <span>
                            {isCompleted ? '🟢' : isOverdue ? '🔴' : isDueSoon ? '🟡' : '🔵'}
                          </span>
                          <span>{dynamicStatus}</span>
                        </span>

                        {/* Reminder type badge */}
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-gray-800 text-gray-300 border border-gray-700">
                          {reminder.reminderType}
                        </span>

                        {/* Priority badge */}
                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${
                          reminder.priority === 'High'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : reminder.priority === 'Medium'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                        }`}>
                          {reminder.priority} Priority
                        </span>

                        {/* Source Tag */}
                        {isDocDerived && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>Document Linked</span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className={`text-base font-bold text-white ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                        {reminder.title}
                      </h3>

                      {/* Description if present */}
                      {reminder.description && (
                        <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                          {reminder.description}
                        </p>
                      )}

                      {/* Target date & Days remaining calculation */}
                      <div className="text-xs text-gray-400 mt-2 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1.5 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          <span>Due: {formatDate(reminder.dueDate)}</span>
                        </span>

                        <span className="text-gray-600">•</span>

                        <span className={`font-semibold font-mono ${
                          isCompleted
                            ? 'text-emerald-400'
                            : isOverdue
                            ? 'text-red-400 font-bold'
                            : isDueSoon
                            ? 'text-amber-400 font-bold'
                            : 'text-blue-400'
                        }`}>
                          {label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/60">
                    {/* Document derived: View Document button */}
                    {isDocDerived ? (
                      <button
                        onClick={() => onNavigateTab('documents')}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <span>View Document</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : (
                      <>
                        {/* Complete / Reopen Button */}
                        <button
                          onClick={() => toggleCompleteReminder(reminder.id, !isCompleted)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                            isCompleted
                              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                          }`}
                          title={isCompleted ? 'Mark as Pending' : 'Mark as Complete'}
                        >
                          {isCompleted ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reopen</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Complete</span>
                            </>
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => setEditingReminder(reminder)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit Reminder"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeletingReminderId(reminder.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Reminder"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Reminder Modal */}
      {isAddOpen && (
        <ReminderModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAdd}
          defaultVehicleId={selectedVehicle.id}
          title="Create Vehicle Reminder"
        />
      )}

      {/* Edit Reminder Modal */}
      {editingReminder && (
        <ReminderModal
          isOpen={!!editingReminder}
          onClose={() => setEditingReminder(null)}
          onSubmit={handleUpdate}
          initialData={editingReminder}
          defaultVehicleId={selectedVehicle.id}
          title="Edit Vehicle Reminder"
        />
      )}

      {/* Delete Confirmation Dialog (Section 22) */}
      <ConfirmDialog
        isOpen={!!deletingReminderId}
        onClose={() => setDeletingReminderId(null)}
        onConfirm={confirmDelete}
        title="Delete this reminder?"
        message="Are you sure you want to delete this reminder? This action cannot be undone and will remove it from your pending alerts."
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
};
