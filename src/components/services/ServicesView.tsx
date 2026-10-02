import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Wrench, 
  Calendar, 
  Gauge, 
  Check, 
  MapPin, 
  Car, 
  AlertTriangle, 
  FileText,
  Clock,
  Sparkles,
  Zap,
  Activity,
  Layers,
  ClipboardList,
  ListFilter,
  Search,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { ServiceRecord, ServiceType } from '../../types';
import { useVehicle } from '../../context/VehicleContext';
import { ServiceModal } from './ServiceModal';
import { MaintenanceScheduleView } from './MaintenanceScheduleView';
import { VehicleInspectionModal } from './VehicleInspectionModal';
import { ConfirmDialog } from '../common/Modal';
import { SectionVisualHeader } from '../common/SectionVisualHeader';
import { formatCurrency, formatOdometer, formatDate } from '../../utils/formatters';

export const ServicesView: React.FC = () => {
  const { 
    selectedVehicle, 
    services, 
    loadingServices, 
    addService, 
    updateService, 
    deleteService,
    addReminder
  } = useVehicle();

  const [activeSubTab, setActiveSubTab] = useState<'history' | 'schedule'>('history');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [initialServiceType, setInitialServiceType] = useState<string | undefined>(undefined);
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const filteredServices = useMemo(() => {
    let result = services.filter((srv: ServiceRecord) => {
      if (categoryFilter !== 'All' && srv.serviceType !== categoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const typeMatches = (srv.serviceType || '').toLowerCase().includes(q);
      const descMatches = (srv.description || srv.workPerformed || '').toLowerCase().includes(q);
      const centerMatches = (srv.serviceCenter || '').toLowerCase().includes(q);
      const notesMatches = (srv.notes || '').toLowerCase().includes(q);
      return typeMatches || descMatches || centerMatches || notesMatches;
    });

    result.sort((a, b) => {
      const dateA = new Date(a.serviceDate || a.date || '').getTime();
      const dateB = new Date(b.serviceDate || b.date || '').getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [services, categoryFilter, searchQuery, sortOrder]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenAddWithPreset = (serviceTypePreset?: string) => {
    setInitialServiceType(serviceTypePreset);
    setIsAddOpen(true);
  };

  const handleCreateScheduleReminder = async (title: string, dueDate: string, reminderType: any) => {
    if (!selectedVehicle) return;
    try {
      await addReminder({
        vehicleId: selectedVehicle.id,
        title,
        dueDate,
        reminderType,
        priority: 'High',
        status: 'Pending',
        sourceType: 'custom',
        description: `Automated predictive maintenance reminder for ${title}`,
      });
      showToast(`Reminder set for ${title}.`);
    } catch (err: any) {
      console.error('Failed to create reminder from schedule:', err);
      setErrorMessage(err?.message || 'Failed to set reminder.');
    }
  };

  const handleAdd = async (data: any) => {
    try {
      setErrorMessage(null);
      await addService(data);
      showToast('Service record saved successfully.');
    } catch (err: any) {
      console.error('Failed to add service record:', err);
      setErrorMessage(
        err?.message?.includes('permission')
          ? "You don't have permission to perform this action."
          : err?.message || 'Unable to save service record. Please try again.'
      );
      throw err;
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingService) return;
    try {
      setErrorMessage(null);
      await updateService(editingService.id, data);
      setEditingService(null);
      showToast('Service record updated successfully.');
    } catch (err: any) {
      console.error('Failed to update service record:', err);
      setErrorMessage(
        err?.message?.includes('permission')
          ? "You don't have permission to edit this record."
          : err?.message || 'Failed to update service record. Please try again.'
      );
      throw err;
    }
  };

  const confirmDelete = async () => {
    if (!deletingServiceId) return;
    try {
      setIsDeleting(true);
      setErrorMessage(null);
      await deleteService(deletingServiceId);
      setDeletingServiceId(null);
      showToast('Service record deleted successfully.');
    } catch (err: any) {
      console.error('Failed to delete service record:', err);
      setErrorMessage('Failed to delete service record. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getServiceTypeBadgeColor = (type: ServiceType) => {
    switch (type) {
      case 'Oil Change':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Brake Service':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'General Service':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'Battery Replacement':
      case 'Electrical Repair':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'Tyre Service':
      case 'Wheel Alignment':
      case 'Wheel Balancing':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Car Wash / Detailing':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'AC Service':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
  };

  if (!selectedVehicle) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-[#0d1017] p-12 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto text-3xl mb-4">
          🚗
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Active Vehicle Selected</h3>
        <p className="text-sm text-gray-400 mb-6">
          Please add or select a vehicle first to view and log maintenance history.
        </p>
      </div>
    );
  }

  // Calculate dynamic summary metrics from records for the active vehicle
  const totalServiceCount = services.length;
  const totalServiceCost = services.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
  const latestService = services.length > 0 ? services[0] : null;
  const latestServiceType = latestService?.serviceType || '—';
  const latestServiceDate = latestService?.serviceDate ? formatDate(latestService.serviceDate) : '—';

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center justify-between shadow-lg shadow-emerald-950/20 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-xs text-emerald-300 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold flex items-center justify-between shadow-lg shadow-red-950/20 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={() => setErrorMessage(null)}
            className="text-xs text-red-300 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3D Section Visual Header */}
      <SectionVisualHeader
        sectionId="services"
        customTitle="Service & Maintenance Bay"
        customTagline="Preventative intervals, engine maintenance, garage workshop history, and 20-point digital inspections."
        activeVehicleInfo={`${selectedVehicle.name} • ${selectedVehicle.vehicleNumber} • ${formatOdometer(selectedVehicle.currentOdometer)}`}
        rightAction={
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsInspectionOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D232B] hover:bg-[#252C35] border border-[#252C35] hover:border-[#00D4C7]/40 text-gray-200 hover:text-white font-semibold text-xs shadow-md transition-all cursor-pointer btn-3d"
              title="Start 20-Point Digital Inspection"
            >
              <ClipboardList className="w-4 h-4 text-[#00D4C7]" />
              <span>20-Point Inspection</span>
            </button>

            <button
              onClick={() => handleOpenAddWithPreset(undefined)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00D4C7] via-cyan-500 to-blue-600 hover:from-[#00D4C7] hover:to-blue-500 text-black hover:text-white font-bold text-sm shadow-lg shadow-[#00D4C7]/20 transition-all cursor-pointer btn-3d"
            >
              <Plus className="w-4 h-4 text-black group-hover:text-white" />
              <span>Add Service Record</span>
            </button>
          </div>
        }
      />

      {/* Sub Tabs: Service History vs AI Predictive Maintenance Schedule */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-950/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-900/60'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Service History Records ({totalServiceCount})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'schedule'
              ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-950/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-900/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>AI Maintenance Schedule &amp; Predictions</span>
        </button>
      </div>

      {activeSubTab === 'schedule' ? (
        <MaintenanceScheduleView
          onLogService={(type) => handleOpenAddWithPreset(type)}
          onAddReminder={handleCreateScheduleReminder}
        />
      ) : (
        <>
          {/* Dynamic Summary Cards (Calculated dynamically from Firestore data) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Service Records */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0f131c] border border-gray-800 hover:border-gray-700 transition-all space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Service Records</span>
                <span className="p-1.5 rounded-lg bg-gray-900 text-cyan-400 border border-gray-800">
                  <Layers className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {totalServiceCount}
              </div>
              <p className="text-[11px] text-gray-500">Total logged services</p>
            </div>

            {/* Metric 2: Total Service Cost */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0f131c] border border-gray-800 hover:border-cyan-500/30 transition-all space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Service Cost</span>
                <span className="p-1.5 rounded-lg bg-gray-900 text-cyan-400 border border-cyan-500/20">
                  <span className="font-bold text-xs">₹</span>
                </span>
              </div>
              <div className="text-2xl font-black text-cyan-400 font-mono">
                {formatCurrency(totalServiceCost)}
              </div>
              <p className="text-[11px] text-gray-500">Cumulative maintenance</p>
            </div>

            {/* Metric 3: Latest Service */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0f131c] border border-gray-800 hover:border-gray-700 transition-all space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Latest Service</span>
                <span className="p-1.5 rounded-lg bg-gray-900 text-amber-400 border border-gray-800">
                  <Wrench className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-lg font-bold text-white truncate" title={latestServiceType}>
                {latestServiceType}
              </div>
              <p className="text-[11px] text-gray-500 truncate">
                {latestService ? `${formatOdometer(latestService.odometer)}` : 'No logs yet'}
              </p>
            </div>

            {/* Metric 4: Last Service Date */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0f131c] border border-gray-800 hover:border-gray-700 transition-all space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Last Service</span>
                <span className="p-1.5 rounded-lg bg-gray-900 text-emerald-400 border border-gray-800">
                  <Calendar className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-lg font-bold text-emerald-400 truncate">
                {latestServiceDate}
              </div>
              <p className="text-[11px] text-gray-500">Service chronology date</p>
            </div>
          </div>

      {/* Main Content: Loading, Empty, or Service Record Cards */}
      {/* Search, Filter, Sort Controls for Service History */}
      {services.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#0d1017] border border-gray-800">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search service by type, service center, or work performed..."
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

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#121622] border border-gray-800 text-gray-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Categories</option>
              <option value="General Service">General Service</option>
              <option value="Oil Change">Oil Change</option>
              <option value="Brake Service">Brake Service</option>
              <option value="Tyre Service">Tyre Service</option>
              <option value="Battery">Battery</option>
              <option value="Electrical">Electrical</option>
              <option value="Body Repair">Body Repair</option>
              <option value="AC Service">AC Service</option>
              <option value="Other">Other</option>
            </select>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Toggle Date Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
            </button>
          </div>
        </div>
      )}

      {loadingServices ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400 space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
          <span className="text-xs uppercase font-semibold tracking-wider text-cyan-400">
            Loading service history...
          </span>
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-3xl border border-gray-800 bg-[#0d1017] p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto text-3xl">
            🔧
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No service records yet</h3>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
              Start tracking your vehicle's maintenance history.
            </p>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            + Add Service Record
          </button>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-[#0d1017] p-8 text-center text-xs text-gray-400">
          No service records match your search or filter. <button onClick={() => { setSearchQuery(''); setCategoryFilter('All'); }} className="text-cyan-400 underline font-semibold ml-1">Reset Filters</button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredServices.map((srv: ServiceRecord) => {
            const displayDate = srv.serviceDate || srv.date || '';
            const displayDesc = srv.description || srv.workPerformed || '';

            return (
              <div
                key={srv.id}
                className="rounded-2xl border border-gray-800/80 bg-[#0f131c] hover:border-cyan-500/30 p-5 sm:p-6 transition-all duration-200 shadow-md shadow-black/40"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left Column: Service Type Badge, Date, Odometer, Service Center, Description */}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold border ${getServiceTypeBadgeColor(srv.serviceType)}`}>
                        {srv.serviceType}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span>{formatDate(displayDate)}</span>
                      </span>
                      <span className="text-xs font-mono font-semibold text-gray-300 bg-gray-900 px-2.5 py-0.5 rounded-md border border-gray-800 flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-cyan-400" />
                        <span>{formatOdometer(srv.odometer)}</span>
                      </span>
                    </div>

                    {/* Service Center (if available) */}
                    {srv.serviceCenter && (
                      <div className="text-xs text-cyan-300/90 flex items-center gap-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{srv.serviceCenter}</span>
                      </div>
                    )}

                    {/* Description / Work Performed (if available) */}
                    {displayDesc && (
                      <div className="pt-1">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Work Performed
                        </div>
                        <p className="text-xs sm:text-sm text-gray-200 whitespace-pre-line leading-relaxed bg-[#0a0d14] p-3 rounded-xl border border-gray-800/70">
                          {displayDesc}
                        </p>
                      </div>
                    )}

                    {/* Notes (if available) */}
                    {srv.notes && (
                      <div className="text-xs text-gray-400 bg-gray-900/40 p-2.5 rounded-lg border border-gray-800/60">
                        <span className="text-gray-500 text-[10px] uppercase font-bold block mb-0.5">Notes:</span>
                        <span>{srv.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Cost and Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-800">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Service Cost
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                        {formatCurrency(srv.cost)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingService(srv)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit Service Record"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingServiceId(srv.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Service Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Add Service Modal */}
      {isAddOpen && (
        <ServiceModal
          isOpen={isAddOpen}
          onClose={() => {
            setIsAddOpen(false);
            setInitialServiceType(undefined);
          }}
          onSubmit={handleAdd}
          initialData={initialServiceType ? { serviceType: initialServiceType as any } : undefined}
          vehicleId={selectedVehicle.id}
          currentVehicleOdometer={selectedVehicle.currentOdometer}
          title="Add Service Record"
        />
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <ServiceModal
          isOpen={!!editingService}
          onClose={() => setEditingService(null)}
          onSubmit={handleUpdate}
          initialData={editingService}
          vehicleId={selectedVehicle.id}
          currentVehicleOdometer={selectedVehicle.currentOdometer}
          title="Edit Service Record"
        />
      )}

      {/* 20-Point Multi-Point Digital Inspection Modal */}
      {isInspectionOpen && selectedVehicle && (
        <VehicleInspectionModal
          isOpen={isInspectionOpen}
          onClose={() => setIsInspectionOpen(false)}
          vehicle={selectedVehicle}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingServiceId}
        onClose={() => setDeletingServiceId(null)}
        onConfirm={confirmDelete}
        title="Delete this service record?"
        message="Are you sure you want to delete this service record? This will permanently remove the record and update your vehicle's service history."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
      />
    </div>
  );
};
