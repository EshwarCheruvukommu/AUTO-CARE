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
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0F1F35] hover:bg-[#122A46] border border-[#1677FF]/40 text-[#00D9FF] hover:text-white font-semibold text-xs shadow-md transition-all cursor-pointer btn-3d"
                title="Compare all vehicles in garage"
              >
                <Layers className="w-3.5 h-3.5 text-[#00D9FF]" />
                <span>Fleet Comparison</span>
              </button>
            )}

            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1677FF] hover:bg-[#2196FF] text-white font-bold text-sm shadow-lg shadow-[#1677FF]/25 transition-all cursor-pointer btn-3d"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add Vehicle</span>
            </button>
          </div>
        }
      />

      {vehicles.length === 0 ? (
        <div className="rounded-3xl border border-[#1D3552] bg-[#0F1F35] p-12 text-center max-w-lg mx-auto card-3d">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1677FF]/20 via-[#2196FF]/20 to-[#00D9FF]/20 border border-[#1677FF]/40 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#1677FF]/15">
            <Car className="w-8 h-8 text-[#00D9FF]" />
          </div>
          <h3 className="text-lg font-bold text-[#F5F9FF] mb-2 font-mono">Your Garage is Empty</h3>
          <p className="text-sm text-[#A9B8CC] mb-6 leading-relaxed">
            Add your car, motorcycle, or fleet vehicle to unlock maintenance schedules, document expirations, fuel logs, and AI diagnostics.
          </p>
          <button
            onClick={onOpenAddModal}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#2196FF] hover:from-[#1360D4] hover:to-[#1677FF] text-white font-bold text-sm transition-all shadow-lg shadow-[#1677FF]/25 cursor-pointer btn-3d"
          >
            + Add Your First Vehicle
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
                    ? 'bg-gradient-to-b from-[#122A46] via-[#0F1F35] to-[#0B1628] border-[#00D9FF] shadow-2xl shadow-[#1677FF]/20 ring-1 ring-[#00D9FF]/40'
                    : 'bg-[#0F1F35] border-[#1D3552] hover:border-[#1677FF]/50 hover:bg-[#122A46]'
                }`}
              >
                {/* Active Indicator & Metallic Top Bar */}
                {isSelected ? (
                  <div className="bg-[#1677FF]/15 border-b border-[#1677FF]/30 px-4 py-2 flex items-center justify-between text-xs text-[#00D9FF] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#00D9FF]" /> Active Vehicle
                    </span>
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider bg-[#1677FF] text-white px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                ) : (
                  <div className="h-1 bg-gradient-to-r from-transparent via-[#1D3552] to-transparent" />
                )}

                <div className="p-5 flex-1">
                  {/* Vehicle Header & Number Plate */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-[#122A46] border border-[#1D3552] text-[#A9B8CC] font-mono font-semibold">
                          {v.brand}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#122A46] text-[#A9B8CC] font-medium">
                          {v.fuelType}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-[#F5F9FF] mt-2 leading-snug">
                        {v.name}
                      </h3>
                      <p className="text-xs text-[#A9B8CC]">
                        {v.model} {v.variant ? `• ${v.variant}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-[#07111F] border border-[#1D3552] text-xs font-mono font-bold text-[#00D9FF] tracking-wider shadow-inner">
                        {v.vehicleNumber}
                      </span>
                    </div>
                  </div>

                  {/* Stylized Vehicle Silhouette Display */}
                  <div className="mt-4 p-3 rounded-2xl bg-[#07111F]/70 border border-[#1D3552]/60 flex items-center justify-between overflow-hidden relative group/car">
                    <div className="flex items-center gap-2 text-xs text-[#A9B8CC]">
                      <div className="w-7 h-7 rounded-lg bg-[#1677FF]/15 flex items-center justify-center text-[#00D9FF]">
                        <Car className="w-4 h-4" />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-gray-300">
                        {v.model}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#71839A] uppercase">
                      Chassis Ready
                    </span>
                    {/* Ambient vehicle glow */}
                    <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-[#1677FF]/15 to-transparent pointer-events-none" />
                  </div>

                  {/* Metrics grid */}
                  <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-[#1D3552]">
                    <div className="p-2.5 rounded-xl bg-[#0B1628]/80 border border-[#1D3552]/60">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#A9B8CC] uppercase font-semibold">
                        <Gauge className="w-3 h-3 text-[#00D9FF]" /> Odometer
                      </div>
                      <div className="text-sm font-black text-white font-mono mt-1">
                        {formatOdometer(v.currentOdometer)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0B1628]/80 border border-[#1D3552]/60">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#A9B8CC] uppercase font-semibold">
                        <Calendar className="w-3 h-3 text-[#2196FF]" /> Purchase
                      </div>
                      <div className="text-sm font-semibold text-gray-200 mt-1">
                        {formatDate(v.purchaseDate)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-[#0B1628] border-t border-[#1D3552] flex items-center justify-between gap-2">
                  {!isSelected ? (
                    <button
                      onClick={() => setSelectedVehicleId(v.id)}
                      className="text-xs px-3.5 py-1.5 rounded-xl bg-[#122A46] hover:bg-[#1677FF]/25 hover:text-[#00D9FF] text-gray-300 font-semibold transition-all cursor-pointer border border-[#1D3552] hover:border-[#1677FF]/50"
                    >
                      Set as Active
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#00D9FF] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse" />
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
