import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Fuel, 
  Calendar, 
  Gauge, 
  Check, 
  MapPin, 
  Car, 
  AlertTriangle, 
  Zap, 
  TrendingUp, 
  Droplet,
  Layers,
  FileText
} from 'lucide-react';
import { FuelRecord, FuelRecordType } from '../../types';
import { useVehicle } from '../../context/VehicleContext';
import { FuelModal } from './FuelModal';
import { ConfirmDialog } from '../common/Modal';
import { formatCurrency, formatOdometer, formatDate } from '../../utils/formatters';
import { calculateFuelMetrics } from '../../utils/mileage';

export const FuelView: React.FC = () => {
  const { 
    selectedVehicle, 
    fuelRecords, 
    loadingFuelRecords, 
    addFuelRecord, 
    updateFuelRecord, 
    deleteFuelRecord 
  } = useVehicle();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
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
      await addFuelRecord(data);
      showToast('Fuel entry saved successfully.');
    } catch (err: any) {
      console.error('Failed to add fuel record:', err);
      setErrorMessage(
        err?.message?.includes('permission')
          ? "You don't have permission to perform this action."
          : err?.message || 'Unable to save fuel entry. Please try again.'
      );
      throw err;
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingRecord) return;
    try {
      setErrorMessage(null);
      await updateFuelRecord(editingRecord.id, data);
      setEditingRecord(null);
      showToast('Fuel entry updated successfully.');
    } catch (err: any) {
      console.error('Failed to update fuel record:', err);
      setErrorMessage(
        err?.message?.includes('permission')
          ? "You don't have permission to edit this record."
          : err?.message || 'Failed to update fuel entry. Please try again.'
      );
      throw err;
    }
  };

  const confirmDelete = async () => {
    if (!deletingRecordId) return;
    try {
      setIsDeleting(true);
      setErrorMessage(null);
      await deleteFuelRecord(deletingRecordId);
      setDeletingRecordId(null);
      showToast('Fuel entry deleted successfully.');
    } catch (err: any) {
      console.error('Failed to delete fuel record:', err);
      setErrorMessage('Failed to delete fuel entry. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getFuelTypeBadgeColor = (type: FuelRecordType) => {
    switch (type) {
      case 'Petrol':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Diesel':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'CNG':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'EV Charging':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
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
          Please add or select a vehicle first to view and log fuel and mileage history.
        </p>
      </div>
    );
  }

  // Calculate dynamic metrics and interval mileages from Firestore records
  const {
    recordMileageMap,
    averageMileage,
    averageMileageLabel,
    totalLitres,
    totalCost,
  } = calculateFuelMetrics(fuelRecords);

  const totalEntriesCount = fuelRecords.length;
  const latestEntry = fuelRecords.length > 0 ? fuelRecords[0] : null;

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
            <span>Fuel & Mileage</span>
            <span className="text-sm font-normal text-gray-400 bg-gray-900 px-2.5 py-0.5 rounded-full border border-gray-800">
              {totalEntriesCount}
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
          <span>Add Fuel Entry</span>
        </button>
      </div>

      {/* Dynamic Summary Cards (Calculated dynamically from Firestore data) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Total Fuel Entries */}
        <div className="p-4 rounded-2xl bg-[#0f131c] border border-gray-800 hover:border-gray-700 transition-all space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Fuel Entries</span>
            <span className="p-1.5 rounded-lg bg-gray-900 text-cyan-400 border border-gray-800">
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {totalEntriesCount}
          </div>
          <p className="text-[11px] text-gray-500">Total logged refuels</p>
        </div>

        {/* Metric 2: Total Fuel Cost */}
        <div className="p-4 rounded-2xl bg-[#0f131c] border border-gray-800 hover:border-cyan-500/30 transition-all space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Total Fuel Cost</span>
            <span className="p-1.5 rounded-lg bg-gray-900 text-cyan-400 border border-cyan-500/20">
              <span className="font-bold text-xs">₹</span>
            </span>
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {formatCurrency(totalCost)}
          </div>
          <p className="text-[11px] text-gray-500">Total fuel expense</p>
        </div>

        {/* Metric 3: Total Fuel Quantity */}
        <div className="p-4 rounded-2xl bg-[#0f131c] border border-gray-800 hover:border-gray-700 transition-all space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Total Quantity</span>
            <span className="p-1.5 rounded-lg bg-gray-900 text-amber-400 border border-gray-800">
              <Droplet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {totalLitres > 0 ? `${totalLitres % 1 === 0 ? totalLitres : totalLitres.toFixed(1)} L` : '0 L'}
          </div>
          <p className="text-[11px] text-gray-500">Cumulative volume</p>
        </div>

        {/* Metric 4: Average Mileage */}
        <div className="p-4 rounded-2xl bg-[#0f131c] border border-gray-800 hover:border-emerald-500/30 transition-all space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Average Mileage</span>
            <span className="p-1.5 rounded-lg bg-gray-900 text-emerald-400 border border-gray-800">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono truncate ${averageMileage !== null ? 'text-emerald-400' : 'text-gray-400'}`}>
            {averageMileageLabel}
          </div>
          <p className="text-[11px] text-gray-500 truncate">
            {averageMileage !== null ? 'Calculated from refuels' : 'Requires min 2 entries'}
          </p>
        </div>

        {/* Metric 5: Latest Fuel Entry */}
        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-[#0f131c] border border-gray-800 hover:border-gray-700 transition-all space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Latest Refuel</span>
            <span className="p-1.5 rounded-lg bg-gray-900 text-cyan-400 border border-gray-800">
              <Fuel className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white truncate">
            {latestEntry ? `${latestEntry.fuelType}` : '—'}
          </div>
          <p className="text-[11px] text-gray-500 truncate">
            {latestEntry ? `${formatDate(latestEntry.fuelDate)}` : 'No logs yet'}
          </p>
        </div>
      </div>

      {/* Main Content: Loading, Empty State, or Fuel Cards List */}
      {loadingFuelRecords ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400 space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
          <span className="text-xs uppercase font-semibold tracking-wider text-cyan-400">
            Loading fuel history...
          </span>
        </div>
      ) : fuelRecords.length === 0 ? (
        <div className="rounded-3xl border border-gray-800 bg-[#0d1017] p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto text-3xl">
            ⛽
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No fuel entries yet</h3>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
              Start tracking your fuel usage and mileage.
            </p>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            + Add Fuel Entry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {fuelRecords.map((record) => {
            const intervalMileage = recordMileageMap[record.id];

            return (
              <div
                key={record.id}
                className="rounded-2xl border border-gray-800/80 bg-[#0f131c] hover:border-cyan-500/30 p-5 sm:p-6 transition-all duration-200 shadow-md shadow-black/40"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left Column: Badges, Date, Odometer, Quantity, Station, Notes */}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold border ${getFuelTypeBadgeColor(record.fuelType)}`}>
                        {record.fuelType}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span>{formatDate(record.fuelDate)}</span>
                      </span>
                      <span className="text-xs font-mono font-semibold text-gray-300 bg-gray-900 px-2.5 py-0.5 rounded-md border border-gray-800 flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-cyan-400" />
                        <span>{formatOdometer(record.odometer)}</span>
                      </span>

                      {/* Mileage Badge for this interval */}
                      {intervalMileage !== null && intervalMileage !== undefined ? (
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>{intervalMileage.toFixed(1)} km/L</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-900/60 px-2 py-0.5 rounded border border-gray-800">
                          Initial refuel
                        </span>
                      )}
                    </div>

                    {/* Fuel Quantity & Unit Price */}
                    {record.fuelType !== 'EV Charging' && record.litres ? (
                      <div className="flex items-center gap-3 text-xs text-gray-300 font-mono">
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Droplet className="w-3.5 h-3.5 text-amber-500" />
                          <span>{record.litres} L</span>
                        </span>
                        {record.pricePerLitre && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-400">₹{record.pricePerLitre}/L</span>
                          </>
                        )}
                      </div>
                    ) : null}

                    {/* Station */}
                    {record.station && (
                      <div className="text-xs text-cyan-300/90 flex items-center gap-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{record.station}</span>
                      </div>
                    )}

                    {/* Notes */}
                    {record.notes && (
                      <div className="text-xs text-gray-400 bg-gray-900/40 p-2.5 rounded-lg border border-gray-800/60">
                        <span className="text-gray-500 text-[10px] uppercase font-bold block mb-0.5">Notes:</span>
                        <span>{record.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Total Cost and Action Buttons */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-800">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Total Cost
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                        {formatCurrency(record.totalCost)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingRecord(record)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit Fuel Entry"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingRecordId(record.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Fuel Entry"
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

      {/* Add Fuel Modal */}
      {isAddOpen && (
        <FuelModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAdd}
          vehicleId={selectedVehicle.id}
          currentVehicleOdometer={selectedVehicle.currentOdometer}
          vehicleFuelType={selectedVehicle.fuelType}
          title="Add Fuel Entry"
        />
      )}

      {/* Edit Fuel Modal */}
      {editingRecord && (
        <FuelModal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          onSubmit={handleUpdate}
          initialData={editingRecord}
          vehicleId={selectedVehicle.id}
          currentVehicleOdometer={selectedVehicle.currentOdometer}
          vehicleFuelType={selectedVehicle.fuelType}
          title="Edit Fuel Entry"
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingRecordId}
        onClose={() => setDeletingRecordId(null)}
        onConfirm={confirmDelete}
        title="Delete this fuel entry?"
        message="Are you sure you want to delete this fuel entry? This will permanently remove the record and update your vehicle's fuel and mileage history."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
      />
    </div>
  );
};
