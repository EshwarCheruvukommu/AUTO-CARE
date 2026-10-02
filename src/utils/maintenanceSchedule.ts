import { ServiceRecord, FuelRecord, Vehicle, CustomMaintenanceRule } from '../types';
import { parseLocalDate, formatDate } from './formatters';

export interface MaintenanceScheduleItem {
  id: string;
  name: string;
  category: 'Fluids' | 'Filters' | 'Tyres & Brakes' | 'Electrical' | 'Engine & Transmission' | 'General';
  description: string;
  intervalKm: number;
  intervalMonths: number;
  lastDoneOdometer: number | null;
  lastDoneDate: string | null;
  nextDueOdometer: number;
  nextDueDate: string;
  remainingKm: number;
  remainingDays: number;
  status: 'Critical Overdue' | 'Overdue' | 'Due Soon' | 'On Schedule' | 'Good';
  importance: 'Critical' | 'Recommended' | 'Standard';
  applicableFuelTypes?: string[];
  source?: 'Manufacturer' | 'Service Center' | 'Personal' | 'Custom';
  isCustom?: boolean;
}

export interface MaintenancePredictionResult {
  dailyKmAverage: number;
  items: MaintenanceScheduleItem[];
  overdueCount: number;
  dueSoonCount: number;
  goodCount: number;
  overallHealthRating: 'Excellent' | 'Good' | 'Attention Required' | 'Critical Overdue';
  nextImmediateService: MaintenanceScheduleItem | null;
}

// Master maintenance service templates with automotive OEM standard intervals
const STANDARD_SCHEDULE_TEMPLATES = [
  {
    id: 'engine-oil',
    name: 'Engine Oil & Filter',
    category: 'Fluids' as const,
    description: 'Replace synthetic engine oil and OEM oil filter for optimal engine protection and fuel efficiency.',
    intervalKm: 10000,
    intervalMonths: 12,
    importance: 'Critical' as const,
    serviceTypeMatch: ['oil change', 'engine oil', 'general service', 'routine service'],
    applicableFuelTypes: ['Petrol', 'Diesel', 'CNG', 'Hybrid'],
  },
  {
    id: 'tyre-rotation',
    name: 'Tyre Rotation & Wheel Balancing',
    category: 'Tyres & Brakes' as const,
    description: 'Rotate tyres front-to-back, check alignment, balance wheels, and inspect tread wear.',
    intervalKm: 10000,
    intervalMonths: 6,
    importance: 'Recommended' as const,
    serviceTypeMatch: ['tyre service', 'wheel alignment', 'wheel balancing', 'rotation'],
  },
  {
    id: 'air-cabin-filter',
    name: 'Engine Air & AC Cabin Filter',
    category: 'Filters' as const,
    description: 'Replace engine air intake filter and cabin pollen/AC filter for clean combustion and air quality.',
    intervalKm: 15000,
    intervalMonths: 12,
    importance: 'Recommended' as const,
    serviceTypeMatch: ['air filter', 'cabin filter', 'ac service', 'filter'],
  },
  {
    id: 'brake-pads-fluid',
    name: 'Brake Pads & Fluid Inspection',
    category: 'Tyres & Brakes' as const,
    description: 'Inspect brake disc wear, brake pad thickness, and test DOT brake fluid boiling point.',
    intervalKm: 20000,
    intervalMonths: 24,
    importance: 'Critical' as const,
    serviceTypeMatch: ['brake service', 'brake pads', 'brake fluid', 'brakes'],
  },
  {
    id: 'coolant-flush',
    name: 'Radiator Coolant Replacement',
    category: 'Fluids' as const,
    description: 'Flush cooling system and refill with fresh ethylene glycol coolant to prevent overheating.',
    intervalKm: 40000,
    intervalMonths: 36,
    importance: 'Recommended' as const,
    serviceTypeMatch: ['coolant', 'radiator', 'cooling'],
  },
  {
    id: 'spark-plugs',
    name: 'Spark Plugs Replacement',
    category: 'Engine & Transmission' as const,
    description: 'Replace iridium/platinum spark plugs for smooth ignition, lower emissions, and prompt starting.',
    intervalKm: 40000,
    intervalMonths: 36,
    importance: 'Recommended' as const,
    serviceTypeMatch: ['spark plug', 'ignition', 'engine repair'],
    applicableFuelTypes: ['Petrol', 'CNG', 'Hybrid'],
  },
  {
    id: 'battery-check',
    name: 'Battery Health & Terminal Check',
    category: 'Electrical' as const,
    description: 'Test cold cranking amps (CCA), clean terminal oxidation, and check 12V battery health.',
    intervalKm: 25000,
    intervalMonths: 24,
    importance: 'Critical' as const,
    serviceTypeMatch: ['battery', 'electrical', '12v'],
  },
  {
    id: 'transmission-fluid',
    name: 'Transmission & Gearbox Oil',
    category: 'Fluids' as const,
    description: 'Inspect and replace manual transmission fluid or automatic CVT/AT fluid.',
    intervalKm: 50000,
    intervalMonths: 48,
    importance: 'Standard' as const,
    serviceTypeMatch: ['transmission', 'gearbox', 'gear oil', 'clutch'],
  },
  {
    id: 'wiper-blades',
    name: 'Wiper Blades Replacement',
    category: 'General' as const,
    description: 'Replace windshield wiper rubber blades to guarantee clear visibility during monsoon and rain.',
    intervalKm: 15000,
    intervalMonths: 12,
    importance: 'Standard' as const,
    serviceTypeMatch: ['wiper', 'detailing', 'car wash'],
  },
  {
    id: 'ev-reduction-gear',
    name: 'EV Drive Unit & Reduction Gear Oil',
    category: 'Engine & Transmission' as const,
    description: 'Inspect electric motor coolant, drive inverter, and replace reduction gearbox lubricant.',
    intervalKm: 40000,
    intervalMonths: 36,
    importance: 'Critical' as const,
    serviceTypeMatch: ['ev service', 'reduction gear', 'motor'],
    applicableFuelTypes: ['Electric'],
  },
];

/**
 * Calculates average daily kilometers driven using chronological odometer entries from fuel & service records.
 */
export function calculateDailyKmAverage(
  vehicle: Vehicle,
  fuelRecords: FuelRecord[],
  services: ServiceRecord[]
): number {
  const points: Array<{ date: Date; odo: number }> = [];

  // Add vehicle purchase baseline
  if (vehicle.purchaseDate) {
    const pDate = parseLocalDate(vehicle.purchaseDate);
    if (!isNaN(pDate.getTime())) {
      points.push({ date: pDate, odo: 0 });
    }
  }

  // Add fuel records
  fuelRecords.forEach((f) => {
    if (f.odometer && f.fuelDate) {
      const d = parseLocalDate(f.fuelDate);
      if (!isNaN(d.getTime())) {
        points.push({ date: d, odo: Number(f.odometer) });
      }
    }
  });

  // Add service records
  services.forEach((s) => {
    const sDateStr = s.serviceDate || (s as any).date;
    if (s.odometer && sDateStr) {
      const d = parseLocalDate(sDateStr);
      if (!isNaN(d.getTime())) {
        points.push({ date: d, odo: Number(s.odometer) });
      }
    }
  });

  // Sort chronological
  points.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (points.length >= 2) {
    const first = points[0];
    const last = points[points.length - 1];
    const diffDays = Math.max(1, Math.round((last.date.getTime() - first.date.getTime()) / (1000 * 60 * 60 * 24)));
    const diffKm = last.odo - first.odo;

    if (diffDays >= 7 && diffKm > 0) {
      const calculated = diffKm / diffDays;
      // Clamp reasonable automotive daily average between 10 km/day and 120 km/day
      if (calculated >= 5 && calculated <= 250) {
        return Math.round(calculated * 10) / 10;
      }
    }
  }

  // Sensible default daily driving estimate (approx 10,000 km per year = ~27.4 km/day)
  return 27.5;
}

/**
 * Computes the complete AI Maintenance Schedule and Due Predictions for the active vehicle.
 */
export function computeMaintenanceSchedule(
  vehicle: Vehicle,
  services: ServiceRecord[],
  fuelRecords: FuelRecord[],
  customRules: CustomMaintenanceRule[] = []
): MaintenancePredictionResult {
  const currentOdo = Number(vehicle.currentOdometer) || 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyKm = calculateDailyKmAverage(vehicle, fuelRecords, services);
  const vehicleFuel = vehicle.fuelType || 'Petrol';

  // Filter templates applicable to vehicle fuel type
  const applicableTemplates = STANDARD_SCHEDULE_TEMPLATES.filter((tmpl) => {
    if (!tmpl.applicableFuelTypes) return true;
    return tmpl.applicableFuelTypes.includes(vehicleFuel);
  });

  // Filter custom rules for this vehicle (or global to all vehicles)
  const vehicleCustomRules = customRules.filter(
    (r) => !r.vehicleId || r.vehicleId === vehicle.id
  );

  // Sort services chronological descending
  const sortedServices = [...services].sort((a, b) => {
    const dateA = new Date(a.serviceDate || (a as any).date || '').getTime();
    const dateB = new Date(b.serviceDate || (b as any).date || '').getTime();
    return dateB - dateA;
  });

  const items: MaintenanceScheduleItem[] = [];

  // Helper to match last done service
  const findLastDone = (nameMatchList: string[]) => {
    for (const srv of sortedServices) {
      const srvTypeLower = (srv.serviceType || '').toLowerCase();
      const srvDescLower = (srv.description || (srv as any).workPerformed || '').toLowerCase();
      const combined = `${srvTypeLower} ${srvDescLower}`;

      const matches = nameMatchList.some((kw) => combined.includes(kw));
      if (matches) {
        return {
          lastDoneOdo: srv.odometer ? Number(srv.odometer) : null,
          lastDoneDateStr: srv.serviceDate || (srv as any).date || null,
        };
      }
    }
    return { lastDoneOdo: null, lastDoneDateStr: null };
  };

  // 1. Process Standard Templates
  for (const tmpl of applicableTemplates) {
    const { lastDoneOdo, lastDoneDateStr } = findLastDone(tmpl.serviceTypeMatch);

    // Baseline odometer and baseline date
    const baselineOdo = lastDoneOdo !== null ? lastDoneOdo : 0;
    const baselineDate = lastDoneDateStr
      ? parseLocalDate(lastDoneDateStr)
      : (vehicle.purchaseDate ? parseLocalDate(vehicle.purchaseDate) : today);

    // Calculate due targets
    const nextDueOdo = baselineOdo + tmpl.intervalKm;
    const remainingKm = nextDueOdo - currentOdo;

    // Calculate due date by months elapsed
    const dueDateByMonths = new Date(baselineDate.getTime());
    dueDateByMonths.setMonth(dueDateByMonths.getMonth() + tmpl.intervalMonths);

    // Calculate due date by remaining kilometers based on daily driving rate
    let calculatedDueDate: Date;
    if (remainingKm <= 0) {
      const daysOverdue = Math.round(Math.abs(remainingKm) / Math.max(1, dailyKm));
      calculatedDueDate = new Date(today.getTime() - daysOverdue * 24 * 60 * 60 * 1000);
    } else {
      const daysUntilKmDue = Math.round(remainingKm / Math.max(1, dailyKm));
      const kmTargetDate = new Date(today.getTime() + daysUntilKmDue * 24 * 60 * 60 * 1000);
      calculatedDueDate = kmTargetDate.getTime() < dueDateByMonths.getTime() ? kmTargetDate : dueDateByMonths;
    }

    const remainingDays = Math.round((calculatedDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Bug #6 & #7: Consistent Status Logic
    // - Critical Overdue: Overdue by > 1,500 km or > 60 days
    // - Overdue: remainingKm <= 0 or remainingDays <= 0
    // - Due Soon: remainingKm <= 1000 km or remainingDays <= 30 days
    // - On Schedule: remainingKm > 1000 km and remainingDays > 30 days
    let status: 'Critical Overdue' | 'Overdue' | 'Due Soon' | 'On Schedule';
    if (remainingKm < -1500 || remainingDays < -60) {
      status = 'Critical Overdue';
    } else if (remainingKm <= 0 || remainingDays <= 0) {
      status = 'Overdue';
    } else if (remainingKm <= 1000 || remainingDays <= 30) {
      status = 'Due Soon';
    } else {
      status = 'On Schedule';
    }

    items.push({
      id: tmpl.id,
      name: tmpl.name,
      category: tmpl.category,
      description: tmpl.description,
      intervalKm: tmpl.intervalKm,
      intervalMonths: tmpl.intervalMonths,
      lastDoneOdometer: lastDoneOdo,
      lastDoneDate: lastDoneDateStr,
      nextDueOdometer: nextDueOdo,
      nextDueDate: calculatedDueDate.toISOString().split('T')[0],
      remainingKm,
      remainingDays,
      status,
      importance: tmpl.importance,
      source: 'Manufacturer',
      isCustom: false,
    });
  }

  // 2. Process Custom Maintenance Rules (Bug #3)
  for (const rule of vehicleCustomRules) {
    const searchKeywords = [rule.name.toLowerCase(), rule.category.toLowerCase()];
    const { lastDoneOdo, lastDoneDateStr } = findLastDone(searchKeywords);

    const baselineOdo = lastDoneOdo !== null 
      ? lastDoneOdo 
      : (rule.startingOdometer !== undefined && rule.startingOdometer !== null ? Number(rule.startingOdometer) : currentOdo);
    const baselineDate = lastDoneDateStr
      ? parseLocalDate(lastDoneDateStr)
      : (vehicle.purchaseDate ? parseLocalDate(vehicle.purchaseDate) : today);

    const nextDueOdo = baselineOdo + rule.intervalKm;
    const remainingKm = nextDueOdo - currentOdo;

    const monthsInterval = rule.intervalMonths || 12;
    const dueDateByMonths = new Date(baselineDate.getTime());
    dueDateByMonths.setMonth(dueDateByMonths.getMonth() + monthsInterval);

    let calculatedDueDate: Date;
    if (remainingKm <= 0) {
      const daysOverdue = Math.round(Math.abs(remainingKm) / Math.max(1, dailyKm));
      calculatedDueDate = new Date(today.getTime() - daysOverdue * 24 * 60 * 60 * 1000);
    } else {
      const daysUntilKmDue = Math.round(remainingKm / Math.max(1, dailyKm));
      const kmTargetDate = new Date(today.getTime() + daysUntilKmDue * 24 * 60 * 60 * 1000);
      calculatedDueDate = kmTargetDate.getTime() < dueDateByMonths.getTime() ? kmTargetDate : dueDateByMonths;
    }

    const remainingDays = Math.round((calculatedDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let status: 'Critical Overdue' | 'Overdue' | 'Due Soon' | 'On Schedule';
    if (remainingKm < -1500 || remainingDays < -60) {
      status = 'Critical Overdue';
    } else if (remainingKm <= 0 || remainingDays <= 0) {
      status = 'Overdue';
    } else if (remainingKm <= 1000 || remainingDays <= 30) {
      status = 'Due Soon';
    } else {
      status = 'On Schedule';
    }

    items.push({
      id: rule.id,
      name: rule.name,
      category: rule.category,
      description: rule.description || `Custom rule from ${rule.source}: every ${rule.intervalKm.toLocaleString()} km${rule.intervalMonths ? ` or ${rule.intervalMonths} months` : ''}.`,
      intervalKm: rule.intervalKm,
      intervalMonths: monthsInterval,
      lastDoneOdometer: lastDoneOdo,
      lastDoneDate: lastDoneDateStr,
      nextDueOdometer: nextDueOdo,
      nextDueDate: calculatedDueDate.toISOString().split('T')[0],
      remainingKm,
      remainingDays,
      status,
      importance: 'Recommended',
      source: rule.source || 'Custom',
      isCustom: true,
    });
  }

  // Sort items: Critical Overdue & Overdue first, then Due Soon, then On Schedule
  items.sort((a, b) => {
    const statusWeight: Record<string, number> = {
      'Critical Overdue': 4,
      'Overdue': 3,
      'Due Soon': 2,
      'On Schedule': 1,
      'Good': 1,
    };
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[b.status] - statusWeight[a.status];
    }
    return a.remainingDays - b.remainingDays;
  });

  const overdueCount = items.filter((i) => i.status === 'Overdue' || i.status === 'Critical Overdue').length;
  const dueSoonCount = items.filter((i) => i.status === 'Due Soon').length;
  const goodCount = items.filter((i) => i.status === 'On Schedule' || i.status === 'Good').length;

  let overallHealthRating: 'Excellent' | 'Good' | 'Attention Required' | 'Critical Overdue' = 'Good';
  if (overdueCount >= 2) overallHealthRating = 'Critical Overdue';
  else if (overdueCount === 1 || dueSoonCount >= 2) overallHealthRating = 'Attention Required';
  else if (dueSoonCount === 0 && overdueCount === 0) overallHealthRating = 'Excellent';

  const nextImmediateService = items.length > 0 ? items[0] : null;

  return {
    dailyKmAverage: dailyKm,
    items,
    overdueCount,
    dueSoonCount,
    goodCount,
    overallHealthRating,
    nextImmediateService,
  };
}
