import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Gauge, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Bell, 
  ChevronRight, 
  ShieldCheck, 
  Filter,
  Wrench,
  Info,
  Car,
  Tag,
  Trash2,
  Edit2
} from 'lucide-react';
import { useVehicle } from '../../context/VehicleContext';
import { computeMaintenanceSchedule, MaintenanceScheduleItem } from '../../utils/maintenanceSchedule';
import { formatOdometer, formatDate } from '../../utils/formatters';
import { CustomRuleModal } from './CustomRuleModal';
import { CustomMaintenanceRule } from '../../types';

interface MaintenanceScheduleViewProps {
  onLogService: (initialServiceType?: string) => void;
  onAddReminder: (title: string, dueDate: string, type: any) => void;
}

export const MaintenanceScheduleView: React.FC<MaintenanceScheduleViewProps> = ({
  onLogService,
  onAddReminder,
}) => {
  const { selectedVehicle, services, fuelRecords, allReminders, customRules, addCustomRule, updateCustomRule, deleteCustomRule } = useVehicle();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [addedReminderIds, setAddedReminderIds] = useState<Set<string>>(new Set());
  const [isCustomRuleModalOpen, setIsCustomRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomMaintenanceRule | null>(null);

  const handleOpenAddCustomRule = () => {
    setEditingRule(null);
    setIsCustomRuleModalOpen(true);
  };

  const handleOpenEditCustomRule = (ruleId: string) => {
    const r = customRules.find(rule => rule.id === ruleId);
    if (r) {
      setEditingRule(r);
      setIsCustomRuleModalOpen(true);
    }
  };

  const handleDeleteRule = async (ruleId: string, ruleName: string) => {
    if (window.confirm(`Are you sure you want to delete the custom maintenance rule "${ruleName}"?`)) {
      try {
        await deleteCustomRule(ruleId);
      } catch (err) {
        console.error('Failed to delete rule:', err);
      }
    }
  };

  const handleSaveCustomRule = async (ruleData: Omit<CustomMaintenanceRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingRule) {
        await updateCustomRule(editingRule.id, ruleData);
      } else {
        await addCustomRule(ruleData);
      }
    } catch (err) {
      console.warn('Failed to save custom rule:', err);
    }
  };

  const scheduleResult = useMemo(() => {
    if (!selectedVehicle) return null;
    return computeMaintenanceSchedule(selectedVehicle, services, fuelRecords, customRules);
  }, [selectedVehicle, services, fuelRecords, customRules]);

  if (!selectedVehicle || !scheduleResult) {
    return null;
  }

  const { items, dailyKmAverage, overdueCount, dueSoonCount, goodCount, overallHealthRating } = scheduleResult;

  const categories = ['All', 'Fluids', 'Filters', 'Tyres & Brakes', 'Electrical', 'Engine & Transmission', 'General'];

  const filteredItems = items.filter((item) => {
    if (selectedCategory === 'All') return true;
    return item.category === selectedCategory;
  });

  const handleCreateReminder = async (item: MaintenanceScheduleItem) => {
    // Duplicate Protection (Bug #9 & #11): Check if identical reminder already exists in allReminders or locally added
    const cleanItemName = item.name.toLowerCase().trim();
    const alreadyExists = allReminders.some((r) => {
      const titleLower = r.title.toLowerCase();
      return (
        titleLower.includes(cleanItemName) ||
        (cleanItemName.includes('oil') && titleLower.includes('oil')) ||
        (cleanItemName.includes('tyre') && titleLower.includes('tyre')) ||
        (cleanItemName.includes('brake') && titleLower.includes('brake'))
      );
    });

    if (alreadyExists || addedReminderIds.has(item.id)) {
      setAddedReminderIds((prev) => new Set(prev).add(item.id));
      alert(`A reminder for "${item.name}" already exists for this vehicle. Duplicate reminder prevented.`);
      return;
    }

    try {
      const type = item.category === 'Tyres & Brakes' ? 'Tyre' :
                   item.category === 'Electrical' ? 'Battery' :
                   item.id.includes('oil') ? 'Oil Change' : 'Maintenance';

      await onAddReminder(
        `${item.name} Due`,
        item.nextDueDate,
        type
      );
      setAddedReminderIds((prev) => new Set(prev).add(item.id));
    } catch (err) {
      console.error('Failed to create reminder from schedule:', err);
    }
  };

  const getStatusBadge = (status: MaintenanceScheduleItem['status']) => {
    switch (status) {
      case 'Critical Overdue':
        return {
          bg: 'bg-red-600/20 border-red-500/50 text-red-300 animate-pulse',
          icon: AlertTriangle,
          label: 'CRITICAL OVERDUE',
        };
      case 'Overdue':
        return {
          bg: 'bg-red-500/15 border-red-500/30 text-red-400',
          icon: AlertTriangle,
          label: 'OVERDUE',
        };
      case 'Due Soon':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          icon: Clock,
          label: 'DUE SOON',
        };
      case 'On Schedule':
      case 'Good':
      default:
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          icon: CheckCircle2,
          label: 'ON SCHEDULE',
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* AI Predictive Intelligence Header Card */}
      <div className="relative rounded-3xl overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-[#0c121e] via-[#0f1726] to-[#0c101a] p-6 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>AI PREDICTIVE MAINTENANCE ENGINE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Maintenance Schedule &amp; Due Predictions
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              AutoCare analyzes your vehicle's current odometer ({formatOdometer(selectedVehicle.currentOdometer)}), service history, and estimated daily driving pace ({dailyKmAverage} km/day) to predict upcoming component maintenance intervals.
            </p>
          </div>

          {/* Quick Metrics Cluster */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-gray-900/80 border border-gray-800 text-center min-w-[100px]">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</div>
              <div className={`text-sm font-extrabold mt-0.5 ${
                overallHealthRating === 'Critical Overdue' ? 'text-red-400' :
                overallHealthRating === 'Attention Required' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {overallHealthRating}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-900/80 border border-gray-800 text-center min-w-[90px]">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overdue</div>
              <div className="text-xl font-black text-red-400 font-mono mt-0.5">
                {overdueCount}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-900/80 border border-gray-800 text-center min-w-[90px]">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Due Soon</div>
              <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
                {dueSoonCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Chips & Add Custom Rule */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 pl-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/25 font-bold'
                  : 'bg-gray-900/80 text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={handleOpenAddCustomRule}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span>+ Add Custom Maintenance Rule</span>
        </button>
      </div>

      {/* Maintenance Schedule Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const badge = getStatusBadge(item.status);
          const BadgeIcon = badge.icon;
          const isOverdue = item.status === 'Overdue';
          const isDueSoon = item.status === 'Due Soon';
          const isReminderCreated = addedReminderIds.has(item.id);

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-5 transition-all relative flex flex-col justify-between ${
                isOverdue
                  ? 'bg-[#150e12] border-red-500/40 shadow-lg shadow-red-950/20'
                  : isDueSoon
                  ? 'bg-[#15120e] border-amber-500/40 shadow-lg shadow-amber-950/20'
                  : 'bg-[#0f131c] border-gray-800 hover:border-gray-700'
              }`}
            >
              <div>
                {/* Header: Title and Status Badge */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {item.name}
                      </h3>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                        {item.category}
                      </span>
                      {item.source && (
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                          item.isCustom
                            ? 'bg-purple-950/60 text-purple-300 border-purple-500/30'
                            : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30'
                        }`}>
                          {item.source}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-black tracking-wider flex items-center gap-1 shrink-0 ${badge.bg}`}>
                    <BadgeIcon className="w-3 h-3" />
                    <span>{badge.label}</span>
                  </div>
                </div>

                {/* Intervals & Prediction Grid */}
                <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-xl bg-black/30 border border-gray-800/80">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-cyan-400" />
                      <span>Next Due Odometer</span>
                    </div>
                    <div className="text-sm font-extrabold text-cyan-300 font-mono mt-0.5">
                      {formatOdometer(item.nextDueOdometer)}
                    </div>
                    <div className={`text-[11px] font-semibold mt-0.5 ${
                      item.remainingKm <= 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {item.remainingKm <= 0
                        ? `Overdue by ${formatOdometer(Math.abs(item.remainingKm))}`
                        : `${formatOdometer(item.remainingKm)} remaining`}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-400" />
                      <span>Predicted Due Date</span>
                    </div>
                    <div className="text-sm font-extrabold text-emerald-300 font-mono mt-0.5">
                      {formatDate(item.nextDueDate)}
                    </div>
                    <div className={`text-[11px] font-semibold mt-0.5 ${
                      item.remainingDays <= 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {item.remainingDays <= 0
                        ? `Overdue by ${Math.abs(item.remainingDays)} days`
                        : `In ~${item.remainingDays} days`}
                    </div>
                  </div>
                </div>

                {/* Last Performed Info */}
                <div className="text-[11px] text-gray-400 flex items-center justify-between pb-3 border-b border-gray-800/60">
                  <span>Last Service Done:</span>
                  <span className="font-medium text-gray-300">
                    {item.lastDoneDate
                      ? `${formatDate(item.lastDoneDate)}${item.lastDoneOdometer ? ` @ ${formatOdometer(item.lastDoneOdometer)}` : ''}`
                      : 'No recorded log in AutoCare'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center gap-2">
                <button
                  onClick={() => onLogService(item.name)}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/15 cursor-pointer transition-all"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Log Done</span>
                </button>

                <button
                  onClick={() => handleCreateReminder(item)}
                  disabled={isReminderCreated}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isReminderCreated
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 cursor-default'
                      : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border-gray-700 hover:text-white'
                  }`}
                  title="Add reminder for this service item"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isReminderCreated ? 'Reminder Set' : 'Set Reminder'}</span>
                </button>

                {item.isCustom && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditCustomRule(item.id)}
                      className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-cyan-300 border border-gray-700 transition-colors cursor-pointer"
                      title="Edit Custom Maintenance Rule"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(item.id, item.name)}
                      className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-red-400 border border-gray-700 transition-colors cursor-pointer"
                      title="Delete Custom Maintenance Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* OEM Disclaimer Note */}
      <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/80 text-xs text-gray-400 flex items-start gap-3 leading-relaxed">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-gray-200 font-semibold">Automotive Service Interval Notice: </span>
          Predicted service intervals are based on automotive OEM standards, calculated average daily kilometers, and recorded maintenance history in AutoCare. For vehicle-specific warranty and severe driving operating schedules, always consult your official manufacturer owner's manual.
        </div>
      </div>

      {/* Custom Maintenance Rule Modal */}
      <CustomRuleModal
        isOpen={isCustomRuleModalOpen}
        onClose={() => {
          setIsCustomRuleModalOpen(false);
          setEditingRule(null);
        }}
        initialData={editingRule}
        onSaveRule={handleSaveCustomRule}
        vehicleId={selectedVehicle.id}
        vehicleName={selectedVehicle.name}
        currentVehicleOdometer={Number(selectedVehicle.currentOdometer) || 0}
      />
    </div>
  );
};
