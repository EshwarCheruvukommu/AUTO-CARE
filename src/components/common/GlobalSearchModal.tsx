import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  X, 
  Car, 
  Wrench, 
  Fuel, 
  Receipt, 
  FileText, 
  Bell, 
  ArrowRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { useVehicle } from '../../context/VehicleContext';
import { formatCurrency, formatOdometer, formatDate } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const { 
    selectedVehicle, 
    vehicles, 
    documents, 
    services, 
    fuelRecords, 
    expenses, 
    allReminders 
  } = useVehicle();

  const [query, setQuery] = useState('');

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { services: [], fuel: [], expenses: [], documents: [], reminders: [], total: 0 };

    const matchingServices = services.filter((s) => {
      const type = (s.serviceType || '').toLowerCase();
      const desc = (s.description || s.workPerformed || '').toLowerCase();
      const center = (s.serviceCenter || '').toLowerCase();
      return type.includes(q) || desc.includes(q) || center.includes(q);
    }).slice(0, 5);

    const matchingFuel = fuelRecords.filter((f) => {
      const date = (f.fuelDate || '').toLowerCase();
      const type = (f.fuelType || '').toLowerCase();
      const station = (f.station || '').toLowerCase();
      const notes = (f.notes || '').toLowerCase();
      return date.includes(q) || type.includes(q) || station.includes(q) || notes.includes(q);
    }).slice(0, 5);

    const matchingExpenses = expenses.filter((e) => {
      const desc = (e.description || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();
      const vendor = (e.vendor || '').toLowerCase();
      return desc.includes(q) || cat.includes(q) || vendor.includes(q);
    }).slice(0, 5);

    const matchingDocuments = documents.filter((d) => {
      const type = (d.type || '').toLowerCase();
      const num = (d.documentNumber || '').toLowerCase();
      const notes = (d.notes || '').toLowerCase();
      return type.includes(q) || num.includes(q) || notes.includes(q);
    }).slice(0, 5);

    const matchingReminders = allReminders.filter((r) => {
      const title = (r.title || '').toLowerCase();
      const type = (r.reminderType || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();
      return title.includes(q) || type.includes(q) || desc.includes(q);
    }).slice(0, 5);

    const total = 
      matchingServices.length + 
      matchingFuel.length + 
      matchingExpenses.length + 
      matchingDocuments.length + 
      matchingReminders.length;

    return {
      services: matchingServices,
      fuel: matchingFuel,
      expenses: matchingExpenses,
      documents: matchingDocuments,
      reminders: matchingReminders,
      total,
    };
  }, [query, services, fuelRecords, expenses, documents, allReminders]);

  if (!isOpen) return null;

  const handleSelectResult = (tab: string) => {
    onNavigateTab(tab);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-[#0c1018] border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-150 text-gray-200">
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-gray-800 bg-[#121624] flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder={`Search across ${selectedVehicle?.name || 'active vehicle'} (services, fuel, expenses, docs, alerts)...`}
            className="w-full bg-transparent border-none text-white placeholder-gray-500 text-sm sm:text-base focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-800 rounded-lg shrink-0"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-900 text-gray-400 hover:text-white border border-gray-800 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {!query.trim() ? (
            <div className="py-8 text-center text-xs text-gray-500 space-y-2">
              <Sparkles className="w-6 h-6 text-cyan-500/60 mx-auto" />
              <p>Type keywords to search {selectedVehicle?.name || 'your vehicle'}'s maintenance records, fuel logs, expenses, and documents.</p>
            </div>
          ) : searchResults.total === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              No matching records found for "{query}".
            </div>
          ) : (
            <>
              {/* Services Results */}
              {searchResults.services.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 px-2">
                    <Wrench className="w-3 h-3" />
                    <span>Service Records</span>
                  </div>
                  {searchResults.services.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectResult('services')}
                      className="p-3 rounded-xl bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 flex items-center justify-between gap-3 cursor-pointer group transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                          {s.serviceType}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {formatDate(s.serviceDate || (s as any).date)} • {formatOdometer(s.odometer)} • {formatCurrency(s.cost)}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Fuel Results */}
              {searchResults.fuel.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 px-2">
                    <Fuel className="w-3 h-3" />
                    <span>Fuel &amp; Mileage</span>
                  </div>
                  {searchResults.fuel.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => handleSelectResult('fuel')}
                      className="p-3 rounded-xl bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 flex items-center justify-between gap-3 cursor-pointer group transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                          {f.fuelType} Refuel ({f.litres}L)
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {formatDate(f.fuelDate)} • {formatOdometer(f.odometer)} • {formatCurrency(f.totalCost)}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-amber-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Expense Results */}
              {searchResults.expenses.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 px-2">
                    <Receipt className="w-3 h-3" />
                    <span>Expenses</span>
                  </div>
                  {searchResults.expenses.map((e) => (
                    <div
                      key={e.id}
                      onClick={() => handleSelectResult('expenses')}
                      className="p-3 rounded-xl bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 flex items-center justify-between gap-3 cursor-pointer group transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-purple-300 truncate">
                          {e.description || e.category}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {formatDate(e.expenseDate || e.date)} • {e.category} • {formatCurrency(e.amount)}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Document Results */}
              {searchResults.documents.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 px-2">
                    <FileText className="w-3 h-3" />
                    <span>Documents</span>
                  </div>
                  {searchResults.documents.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => handleSelectResult('documents')}
                      className="p-3 rounded-xl bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 flex items-center justify-between gap-3 cursor-pointer group transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-blue-300 truncate">
                          {d.type} {d.documentNumber ? `(${d.documentNumber})` : ''}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          Expires: {formatDate(d.expiryDate)}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Reminder Results */}
              {searchResults.reminders.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5 px-2">
                    <Bell className="w-3 h-3" />
                    <span>Reminders &amp; Alerts</span>
                  </div>
                  {searchResults.reminders.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => handleSelectResult('reminders')}
                      className="p-3 rounded-xl bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 flex items-center justify-between gap-3 cursor-pointer group transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-red-300 truncate">
                          {r.title}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          Due: {formatDate(r.dueDate)} • {r.status}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-red-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-800 bg-[#0d1017] flex items-center justify-between text-[11px] text-gray-500">
          <span>Vehicle Scoped: <strong className="text-gray-300">{selectedVehicle?.name || 'None'}</strong></span>
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};
