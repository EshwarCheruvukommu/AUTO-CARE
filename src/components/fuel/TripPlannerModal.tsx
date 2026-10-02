import React, { useState, useMemo } from 'react';
import { 
  X, 
  MapPin, 
  Fuel, 
  Coins, 
  Gauge, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles,
  Calculator,
  Compass,
  ArrowRight
} from 'lucide-react';
import { Vehicle, FuelRecord, VehicleDocument, VehicleReminder } from '../../types';
import { formatCurrency, formatOdometer, formatDate, getDocumentStatus } from '../../utils/formatters';
import { calculateFuelMetrics } from '../../utils/mileage';

interface TripPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  fuelRecords: FuelRecord[];
  documents: VehicleDocument[];
  allReminders: VehicleReminder[];
}

export const TripPlannerModal: React.FC<TripPlannerModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  fuelRecords,
  documents,
  allReminders,
}) => {
  const [distanceKm, setDistanceKm] = useState<number>(350);
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(true);
  const [tollBudget, setTollBudget] = useState<number>(450);
  const [contingencyBudget, setContingencyBudget] = useState<number>(500);

  // Derive mileage and fuel price from records
  const fuelMetrics = useMemo(() => calculateFuelMetrics(fuelRecords), [fuelRecords]);
  const defaultMileage = fuelMetrics.averageMileage || 15.0;

  const latestFuel = fuelRecords.length > 0 ? fuelRecords[0] : null;
  const defaultFuelPrice = (latestFuel?.litres && latestFuel.litres > 0 && latestFuel.totalCost)
    ? Math.round((latestFuel.totalCost / latestFuel.litres) * 100) / 100
    : (latestFuel?.pricePerLitre || 102.5);

  const [fuelMileage, setFuelMileage] = useState<number>(defaultMileage);
  const [pricePerLitre, setPricePerLitre] = useState<number>(defaultFuelPrice);

  if (!isOpen) return null;

  const totalTripKm = isRoundTrip ? distanceKm * 2 : distanceKm;
  const estimatedLitres = fuelMileage > 0 ? Math.round((totalTripKm / fuelMileage) * 10) / 10 : 0;
  const estimatedFuelCost = Math.round(estimatedLitres * pricePerLitre);
  const totalEstimatedTripCost = estimatedFuelCost + Number(tollBudget || 0) + Number(contingencyBudget || 0);

  // Legal checks
  const insuranceDoc = documents.find((d) => d.type.toLowerCase().includes('insurance'));
  const pucDoc = documents.find((d) => d.type.toLowerCase().includes('puc') || d.type.toLowerCase().includes('pollution'));

  const insStatus = insuranceDoc ? getDocumentStatus(insuranceDoc.expiryDate) : null;
  const pucStatus = pucDoc ? getDocumentStatus(pucDoc.expiryDate) : null;

  const isInsValid = insStatus?.status === 'Valid' || insStatus?.status === 'Expiring Soon';
  const isPucValid = pucStatus?.status === 'Valid' || pucStatus?.status === 'Expiring Soon';

  const overdueReminders = allReminders.filter((r) => r.status !== 'Completed' && new Date(r.dueDate).getTime() < new Date().getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#0e121a] border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-gray-100">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-800 flex items-center justify-between bg-[#111622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Trip Planner &amp; Fuel Cost Estimator</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {vehicle.name} ({vehicle.vehicleNumber}) • {vehicle.fuelType}
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
          
          {/* Trip Distance Inputs */}
          <div className="p-4 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>One-Way Travel Distance (KM)</span>
              </label>

              <button
                type="button"
                onClick={() => setIsRoundTrip(!isRoundTrip)}
                className={`text-xs px-3 py-1 rounded-xl font-bold border transition-all cursor-pointer ${
                  isRoundTrip
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400'
                }`}
              >
                {isRoundTrip ? '✓ Round Trip (2x)' : 'One Way Only'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Math.max(1, Number(e.target.value)))}
                className="flex-1 bg-gray-900 border border-gray-700 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-lg font-bold text-white font-mono focus:outline-none"
              />
              <span className="text-sm font-bold text-gray-400">KM</span>
            </div>

            <div className="text-xs text-gray-400 flex items-center justify-between pt-1">
              <span>Total Travel Distance:</span>
              <span className="font-mono font-bold text-cyan-300 text-sm">{formatOdometer(totalTripKm)}</span>
            </div>
          </div>

          {/* Efficiency & Price Factors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>Fuel Mileage (km/L)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={fuelMileage}
                onChange={(e) => setFuelMileage(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-base font-bold text-white font-mono focus:outline-none"
              />
              <span className="text-[10px] text-gray-500 block">
                Derived from AutoCare fuel logs ({fuelMetrics.averageMileageLabel})
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fuel Price (₹/Litre)</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={pricePerLitre}
                onChange={(e) => setPricePerLitre(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-base font-bold text-white font-mono focus:outline-none"
              />
              <span className="text-[10px] text-gray-500 block">
                Latest fill-up rate in AutoCare records
              </span>
            </div>
          </div>

          {/* Toll & Contingency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Estimated Toll &amp; Parking (₹)
              </label>
              <input
                type="number"
                min="0"
                value={tollBudget}
                onChange={(e) => setTollBudget(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-base font-bold text-white font-mono focus:outline-none"
              />
            </div>

            <div className="p-4 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Contingency / Refreshments (₹)
              </label>
              <input
                type="number"
                min="0"
                value={contingencyBudget}
                onChange={(e) => setContingencyBudget(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-base font-bold text-white font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Calculation Summary Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-blue-950/30 to-[#0e121a] border border-cyan-500/40 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Calculator className="w-4 h-4" />
              <span>Trip Budget Breakdown</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <span className="text-[10px] text-gray-400 uppercase block font-semibold">Fuel Needed</span>
                <span className="text-lg font-black text-white font-mono">{estimatedLitres} Litres</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase block font-semibold">Fuel Cost</span>
                <span className="text-lg font-black text-cyan-300 font-mono">{formatCurrency(estimatedFuelCost)}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] text-gray-400 uppercase block font-semibold">Total Trip Cost</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">{formatCurrency(totalEstimatedTripCost)}</span>
              </div>
            </div>
          </div>

          {/* Pre-Trip Vehicle Readiness Audit */}
          <div className="p-5 rounded-2xl bg-[#0f131c] border border-gray-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Pre-Trip Vehicle Audit</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900/60 border border-gray-800">
                <span className="text-gray-300">Insurance Policy Status</span>
                <span className={`font-bold flex items-center gap-1 ${isInsValid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isInsValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>{insuranceDoc ? insStatus?.label : 'No Insurance logged'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900/60 border border-gray-800">
                <span className="text-gray-300">PUC / Emission Certificate</span>
                <span className={`font-bold flex items-center gap-1 ${isPucValid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPucValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>{pucDoc ? pucStatus?.label : 'No PUC logged'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900/60 border border-gray-800">
                <span className="text-gray-300">Overdue Maintenance Tasks</span>
                <span className={`font-bold flex items-center gap-1 ${overdueReminders.length === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {overdueReminders.length === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>{overdueReminders.length === 0 ? 'No overdue maintenance' : `${overdueReminders.length} task(s) overdue`}</span>
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-800 bg-[#111622] flex items-center justify-between">
          <div className="text-xs text-gray-400">
            Total Estimated Travel Cost: <span className="text-emerald-400 font-bold font-mono text-sm">{formatCurrency(totalEstimatedTripCost)}</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            Close Planner
          </button>
        </div>

      </div>
    </div>
  );
};
