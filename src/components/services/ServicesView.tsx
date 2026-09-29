import React, { useState } from 'react';
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
  Layers
} from 'lucide-react';
import { ServiceRecord, ServiceType } from '../../types';
import { useVehicle } from '../../context/VehicleContext';
import { ServiceModal } from './ServiceModal';
import { ConfirmDialog } from '../common/Modal';
import { formatCurrency, formatOdometer, formatDate } from '../../utils/formatters';

export const ServicesView: React.FC = () => {
  const { 
    selectedVehicle, 
    services, 
    loadingServices, 
    addService, 
    updateService, 
    deleteService 
  } = useVehicle();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-800/60">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>Service & Maintenance</span>
            <span className="text-sm font-normal text-gray-400 bg-gray-900 px-2.5 py-0.5 rounded-full border border-gray-800">
              {totalServiceCount}
            </span>
          </h1>

          {/* Current Vehicle Context Badge */}
          <div className="mt-2 flex items-center gap-3 text-sm text-gray-300">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Car className="w-4 h-4 text-cyan-400" />
              <span>{selectedVehicle.name}</span>
            </span>
            <span className="text-gray-600">•</span>
            <span className="font-mono text-cyan-400 font-semibold flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" />
              <span>{formatOdometer(selectedVehicle.currentOdometer)}</span>
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400 font-mono text-xs">{selectedVehicle.vehicleNumber}</span>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Service Record</span>
        </button>
      </div>

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
      ) : (
        <div className="space-y-4">
          {services.map((srv) => {
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

      {/* Add Service Modal */}
      {isAddOpen && (
        <ServiceModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAdd}
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
