import React, { useState } from 'react';
import { FuelType, Vehicle } from '../../types';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Vehicle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialData?: Vehicle | null;
  title: string;
}

const FUEL_TYPES: FuelType[] = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'Other'];

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [vehicleNumber, setVehicleNumber] = useState(initialData?.vehicleNumber || '');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [model, setModel] = useState(initialData?.model || '');
  const [variant, setVariant] = useState(initialData?.variant || '');
  const [fuelType, setFuelType] = useState<FuelType>(initialData?.fuelType || 'Petrol');
  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchaseDate || new Date().toISOString().split('T')[0]
  );
  const [currentOdometer, setCurrentOdometer] = useState<string>(
    initialData ? String(initialData.currentOdometer) : '0'
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if initialData changes
  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setVehicleNumber(initialData.vehicleNumber);
      setBrand(initialData.brand);
      setModel(initialData.model);
      setVariant(initialData.variant || '');
      setFuelType(initialData.fuelType);
      setPurchaseDate(initialData.purchaseDate || new Date().toISOString().split('T')[0]);
      setCurrentOdometer(String(initialData.currentOdometer));
    } else {
      setName('');
      setVehicleNumber('');
      setBrand('');
      setModel('');
      setVariant('');
      setFuelType('Petrol');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setCurrentOdometer('0');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a vehicle name (e.g. My Grand i10)');
      return;
    }
    if (!vehicleNumber.trim()) {
      setError('Please enter the registration number (e.g. TS09EX1234)');
      return;
    }
    if (!brand.trim()) {
      setError('Please enter the brand/make (e.g. Hyundai)');
      return;
    }
    if (!model.trim()) {
      setError('Please enter the vehicle model (e.g. Grand i10 Nios)');
      return;
    }

    const odoNum = Number(currentOdometer);
    if (isNaN(odoNum) || odoNum < 0) {
      setError('Odometer must be a valid non-negative number');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        name: name.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        brand: brand.trim(),
        model: model.trim(),
        variant: variant.trim(),
        fuelType,
        purchaseDate,
        currentOdometer: odoNum,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to save vehicle details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#121620] border border-cyan-500/20 rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>🚗</span> {title}
        </h3>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Vehicle Nickname *
              </label>
              <input
                type="text"
                placeholder="e.g. Grand i10 Nios"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Registration / Number *
              </label>
              <input
                type="text"
                placeholder="e.g. TS09EX1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                required
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-gray-500 focus:outline-none uppercase transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Brand / Make *
              </label>
              <input
                type="text"
                placeholder="e.g. Hyundai, Honda, Tata"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                required
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Model *
              </label>
              <input
                type="text"
                placeholder="e.g. Grand i10 Nios, Nexon"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Variant / Trim
              </label>
              <input
                type="text"
                placeholder="e.g. Sportz, Titanium, XZ+"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Fuel Type *
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as FuelType)}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
              >
                {FUEL_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {ft}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Current Odometer (KM) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 20640"
                value={currentOdometer}
                onChange={(e) => setCurrentOdometer(e.target.value)}
                required
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Purchase / Registration Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? 'Saving...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
