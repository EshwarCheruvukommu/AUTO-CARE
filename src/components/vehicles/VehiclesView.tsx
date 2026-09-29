import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, Gauge, Calendar, Fuel, AlertCircle } from 'lucide-react';
import { Vehicle } from '../../types';
import { useVehicle } from '../../context/VehicleContext';
import { VehicleModal } from './VehicleModal';
import { ConfirmDialog } from '../common/Modal';
import { formatOdometer, formatDate } from '../../utils/formatters';

interface VehiclesViewProps {
  onOpenAddModal: () => void;
}

export const VehiclesView: React.FC<VehiclesViewProps> = ({ onOpenAddModal }) => {
  const { 
    vehicles, 
    selectedVehicle, 
    setSelectedVehicleId, 
    deleteVehicle, 
    updateVehicle, 
    loadingVehicles 
  } = useVehicle();

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdate = async (data: any) => {
    if (!editingVehicle) return;
    await updateVehicle(editingVehicle.id, data);
    setEditingVehicle(null);
  };

  const confirmDelete = async () => {
    if (!deletingVehicleId) return;
    try {
      setIsDeleting(true);
      await deleteVehicle(deletingVehicleId);
      setDeletingVehicleId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loadingVehicles) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>My Vehicles</span>
            <span className="text-sm font-normal text-gray-400">({vehicles.length})</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your garage, switch active vehicles, and view technical details.
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vehicle</span>
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-[#0d1017] p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto text-3xl mb-4">
            🚗
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No vehicles yet</h3>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            Add your first car, motorcycle, or scooter to start tracking services, documents, and expenses.
          </p>
          <button
            onClick={onOpenAddModal}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all"
          >
            Add Your First Vehicle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {vehicles.map((v) => {
            const isSelected = selectedVehicle?.id === v.id;
            return (
              <div
                key={v.id}
                className={`relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#131b2c] to-[#0d121c] border-cyan-500/60 shadow-xl shadow-cyan-950/50'
                    : 'bg-[#0f131c] border-gray-800/80 hover:border-gray-700 hover:bg-[#121622]'
                }`}
              >
                {/* Active Indicator Header */}
                {isSelected && (
                  <div className="bg-cyan-500/20 border-b border-cyan-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-cyan-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-cyan-400" /> Active Dashboard Vehicle
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-cyan-500/30 px-2 py-0.5 rounded text-white">
                      Selected
                    </span>
                  </div>
                )}

                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                          {v.brand}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-800/60 text-gray-400">
                          {v.fuelType}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white mt-1.5 leading-snug">
                        {v.name}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {v.model} {v.variant ? `• ${v.variant}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-700 text-xs font-mono font-bold text-cyan-300 tracking-wider">
                        {v.vehicleNumber}
                      </span>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-gray-800/60">
                    <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800/40">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 uppercase font-semibold">
                        <Gauge className="w-3 h-3 text-cyan-400" /> Odometer
                      </div>
                      <div className="text-sm font-bold text-white mt-1">
                        {formatOdometer(v.currentOdometer)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800/40">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 uppercase font-semibold">
                        <Calendar className="w-3 h-3 text-blue-400" /> Purchase
                      </div>
                      <div className="text-sm font-bold text-gray-200 mt-1">
                        {formatDate(v.purchaseDate)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-gray-950/40 border-t border-gray-800/60 flex items-center justify-between gap-2">
                  {!isSelected ? (
                    <button
                      onClick={() => setSelectedVehicleId(v.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-gray-300 font-semibold transition-all cursor-pointer"
                    >
                      Set as Active
                    </button>
                  ) : (
                    <span className="text-[11px] text-cyan-400 font-medium">Currently viewing</span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingVehicle(v)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                      title="Edit Vehicle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingVehicleId(v.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete Vehicle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <VehicleModal
          isOpen={!!editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSubmit={handleUpdate}
          initialData={editingVehicle}
          title="Edit Vehicle Details"
        />
      )}

      {/* Delete Vehicle Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingVehicleId}
        onClose={() => setDeletingVehicleId(null)}
        onConfirm={confirmDelete}
        title="Delete Vehicle?"
        message="This will permanently delete this vehicle and all its associated documents, maintenance records, and expense entries. This action cannot be undone."
        confirmLabel="Delete Vehicle"
        isLoading={isDeleting}
      />
    </div>
  );
};
