import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Printer, 
  ShieldCheck, 
  Gauge, 
  Calendar, 
  Car,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { Vehicle } from '../../types';
import { formatOdometer, formatDate } from '../../utils/formatters';

interface InspectionItem {
  id: string;
  category: 'Fluids & Leaks' | 'Tyres & Brakes' | 'Electrical & Lights' | 'Under Bonnet' | 'Cabin & Safety';
  name: string;
  status: 'pass' | 'attention' | 'fail' | 'untested';
  notes?: string;
}

const DEFAULT_INSPECTION_ITEMS: InspectionItem[] = [
  // Fluids & Leaks
  { id: 'engine-oil-level', category: 'Fluids & Leaks', name: 'Engine Oil Level & Condition', status: 'pass' },
  { id: 'brake-fluid-level', category: 'Fluids & Leaks', name: 'Brake Fluid Level & Moisture', status: 'pass' },
  { id: 'coolant-level', category: 'Fluids & Leaks', name: 'Radiator Coolant Level', status: 'pass' },
  { id: 'washer-fluid', category: 'Fluids & Leaks', name: 'Windshield Washer Fluid', status: 'pass' },
  { id: 'fluid-leaks', category: 'Fluids & Leaks', name: 'Underbody Fluid Leak Check', status: 'pass' },

  // Tyres & Brakes
  { id: 'tyre-tread-front', category: 'Tyres & Brakes', name: 'Front Tyres Tread Depth (>3mm)', status: 'pass' },
  { id: 'tyre-tread-rear', category: 'Tyres & Brakes', name: 'Rear Tyres Tread Depth (>3mm)', status: 'pass' },
  { id: 'tyre-pressures', category: 'Tyres & Brakes', name: 'Tyre Pressures (PSI / Bar)', status: 'pass' },
  { id: 'spare-tyre', category: 'Tyres & Brakes', name: 'Spare Tyre Pressure & Toolkit', status: 'pass' },
  { id: 'brake-pads', category: 'Tyres & Brakes', name: 'Brake Pad Thickness (>4mm)', status: 'pass' },
  { id: 'handbrake', category: 'Tyres & Brakes', name: 'Parking / Handbrake Cable Tension', status: 'pass' },

  // Electrical & Lights
  { id: 'headlights', category: 'Electrical & Lights', name: 'Headlights (Low & High Beam)', status: 'pass' },
  { id: 'brake-indicators', category: 'Electrical & Lights', name: 'Brake Lights & Turn Indicators', status: 'pass' },
  { id: 'battery-terminals', category: 'Electrical & Lights', name: 'Battery Terminals & Starting Crank', status: 'pass' },
  { id: 'horn', category: 'Electrical & Lights', name: 'Vehicle Horn & Hazard Lights', status: 'pass' },

  // Under Bonnet
  { id: 'drive-belts', category: 'Under Bonnet', name: 'Alternator & Accessory Belts', status: 'pass' },
  { id: 'air-filter-visual', category: 'Under Bonnet', name: 'Air Intake Filter Cleanliness', status: 'pass' },

  // Cabin & Safety
  { id: 'wiper-blades-check', category: 'Cabin & Safety', name: 'Windshield Wiper Blades Streaking', status: 'pass' },
  { id: 'ac-cooling', category: 'Cabin & Safety', name: 'Air Conditioning Cooling & Blower', status: 'pass' },
  { id: 'seatbelts-emergency', category: 'Cabin & Safety', name: 'Seatbelt Retractors & First Aid Kit', status: 'pass' },
];

interface VehicleInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
}

export const VehicleInspectionModal: React.FC<VehicleInspectionModalProps> = ({
  isOpen,
  onClose,
  vehicle,
}) => {
  const [items, setItems] = useState<InspectionItem[]>(DEFAULT_INSPECTION_ITEMS);
  const [inspectorName, setInspectorName] = useState<string>('Owner Self-Check');

  if (!isOpen) return null;

  const handleStatusChange = (id: string, newStatus: InspectionItem['status']) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const passCount = items.filter((i) => i.status === 'pass').length;
  const attentionCount = items.filter((i) => i.status === 'attention').length;
  const failCount = items.filter((i) => i.status === 'fail').length;

  const scorePercentage = Math.round((passCount / items.length) * 100);

  const categories = Array.from(new Set(items.map((i) => i.category)));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#0e121a] border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-gray-100">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-800 flex items-center justify-between bg-[#111622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>20-Point Multi-Point Digital Inspection</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {vehicle.name} ({vehicle.vehicleNumber}) • {formatOdometer(vehicle.currentOdometer)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Print Inspection Sheet"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Inspection Score Header Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/30 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl font-mono border ${
              scorePercentage >= 90
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : scorePercentage >= 70
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-red-500/20 text-red-400 border-red-500/40'
            }`}>
              {scorePercentage}%
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overall Health Score</div>
              <div className="text-base font-extrabold text-white">
                {scorePercentage >= 90 ? 'Vehicle in Excellent Shape' : scorePercentage >= 70 ? 'Minor Attention Recommended' : 'Action Required on Critical Items'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{passCount} Pass</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{attentionCount} Attention</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 font-bold flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              <span>{failCount} Fail</span>
            </span>
          </div>
        </div>

        {/* Scrollable Inspection Items List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.category === cat);
            return (
              <div key={cat} className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2 pb-1 border-b border-gray-800">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{cat}</span>
                </h3>

                <div className="space-y-2">
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <span className="text-sm font-semibold text-white">
                        {item.name}
                      </span>

                      {/* Status Selector Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, 'pass')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            item.status === 'pass'
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                              : 'bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Pass</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, 'attention')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            item.status === 'attention'
                              ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                              : 'bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Attention</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, 'fail')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            item.status === 'fail'
                              ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                              : 'bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Fail</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-800 bg-[#111622] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            Inspection recorded for <span className="text-white font-semibold">{vehicle.name}</span> on {formatDate(new Date().toISOString())}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            Done &amp; Close
          </button>
        </div>

      </div>
    </div>
  );
};
