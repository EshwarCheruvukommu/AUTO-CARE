import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, Fuel, Wrench, Calendar, Info, Layers } from 'lucide-react';
import { ExpenseRecord, FuelRecord, ServiceRecord } from '../../types';
import { formatCurrency, parseLocalDate } from '../../utils/formatters';

interface ExpenditureTrendChartProps {
  expenses: ExpenseRecord[];
  fuelRecords: FuelRecord[];
  services: ServiceRecord[];
}

export const ExpenditureTrendChart: React.FC<ExpenditureTrendChartProps> = ({
  expenses,
  fuelRecords,
  services,
}) => {
  const [timeRange, setTimeRange] = useState<'6m' | '12m' | 'all'>('12m');
  const [chartType, setChartType] = useState<'line' | 'area'>('line');

  // Aggregate monthly data for Maintenance (Service + Repair) and Fuel
  const chartData = useMemo(() => {
    const monthlyAgg: Record<
      string,
      {
        monthKey: string;
        monthLabel: string;
        maintenance: number;
        fuel: number;
        otherExpenses: number;
        total: number;
        sortTimestamp: number;
      }
    > = {};

    // 1. Process Fuel Records
    fuelRecords.forEach((f) => {
      if (!f.fuelDate) return;
      const d = parseLocalDate(f.fuelDate);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

      if (!monthlyAgg[key]) {
        monthlyAgg[key] = {
          monthKey: key,
          monthLabel: label,
          maintenance: 0,
          fuel: 0,
          otherExpenses: 0,
          total: 0,
          sortTimestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
        };
      }
      const cost = Number(f.totalCost) || 0;
      monthlyAgg[key].fuel += cost;
      monthlyAgg[key].total += cost;
    });

    // 2. Process Service Records
    services.forEach((s) => {
      const dateStr = s.serviceDate || (s as any).date;
      if (!dateStr) return;
      const d = parseLocalDate(dateStr);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

      if (!monthlyAgg[key]) {
        monthlyAgg[key] = {
          monthKey: key,
          monthLabel: label,
          maintenance: 0,
          fuel: 0,
          otherExpenses: 0,
          total: 0,
          sortTimestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
        };
      }
      const cost = Number(s.cost) || 0;
      monthlyAgg[key].maintenance += cost;
      monthlyAgg[key].total += cost;
    });

    // 3. Process Expense Records (capture Service/Repair and Fuel expenses if logged under expenses)
    expenses.forEach((e) => {
      const dateStr = e.expenseDate || (e as any).date;
      if (!dateStr) return;
      const d = parseLocalDate(dateStr);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

      if (!monthlyAgg[key]) {
        monthlyAgg[key] = {
          monthKey: key,
          monthLabel: label,
          maintenance: 0,
          fuel: 0,
          otherExpenses: 0,
          total: 0,
          sortTimestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
        };
      }
      const amt = Number(e.amount) || 0;
      const cat = (e.category || '').toLowerCase();

      if (cat === 'fuel') {
        // If user logged fuel in expenses table, track here if not double-counted
        monthlyAgg[key].fuel += amt;
      } else if (
        cat === 'service' ||
        cat === 'repair' ||
        cat === 'tyres' ||
        cat === 'battery'
      ) {
        monthlyAgg[key].maintenance += amt;
      } else {
        monthlyAgg[key].otherExpenses += amt;
      }
      monthlyAgg[key].total += amt;
    });

    let list = Object.values(monthlyAgg).sort(
      (a, b) => a.sortTimestamp - b.sortTimestamp
    );

    // Filter by time range
    if (timeRange === '6m') {
      list = list.slice(-6);
    } else if (timeRange === '12m') {
      list = list.slice(-12);
    }

    return list;
  }, [expenses, fuelRecords, services, timeRange]);

  // Overall totals for badge overview
  const totals = useMemo(() => {
    let maintenanceTotal = 0;
    let fuelTotal = 0;
    let combinedTotal = 0;

    chartData.forEach((d) => {
      maintenanceTotal += d.maintenance;
      fuelTotal += d.fuel;
      combinedTotal += d.total;
    });

    return { maintenanceTotal, fuelTotal, combinedTotal };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3.5 rounded-2xl bg-[#090e17] border border-gray-700/80 shadow-2xl space-y-2 text-xs">
          <div className="font-bold text-gray-200 border-b border-gray-800 pb-1.5 flex items-center justify-between gap-4">
            <span>{label}</span>
            <span className="text-[10px] text-gray-400 font-normal">Monthly Spend</span>
          </div>

          <div className="space-y-1 font-mono">
            {payload.map((entry: any, index: number) => (
              <div
                key={`item-${index}`}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-300 font-sans">{entry.name}:</span>
                </div>
                <span className="font-bold text-white">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white">
              Monthly Maintenance &amp; Fuel Expenditure Trends
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Historical trend analysis comparing routine maintenance vs fuel expenses over time
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Time range selector */}
          <div className="flex bg-[#0a0d14] rounded-xl p-1 border border-gray-800 text-xs">
            {(['6m', '12m', 'all'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-cyan-500 text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range === '6m' ? 'Last 6M' : range === '12m' ? 'Last 12M' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Line vs Area toggle */}
          <button
            type="button"
            onClick={() => setChartType(chartType === 'line' ? 'area' : 'line')}
            className="p-1.5 rounded-xl bg-[#0a0d14] border border-gray-800 text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer"
            title={`Switch to ${chartType === 'line' ? 'Area' : 'Line'} view`}
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Maintenance Total */}
        <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-cyan-500/20 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              <Wrench className="w-3.5 h-3.5" />
              <span>Maintenance Spend</span>
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">
              {formatCurrency(totals.maintenanceTotal)}
            </div>
          </div>
          <div className="text-right text-[10px] text-gray-400">
            Services &amp; Repairs
          </div>
        </div>

        {/* Fuel Total */}
        <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-amber-500/20 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              <Fuel className="w-3.5 h-3.5" />
              <span>Fuel Spend</span>
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">
              {formatCurrency(totals.fuelTotal)}
            </div>
          </div>
          <div className="text-right text-[10px] text-gray-400">
            Refueling Logs
          </div>
        </div>

        {/* Combined Spend */}
        <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-emerald-500/20 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Combined Total</span>
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">
              {formatCurrency(totals.combinedTotal)}
            </div>
          </div>
          <div className="text-right text-[10px] text-gray-400">
            In Selected Period
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      {chartData.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-400 space-y-2 bg-[#0a0d14] rounded-2xl border border-gray-800">
          <Calendar className="w-8 h-8 text-gray-600 mx-auto" />
          <p className="font-semibold text-gray-300">No monthly trend data available yet.</p>
          <p className="text-gray-500 max-w-sm mx-auto">
            Log fuel fills or service entries to view historical monthly expenditure curves.
          </p>
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1D2A3A" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                  formatter={(value) => <span className="text-gray-300 font-medium">{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="maintenance"
                  name="Maintenance"
                  stroke="#00D9FF"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#00D9FF', stroke: '#0B1628', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#00D9FF', stroke: '#ffffff', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="fuel"
                  name="Fuel"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#F59E0B', stroke: '#0B1628', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#F59E0B', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </LineChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="maintenanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00D9FF" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1D2A3A" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                  formatter={(value) => <span className="text-gray-300 font-medium">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="maintenance"
                  name="Maintenance"
                  stroke="#00D9FF"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#maintenanceGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="fuel"
                  name="Fuel"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#fuelGradient)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
