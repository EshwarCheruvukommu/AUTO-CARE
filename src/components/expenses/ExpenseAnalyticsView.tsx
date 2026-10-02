import React, { useMemo } from 'react';
import { 
  PieChart, 
  TrendingUp, 
  Gauge, 
  Coins, 
  Receipt, 
  Fuel, 
  Wrench, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Info
} from 'lucide-react';
import { useVehicle } from '../../context/VehicleContext';
import { formatCurrency, formatOdometer, parseLocalDate } from '../../utils/formatters';

export const ExpenseAnalyticsView: React.FC = () => {
  const { selectedVehicle, expenses, fuelRecords, services } = useVehicle();

  // Aggregate total costs across all sources
  const analyticsData = useMemo(() => {
    if (!selectedVehicle) return null;

    const totalExpenseRecordsCost = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalFuelCost = fuelRecords.reduce((acc, f) => acc + (Number(f.totalCost) || 0), 0);
    const totalServiceCost = services.reduce((acc, s) => acc + (Number(s.cost) || 0), 0);

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (Number(e.amount) || 0);
    });

    // Ensure fuel & service are reflected if not recorded as separate expenses
    if (!categoryTotals['Fuel'] && totalFuelCost > 0) {
      categoryTotals['Fuel'] = totalFuelCost;
    }
    if (!categoryTotals['Service'] && totalServiceCost > 0) {
      categoryTotals['Service'] = totalServiceCost;
    }

    const totalOverallCost = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    // Monthly breakdown
    const monthlyMap: Record<string, { label: string; amount: number; sortKey: string }> = {};
    expenses.forEach((e) => {
      const dateStr = e.expenseDate || (e as any).date;
      if (!dateStr) return;
      const d = parseLocalDate(dateStr);
      if (isNaN(d.getTime())) return;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      if (!monthlyMap[ym]) {
        monthlyMap[ym] = { label, amount: 0, sortKey: ym };
      }
      monthlyMap[ym].amount += Number(e.amount) || 0;
    });

    const monthlyList = Object.values(monthlyMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const maxMonthly = monthlyList.reduce((max, m) => Math.max(max, m.amount), 1);

    // Cost per kilometer driven calculation
    const currentOdo = selectedVehicle.currentOdometer || 0;
    const costPerKm = currentOdo > 0 ? (totalOverallCost / currentOdo).toFixed(2) : '—';

    // Sorted categories
    const sortedCategories = Object.entries(categoryTotals)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalOverallCost > 0 ? Math.round((amt / totalOverallCost) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalOverallCost,
      totalFuelCost,
      totalServiceCost,
      costPerKm,
      sortedCategories,
      monthlyList,
      maxMonthly,
    };
  }, [selectedVehicle, expenses, fuelRecords, services]);

  if (!selectedVehicle || !analyticsData) return null;

  const { totalOverallCost, costPerKm, sortedCategories, monthlyList, maxMonthly } = analyticsData;

  const getCategoryColor = (idx: number) => {
    const palette = [
      'bg-cyan-500',
      'bg-blue-600',
      'bg-indigo-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-amber-500',
      'bg-emerald-500',
      'bg-teal-500',
    ];
    return palette[idx % palette.length];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Cost */}
        <div className="p-5 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Recorded Spend</span>
            <span className="p-1.5 rounded-lg bg-gray-900 text-cyan-400 border border-cyan-500/20">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-cyan-400 font-mono">
            {formatCurrency(totalOverallCost)}
          </div>
          <p className="text-[11px] text-gray-500">Across all categories &amp; maintenance</p>
        </div>

        {/* Cost per KM */}
        <div className="p-5 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Running Cost / KM</span>
            <span className="p-1.5 rounded-lg bg-gray-900 text-emerald-400 border border-emerald-500/20">
              <Gauge className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {costPerKm !== '—' ? `₹${costPerKm}` : '—'}
          </div>
          <p className="text-[11px] text-gray-500">Per km driven ({formatOdometer(selectedVehicle.currentOdometer)})</p>
        </div>

        {/* Top Spending Category */}
        <div className="p-5 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Top Spending Area</span>
            <span className="p-1.5 rounded-lg bg-gray-900 text-amber-400 border border-amber-500/20">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white truncate">
            {sortedCategories.length > 0 ? sortedCategories[0].category : 'No records'}
          </div>
          <p className="text-[11px] text-gray-500">
            {sortedCategories.length > 0 ? `${formatCurrency(sortedCategories[0].amount)} (${sortedCategories[0].percentage}%)` : '—'}
          </p>
        </div>
      </div>

      {/* Multi-Segment Distribution Bar */}
      <div className="p-6 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-400" />
            <span>Expense Distribution</span>
          </h3>
          <span className="text-xs text-gray-400 font-mono">{sortedCategories.length} Categories</span>
        </div>

        {/* Bar */}
        <div className="h-4 w-full bg-gray-900 rounded-full overflow-hidden flex shadow-inner">
          {sortedCategories.map((item, idx) => (
            <div
              key={item.category}
              style={{ width: `${Math.max(item.percentage, 2)}%` }}
              className={`${getCategoryColor(idx)} h-full transition-all duration-300 hover:opacity-80`}
              title={`${item.category}: ${formatCurrency(item.amount)} (${item.percentage}%)`}
            />
          ))}
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          {sortedCategories.map((item, idx) => (
            <div key={item.category} className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${getCategoryColor(idx)} shrink-0`} />
                <span className="text-xs font-semibold text-gray-300 truncate">{item.category}</span>
              </div>
              <div className="text-sm font-extrabold text-white font-mono">
                {formatCurrency(item.amount)}
              </div>
              <div className="text-[10px] text-gray-500 font-semibold">
                {item.percentage}% of total
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Month-over-Month Spending Trend Graph */}
      {monthlyList.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>Monthly Spending Progression</span>
          </h3>

          <div className="space-y-3 pt-2">
            {monthlyList.map((m) => {
              const pct = Math.round((m.amount / maxMonthly) * 100);
              return (
                <div key={m.sortKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-300">{m.label}</span>
                    <span className="font-mono font-bold text-cyan-300">{formatCurrency(m.amount)}</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
