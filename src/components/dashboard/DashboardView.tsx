import React, { useState, useMemo } from 'react';
import { 
  Gauge, 
  FileText, 
  Wrench, 
  Receipt, 
  Fuel,
  AlertTriangle, 
  Plus, 
  Clock, 
  CheckCircle, 
  Calendar, 
  ChevronRight,
  ChevronDown,
  Sparkles,
  Bell,
  ExternalLink,
  Car,
  TrendingUp,
  MapPin,
  Layers,
  ArrowRight,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  History,
  Printer,
  Download
} from 'lucide-react';
import { useVehicle } from '../../context/VehicleContext';
import { 
  formatCurrency, 
  formatOdometer, 
  formatDate, 
  parseLocalDate,
  getDocumentStatus, 
  getReminderStatus 
} from '../../utils/formatters';
import { calculateFuelMetrics } from '../../utils/mileage';
import { printVehicleMaintenanceReport, exportVehicleDataJSON } from '../../utils/exportReport';
import { VehicleTimelineView } from '../common/VehicleTimelineView';
import { Automotive3DHero } from './Automotive3DHero';
import { Card3D } from '../common/Card3D';

// Modals for Quick Actions
import { DocumentModal } from '../documents/DocumentModal';
import { ServiceModal } from '../services/ServiceModal';
import { FuelModal } from '../fuel/FuelModal';
import { ExpenseModal } from '../expenses/ExpenseModal';
import { ReminderModal } from '../reminders/ReminderModal';

interface DashboardViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenAddVehicle: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenAddVehicle,
}) => {
  const { 
    vehicles, 
    selectedVehicle, 
    setSelectedVehicleId,
    loadingVehicles,
    documents, 
    loadingDocuments,
    services, 
    loadingServices,
    fuelRecords, 
    loadingFuelRecords,
    expenses, 
    loadingExpenses,
    allReminders,
    loadingReminders,
    reminderSummary,
    addDocument,
    addService,
    addFuelRecord,
    addExpense,
    addReminder
  } = useVehicle();

  // Quick Action Modal states
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddFuelOpen, setIsAddFuelOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);

  // Overall loading state check
  const isLoading = loadingVehicles || (selectedVehicle && (
    loadingDocuments || loadingServices || loadingFuelRecords || loadingExpenses || loadingReminders
  ));

  // 1. Calculations: Key Metrics (Section 5)
  const totalServiceCost = useMemo(() => {
    return services.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
  }, [services]);

  const totalFuelCost = useMemo(() => {
    return fuelRecords.reduce((acc, curr) => acc + (Number(curr.totalCost) || 0), 0);
  }, [fuelRecords]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [expenses]);

  const totalServiceRecords = services.length;
  const totalFuelEntries = fuelRecords.length;
  const activeRemindersCount = reminderSummary.pending;

  // 2. Calculations: Document Status Breakdown (Section 6)
  const docCounts = useMemo(() => {
    return documents.reduce(
      (acc, d) => {
        const { status } = getDocumentStatus(d.expiryDate);
        if (status === 'Valid') acc.valid += 1;
        else if (status === 'Expiring Soon') acc.expiring += 1;
        else if (status === 'Expired') acc.expired += 1;
        return acc;
      },
      { valid: 0, expiring: 0, expired: 0 }
    );
  }, [documents]);

  // 3. Calculations: Fuel & Mileage Metrics (Section 8)
  const fuelMetrics = useMemo(() => {
    const metrics = calculateFuelMetrics(fuelRecords);
    const latestFuel = fuelRecords.length > 0 ? fuelRecords[0] : null;

    let latestMileageDisplay = 'Not enough data';
    if (latestFuel && metrics.recordMileageMap[latestFuel.id]) {
      const val = metrics.recordMileageMap[latestFuel.id];
      if (val !== null && val > 0) {
        latestMileageDisplay = `${val.toFixed(1)} km/L`;
      }
    } else if (metrics.averageMileageLabel !== 'Not enough data') {
      latestMileageDisplay = metrics.averageMileageLabel;
    }

    return {
      latestEntry: latestFuel,
      totalFuelCost: metrics.totalCost,
      latestMileageDisplay,
      totalLitres: metrics.totalLitres,
      averageMileageLabel: metrics.averageMileageLabel,
    };
  }, [fuelRecords]);

  // 4. Calculations: Upcoming Alerts sorted by urgency: Overdue -> Due Soon -> Upcoming (Section 7)
  const upcomingAlertsList = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      message: string;
      vehicleInfo: string;
      dueDate: string;
      status: 'Overdue' | 'Due Soon' | 'Upcoming';
      priority: string;
      severity: 'danger' | 'warning' | 'info';
      actionTab: 'documents' | 'reminders';
      orderScore: number;
    }> = [];

    // Pending reminders from allReminders (includes dynamic document expiries)
    allReminders
      .filter((r) => r.status !== 'Completed')
      .forEach((r) => {
        const { dynamicStatus, label, diffDays } = getReminderStatus(r.dueDate, r.status, r.completedAt);
        
        let orderScore = 0;
        let severity: 'danger' | 'warning' | 'info' = 'info';

        if (dynamicStatus === 'Overdue') {
          orderScore = 10000 - diffDays; // Overdue highest priority (most overdue first)
          severity = 'danger';
        } else if (dynamicStatus === 'Due Soon') {
          orderScore = 5000 - diffDays; // Due soon second priority (closest first)
          severity = 'warning';
        } else {
          orderScore = 1000 - diffDays; // Upcoming third priority (closest first)
          severity = 'info';
        }

        list.push({
          id: r.id,
          title: r.title,
          message: label,
          vehicleInfo: selectedVehicle ? `${selectedVehicle.name} (${selectedVehicle.vehicleNumber})` : '',
          dueDate: r.dueDate,
          status: dynamicStatus as 'Overdue' | 'Due Soon' | 'Upcoming',
          priority: r.priority || 'Medium',
          severity,
          actionTab: r.sourceType === 'document' ? 'documents' : 'reminders',
          orderScore,
        });
      });

    // Sort by orderScore descending
    list.sort((a, b) => b.orderScore - a.orderScore);
    return list;
  }, [allReminders, selectedVehicle]);

  // 5. Calculations: Monthly Expense Summary (Section 11)
  const monthlyExpenseSummary = useMemo(() => {
    if (expenses.length === 0) return [];
    const monthMap: Record<string, { label: string; yearMonth: string; total: number; count: number; dateForSort: number }> = {};

    expenses.forEach((exp) => {
      const dateStr = exp.expenseDate || exp.date;
      if (!dateStr) return;
      const d = parseLocalDate(dateStr);
      if (isNaN(d.getTime())) return;
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

      if (!monthMap[key]) {
        monthMap[key] = {
          label,
          yearMonth: key,
          total: 0,
          count: 0,
          dateForSort: new Date(year, month, 1).getTime(),
        };
      }
      monthMap[key].total += Number(exp.amount) || 0;
      monthMap[key].count += 1;
    });

    return Object.values(monthMap).sort((a, b) => b.dateForSort - a.dateForSort);
  }, [expenses]);

  // 6. Calculations: Vehicle Status / Operational Health Overview (Section 12)
  const vehicleStatus = useMemo(() => {
    // A. Documents Status
    let docStatus: { label: string; severity: 'success' | 'warning' | 'neutral'; description: string };
    if (documents.length === 0) {
      docStatus = { label: 'No Documents', severity: 'neutral', description: 'Add insurance or PUC to track expiry' };
    } else if (docCounts.expired > 0 || docCounts.expiring > 0) {
      const issues = [];
      if (docCounts.expired > 0) issues.push(`${docCounts.expired} expired`);
      if (docCounts.expiring > 0) issues.push(`${docCounts.expiring} expiring soon`);
      docStatus = { label: 'Attention Required', severity: 'warning', description: issues.join(', ') };
    } else {
      docStatus = { label: 'Good', severity: 'success', description: 'All logged documents are currently valid' };
    }

    // B. Maintenance Status
    let maintenanceStatus: { label: string; severity: 'success' | 'info' | 'neutral'; description: string };
    if (services.length === 0) {
      maintenanceStatus = { label: 'No Service Records', severity: 'neutral', description: 'No maintenance records logged yet' };
    } else {
      const latestService = services[0];
      const serviceDate = parseLocalDate(latestService.serviceDate || (latestService as any).date || '');
      const diffDays = Math.floor((new Date().getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));
      if (!isNaN(diffDays) && diffDays <= 90) {
        maintenanceStatus = { label: 'Recent Service', severity: 'success', description: `Serviced ${diffDays}d ago (${formatDate(latestService.serviceDate)})` };
      } else {
        maintenanceStatus = { label: 'Service History Available', severity: 'info', description: `${services.length} maintenance record${services.length > 1 ? 's' : ''} logged` };
      }
    }

    // C. Fuel Tracking Status
    let fuelStatus: { label: string; severity: 'success' | 'warning' | 'neutral'; description: string };
    if (fuelRecords.length === 0) {
      fuelStatus = { label: 'Not Tracking', severity: 'neutral', description: 'Add fuel entries to calculate mileage' };
    } else if (fuelRecords.length === 1) {
      fuelStatus = { label: 'Not Enough Data', severity: 'warning', description: 'Requires 2+ entries to compute mileage' };
    } else {
      fuelStatus = { label: 'Tracking', severity: 'success', description: `Mileage: ${fuelMetrics.latestMileageDisplay}` };
    }

    // D. Reminders Status
    let reminderStatus: { label: string; severity: 'success' | 'warning' | 'neutral'; description: string };
    const urgentCount = reminderSummary.overdue + reminderSummary.dueSoon;
    if (reminderSummary.pending === 0) {
      reminderStatus = { label: 'No Active Alerts', severity: 'success', description: 'All vehicle deadlines on schedule' };
    } else if (urgentCount > 0) {
      reminderStatus = { label: 'Attention Required', severity: 'warning', description: `${urgentCount} urgent deadline${urgentCount > 1 ? 's' : ''} pending` };
    } else {
      reminderStatus = { label: 'No Active Alerts', severity: 'success', description: `${reminderSummary.upcoming} reminder${reminderSummary.upcoming > 1 ? 's' : ''} upcoming on schedule` };
    }

    return {
      docStatus,
      maintenanceStatus,
      fuelStatus,
      reminderStatus,
    };
  }, [documents, docCounts, services, fuelRecords, fuelMetrics, reminderSummary]);

  // 7. Calculations: Recent Expenses sorted by expenseDate DESC, tie-breaker createdAt DESC (Section 10)
  const recentExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => {
        const timeA = new Date(a.expenseDate || a.date || '').getTime();
        const timeB = new Date(b.expenseDate || b.date || '').getTime();
        if (timeB !== timeA) {
          return timeB - timeA;
        }
        const createdA = new Date(a.createdAt || 0).getTime();
        const createdB = new Date(b.createdAt || 0).getTime();
        return createdB - createdA;
      })
      .slice(0, 3);
  }, [expenses]);

  // 8. Calculations: Recent Services (Section 9)
  const recentServices = useMemo(() => {
    return [...services]
      .sort((a, b) => {
        const timeA = new Date(a.serviceDate || (a as any).date || '').getTime();
        const timeB = new Date(b.serviceDate || (b as any).date || '').getTime();
        return timeB - timeA;
      })
      .slice(0, 3);
  }, [services]);

  // If user has zero vehicles, show friendly onboarding state (Section 3 & 13)
  if (!loadingVehicles && vehicles.length === 0) {
    return (
      <div className="py-12 px-4 max-w-xl mx-auto text-center space-y-6">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-4xl shadow-2xl shadow-cyan-500/10 mx-auto">
            🚗
          </div>
          <div className="absolute -bottom-2 -right-2 bg-cyan-500 text-black p-1.5 rounded-xl shadow-lg">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-black text-white tracking-tight">
            Welcome to AutoCare 👋
          </h2>
          <p className="text-base text-gray-300 font-medium">
            Add your first vehicle to start managing your vehicle records.
          </p>
          <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            Manage your insurance, PUC, RC, maintenance history, fuel records, expenses, and automated reminders all in one centralized automotive dashboard.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={onOpenAddVehicle}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            + Add Your Vehicle
          </button>
        </div>

        {/* Feature Teasers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-8 border-t border-gray-800/80 text-left">
          <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-800">
            <span className="text-xl">📄</span>
            <h4 className="text-xs font-bold text-white mt-2">Document Expiries</h4>
            <p className="text-[11px] text-gray-400 mt-0.5">Automated countdowns for Insurance &amp; PUC.</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-800">
            <span className="text-xl">🔧</span>
            <h4 className="text-xs font-bold text-white mt-2">Maintenance History</h4>
            <p className="text-[11px] text-gray-400 mt-0.5">Chronological record of repairs and oil changes.</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-800">
            <span className="text-xl">⛽</span>
            <h4 className="text-xs font-bold text-white mt-2">Fuel &amp; Mileage</h4>
            <p className="text-[11px] text-gray-400 mt-0.5">Real odometer-based mileage computation.</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl bg-gray-900/70 border border-gray-800"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-900/60 border border-gray-800"></div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-900/60 border border-gray-800"></div>
          ))}
        </div>
        <div className="h-32 rounded-2xl bg-gray-900/60 border border-gray-800"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-2xl bg-gray-900/60 border border-gray-800"></div>
          <div className="h-64 rounded-2xl bg-gray-900/60 border border-gray-800"></div>
        </div>
      </div>
    );
  }

  if (!selectedVehicle) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* ================================================== */}
      {/* 1. DASHBOARD HEADER (Section 3) - 3D Automotive Hero */}
      {/* ================================================== */}
      <Automotive3DHero
        selectedVehicle={selectedVehicle}
        vehicles={vehicles}
        onSelectVehicle={(id) => setSelectedVehicleId(id)}
        onOpenAddVehicle={onOpenAddVehicle}
        onOpenTimeline={() => setIsTimelineOpen(true)}
        onPrintReport={() => printVehicleMaintenanceReport(selectedVehicle, services, documents, fuelRecords, expenses)}
        onNavigateTab={onNavigateTab}
      />

      {/* ================================================== */}
      {/* 2. QUICK ACTIONS (Section 4) */}
      {/* ================================================== */}
      <div className="p-4 rounded-3xl bg-[#151A20] border border-[#252C35] shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00D4C7]" />
            <span>Telemetry Quick Commands</span>
          </span>
          <span className="text-[11px] text-gray-400">Record new vehicle telemetry instantly</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* + Add Vehicle */}
          <button
            onClick={onOpenAddVehicle}
            className="p-3 rounded-2xl bg-[#1D232B] hover:bg-[#252C35] border border-[#252C35] hover:border-[#00D4C7]/50 text-left transition-all group cursor-pointer shadow-sm btn-3d"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#00D4C7]/10 border border-[#00D4C7]/30 flex items-center justify-center text-[#00D4C7] group-hover:scale-105 transition-transform">
                <Car className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-[#00D4C7] transition-colors">
                + Vehicle
              </span>
            </div>
          </button>

          {/* + Add Document */}
          <button
            onClick={() => setIsAddDocOpen(true)}
            className="p-3 rounded-2xl bg-[#1D232B] hover:bg-[#252C35] border border-[#252C35] hover:border-blue-500/50 text-left transition-all group cursor-pointer shadow-sm btn-3d"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                + Document
              </span>
            </div>
          </button>

          {/* + Add Service */}
          <button
            onClick={() => setIsAddServiceOpen(true)}
            className="p-3 rounded-2xl bg-[#1D232B] hover:bg-[#252C35] border border-[#252C35] hover:border-[#00D4C7]/50 text-left transition-all group cursor-pointer shadow-sm btn-3d"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#00D4C7]/10 border border-[#00D4C7]/30 flex items-center justify-center text-[#00D4C7] group-hover:scale-105 transition-transform">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-[#00D4C7] transition-colors">
                + Service
              </span>
            </div>
          </button>

          {/* + Add Fuel */}
          <button
            onClick={() => setIsAddFuelOpen(true)}
            className="p-3 rounded-2xl bg-[#1D232B] hover:bg-[#252C35] border border-[#252C35] hover:border-amber-500/50 text-left transition-all group cursor-pointer shadow-sm btn-3d"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Fuel className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                + Fuel
              </span>
            </div>
          </button>

          {/* + Add Expense */}
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="p-3 rounded-2xl bg-[#1D232B] hover:bg-[#252C35] border border-[#252C35] hover:border-emerald-500/50 text-left transition-all group cursor-pointer shadow-sm btn-3d"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                + Expense
              </span>
            </div>
          </button>

          {/* + Add Reminder */}
          <button
            onClick={() => setIsAddReminderOpen(true)}
            className="p-3 rounded-2xl bg-[#1D232B] hover:bg-[#252C35] border border-[#252C35] hover:border-purple-500/50 text-left transition-all group cursor-pointer shadow-sm btn-3d"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                + Reminder
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ================================================== */}
      {/* 3. KEY METRICS - 6 3D CARDS (Section 5) */}
      {/* ================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Total Service Cost */}
        <Card3D 
          onClick={() => onNavigateTab('services')}
          className="p-4 cursor-pointer group flex flex-col justify-between"
          accentColor="#00D4C7"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Service Cost
            </span>
            <div className="p-1.5 rounded-lg bg-[#00D4C7]/10 text-[#00D4C7] group-hover:scale-110 transition-transform">
              <Wrench className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 text-xl font-black text-[#00D4C7] font-mono">
            {formatCurrency(totalServiceCost)}
          </div>
          <div className="mt-1 text-[10px] text-gray-400">
            Logged services
          </div>
        </Card3D>

        {/* 2. Total Fuel Cost */}
        <Card3D 
          onClick={() => onNavigateTab('fuel')}
          className="p-4 cursor-pointer group flex flex-col justify-between"
          accentColor="#FFB020"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Fuel Cost
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <Fuel className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 text-xl font-black text-amber-400 font-mono">
            {formatCurrency(totalFuelCost)}
          </div>
          <div className="mt-1 text-[10px] text-gray-400">
            Fuel expenditures
          </div>
        </Card3D>

        {/* 3. Total Expenses */}
        <Card3D 
          onClick={() => onNavigateTab('expenses')}
          className="p-4 cursor-pointer group flex flex-col justify-between"
          accentColor="#20C997"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 text-xl font-black text-emerald-400 font-mono">
            {formatCurrency(totalExpenses)}
          </div>
          <div className="mt-1 text-[10px] text-gray-400">
            General expenses
          </div>
        </Card3D>

        {/* 4. Service Records */}
        <Card3D 
          onClick={() => onNavigateTab('services')}
          className="p-4 cursor-pointer group flex flex-col justify-between"
          accentColor="#A855F7"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Service Records
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 text-xl font-black text-white font-mono">
            {totalServiceRecords}
          </div>
          <div className="mt-1 text-[10px] text-gray-400">
            Maintenance logs
          </div>
        </Card3D>

        {/* 5. Fuel Entries */}
        <Card3D 
          onClick={() => onNavigateTab('fuel')}
          className="p-4 cursor-pointer group flex flex-col justify-between"
          accentColor="#38BDF8"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Fuel Entries
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <Fuel className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 text-xl font-black text-white font-mono">
            {totalFuelEntries}
          </div>
          <div className="mt-1 text-[10px] text-gray-400">
            Recorded fill-ups
          </div>
        </Card3D>

        {/* 6. Active Reminders */}
        <Card3D 
          onClick={() => onNavigateTab('reminders')}
          className="p-4 cursor-pointer group flex flex-col justify-between"
          accentColor={activeRemindersCount > 0 ? '#FF4D4F' : '#00D4C7'}
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Active Reminders
            </span>
            <div className={`p-1.5 rounded-lg group-hover:scale-110 transition-transform ${
              activeRemindersCount > 0 ? 'bg-red-500/15 text-red-400' : 'bg-gray-800 text-gray-400'
            }`}>
              <Bell className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`mt-3 text-xl font-black font-mono ${
            activeRemindersCount > 0 ? 'text-red-400' : 'text-white'
          }`}>
            {activeRemindersCount}
          </div>
          <div className="mt-1 text-[10px] text-gray-400">
            Pending tasks &amp; expiries
          </div>
        </Card3D>
      </div>

      {/* ================================================== */}
      {/* 4. VEHICLE STATUS OVERVIEW (Section 12) */}
      {/* ================================================== */}
      <div className="p-6 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Vehicle Status Overview</h3>
          </div>
          <span className="text-[11px] text-gray-400">
            Operational status based on AutoCare logged records (non-diagnostic)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Documents Status */}
          <div 
            onClick={() => onNavigateTab('documents')}
            className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 hover:border-cyan-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Documents</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                vehicleStatus.docStatus.severity === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : vehicleStatus.docStatus.severity === 'warning'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                {vehicleStatus.docStatus.label}
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-2 truncate font-medium">
              {vehicleStatus.docStatus.description}
            </p>
          </div>

          {/* Maintenance Status */}
          <div 
            onClick={() => onNavigateTab('services')}
            className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 hover:border-cyan-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Maintenance</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                vehicleStatus.maintenanceStatus.severity === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : vehicleStatus.maintenanceStatus.severity === 'info'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                {vehicleStatus.maintenanceStatus.label}
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-2 truncate font-medium">
              {vehicleStatus.maintenanceStatus.description}
            </p>
          </div>

          {/* Fuel Tracking Status */}
          <div 
            onClick={() => onNavigateTab('fuel')}
            className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 hover:border-cyan-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Fuel Tracking</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                vehicleStatus.fuelStatus.severity === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : vehicleStatus.fuelStatus.severity === 'warning'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                {vehicleStatus.fuelStatus.label}
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-2 truncate font-medium">
              {vehicleStatus.fuelStatus.description}
            </p>
          </div>

          {/* Reminders Status */}
          <div 
            onClick={() => onNavigateTab('reminders')}
            className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 hover:border-cyan-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Reminders</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                vehicleStatus.reminderStatus.severity === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}>
                {vehicleStatus.reminderStatus.label}
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-2 truncate font-medium">
              {vehicleStatus.reminderStatus.description}
            </p>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 5. DOCUMENT STATUS & REMINDER SUMMARY (Sections 6 & 7) */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Status Summary Card (Section 6) */}
        <div className="p-6 rounded-3xl bg-[#0f131c] border border-gray-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-800/60">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Document Status</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-mono">
                  {documents.length} Total
                </span>
              </h3>
              <button
                onClick={() => onNavigateTab('documents')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View Documents →</span>
              </button>
            </div>

            <div className="mt-4">
              {documents.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 space-y-2">
                  <p>No documents added yet.</p>
                  <button
                    onClick={() => setIsAddDocOpen(true)}
                    className="text-cyan-400 hover:underline font-semibold cursor-pointer block mx-auto"
                  >
                    + Add Insurance or PUC
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Valid
                    </span>
                    <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                      {docCounts.valid}
                    </span>
                    <span className="text-[10px] text-gray-500">&gt; 30 days left</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                      Expiring Soon
                    </span>
                    <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
                      {docCounts.expiring}
                    </span>
                    <span className="text-[10px] text-gray-500">1–30 days left</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/30 text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 block">
                      Expired
                    </span>
                    <span className="text-2xl font-black text-red-400 font-mono mt-1 block">
                      {docCounts.expired}
                    </span>
                    <span className="text-[10px] text-gray-500">Renewal needed</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>Automated 30-day countdowns</span>
            <button
              onClick={() => setIsAddDocOpen(true)}
              className="text-cyan-400 hover:underline font-semibold cursor-pointer"
            >
              + Add Document
            </button>
          </div>
        </div>

        {/* Reminder Summary Card */}
        <div className="p-6 rounded-3xl bg-[#0f131c] border border-gray-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-800/60">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span>Reminder Summary</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                  {reminderSummary.pending} Active
                </span>
              </h3>
              <button
                onClick={() => onNavigateTab('reminders')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View Reminders →</span>
              </button>
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Overdue */}
                <div className="p-3 rounded-2xl bg-red-950/20 border border-red-500/30 text-center">
                  <span className="text-[11px] font-bold text-red-400 block flex items-center justify-center gap-1">
                    <span>🔴</span> Overdue
                  </span>
                  <span className="text-2xl font-black text-red-400 font-mono mt-1 block">
                    {reminderSummary.overdue}
                  </span>
                </div>

                {/* Due Soon */}
                <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-center">
                  <span className="text-[11px] font-bold text-amber-400 block flex items-center justify-center gap-1">
                    <span>🟠</span> Due Soon
                  </span>
                  <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
                    {reminderSummary.dueSoon}
                  </span>
                </div>

                {/* Upcoming */}
                <div className="p-3 rounded-2xl bg-blue-950/20 border border-blue-500/30 text-center">
                  <span className="text-[11px] font-bold text-blue-400 block flex items-center justify-center gap-1">
                    <span>🔵</span> Upcoming
                  </span>
                  <span className="text-2xl font-black text-blue-400 font-mono mt-1 block">
                    {reminderSummary.upcoming}
                  </span>
                </div>

                {/* Completed */}
                <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center">
                  <span className="text-[11px] font-bold text-emerald-400 block flex items-center justify-center gap-1">
                    <span>🟢</span> Completed
                  </span>
                  <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                    {reminderSummary.completed}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>Dynamic document &amp; custom alerts</span>
            <button
              onClick={() => setIsAddReminderOpen(true)}
              className="text-cyan-400 hover:underline font-semibold cursor-pointer"
            >
              + Add Reminder
            </button>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 6. UPCOMING ALERTS - PRIORITIZED (Section 7) */}
      {/* ================================================== */}
      <div className="p-6 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800/60">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-white">Upcoming Alerts</h3>
            {upcomingAlertsList.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono font-bold">
                {upcomingAlertsList.length} Active
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigateTab('reminders')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View All →</span>
          </button>
        </div>

        <div>
          {upcomingAlertsList.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400 space-y-1">
              <div className="text-2xl mb-1">🛡️</div>
              <p className="font-semibold text-gray-300">No active reminders.</p>
              <p className="text-gray-500">All caught up! No overdue or urgent alerts for this vehicle.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingAlertsList.slice(0, 6).map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => onNavigateTab(alert.actionTab)}
                  className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] ${
                    alert.severity === 'danger'
                      ? 'bg-red-950/20 border-red-500/30 hover:bg-red-950/30'
                      : alert.severity === 'warning'
                      ? 'bg-amber-950/20 border-amber-500/30 hover:bg-amber-950/30'
                      : 'bg-blue-950/20 border-blue-500/30 hover:bg-blue-950/30'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        alert.severity === 'danger'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : alert.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                        {alert.status}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-400">
                        {alert.priority} Priority
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white truncate pt-1">
                      {alert.title}
                    </h4>

                    <p className="text-xs text-gray-300 truncate">
                      {alert.message}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px] text-gray-400">
                    <span className="truncate max-w-[140px] text-gray-400">
                      {alert.vehicleInfo}
                    </span>
                    <span className={`font-mono font-bold ${
                      alert.severity === 'danger' ? 'text-red-400' : alert.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                    }`}>
                      {formatDate(alert.dueDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================================================== */}
      {/* 7. FUEL & MILEAGE SUMMARY & MONTHLY EXPENSES (Sections 8 & 11) */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fuel & Mileage Summary (Section 8) */}
        <div className="p-6 rounded-3xl bg-[#0f131c] border border-gray-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-800/60">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-400" />
                <span>Fuel &amp; Mileage Summary</span>
              </h3>
              <button
                onClick={() => onNavigateTab('fuel')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View Fuel Log →</span>
              </button>
            </div>

            <div className="mt-4">
              {fuelRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 space-y-2">
                  <p>Add fuel entries to calculate mileage.</p>
                  <button
                    onClick={() => setIsAddFuelOpen(true)}
                    className="text-amber-400 hover:underline font-semibold cursor-pointer block mx-auto"
                  >
                    + Record First Fuel Fill
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Key Stats 4-Pack */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                        Latest Mileage
                      </span>
                      <span className="text-lg font-black text-amber-400 font-mono mt-1 block">
                        {fuelMetrics.latestMileageDisplay}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block" title="Odometer reading logged on latest fuel refill">
                        Latest Recorded Fuel Odometer
                      </span>
                      <span className="text-lg font-black text-white font-mono mt-1 block">
                        {fuelMetrics.latestEntry ? formatOdometer(fuelMetrics.latestEntry.odometer) : 'N/A'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                        Total Fuel Cost
                      </span>
                      <span className="text-lg font-black text-cyan-400 font-mono mt-1 block">
                        {formatCurrency(fuelMetrics.totalFuelCost)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                        Latest Refuel
                      </span>
                      <span className="text-sm font-bold text-white truncate mt-1 block">
                        {fuelMetrics.latestEntry 
                          ? `${fuelMetrics.latestEntry.fuelType} • ${fuelMetrics.latestEntry.litres || 0} L`
                          : 'No refuels logged'}
                      </span>
                    </div>
                  </div>

                  {/* Most Recent Entry Strip */}
                  {fuelMetrics.latestEntry && (
                    <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{fuelMetrics.latestEntry.fuelType}</span>
                          {fuelMetrics.latestEntry.station && (
                            <span className="text-gray-400 font-normal">at {fuelMetrics.latestEntry.station}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {formatDate(fuelMetrics.latestEntry.fuelDate)}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-white font-mono">
                          {formatCurrency(fuelMetrics.latestEntry.totalCost)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>Real interval-based mileage</span>
            <button
              onClick={() => setIsAddFuelOpen(true)}
              className="text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              + Add Fuel Entry
            </button>
          </div>
        </div>

        {/* Monthly Expense Summary (Section 11) */}
        <div className="p-6 rounded-3xl bg-[#0f131c] border border-gray-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-800/60">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Monthly Expense Summary</span>
              </h3>
              <button
                onClick={() => onNavigateTab('expenses')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Expenses →</span>
              </button>
            </div>

            <div className="mt-4">
              {monthlyExpenseSummary.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 space-y-2">
                  <p>No expense data available yet.</p>
                  <button
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="text-emerald-400 hover:underline font-semibold cursor-pointer block mx-auto"
                  >
                    + Record First Expense
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                  {monthlyExpenseSummary.map((item) => (
                    <div
                      key={item.yearMonth}
                      className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          📅
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {item.count} expense{item.count > 1 ? 's' : ''} logged
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-emerald-400 font-mono">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>Dynamic aggregation from expenses</span>
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="text-emerald-400 hover:underline font-semibold cursor-pointer"
            >
              + Record Expense
            </button>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 8. RECENT SERVICE & RECENT EXPENSES (Sections 9 & 10) */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Service History (Section 9) */}
        <div className="p-6 rounded-3xl bg-[#0f131c] border border-gray-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-800/60">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-cyan-400" />
                <span>Recent Service History</span>
              </h3>
              <button
                onClick={() => onNavigateTab('services')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Services →</span>
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {recentServices.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 space-y-2">
                  <p>No service records yet.</p>
                  <button
                    onClick={() => setIsAddServiceOpen(true)}
                    className="text-cyan-400 hover:underline font-semibold cursor-pointer block mx-auto"
                  >
                    + Log First Service
                  </button>
                </div>
              ) : (
                recentServices.map((record) => (
                  <div
                    key={record.id}
                    className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-lg border border-cyan-500/20">
                          {record.serviceType}
                        </span>
                        <span className="text-xs text-gray-300 font-mono">
                          {formatOdometer(record.odometer)}
                        </span>
                      </div>

                      <div className="text-xs text-gray-300 mt-1 flex items-center gap-2 flex-wrap">
                        <span>{formatDate(record.serviceDate || (record as any).date || '')}</span>
                        {record.serviceCenter && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-400 truncate">{record.serviceCenter}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-white font-mono">
                        {formatCurrency(record.cost)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>Showing latest 3 records</span>
            <button
              onClick={() => onNavigateTab('services')}
              className="text-cyan-400 hover:underline font-semibold cursor-pointer"
            >
              Full Service History →
            </button>
          </div>
        </div>

        {/* Recent Expenses (Section 10) */}
        <div className="p-6 rounded-3xl bg-[#0f131c] border border-gray-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-800/60">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Recent Expenses</span>
              </h3>
              <button
                onClick={() => onNavigateTab('expenses')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Expenses →</span>
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {recentExpenses.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 space-y-2">
                  <p>No expenses recorded yet.</p>
                  <button
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="text-emerald-400 hover:underline font-semibold cursor-pointer block mx-auto"
                  >
                    + Record First Expense
                  </button>
                </div>
              ) : (
                recentExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-gray-800 text-gray-300 border border-gray-700">
                          {exp.category}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(exp.expenseDate || exp.date || '')}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-white mt-1 truncate">
                        {exp.description}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-emerald-400 font-mono">
                        {formatCurrency(exp.amount)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>Showing latest 3 records</span>
            <button
              onClick={() => onNavigateTab('expenses')}
              className="text-cyan-400 hover:underline font-semibold cursor-pointer"
            >
              Full Expense Log →
            </button>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* QUICK ACTION MODALS */}
      {/* ================================================== */}

      {/* Add Document Modal */}
      {isAddDocOpen && (
        <DocumentModal
          isOpen={isAddDocOpen}
          onClose={() => setIsAddDocOpen(false)}
          onSubmit={async (data) => {
            await addDocument(data);
          }}
          vehicleId={selectedVehicle.id}
          title="Add Vehicle Document"
        />
      )}

      {/* Add Service Modal */}
      {isAddServiceOpen && (
        <ServiceModal
          isOpen={isAddServiceOpen}
          onClose={() => setIsAddServiceOpen(false)}
          onSubmit={async (data) => {
            await addService(data);
          }}
          vehicleId={selectedVehicle.id}
          currentVehicleOdometer={selectedVehicle.currentOdometer}
          title="Log Service & Maintenance"
        />
      )}

      {/* Add Fuel Modal */}
      {isAddFuelOpen && (
        <FuelModal
          isOpen={isAddFuelOpen}
          onClose={() => setIsAddFuelOpen(false)}
          onSubmit={async (data) => {
            await addFuelRecord(data);
          }}
          vehicleId={selectedVehicle.id}
          currentVehicleOdometer={selectedVehicle.currentOdometer}
          vehicleFuelType={selectedVehicle.fuelType}
          title="Add Fuel Entry"
        />
      )}

      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <ExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          onSubmit={async (data) => {
            await addExpense(data);
          }}
          vehicleId={selectedVehicle.id}
          title="Record New Expense"
        />
      )}

      {/* Add Reminder Modal */}
      {isAddReminderOpen && (
        <ReminderModal
          isOpen={isAddReminderOpen}
          onClose={() => setIsAddReminderOpen(false)}
          onSubmit={async (data) => {
            await addReminder(data);
          }}
          defaultVehicleId={selectedVehicle.id}
          title="Create Vehicle Reminder"
        />
      )}

      {/* Vehicle Timeline / Logbook Modal */}
      {isTimelineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[90vh] bg-[#0e121a] border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-gray-100">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#111622]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Vehicle Lifetime Timeline &amp; Logbook
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selectedVehicle.name} ({selectedVehicle.vehicleNumber}) • Chronological History Stream
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTimelineOpen(false)}
                className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
              <VehicleTimelineView />
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#111622] flex items-center justify-between">
              <button
                onClick={() => exportVehicleDataJSON(selectedVehicle, services, fuelRecords, expenses, documents)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup JSON Archive</span>
              </button>
              <button
                onClick={() => setIsTimelineOpen(false)}
                className="px-6 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
