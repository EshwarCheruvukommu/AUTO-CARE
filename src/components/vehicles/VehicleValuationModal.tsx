import React, { useState, useMemo } from 'react';
import { 
  X, 
  TrendingDown, 
  ShieldCheck, 
  Gauge, 
  Calendar, 
  Car, 
  Sparkles,
  Info,
  DollarSign,
  Award
} from 'lucide-react';
import { Vehicle, ServiceRecord, VehicleDocument } from '../../types';
import { formatCurrency, formatOdometer, formatDate, parseLocalDate } from '../../utils/formatters';

interface VehicleValuationModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  services: ServiceRecord[];
  documents: VehicleDocument[];
}

export const VehicleValuationModal: React.FC<VehicleValuationModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  services,
  documents,
}) => {
  // Estimated original purchase price or on-road invoice price
  const [estimatedNewPrice, setEstimatedNewPrice] = useState<number>(() => {
    // Sensible defaults based on brand & vehicle type
    const nameLower = (vehicle.name + ' ' + vehicle.brand + ' ' + vehicle.model).toLowerCase();
    if (nameLower.includes('bmw') || nameLower.includes('mercedes') || nameLower.includes('audi')) return 4500000;
    if (nameLower.includes('fortuner') || nameLower.includes('innova') || nameLower.includes('xuv700') || nameLower.includes('harrier')) return 2400000;
    if (nameLower.includes('city') || nameLower.includes('creta') || nameLower.includes('seltos') || nameLower.includes('verna') || nameLower.includes('nexon')) return 1400000;
    if (nameLower.includes('swift') || nameLower.includes('baleno') || nameLower.includes('i20') || nameLower.includes('wagon r')) return 800000;
    return 1000000;
  });

  const [conditionGrade, setConditionGrade] = useState<'excellent' | 'good' | 'fair'>('good');

  if (!isOpen) return null;

  // Calculate age in months and years
  const today = new Date();
  const pDate = vehicle.purchaseDate ? parseLocalDate(vehicle.purchaseDate) : today;
  const ageMonths = Math.max(1, Math.round((today.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4)));
  const ageYears = Math.round((ageMonths / 12) * 10) / 10;

  // Automotive depreciation calculation curve
  // Year 1: ~15% drop, Year 2: ~25%, Year 3: ~35%, Year 4: ~45%, Year 5+: ~55%+
  let depreciationRate = 0;
  if (ageYears <= 1) depreciationRate = 0.15;
  else if (ageYears <= 2) depreciationRate = 0.25;
  else if (ageYears <= 3) depreciationRate = 0.35;
  else if (ageYears <= 4) depreciationRate = 0.45;
  else if (ageYears <= 5) depreciationRate = 0.55;
  else depreciationRate = Math.min(0.80, 0.55 + (ageYears - 5) * 0.05);

  // Mileage penalty / bonus
  const standardKmExpected = ageYears * 12000;
  const kmDelta = (vehicle.currentOdometer || 0) - standardKmExpected;
  const mileageFactor = Math.max(-0.15, Math.min(0.10, -(kmDelta / 50000) * 0.05));

  // AutoCare verified maintenance record bonus (+5% for 3+ logged services)
  const maintenanceBonus = services.length >= 3 ? 0.06 : services.length >= 1 ? 0.03 : 0;

  // Condition adjustment
  const conditionFactor = conditionGrade === 'excellent' ? 0.05 : conditionGrade === 'fair' ? -0.08 : 0;

  const netRetainedPercentage = Math.max(0.15, 1 - depreciationRate + mileageFactor + maintenanceBonus + conditionFactor);
  const estimatedMarketValue = Math.round(estimatedNewPrice * netRetainedPercentage);
  const lowRange = Math.round(estimatedMarketValue * 0.94);
  const highRange = Math.round(estimatedMarketValue * 1.06);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#0e121a] border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-gray-100">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-800 flex items-center justify-between bg-[#111622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Resale Value &amp; Market Valuation Estimator</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {vehicle.name} ({vehicle.vehicleNumber}) • Age: ~{ageYears} Years
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          
          {/* Estimated Valuation Highlight Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-blue-950/30 to-[#0e121a] border border-cyan-500/40 text-center space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Estimated Fair Market Resale Value</span>
            </span>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {formatCurrency(lowRange)} – {formatCurrency(highRange)}
            </div>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Based on age ({ageYears} yrs), odometer ({formatOdometer(vehicle.currentOdometer)}), verified AutoCare service history, and condition grade.
            </p>
          </div>

          {/* User Parameters Adjustment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Estimated Original / Purchase Price (₹)
              </label>
              <input
                type="number"
                step="50000"
                min="50000"
                value={estimatedNewPrice}
                onChange={(e) => setEstimatedNewPrice(Math.max(10000, Number(e.target.value)))}
                className="w-full bg-gray-900 border border-gray-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-base font-bold text-white font-mono focus:outline-none"
              />
              <span className="text-[10px] text-gray-500 block">
                Adjust according to your vehicle invoice or showroom price
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Vehicle Physical Condition
              </label>
              <select
                value={conditionGrade}
                onChange={(e: any) => setConditionGrade(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm font-semibold text-white focus:outline-none"
              >
                <option value="excellent">Excellent (Showroom condition, zero dents)</option>
                <option value="good">Good (Normal minor wear, clean cabin)</option>
                <option value="fair">Fair (Visible scratches or requires minor work)</option>
              </select>
            </div>
          </div>

          {/* Breakdown Factors */}
          <div className="p-5 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] pb-1 border-b border-gray-800">
              Valuation Valuation Breakdown
            </h4>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Baseline Depreciation ({ageYears} years)</span>
              <span className="font-mono text-red-400 font-bold">-{(depreciationRate * 100).toFixed(0)}%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Odometer Impact ({formatOdometer(vehicle.currentOdometer)})</span>
              <span className={`font-mono font-bold ${mileageFactor >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {mileageFactor >= 0 ? `+${(mileageFactor * 100).toFixed(1)}% (Low Mileage Bonus)` : `${(mileageFactor * 100).toFixed(1)}%`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">AutoCare Verified Maintenance Bonus</span>
              <span className="font-mono text-emerald-400 font-bold">
                +{ (maintenanceBonus * 100).toFixed(0) }% ({services.length} logged service records)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Physical Condition Adjustment</span>
              <span className={`font-mono font-bold ${conditionFactor >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {conditionFactor >= 0 ? `+${(conditionFactor * 100).toFixed(0)}%` : `${(conditionFactor * 100).toFixed(0)}%`}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 text-[11px] text-gray-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              Maintaining up-to-date service records and valid insurance/PUC documents in AutoCare significantly improves buyer confidence and resale valuation by up to 6–10%.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-800 bg-[#111622] flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Estimated Resale Range: <span className="font-bold text-white font-mono">{formatCurrency(lowRange)} – {formatCurrency(highRange)}</span>
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
