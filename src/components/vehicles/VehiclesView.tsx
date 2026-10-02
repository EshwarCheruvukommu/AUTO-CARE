import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, Gauge, Calendar, Fuel, AlertCircle, Layers, Award, Car, Sparkles } from 'lucide-react';
import { Vehicle } from '../../types';
import { useVehicle } from '../../context/VehicleContext';
import { VehicleModal } from './VehicleModal';
import { FleetOverviewModal } from './FleetOverviewModal';
import { VehicleValuationModal } from './VehicleValuationModal';
import { ConfirmDialog } from '../common/Modal';
import { SectionVisualHeader } from '../common/SectionVisualHeader';
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
    loadingVehicles,
    services,
    documents
  } = useVehicle();

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [valuationVehicle, setValuationVehicle] = useState<Vehicle | null>(null);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
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
      {/* 3D Section Visual Header */}
      <SectionVisualHeader
        sectionId="vehicles"
        customTitle="My Vehicles"
        customTagline="Manage your garage fleet, switch active vehicles, and inspect technical specifications."
        activeVehicleInfo={selectedVehicle ? `${selectedVehicle.name} (${selectedVehicle.vehicleNumber})` : undefined}
        rightAction={
          <div className="flex items-center gap-2.5 flex-wrap">
            {vehicles.length > 1 && (
              <button
                onClick={() => setIsFleetModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1D232B] hover:bg-[#252C35] border border-[#00D4C7]/40 text-[#00D4C7] hover:text-white font-semibold text-xs shadow-md transition-all cursor-pointer btn-3d"
                title="Compare all vehicles in garage"
              >
                <Layers className="w-3.5 h-3.5 text-[#00D4C7]" />
                <span>Fleet Comparison</span>
              </button>
            )}

            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00D4C7] to-blue-600 hover:from-[#00D4C7] hover:to-blue-500 text-black hover:text-white font-bold text-sm shadow-lg shadow-[#00D4C7]/20 transition-all cursor-pointer btn-3d"
            >
              <Plus className="w-4 h-4 text-black group-hover:text-white" />
              <span>Add Vehicle</span>
            </button>
          </div>
        }
      />

      {vehicles.length === 0 ? (
        <div className="rounded-3xl border border-[#252C35] bg-[#151A20] p-12 text-center max-w-lg mx-auto card-3d">
          <div className="w-16 h-16 rounded-2xl bg-[#00D4C7]/10 border border-[#00D4C7]/30 flex items-center justify-center mx-auto text-3xl mb-4">
            🚗
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No vehicles yet</h3>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            Add your first car, motorcycle, or scooter to start tracking services, documents, and expenses.
          </p>
          <button
            onClick={onOpenAddModal}
            className="px-6 py-2.5 rounded-xl bg-[#00D4C7] hover:bg-[#00D4C7]/80 text-black font-bold text-sm transition-all shadow-lg shadow-[#00D4C7]/25"
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
                className={`relative rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between card-3d ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#18232e] via-[#151a20] to-[#0f131a] border-[#00D4C7]/70 shadow-2xl shadow-[#00D4C7]/15 ring-1 ring-[#00D4C7]/30'
                    : 'bg-[#151A20] border-[#252C35] hover:border-[#384554] hover:bg-[#1A2028]'
                }`}
              >
                {/* Active Indicator & Metallic Top Bar */}
                {isSelected ? (
                  <div className="bg-[#00D4C7]/15 border-b border-[#00D4C7]/30 px-4 py-2 flex items-center justify-between text-xs text-[#00D4C7] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#00D4C7]" /> Active Telemetry Vehicle
                    </span>
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider bg-[#00D4C7] text-black px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                ) : (
                  <div className="h-1 bg-gradient-to-r from-transparent via-[#252C35] to-transparent" />
                )}

                <div className="p-5 flex-1">
                  {/* Vehicle Header & Number Plate */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-[#1D232B] border border-[#252C35] text-gray-300 font-mono font-semibold">
                          {v.brand}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#1D232B] text-gray-400 font-medium">
                          {v.fuelType}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white mt-2 leading-snug">
                        {v.name}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {v.model} {v.variant ? `• ${v.variant}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-[#0e1217] border border-[#252C35] text-xs font-mono font-bold text-[#00D4C7] tracking-wider shadow-inner">
                        {v.vehicleNumber}
                      </span>
                    </div>
                  </div>

                  {/* Stylized Vehicle Silhouette Display */}
                  <div className="mt-4 p-3 rounded-2xl bg-[#0e1217]/70 border border-[#252C35]/60 flex items-center justify-between overflow-hidden relative group/car">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <div className="w-7 h-7 rounded-lg bg-[#00D4C7]/10 flex items-center justify-center text-[#00D4C7]">
                        <Car className="w-4 h-4" />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-gray-300">
                        {v.model}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 uppercase">
                      Chassis Ready
                    </span>
                    {/* Ambient vehicle glow */}
                    <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-[#00D4C7]/5 to-transparent pointer-events-none" />
                  </div>

                  {/* Metrics grid */}
                  <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-[#252C35]">
                    <div className="p-2.5 rounded-xl bg-[#1D232B]/80 border border-[#252C35]/60">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 uppercase font-semibold">
                        <Gauge className="w-3 h-3 text-[#00D4C7]" /> Odometer
                      </div>
                      <div className="text-sm font-black text-white font-mono mt-1">
                        {formatOdometer(v.currentOdometer)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#1D232B]/80 border border-[#252C35]/60">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 uppercase font-semibold">
                        <Calendar className="w-3 h-3 text-cyan-400" /> Purchase
                      </div>
                      <div className="text-sm font-semibold text-gray-200 mt-1">
                        {formatDate(v.purchaseDate)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-[#11151B] border-t border-[#252C35] flex items-center justify-between gap-2">
                  {!isSelected ? (
                    <button
                      onClick={() => setSelectedVehicleId(v.id)}
                      className="text-xs px-3.5 py-1.5 rounded-xl bg-[#1D232B] hover:bg-[#00D4C7]/20 hover:text-[#00D4C7] text-gray-300 font-semibold transition-all cursor-pointer border border-[#252C35] hover:border-[#00D4C7]/40"
                    >
                      Set as Active
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#00D4C7] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D4C7] animate-pulse" />
                      <span>Active Telemetry</span>
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setValuationVehicle(v)}
                      className="p-2 text-gray-400 hover:text-amber-400 hover:bg-[#1D232B] rounded-xl transition-colors cursor-pointer"
                      title="Resale Valuation & Depreciation"
                    >
                      <Award className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingVehicle(v)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-[#1D232B] rounded-xl transition-colors cursor-pointer"
                      title="Edit Vehicle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingVehicleId(v.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
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

      {/* Garage Fleet Overview Modal */}
      {isFleetModalOpen && (
        <FleetOverviewModal
          isOpen={isFleetModalOpen}
          onClose={() => setIsFleetModalOpen(false)}
          vehicles={vehicles}
          onSelectVehicle={(id) => setSelectedVehicleId(id)}
          activeVehicleId={selectedVehicle?.id || ''}
        />
      )}

      {/* Vehicle Valuation Estimator Modal */}
      {valuationVehicle && (
        <VehicleValuationModal
          isOpen={!!valuationVehicle}
          onClose={() => setValuationVehicle(null)}
          vehicle={valuationVehicle}
          services={services}
          documents={documents}
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
