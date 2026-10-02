import React from 'react';
import { 
  X, 
  Car, 
  Gauge, 
  Fuel, 
  Wrench, 
  Receipt, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { Vehicle } from '../../types';
import { formatCurrency, formatOdometer, formatDate } from '../../utils/formatters';

interface FleetOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onSelectVehicle: (id: string) => void;
  activeVehicleId: string;
}

export const FleetOverviewModal: React.FC<FleetOverviewModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  onSelectVehicle,
  activeVehicleId,
}) => {
  if (!isOpen) return null;

  const totalOdometer = vehicles.reduce((sum, v) => sum + (Number(v.currentOdometer) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0e121a] border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-gray-100">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-800 flex items-center justify-between bg-[#111622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Garage Fleet Overview &amp; Multi-Vehicle Comparison</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Manage and compare all {vehicles.length} vehicle{vehicles.length > 1 ? 's' : ''} in your garage
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fleet Aggregate Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-5 sm:p-6 bg-gradient-to-r from-cyan-950/30 via-blue-950/20 to-[#0e121a] border-b border-gray-800">
          <div className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Garage Fleet</span>
            <span className="text-2xl font-black text-white font-mono">{vehicles.length} Vehicle{vehicles.length > 1 ? 's' : ''}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Fleet Odometer</span>
            <span className="text-2xl font-black text-cyan-400 font-mono">{formatOdometer(totalOdometer)}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Selection</span>
            <span className="text-base font-bold text-emerald-400 truncate block mt-1">
              {vehicles.find(v => v.id === activeVehicleId)?.name || 'None'}
            </span>
          </div>
        </div>

        {/* Side-by-Side Comparison Table */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          <div className="overflow-x-auto rounded-2xl border border-gray-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900/80 text-gray-400 uppercase tracking-wider border-b border-gray-800">
                  <th className="p-3.5 font-bold">Vehicle</th>
                  <th className="p-3.5 font-bold">Registration</th>
                  <th className="p-3.5 font-bold">Fuel Type</th>
                  <th className="p-3.5 font-bold">Odometer</th>
                  <th className="p-3.5 font-bold">Purchase Date</th>
                  <th className="p-3.5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {vehicles.map((v) => {
                  const isActive = v.id === activeVehicleId;

                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-gray-800/40 transition-colors ${
                        isActive ? 'bg-cyan-500/10' : ''
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <Car className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                          <span>{v.name}</span>
                          {isActive && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500 text-black font-extrabold uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {v.brand} {v.model} {v.variant ? `• ${v.variant}` : ''}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono font-semibold text-cyan-300">
                        {v.vehicleNumber}
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-medium text-[11px]">
                          {v.fuelType}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-white">
                        {formatOdometer(v.currentOdometer)}
                      </td>

                      <td className="p-3.5 text-gray-400">
                        {v.purchaseDate ? formatDate(v.purchaseDate) : 'Not set'}
                      </td>

                      <td className="p-3.5 text-right">
                        {isActive ? (
                          <span className="text-cyan-400 font-bold text-xs">Currently Selected</span>
                        ) : (
                          <button
                            onClick={() => {
                              onSelectVehicle(v.id);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-cyan-500 hover:text-black text-gray-300 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Switch to This
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-800 bg-[#111622] flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Clicking "Switch to This" instantly changes the active vehicle dashboard context.
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
