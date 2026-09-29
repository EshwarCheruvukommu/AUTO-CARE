import React, { useState, useEffect } from 'react';
import { FuelRecord, FuelRecordType } from '../../types';
import { AlertCircle, Info, X, Loader2, Calculator } from 'lucide-react';

interface FuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<FuelRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialData?: FuelRecord | null;
  vehicleId: string;
  currentVehicleOdometer: number;
  vehicleFuelType?: string;
  title: string;
}

export const FUEL_TYPES: FuelRecordType[] = [
  'Petrol',
  'Diesel',
  'CNG',
  'EV Charging',
  'Other',
];

export const FuelModal: React.FC<FuelModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  vehicleId,
  currentVehicleOdometer,
  vehicleFuelType,
  title,
}) => {
  // Determine default fuel type from vehicle context
  const getDefaultFuelType = (): FuelRecordType => {
    if (initialData?.fuelType) return initialData.fuelType;
    if (vehicleFuelType === 'Diesel') return 'Diesel';
    if (vehicleFuelType === 'CNG') return 'CNG';
    if (vehicleFuelType === 'Electric') return 'EV Charging';
    return 'Petrol';
  };

  const [fuelType, setFuelType] = useState<FuelRecordType>(getDefaultFuelType());
  const [fuelDate, setFuelDate] = useState<string>(
    initialData?.fuelDate || new Date().toISOString().split('T')[0]
  );
  const [odometer, setOdometer] = useState<string>(
    initialData ? String(initialData.odometer) : String(currentVehicleOdometer || 0)
  );
  const [litres, setLitres] = useState<string>(
    initialData?.litres !== null && initialData?.litres !== undefined ? String(initialData.litres) : ''
  );
  const [pricePerLitre, setPricePerLitre] = useState<string>(
    initialData?.pricePerLitre !== null && initialData?.pricePerLitre !== undefined
      ? String(initialData.pricePerLitre)
      : ''
  );
  const [totalCost, setTotalCost] = useState<string>(
    initialData ? String(initialData.totalCost) : ''
  );
  const [station, setStation] = useState<string>(initialData?.station || '');
  const [notes, setNotes] = useState<string>(initialData?.notes || '');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoCalcApplied, setAutoCalcApplied] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFuelType(initialData.fuelType);
      setFuelDate(initialData.fuelDate || new Date().toISOString().split('T')[0]);
      setOdometer(String(initialData.odometer));
      setLitres(initialData.litres !== null && initialData.litres !== undefined ? String(initialData.litres) : '');
      setPricePerLitre(
        initialData.pricePerLitre !== null && initialData.pricePerLitre !== undefined
          ? String(initialData.pricePerLitre)
          : ''
      );
      setTotalCost(String(initialData.totalCost));
      setStation(initialData.station || '');
      setNotes(initialData.notes || '');
    } else {
      setFuelType(getDefaultFuelType());
      setFuelDate(new Date().toISOString().split('T')[0]);
      setOdometer(String(currentVehicleOdometer || 0));
      setLitres('');
      setPricePerLitre('');
      setTotalCost('');
      setStation('');
      setNotes('');
    }
    setError(null);
    setIsSubmitting(false);
    setAutoCalcApplied(false);
  }, [initialData, isOpen, currentVehicleOdometer, vehicleFuelType]);

  if (!isOpen) return null;

  const isEvCharging = fuelType === 'EV Charging';

  // Handle Litres and Price per litre updates with auto total calculation
  const handleLitresChange = (val: string) => {
    setLitres(val);
    const numLitres = parseFloat(val);
    const numPrice = parseFloat(pricePerLitre);
    if (!isNaN(numLitres) && numLitres > 0 && !isNaN(numPrice) && numPrice > 0) {
      const calc = Math.round(numLitres * numPrice * 100) / 100;
      setTotalCost(String(calc));
      setAutoCalcApplied(true);
    }
  };

  const handlePriceChange = (val: string) => {
    setPricePerLitre(val);
    const numLitres = parseFloat(litres);
    const numPrice = parseFloat(val);
    if (!isNaN(numLitres) && numLitres > 0 && !isNaN(numPrice) && numPrice > 0) {
      const calc = Math.round(numLitres * numPrice * 100) / 100;
      setTotalCost(String(calc));
      setAutoCalcApplied(true);
    }
  };

  const numOdometer = Number(odometer);
  const isHistoricalOdometer =
    !isNaN(numOdometer) &&
    numOdometer >= 0 &&
    currentVehicleOdometer > 0 &&
    numOdometer < currentVehicleOdometer;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vehicleId) {
      setError('No vehicle selected.');
      return;
    }

    if (!fuelDate) {
      setError('Please provide a valid Fuel Date.');
      return;
    }

    if (isNaN(numOdometer) || numOdometer < 0) {
      setError('Please provide a valid, positive odometer reading.');
      return;
    }

    const costNum = parseFloat(totalCost);
    if (isNaN(costNum) || costNum < 0) {
      setError('Please enter a valid, non-negative total cost.');
      return;
    }

    let parsedLitres: number | null = null;
    let parsedPrice: number | null = null;

    if (!isEvCharging) {
      const litresNum = parseFloat(litres);
      if (isNaN(litresNum) || litresNum <= 0) {
        setError('Please provide a valid fuel quantity (litres) greater than 0.');
        return;
      }
      parsedLitres = litresNum;

      const priceNum = parseFloat(pricePerLitre);
      if (isNaN(priceNum) || priceNum <= 0) {
        setError('Please provide a valid price per litre greater than 0.');
        return;
      }
      parsedPrice = priceNum;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        vehicleId,
        fuelType,
        fuelDate,
        odometer: Math.round(numOdometer),
        litres: parsedLitres,
        pricePerLitre: parsedPrice,
        totalCost: costNum,
        station: station.trim() ? station.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      });
      onClose();
    } catch (err: any) {
      console.error('Fuel record save failed:', err);
      setError(
        err?.message?.includes('permission')
          ? "You don't have permission to perform this action."
          : err?.message || 'Failed to save fuel entry. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="fixed inset-0" onClick={isSubmitting ? undefined : onClose} />
      <div className="relative w-full max-w-lg bg-[#121620] border border-cyan-500/20 rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⛽</span> {title}
          </h3>
          {!isSubmitting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Fuel Type *
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as FuelRecordType)}
                disabled={isSubmitting}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
              >
                {FUEL_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {ft}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Fuel Date *
              </label>
              <input
                type="date"
                value={fuelDate}
                onChange={(e) => setFuelDate(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Odometer Reading (KM) *
            </label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 21100"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-gray-500 focus:outline-none transition-colors"
            />
            {isHistoricalOdometer && (
              <p className="text-[11px] text-amber-400/90 mt-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>This fuel entry is from an earlier odometer reading.</span>
              </p>
            )}
          </div>

          {/* Litres and Price per litre (Hidden or optional for EV Charging) */}
          {!isEvCharging ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  Quantity (Litres) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="e.g. 20"
                  value={litres}
                  onChange={(e) => handleLitresChange(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-gray-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  Price Per Litre (₹) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="e.g. 100"
                  value={pricePerLitre}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-gray-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          ) : null}

          {/* Total Cost */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {isEvCharging ? 'Charging Cost (₹) *' : 'Total Fuel Cost (₹) *'}
              </label>
              {autoCalcApplied && !isEvCharging && (
                <span className="text-[11px] text-cyan-400 flex items-center gap-1 font-mono">
                  <Calculator className="w-3 h-3" /> Auto-calculated (Litres × Price)
                </span>
              )}
            </div>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 2000"
              value={totalCost}
              onChange={(e) => {
                setTotalCost(e.target.value);
                setAutoCalcApplied(false);
              }}
              required
              disabled={isSubmitting}
              className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Fuel Station */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Fuel Station (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Indian Oil, Outer Ring Road"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Tank full refuel before highway trip"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : (initialData ? 'Update Fuel Entry' : 'Save Fuel Entry')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
