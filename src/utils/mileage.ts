import { FuelRecord } from '../types';

export interface MileageCalculationResult {
  recordMileageMap: Record<string, number | null>;
  averageMileage: number | null;
  averageMileageLabel: string;
  totalLitres: number;
  totalCost: number;
}

/**
 * Calculates interval mileage and overall average mileage for a set of fuel records.
 * Rules:
 * - Requires at least two chronological fuel entries to compute mileage for an interval.
 * - Distance = current.odometer - previous.odometer.
 * - Interval Mileage = Distance / current.litres.
 * - Only intervals where distance > 0 and fuel quantity > 0 are valid.
 * - Average Mileage is the arithmetic mean of all valid intervals.
 * - If not enough valid data, returns "Not enough data".
 */
export function calculateFuelMetrics(records: FuelRecord[]): MileageCalculationResult {
  const recordMileageMap: Record<string, number | null> = {};
  const validMileages: number[] = [];

  // Sort chronological ascending: date first, then odometer
  const chronological = [...records].sort((a, b) => {
    const timeDiff = new Date(a.fuelDate).getTime() - new Date(b.fuelDate).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (a.odometer || 0) - (b.odometer || 0);
  });

  if (chronological.length > 0) {
    // First record has no preceding reference point
    recordMileageMap[chronological[0].id] = null;

    for (let i = 1; i < chronological.length; i++) {
      const prev = chronological[i - 1];
      const curr = chronological[i];

      const distance = curr.odometer - prev.odometer;
      const fuelAmount = curr.litres !== null && curr.litres !== undefined ? Number(curr.litres) : 0;

      if (distance > 0 && fuelAmount > 0) {
        const mileage = distance / fuelAmount;
        recordMileageMap[curr.id] = mileage;
        validMileages.push(mileage);
      } else {
        recordMileageMap[curr.id] = null;
      }
    }
  }

  // Calculate totals
  let totalLitres = 0;
  let totalCost = 0;

  records.forEach((r) => {
    totalCost += Number(r.totalCost) || 0;
    // For Petrol, Diesel, CNG (or any refuel with litres)
    if (r.fuelType !== 'EV Charging' && r.litres && Number(r.litres) > 0) {
      totalLitres += Number(r.litres);
    }
  });

  const averageMileage =
    validMileages.length > 0
      ? validMileages.reduce((sum, val) => sum + val, 0) / validMileages.length
      : null;

  const averageMileageLabel =
    averageMileage !== null ? `${averageMileage.toFixed(1)} km/L` : 'Not enough data';

  return {
    recordMileageMap,
    averageMileage,
    averageMileageLabel,
    totalLitres,
    totalCost,
  };
}
