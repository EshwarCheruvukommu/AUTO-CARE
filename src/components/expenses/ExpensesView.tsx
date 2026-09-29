import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Receipt, 
  Calendar, 
  PieChart, 
  Search, 
  Building2, 
  FileText,
  Fuel, 
  Wrench, 
  ShieldCheck, 
  FileCheck, 
  Disc, 
  Zap, 
  Sparkles, 
  Droplets, 
  Car, 
  Milestone, 
  Tag, 
  AlertTriangle,
  TrendingUp,
  X,
  CalendarDays
} from 'lucide-react';
import { ExpenseRecord, ExpenseCategory } from '../../types';
import { useVehicle } from '../../context/VehicleContext';
import { ExpenseModal } from './ExpenseModal';
import { ConfirmDialog } from '../common/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';

const CATEGORY_CONFIG: Record<
  string, 
  { label: string; color: string; badge: string; bar: string; icon: React.FC<{ className?: string }> }
> = {
  Fuel: {
    label: 'Fuel',
    color: 'text-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    bar: 'bg-amber-500',
    icon: Fuel,
  },
  Service: {
    label: 'Service',
    color: 'text-cyan-400',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    bar: 'bg-cyan-500',
    icon: Wrench,
  },
  Repair: {
    label: 'Repair',
    color: 'text-rose-400',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    bar: 'bg-rose-500',
    icon: AlertTriangle,
  },
  Insurance: {
    label: 'Insurance',
    color: 'text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bar: 'bg-emerald-500',
    icon: ShieldCheck,
  },
  PUC: {
    label: 'PUC',
    color: 'text-teal-400',
    badge: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    bar: 'bg-teal-500',
    icon: FileCheck,
  },
  Tyres: {
    label: 'Tyres',
    color: 'text-orange-400',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    bar: 'bg-orange-500',
    icon: Disc,
  },
  Battery: {
    label: 'Battery',
    color: 'text-yellow-400',
    badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    bar: 'bg-yellow-500',
    icon: Zap,
  },
  Accessories: {
    label: 'Accessories',
    color: 'text-purple-400',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    bar: 'bg-purple-500',
    icon: Sparkles,
  },
  'Washing / Detailing': {
    label: 'Washing / Detailing',
    color: 'text-sky-400',
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    bar: 'bg-sky-500',
    icon: Droplets,
  },
  Washing: {
    label: 'Washing',
    color: 'text-sky-400',
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    bar: 'bg-sky-500',
    icon: Droplets,
  },
  Parking: {
    label: 'Parking',
    color: 'text-indigo-400',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    bar: 'bg-indigo-500',
    icon: Car,
  },
  Toll: {
    label: 'Toll',
    color: 'text-pink-400',
    badge: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    bar: 'bg-pink-500',
    icon: Milestone,
  },
  Other: {
    label: 'Other',
    color: 'text-gray-400',
    badge: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    bar: 'bg-gray-500',
    icon: Tag,
  },
};

const ALL_FILTER_CATEGORIES: ExpenseCategory[] = [
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

export const ExpensesView: React.FC = () => {
  const { 
    selectedVehicle, 
    expenses, 
    loadingExpenses, 
    addExpense, 
    updateExpense, 
    deleteExpense 
  } = useVehicle();

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState<boolean>(false);

  const handleAdd = async (data: any) => {
    await addExpense(data);
  };

  const handleUpdate = async (data: any) => {
    if (!editingExpense) return;
    await updateExpense(editingExpense.id, data);
    setEditingExpense(null);
  };

  const confirmDelete = async () => {
    if (!deletingExpenseId) return;
    try {
      setIsDeleting(true);
      await deleteExpense(deletingExpenseId);
      setDeletingExpenseId(null);
    } catch (err) {
      console.error('Error deleting expense:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics and statistics
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let total = 0;
    let thisMonth = 0;
    let thisYear = 0;
    const categoryTotals: Record<string, number> = {};
    const monthlyGroups: Record<string, { label: string; total: number; count: number }> = {};

    expenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      total += amt;

      const dateStr = e.expenseDate || e.date || '';
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        if (d.getFullYear() === currentYear) {
          thisYear += amt;
          if (d.getMonth() === currentMonth) {
            thisMonth += amt;
          }
        }

        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
        if (!monthlyGroups[monthKey]) {
          monthlyGroups[monthKey] = { label: monthLabel, total: 0, count: 0 };
        }
        monthlyGroups[monthKey].total += amt;
        monthlyGroups[monthKey].count += 1;
      }

      const normalizedCat = e.category === 'Washing' ? 'Washing / Detailing' : e.category;
      categoryTotals[normalizedCat] = (categoryTotals[normalizedCat] || 0) + amt;
    });

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: total > 0 ? (amt / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const sortedMonths = Object.entries(monthlyGroups)
      .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
      .map(([key, data]) => ({ key, ...data }));

    const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

    return { 
      total, 
      thisMonth, 
      thisYear, 
      categoryBreakdown, 
      sortedMonths, 
      topCategory,
      count: expenses.length 
    };
  }, [expenses]);

  // Filtered expenses based on category and search query
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const normalizedCat = e.category === 'Washing' ? 'Washing / Detailing' : e.category;
      if (selectedFilterCategory !== 'all' && normalizedCat !== selectedFilterCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = e.description?.toLowerCase().includes(query);
        const vendorMatch = e.vendor?.toLowerCase().includes(query);
        const notesMatch = e.notes?.toLowerCase().includes(query);
        const catMatch = normalizedCat.toLowerCase().includes(query);
        if (!descMatch && !vendorMatch && !notesMatch && !catMatch) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, selectedFilterCategory, searchQuery]);

  if (!selectedVehicle) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-[#0d1017] p-12 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto text-2xl mb-4">
          🚗
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Active Vehicle Selected</h3>
        <p className="text-sm text-gray-400 mb-6">
          Please add or select a vehicle from the top selector to view and manage expenses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Expenses & Spending</span>
            </h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold">
              {expenses.length} records
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800/80 border border-gray-700 text-gray-300">
              🚗 {selectedVehicle.name} ({selectedVehicle.vehicleNumber})
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Track and categorize all maintenance, fuel, insurance, tolls, and operating costs for your vehicle.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses */}
        <div className="p-5 rounded-2xl bg-[#0f131c] border border-gray-800/80 hover:border-gray-700/80 transition-colors">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Expenses
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(stats.total)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Lifetime tracked spending
          </span>
        </div>

        {/* This Month's Expenses */}
        <div className="p-5 rounded-2xl bg-[#0f131c] border border-gray-800/80 hover:border-gray-700/80 transition-colors">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              This Month
            </span>
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {formatCurrency(stats.thisMonth)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Current Year Expenses */}
        <div className="p-5 rounded-2xl bg-[#0f131c] border border-gray-800/80 hover:border-gray-700/80 transition-colors">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Year {new Date().getFullYear()}
            </span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <CalendarDays className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {formatCurrency(stats.thisYear)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Total year-to-date spending
          </span>
        </div>

        {/* Top Category */}
        <div className="p-5 rounded-2xl bg-[#0f131c] border border-gray-800/80 hover:border-gray-700/80 transition-colors">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Top Category
            </span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <PieChart className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-purple-400 font-mono truncate">
            {stats.topCategory ? stats.topCategory.category : 'N/A'}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {stats.topCategory 
              ? `${formatCurrency(stats.topCategory.amount)} (${stats.topCategory.percentage.toFixed(0)}%)`
              : 'No expenses yet'}
          </span>
        </div>
      </div>

      {/* Category Breakdown Progress Bar & Detail Cards */}
      {stats.categoryBreakdown.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#0f131c] border border-gray-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <span>Expense Category Breakdown</span>
            </h3>
            <span className="text-xs text-gray-400">
              Total {formatCurrency(stats.total)} across {stats.categoryBreakdown.length} categories
            </span>
          </div>

          {/* Multi-segmented distribution progress bar */}
          <div className="h-3 w-full rounded-full bg-gray-900 flex overflow-hidden border border-gray-800">
            {stats.categoryBreakdown.map((item) => {
              const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.Other;
              return (
                <div
                  key={item.category}
                  style={{ width: `${Math.max(item.percentage, 2.5)}%` }}
                  className={`${cfg.bar} transition-all duration-300 hover:brightness-125 cursor-pointer`}
                  title={`${item.category}: ${formatCurrency(item.amount)} (${item.percentage.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          {/* Category summary cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
            {stats.categoryBreakdown.map((item) => {
              const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.Other;
              const Icon = cfg.icon;
              return (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => setSelectedFilterCategory(
                    selectedFilterCategory === item.category ? 'all' : item.category
                  )}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedFilterCategory === item.category
                      ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                      : 'bg-gray-900/60 border-gray-800/60 hover:border-gray-700/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${cfg.badge}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-gray-200 truncate">
                        {item.category}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-400">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-bold text-white font-mono">
                    {formatCurrency(item.amount)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Breakdown Toggle Widget */}
      {stats.sortedMonths.length > 0 && (
        <div className="rounded-2xl border border-gray-800/80 bg-[#0f131c] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-900/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <CalendarDays className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">Monthly Expense Totals</span>
              <span className="text-xs text-gray-400">({stats.sortedMonths.length} months recorded)</span>
            </div>
            <span className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">
              {showMonthlyBreakdown ? 'Hide Breakdown ▲' : 'View Monthly Totals ▼'}
            </span>
          </button>

          {showMonthlyBreakdown && (
            <div className="px-6 pb-6 pt-2 border-t border-gray-800/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.sortedMonths.map((m) => (
                <div
                  key={m.key}
                  className="p-3.5 rounded-xl bg-gray-900/70 border border-gray-800 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-gray-300">{m.label}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{m.count} expense records</div>
                  </div>
                  <div className="text-sm font-bold text-cyan-400 font-mono">
                    {formatCurrency(m.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search and Category Filter Bar */}
      <div className="space-y-3">
        {/* Search input & reset */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by description, vendor, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0d14] border border-gray-800 focus:border-cyan-400 rounded-xl pl-9 pr-9 py-2 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-gray-400 flex items-center gap-2 self-end sm:self-auto">
            <span>Showing <strong className="text-white">{filteredExpenses.length}</strong> of {expenses.length} entries</span>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button
            onClick={() => setSelectedFilterCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedFilterCategory === 'all'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'text-gray-400 hover:text-gray-200 bg-gray-900/80 border border-gray-800'
            }`}
          >
            All Categories ({expenses.length})
          </button>
          {ALL_FILTER_CATEGORIES.map((cat) => {
            const count = expenses.filter((e) => {
              const normalized = e.category === 'Washing' ? 'Washing / Detailing' : e.category;
              return normalized === cat;
            }).length;
            const isSelected = selectedFilterCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : 'text-gray-400 hover:text-gray-200 bg-gray-900/80 border border-gray-800'
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-cyan-400/20 text-cyan-300' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expense History Content */}
      {loadingExpenses ? (
        <div className="flex items-center justify-center min-h-[220px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-[#0d1017] p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto text-3xl mb-4">
            💰
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {searchQuery 
              ? 'No matching expenses found' 
              : selectedFilterCategory === 'all'
              ? 'No expenses recorded yet'
              : `No ${selectedFilterCategory} expenses`}
          </h3>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            {searchQuery 
              ? `No expense entries matched "${searchQuery}". Try clearing search or selecting another category.`
              : 'Log every fuel fill, regular maintenance, insurance premium, toll, and spare part to get a full view of your vehicle ownership cost.'}
          </p>
          {searchQuery ? (
            <button
              onClick={() => { setSearchQuery(''); setSelectedFilterCategory('all'); }}
              className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm transition-all"
            >
              Clear Filters
            </button>
          ) : (
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              Add First Expense
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-800 bg-[#0f131c] overflow-hidden">
          <div className="divide-y divide-gray-800/80">
            {filteredExpenses.map((exp) => {
              const normalizedCat = exp.category === 'Washing' ? 'Washing / Detailing' : exp.category;
              const cfg = CATEGORY_CONFIG[normalizedCat] || CATEGORY_CONFIG.Other;
              const Icon = cfg.icon;
              const dateVal = exp.expenseDate || exp.date || '';

              return (
                <div
                  key={exp.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-900/40 transition-colors gap-3 group"
                >
                  {/* Left: Icon, Category, Description, Vendor, Notes */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cfg.badge} mt-0.5 sm:mt-0`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border ${cfg.badge}`}>
                          {normalizedCat}
                        </span>

                        <span className="text-xs text-gray-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          {formatDate(dateVal)}
                        </span>

                        {exp.vendor && (
                          <span className="text-xs text-cyan-400/90 flex items-center gap-1 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded-md">
                            <Building2 className="w-3 h-3 text-cyan-400" />
                            <span className="truncate max-w-[150px] sm:max-w-[200px]">{exp.vendor}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-semibold text-white mt-1.5 break-words">
                        {exp.description}
                      </div>

                      {exp.notes && (
                        <div className="text-xs text-gray-400 mt-1 flex items-start gap-1 bg-gray-900/60 p-2 rounded-lg border border-gray-800/60">
                          <FileText className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{exp.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/60">
                    <div className="text-left sm:text-right">
                      <div className="text-base sm:text-lg font-black text-cyan-400 font-mono">
                        {formatCurrency(exp.amount)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingExpense(exp)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit Expense"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingExpenseId(exp.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isAddOpen && (
        <ExpenseModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAdd}
          vehicleId={selectedVehicle.id}
          title="Record New Expense"
        />
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <ExpenseModal
          isOpen={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          onSubmit={handleUpdate}
          initialData={editingExpense}
          vehicleId={selectedVehicle.id}
          title="Edit Expense Record"
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingExpenseId}
        onClose={() => setDeletingExpenseId(null)}
        onConfirm={confirmDelete}
        title="Delete Expense Entry?"
        message="Are you sure you want to remove this expense entry? This will permanently delete the transaction and update your monthly and category expense metrics."
        confirmLabel="Delete Expense"
        isLoading={isDeleting}
      />
    </div>
  );
};
