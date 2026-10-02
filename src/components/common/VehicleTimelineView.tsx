import React, { useState, useMemo } from 'react';
import { 
  History, 
  Wrench, 
  Fuel, 
  Receipt, 
  FileText, 
  Bell, 
  Calendar, 
  Gauge, 
  Filter, 
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useVehicle } from '../../context/VehicleContext';
import { formatCurrency, formatOdometer, formatDate, parseLocalDate, formatPricePerLitre } from '../../utils/formatters';

export interface TimelineEvent {
  id: string;
  type: 'service' | 'fuel' | 'expense' | 'document' | 'reminder';
  date: string;
  title: string;
  subtitle: string;
  odometer?: number;
  cost?: number;
  statusBadge?: string;
  notes?: string;
  rawDate: Date;
}

export const VehicleTimelineView: React.FC = () => {
  const { 
    selectedVehicle, 
    services, 
    fuelRecords, 
    expenses, 
    documents, 
    allReminders 
  } = useVehicle();

  const [activeFilter, setActiveFilter] = useState<'all' | 'service' | 'fuel' | 'expense' | 'document'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Combine all records into a single chronological timeline
  const timelineEvents = useMemo(() => {
    if (!selectedVehicle) return [];

    const list: TimelineEvent[] = [];

    // 1. Services
    services.forEach((s) => {
      const sDateStr = s.serviceDate || (s as any).date || '';
      const d = parseLocalDate(sDateStr);
      list.push({
        id: `srv-${s.id}`,
        type: 'service',
        date: sDateStr,
        title: s.serviceType || 'Service',
        subtitle: s.serviceCenter ? `At ${s.serviceCenter}` : (s.description || 'Maintenance record'),
        odometer: s.odometer,
        cost: s.cost,
        notes: s.notes || undefined,
        rawDate: d,
      });
    });

    // 2. Fuel entries
    fuelRecords.forEach((f) => {
      const d = parseLocalDate(f.fuelDate);
      list.push({
        id: `fuel-${f.id}`,
        type: 'fuel',
        date: f.fuelDate,
        title: `${f.fuelType} Refill`,
        subtitle: f.litres ? `${f.litres}L @ ${formatPricePerLitre(f.totalCost, f.litres, f.pricePerLitre)}` : (f.station || 'Fuel fill-up'),
        odometer: f.odometer,
        cost: f.totalCost,
        notes: f.notes || undefined,
        rawDate: d,
      });
    });

    // 3. Expenses
    expenses.forEach((e) => {
      const eDateStr = e.expenseDate || (e as any).date || '';
      const d = parseLocalDate(eDateStr);
      list.push({
        id: `exp-${e.id}`,
        type: 'expense',
        date: eDateStr,
        title: `${e.category} Expense`,
        subtitle: e.description + (e.vendor ? ` • ${e.vendor}` : ''),
        cost: e.amount,
        notes: e.notes || undefined,
        rawDate: d,
      });
    });

    // 4. Documents
    documents.forEach((doc) => {
      const d = parseLocalDate(doc.issueDate || doc.createdAt);
      list.push({
        id: `doc-${doc.id}`,
        type: 'document',
        date: doc.issueDate || doc.createdAt,
        title: `${doc.type} Document`,
        subtitle: `Doc #: ${doc.documentNumber || 'N/A'} (Expires: ${formatDate(doc.expiryDate)})`,
        notes: doc.notes || undefined,
        rawDate: d,
      });
    });

    // Sort chronological descending (most recent events at top)
    list.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    return list;
  }, [selectedVehicle, services, fuelRecords, expenses, documents]);

  const filteredEvents = useMemo(() => {
    return timelineEvents.filter((item) => {
      if (activeFilter !== 'all' && item.type !== activeFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          (item.notes && item.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [timelineEvents, activeFilter, searchTerm]);

  if (!selectedVehicle) return null;

  const getEventBadge = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'service':
        return {
          icon: Wrench,
          bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          dotBg: 'bg-purple-500',
        };
      case 'fuel':
        return {
          icon: Fuel,
          bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
          dotBg: 'bg-cyan-500',
        };
      case 'expense':
        return {
          icon: Receipt,
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          dotBg: 'bg-amber-400',
        };
      case 'document':
        return {
          icon: FileText,
          bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          dotBg: 'bg-blue-500',
        };
      default:
        return {
          icon: History,
          bg: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
          dotBg: 'bg-gray-400',
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Search & Category Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#0f131c] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {(['all', 'service', 'fuel', 'expense', 'document'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === filter
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/25'
                  : 'bg-gray-900/80 text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              {filter === 'all' ? `All Events (${timelineEvents.length})` : filter}
            </button>
          ))}
        </div>

        {/* Keyword Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search timeline..."
            className="w-full bg-[#121620] border border-gray-800 focus:border-cyan-500/50 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#0d1017] border border-gray-800 space-y-3">
          <History className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No timeline events found</h3>
          <p className="text-xs text-gray-400">
            {searchTerm ? 'No events matched your search query.' : 'Add services, fuel fill-ups, or expenses to view chronological logs.'}
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-blue-600/40 before:to-gray-800">
          {filteredEvents.map((evt) => {
            const badge = getEventBadge(evt.type);
            const EventIcon = badge.icon;

            return (
              <div key={evt.id} className="relative group">
                {/* Node Dot on Timeline */}
                <div className={`absolute -left-[19px] sm:-left-[23px] top-4 w-3.5 h-3.5 rounded-full ${badge.dotBg} ring-4 ring-[#090b10] group-hover:scale-125 transition-transform shadow-md`} />

                {/* Event Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0f131c] border border-gray-800 group-hover:border-cyan-500/30 transition-all shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${badge.bg}`}>
                          <EventIcon className="w-3 h-3" />
                          <span>{evt.type}</span>
                        </span>

                        <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span>{formatDate(evt.date)}</span>
                        </span>

                        {evt.odometer && (
                          <span className="text-xs font-mono font-semibold text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20 flex items-center gap-1">
                            <Gauge className="w-3 h-3 text-cyan-400" />
                            <span>{formatOdometer(evt.odometer)}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-white tracking-tight">
                        {evt.title}
                      </h4>

                      <p className="text-xs text-gray-300">
                        {evt.subtitle}
                      </p>

                      {evt.notes && (
                        <div className="text-[11px] text-gray-400 bg-black/30 p-2 rounded-lg border border-gray-800/80 mt-2">
                          <span className="text-gray-500 font-semibold mr-1">Note:</span>
                          {evt.notes}
                        </div>
                      )}
                    </div>

                    {/* Cost Amount (if any) */}
                    {evt.cost !== undefined && evt.cost > 0 && (
                      <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Amount
                        </span>
                        <span className="text-lg font-black text-cyan-400 font-mono">
                          {formatCurrency(evt.cost)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
