import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config for server-side verification and Firestore REST API
const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
} catch (err) {
  console.error('Could not load firebase-applet-config.json:', err);
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Singleton GoogleGenAI instance for high performance and zero initialization overhead per request
let cachedAIInstance: GoogleGenAI | null = null;
function getCachedGenAI(apiKey: string): GoogleGenAI {
  if (!cachedAIInstance) {
    cachedAIInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAIInstance;
}

// Strong, read-only system instruction for AutoCare AI (Streamlined, zero bloat, high precision)
const AUTOCARE_SYSTEM_INSTRUCTION = `You are AutoCare AI, the intelligent, warm automotive co-pilot inside AutoCare.

CORE PRINCIPLES:
1. Strictly Read-Only: Cannot create, edit, or delete records. Direct users to the relevant UI tab if requested.
2. Grounded & Factual: Answer strictly from provided active vehicle records. Never invent numbers, dates, or mechanical issues.
3. Concise & Direct: For simple questions (odometer, last service, fuel, expenses, reminders), give direct 1-3 sentence answers without corporate fluff. Keep longer structured formatting ONLY for trip readiness or full vehicle audits.
4. Odometer & 0 KM: 0 km is completely VALID for brand-new vehicles. State "Your current odometer is 0 km." Never treat 0 as missing.
5. Missing Data: If a record is empty or not logged, clearly state: "No [services/fuel/documents/expenses] recorded in AutoCare yet."
6. Safety Boundary: Digital records supplement but never replace physical mechanical inspections. Never claim definitive mechanical health.
7. Fuel Cost & Litres: Mention both total litres and cost when answering fuel log queries.
8. Tone: Warm, professional, concise, owner-friendly.`;

// Helper: Parse YYYY-MM-DD or ISO strings into local date
function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  const cleanDate = dateString.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(dateString);
}

// Helper: Format date to friendly Indian / UK style "4 October 2026"
function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  try {
    const d = parseLocalDate(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// Helper: Document Status calculation matching AutoCare business rules
function getDocumentStatus(expiryDate: string, referenceDate: Date = new Date()): {
  status: 'Valid' | 'Expiring Soon' | 'Expired';
  daysRemaining: number;
  label: string;
} {
  if (!expiryDate) {
    return { status: 'Valid', daysRemaining: 999, label: 'No Expiry Set' };
  }
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const exp = parseLocalDate(expiryDate);
  exp.setHours(0, 0, 0, 0);

  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'Expired',
      daysRemaining: diffDays,
      label: `Expired ${Math.abs(diffDays) === 1 ? '1 day' : `${Math.abs(diffDays)} days`} ago`,
    };
  }
  if (diffDays === 0) {
    return {
      status: 'Expiring Soon',
      daysRemaining: 0,
      label: 'Expires today',
    };
  }
  if (diffDays <= 30) {
    return {
      status: 'Expiring Soon',
      daysRemaining: diffDays,
      label: `Expires in ${diffDays === 1 ? '1 day' : `${diffDays} days`}`,
    };
  }
  return {
    status: 'Valid',
    daysRemaining: diffDays,
    label: `Expires in ${diffDays} days`,
  };
}

// Helper: Reminder status calculation matching AutoCare rules
function getReminderStatus(
  dueDate: string,
  status: string,
  completedAt?: string | null,
  referenceDate: Date = new Date()
): {
  dynamicStatus: 'Completed' | 'Overdue' | 'Due Soon' | 'Upcoming';
  diffDays: number;
  label: string;
} {
  if (status === 'Completed') {
    return {
      dynamicStatus: 'Completed',
      diffDays: 0,
      label: completedAt ? `Completed on ${formatDate(completedAt)}` : 'Completed',
    };
  }
  if (!dueDate) {
    return {
      dynamicStatus: 'Upcoming',
      diffDays: 999,
      label: 'No due date set',
    };
  }

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const due = parseLocalDate(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      dynamicStatus: 'Overdue',
      diffDays,
      label: `Overdue by ${Math.abs(diffDays) === 1 ? '1 day' : `${Math.abs(diffDays)} days`}`,
    };
  }
  if (diffDays === 0) {
    return {
      dynamicStatus: 'Due Soon',
      diffDays: 0,
      label: 'Due today',
    };
  }
  if (diffDays <= 30) {
    return {
      dynamicStatus: 'Due Soon',
      diffDays,
      label: `Due in ${diffDays === 1 ? '1 day' : `${diffDays} days`}`,
    };
  }
  return {
    dynamicStatus: 'Upcoming',
    diffDays,
    label: `Due in ${diffDays} days`,
  };
}

// Helper: Calculate mileage strictly adhering to AutoCare mileage logic
function calculateMileage(fuelRecords: any[]) {
  // Sort chronological ascending: date first, then odometer
  const chronological = [...fuelRecords].sort((a, b) => {
    const timeDiff = new Date(a.fuelDate || 0).getTime() - new Date(b.fuelDate || 0).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (Number(a.odometer) || 0) - (Number(b.odometer) || 0);
  });

  const recordMileageMap: Record<string, number | null> = {};
  const validMileages: number[] = [];

  if (chronological.length > 0) {
    recordMileageMap[chronological[0].id] = null;
    for (let i = 1; i < chronological.length; i++) {
      const prev = chronological[i - 1];
      const curr = chronological[i];
      const distance = (Number(curr.odometer) || 0) - (Number(prev.odometer) || 0);
      const fuelAmount = Number(curr.litres) || 0;

      if (distance > 0 && fuelAmount > 0) {
        const mileage = distance / fuelAmount;
        recordMileageMap[curr.id] = mileage;
        validMileages.push(mileage);
      } else {
        recordMileageMap[curr.id] = null;
      }
    }
  }

  // Find latest mileage from the most recent chronological interval with a valid mileage
  let latestMileage: number | null = null;
  for (let i = chronological.length - 1; i >= 0; i--) {
    const recId = chronological[i].id;
    if (recordMileageMap[recId] !== null && recordMileageMap[recId] !== undefined) {
      latestMileage = recordMileageMap[recId];
      break;
    }
  }

  const averageMileage =
    validMileages.length > 0
      ? validMileages.reduce((sum, val) => sum + val, 0) / validMileages.length
      : null;

  return {
    latestMileage,
    latestMileageLabel: latestMileage !== null ? `${latestMileage.toFixed(1)} km/L` : 'Not enough data',
    averageMileage,
    averageMileageLabel: averageMileage !== null ? `${averageMileage.toFixed(1)} km/L` : 'Not enough data',
  };
}

// Helper: Build the comprehensive, read-only vehicle context for Phase 10.5 Advanced Intelligence (Features 9–15)
function buildVehicleContextString(data: {
  vehicle: any;
  documents: any[];
  services: any[];
  fuelRecords: any[];
  expenses: any[];
  reminders: any[];
}): string {
  const { vehicle, documents, services, fuelRecords, expenses, reminders } = data;

  const vName = vehicle.name || 'Unnamed Vehicle';
  const vReg = vehicle.vehicleNumber || 'N/A';
  const vBrand = vehicle.brand || '';
  const vModel = vehicle.model || '';
  const vVariant = vehicle.variant || '';
  const vFuel = vehicle.fuelType || '';
  const hasValidOdo = vehicle.currentOdometer !== undefined && vehicle.currentOdometer !== null && vehicle.currentOdometer !== '' && !isNaN(Number(vehicle.currentOdometer));
  const vOdoNum = hasValidOdo ? Number(vehicle.currentOdometer) : null;
  const vOdo = hasValidOdo ? `${vOdoNum!.toLocaleString('en-IN')} km` : 'No current odometer reading has been recorded';
  const vPurchase = vehicle.purchaseDate ? formatDate(vehicle.purchaseDate) : 'N/A';

  // --- 1. SERVICE CALCULATIONS, TRENDS & PREDICTIONS (Feature 9, 11) ---
  const serviceCount = services.length;
  const totalServiceCost = services.reduce((acc, s) => acc + (Number(s.cost) || 0), 0);
  const sortedServicesDesc = [...services].sort(
    (a, b) => new Date(b.serviceDate || b.date || 0).getTime() - new Date(a.serviceDate || a.date || 0).getTime()
  );
  const sortedServicesAsc = [...services].sort(
    (a, b) => new Date(a.serviceDate || a.date || 0).getTime() - new Date(b.serviceDate || b.date || 0).getTime()
  );
  const latestService = sortedServicesDesc[0];

  // Frequency & repeated service types
  const serviceTypeCounts: Record<string, number> = {};
  for (const s of services) {
    const type = s.serviceType || 'General Service';
    serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1;
  }
  const repeatedServices = Object.entries(serviceTypeCounts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  // Service Cost Trend:
  let serviceCostTrendNote = '';
  if (serviceCount === 0) {
    serviceCostTrendNote = 'No service records logged in AutoCare yet.';
  } else if (serviceCount === 1) {
    serviceCostTrendNote = `1 service record logged (Cost: ₹${Number(latestService.cost || 0).toLocaleString('en-IN')}). At least 2 service records are needed to determine a cost progression trend.`;
  } else {
    const earliestCost = Number(sortedServicesAsc[0].cost) || 0;
    const latestCost = Number(latestService.cost) || 0;
    const diffCost = latestCost - earliestCost;
    if (diffCost > 0) {
      serviceCostTrendNote = `Service spending has increased from ₹${earliestCost.toLocaleString('en-IN')} (earliest service) to ₹${latestCost.toLocaleString('en-IN')} (latest service).`;
    } else if (diffCost < 0) {
      serviceCostTrendNote = `Service spending has decreased from ₹${earliestCost.toLocaleString('en-IN')} (earliest service) to ₹${latestCost.toLocaleString('en-IN')} (latest service).`;
    } else {
      serviceCostTrendNote = `Service spending has been consistent at ₹${latestCost.toLocaleString('en-IN')} between recorded services.`;
    }
  }

  // Distance & time elapsed since last service
  let distanceSinceLastService: string = 'N/A';
  let daysSinceLastService: string = 'N/A';
  if (latestService) {
    if (vOdoNum && latestService.odometer) {
      const diffKm = vOdoNum - Number(latestService.odometer);
      distanceSinceLastService = `${diffKm > 0 ? diffKm.toLocaleString('en-IN') : 0} km`;
    }
    const servDate = parseLocalDate(latestService.serviceDate || latestService.date);
    const today = new Date();
    const diffDays = Math.round((today.getTime() - servDate.getTime()) / (1000 * 60 * 60 * 24));
    daysSinceLastService = `${diffDays >= 0 ? diffDays : 0} days ago`;
  }

  // Component check for maintenance predictions
  const hasBatteryService = services.some(s => 
    (s.serviceType && s.serviceType.toLowerCase().includes('battery')) ||
    (s.description && s.description.toLowerCase().includes('battery')) ||
    (s.notes && s.notes.toLowerCase().includes('battery'))
  );
  const hasTyreService = services.some(s => 
    (s.serviceType && (s.serviceType.toLowerCase().includes('tyre') || s.serviceType.toLowerCase().includes('tire') || s.serviceType.toLowerCase().includes('wheel') || s.serviceType.toLowerCase().includes('alignment') || s.serviceType.toLowerCase().includes('balancing'))) ||
    (s.description && (s.description.toLowerCase().includes('tyre') || s.description.toLowerCase().includes('tire')))
  );
  const hasBrakeService = services.some(s => 
    (s.serviceType && s.serviceType.toLowerCase().includes('brake')) ||
    (s.description && s.description.toLowerCase().includes('brake'))
  );

  // --- 2. FUEL & MILEAGE CALCULATIONS & TRENDS (Feature 9) ---
  const fuelMetrics = calculateMileage(fuelRecords);
  const fuelEntriesCount = fuelRecords.length;
  const totalFuelCost = fuelRecords.reduce((acc, f) => acc + (Number(f.totalCost) || 0), 0);
  const totalFuelQuantity = fuelRecords.reduce((acc, f) => acc + (Number(f.litres) || 0), 0);
  const sortedFuelByDateDesc = [...fuelRecords].sort(
    (a, b) => new Date(b.fuelDate || 0).getTime() - new Date(a.fuelDate || 0).getTime()
  );
  const sortedFuelByDateAsc = [...fuelRecords].sort(
    (a, b) => new Date(a.fuelDate || 0).getTime() - new Date(b.fuelDate || 0).getTime()
  );
  const latestFuelOdo = sortedFuelByDateDesc[0]?.odometer
    ? `${Number(sortedFuelByDateDesc[0].odometer).toLocaleString('en-IN')} km`
    : vOdo;

  // Chronological interval mileages for trend analysis
  const validIntervalMileages: Array<{ date: string; kmPerLitre: number; odo: number; litres: number; cost: number }> = [];
  if (sortedFuelByDateAsc.length > 1) {
    for (let i = 1; i < sortedFuelByDateAsc.length; i++) {
      const prev = sortedFuelByDateAsc[i - 1];
      const curr = sortedFuelByDateAsc[i];
      const dist = (Number(curr.odometer) || 0) - (Number(prev.odometer) || 0);
      const litres = Number(curr.litres) || 0;
      if (dist > 0 && litres > 0) {
        validIntervalMileages.push({
          date: curr.fuelDate,
          kmPerLitre: Number((dist / litres).toFixed(1)),
          odo: Number(curr.odometer),
          litres,
          cost: Number(curr.totalCost) || 0,
        });
      }
    }
  }

  let mileageTrendStatement = '';
  if (fuelEntriesCount < 2) {
    mileageTrendStatement = 'Only 0–1 fuel entries logged. Not enough data to calculate mileage or trends (requires at least 2 consecutive entries for mileage, 3 for trends).';
  } else if (validIntervalMileages.length < 2) {
    mileageTrendStatement = `Only 1 valid mileage interval recorded (${fuelMetrics.latestMileageLabel}). At least 3 fuel entries (2+ intervals) are needed to determine a reliable long-term mileage trend.`;
  } else {
    const firstInterval = validIntervalMileages[0].kmPerLitre;
    const lastInterval = validIntervalMileages[validIntervalMileages.length - 1].kmPerLitre;
    const diff = lastInterval - firstInterval;
    if (Math.abs(diff) < 0.3) {
      mileageTrendStatement = `Your recorded mileage has remained steady, hovering between ${firstInterval} km/L and ${lastInterval} km/L (average: ${fuelMetrics.averageMileageLabel}).`;
    } else if (diff > 0) {
      mileageTrendStatement = `Your recorded mileage has increased from ${firstInterval} km/L to ${lastInterval} km/L (average: ${fuelMetrics.averageMileageLabel}).`;
    } else {
      mileageTrendStatement = `Your recorded mileage has decreased from ${firstInterval} km/L to ${lastInterval} km/L (average: ${fuelMetrics.averageMileageLabel}).`;
    }
  }

  let fuelCostTrendNote = '';
  if (fuelEntriesCount >= 2) {
    const earliestFillCost = Number(sortedFuelByDateAsc[0].totalCost) || 0;
    const latestFillCost = Number(sortedFuelByDateDesc[0].totalCost) || 0;
    const avgFillCost = Math.round(totalFuelCost / fuelEntriesCount);
    fuelCostTrendNote = `Average fuel fill-up cost is ₹${avgFillCost.toLocaleString('en-IN')}. Latest fill-up was ₹${latestFillCost.toLocaleString('en-IN')}, compared to ₹${earliestFillCost.toLocaleString('en-IN')} on the earliest recorded fill-up.`;
  } else if (fuelEntriesCount === 1) {
    fuelCostTrendNote = `1 fuel fill-up recorded (₹${Number(sortedFuelByDateDesc[0].totalCost || 0).toLocaleString('en-IN')}).`;
  } else {
    fuelCostTrendNote = 'No fuel fill-up records logged in AutoCare yet.';
  }

  // --- 3. EXPENSE CALCULATIONS, TRENDS & CATEGORY COMPARISON (Feature 9) ---
  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const categoryExpenses: Record<string, number> = {};
  const monthlyExpensesMap: Record<string, number> = {};

  for (const exp of expenses) {
    const cat = exp.category || 'Other';
    const amt = Number(exp.amount) || 0;
    categoryExpenses[cat] = (categoryExpenses[cat] || 0) + amt;

    const d = exp.expenseDate || exp.date;
    if (d) {
      try {
        const dt = parseLocalDate(d);
        const year = dt.getFullYear();
        const monthNum = String(dt.getMonth() + 1).padStart(2, '0');
        const sortKey = `${year}-${monthNum}`;
        monthlyExpensesMap[sortKey] = (monthlyExpensesMap[sortKey] || 0) + amt;
      } catch {
        // ignore
      }
    }
  }

  // Sorted monthly expenses
  const sortedMonths = Object.keys(monthlyExpensesMap).sort();
  const monthlyExpenseList = sortedMonths.map((ym) => {
    const [y, m] = ym.split('-');
    const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    const label = dt.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    return {
      sortKey: ym,
      label,
      amount: monthlyExpensesMap[ym],
    };
  });

  let expenseTrendStatement = '';
  if (monthlyExpenseList.length === 0) {
    expenseTrendStatement = 'No expenses recorded in AutoCare yet.';
  } else if (monthlyExpenseList.length === 1) {
    expenseTrendStatement = `Expenses recorded only for ${monthlyExpenseList[0].label} (₹${monthlyExpenseList[0].amount.toLocaleString('en-IN')}). Multiple months of data are needed for multi-month trend analysis.`;
  } else {
    const prevMonth = monthlyExpenseList[monthlyExpenseList.length - 2];
    const latestMonth = monthlyExpenseList[monthlyExpenseList.length - 1];
    const diff = latestMonth.amount - prevMonth.amount;
    if (diff > 0) {
      expenseTrendStatement = `Your recorded vehicle expenses increased from ₹${prevMonth.amount.toLocaleString('en-IN')} in ${prevMonth.label} to ₹${latestMonth.amount.toLocaleString('en-IN')} in ${latestMonth.label}.`;
    } else if (diff < 0) {
      expenseTrendStatement = `Your recorded vehicle expenses decreased from ₹${prevMonth.amount.toLocaleString('en-IN')} in ${prevMonth.label} to ₹${latestMonth.amount.toLocaleString('en-IN')} in ${latestMonth.label}.`;
    } else {
      expenseTrendStatement = `Your recorded vehicle expenses remained identical at ₹${latestMonth.amount.toLocaleString('en-IN')} between ${prevMonth.label} and ${latestMonth.label}.`;
    }
  }

  // Highest spending category
  let highestExpenseCategory = '';
  let highestExpenseAmount = 0;
  for (const [cat, amt] of Object.entries(categoryExpenses)) {
    if (amt > highestExpenseAmount) {
      highestExpenseAmount = amt;
      highestExpenseCategory = cat;
    }
  }

  // Cross-category comparison: Fuel vs Service vs Other
  const fuelRecordedExpense = categoryExpenses['Fuel'] || totalFuelCost;
  const serviceRecordedExpense = categoryExpenses['Service'] || totalServiceCost;

  // --- 4. COST FORECASTING CALCULATIONS (Feature 10) ---
  const activeMonthsCount = Math.max(1, monthlyExpenseList.length);
  let isForecastingViable = false;
  let estimatedMonthlyFuel = 0;
  let estimatedMonthlyService = 0;
  let estimatedMonthlyOther = 0;

  if (totalExpenses > 0 || totalFuelCost > 0 || totalServiceCost > 0) {
    isForecastingViable = true;
    estimatedMonthlyFuel = totalFuelCost > 0 ? Math.round(totalFuelCost / activeMonthsCount) : (categoryExpenses['Fuel'] ? Math.round(categoryExpenses['Fuel'] / activeMonthsCount) : 0);
    estimatedMonthlyService = totalServiceCost > 0 ? Math.round(totalServiceCost / Math.max(1, activeMonthsCount * 2)) : 0;
    const otherRecorded = Math.max(0, totalExpenses - (categoryExpenses['Fuel'] || 0) - (categoryExpenses['Service'] || 0));
    estimatedMonthlyOther = Math.round(otherRecorded / activeMonthsCount);
  }

  const estimatedTotalMonthlyBudget = estimatedMonthlyFuel + estimatedMonthlyService + estimatedMonthlyOther;

  // --- 5. DOCUMENT COMPLIANCE & INTELLIGENCE (Feature 12) ---
  const docList = documents.map((doc) => {
    const st = getDocumentStatus(doc.expiryDate);
    return {
      id: doc.id,
      type: doc.type || 'Document',
      number: doc.documentNumber || '',
      issueDate: doc.issueDate ? formatDate(doc.issueDate) : 'Not recorded',
      expiryDate: doc.expiryDate ? formatDate(doc.expiryDate) : 'No Expiry Set',
      rawExpiryDate: doc.expiryDate,
      status: st.status,
      daysRemaining: st.daysRemaining,
      label: st.label,
      notes: doc.notes || '',
    };
  });

  const expiredDocs = docList.filter((d) => d.status === 'Expired');
  const expiringSoonDocs = docList.filter((d) => d.status === 'Expiring Soon');
  const validDocs = docList.filter((d) => d.status === 'Valid');

  const docTypesLower = docList.map((d) => d.type.toLowerCase());
  const hasInsurance = docTypesLower.some((t) => t.includes('insurance'));
  const hasPUC = docTypesLower.some((t) => t.includes('puc') || t.includes('pollution') || t.includes('emission'));
  const hasRC = docTypesLower.some((t) => t.includes('rc') || t.includes('registration'));

  const insuranceDoc = docList.find((d) => d.type.toLowerCase().includes('insurance'));
  const pucDoc = docList.find((d) => d.type.toLowerCase().includes('puc') || d.type.toLowerCase().includes('pollution'));
  const rcDoc = docList.find((d) => d.type.toLowerCase().includes('rc') || d.type.toLowerCase().includes('registration'));

  // --- 6. REMINDERS & SCHEDULE WITH STRICT DEDUPLICATION (Feature 11, 15) ---
  // Ensure that 1 Insurance Expiry NEVER becomes 2 reminders!
  const allRems: any[] = [];
  const seenReminderKeys = new Set<string>();

  // Process reminders (from DB and client payload)
  for (const r of reminders) {
    const st = getReminderStatus(r.dueDate, r.status, r.completedAt);
    const title = r.title || 'Reminder';
    const cleanTitle = title.toLowerCase().replace(/expiry/g, '').trim();
    const dateStr = (r.dueDate || '').split('T')[0];
    const normKey = `${cleanTitle}_${dateStr}`;

    if (!seenReminderKeys.has(normKey)) {
      seenReminderKeys.add(normKey);
      allRems.push({
        title,
        dueDate: r.dueDate ? formatDate(r.dueDate) : 'No due date',
        status: r.status,
        dynamicStatus: st.dynamicStatus,
        daysRemaining: st.diffDays,
        label: st.label,
      });
    }
  }

  // Also verify documents: only add if not already covered by seenReminderKeys
  for (const doc of docList) {
    if (doc.status === 'Expired' || doc.status === 'Expiring Soon') {
      const cleanType = doc.type.toLowerCase().trim();
      const rawDate = (doc.rawExpiryDate || '').split('T')[0];
      const normKey = `${cleanType}_${rawDate}`;

      const alreadyCovered = Array.from(seenReminderKeys).some(k => 
        k.includes(cleanType) || k.includes(normKey)
      );

      if (!seenReminderKeys.has(normKey) && !alreadyCovered) {
        seenReminderKeys.add(normKey);
        const days = doc.daysRemaining;
        allRems.push({
          title: `${doc.type} Expiry`,
          dueDate: doc.expiryDate,
          status: 'Pending',
          dynamicStatus: doc.status === 'Expired' ? 'Overdue' : 'Due Soon',
          daysRemaining: days,
          label:
            days < 0
              ? `Overdue by ${Math.abs(days)} days`
              : days === 0
              ? 'Due today'
              : `Due in ${days} days`,
        });
      }
    }
  }

  const activeReminders = allRems.filter((r) => r.status !== 'Completed');
  const overdueReminders = activeReminders.filter((r) => r.dynamicStatus === 'Overdue');
  const dueSoonReminders = activeReminders.filter((r) => r.dynamicStatus === 'Due Soon');
  const upcomingReminders = activeReminders.filter((r) => r.dynamicStatus === 'Upcoming');
  const completedCount = allRems.filter((r) => r.status === 'Completed').length;

  // --- 7. TRIP READINESS ASSESSMENT & PRE-TRIP AUDIT (Feature 14) ---
  const tripLegalValid = hasInsurance && insuranceDoc?.status !== 'Expired';
  const tripPucValid = hasPUC && pucDoc?.status !== 'Expired';
  const tripRcValid = hasRC && rcDoc?.status !== 'Expired';

  // --- 8. SMART RECOMMENDATIONS (Deduplicated & Prioritized) ---
  const prioritizedRecommendations: string[] = [];
  if (expiredDocs.length > 0) {
    expiredDocs.forEach((d) => {
      prioritizedRecommendations.push(`[URGENT] Document Expired: ${d.type} is expired (${d.label}). Renew immediately in Documents.`);
    });
  }
  if (overdueReminders.length > 0) {
    overdueReminders.forEach((r) => {
      const matchesDoc = expiredDocs.some(d => r.title.toLowerCase().includes(d.type.toLowerCase()));
      if (!matchesDoc) {
        prioritizedRecommendations.push(`[URGENT] Overdue Task: "${r.title}" (${r.label}). Address in Reminders.`);
      }
    });
  }
  if (expiringSoonDocs.length > 0) {
    expiringSoonDocs.forEach((d) => {
      prioritizedRecommendations.push(`[ACTION] Document Expiring Soon: ${d.type} (${d.label}). Plan renewal in Documents.`);
    });
  }
  if (dueSoonReminders.length > 0) {
    dueSoonReminders.forEach((r) => {
      const matchesDoc = expiringSoonDocs.some(d => r.title.toLowerCase().includes(d.type.toLowerCase()));
      if (!matchesDoc) {
        prioritizedRecommendations.push(`[UPCOMING] Task Due Soon: "${r.title}" (${r.label}). Check Reminders.`);
      }
    });
  }
  if (!hasInsurance) {
    prioritizedRecommendations.push('[DOCUMENT MISSING] No Insurance document recorded. Upload in Documents.');
  }
  if (!hasPUC) {
    prioritizedRecommendations.push('[DOCUMENT MISSING] No PUC / Emission certificate recorded. Upload in Documents.');
  }
  if (fuelEntriesCount < 2) {
    prioritizedRecommendations.push('[TRACKING] Log consecutive fuel fill-ups in Fuel & Mileage to enable mileage and fuel efficiency tracking.');
  }
  if (serviceCount === 0) {
    prioritizedRecommendations.push('[TRACKING] No service records logged yet. Add maintenance history in Service & Maintenance.');
  }

  // --- ASSEMBLE COMPREHENSIVE GROUNDED CONTEXT STRING ---
  let ctx = `CURRENT ACTIVE VEHICLE PROFILE
Vehicle Name: ${vName}
Registration Number: ${vReg}
Brand: ${vBrand || 'N/A'}
Model: ${vModel || 'N/A'}
Variant: ${vVariant || 'Standard'}
Fuel Type: ${vFuel || 'N/A'}
Current Odometer: ${vOdo}
Purchase Date: ${vPurchase}

==================================================
1. SERVICE & MAINTENANCE (HISTORY, TRENDS & PREDICTIONS)
Total Service Records: ${serviceCount}
Total Service Spend: ₹${totalServiceCost.toLocaleString('en-IN')}
Average Cost Per Service: ₹${serviceCount > 0 ? Math.round(totalServiceCost / serviceCount).toLocaleString('en-IN') : 0}
Distance Driven Since Last Service: ${distanceSinceLastService}
Days Elapsed Since Last Service: ${daysSinceLastService}
Service Cost Progression Trend: ${serviceCostTrendNote}
`;

  if (latestService) {
    ctx += `Latest Service Performed:
- Type: ${latestService.serviceType || 'Service'}
- Date: ${formatDate(latestService.serviceDate || latestService.date)}
- Odometer: ${latestService.odometer ? `${Number(latestService.odometer).toLocaleString('en-IN')} km` : 'Not recorded'}
- Cost: ₹${Number(latestService.cost || 0).toLocaleString('en-IN')}
- Service Center: ${latestService.serviceCenter || 'Not specified'}
- Notes: ${latestService.notes || latestService.description || 'None'}\n`;
  } else {
    ctx += `Latest Service: No service records logged in AutoCare.\n`;
  }

  if (sortedServicesDesc.length > 1) {
    ctx += `Recent Service Records (Chronological):
`;
    sortedServicesDesc.slice(0, 5).forEach((s, idx) => {
      ctx += `${idx + 1}. ${s.serviceType || 'Service'} on ${formatDate(s.serviceDate || s.date)} | Cost: ₹${Number(s.cost || 0).toLocaleString('en-IN')}${s.odometer ? ` | Odo: ${Number(s.odometer).toLocaleString('en-IN')} km` : ''}${s.serviceCenter ? ` | Center: ${s.serviceCenter}` : ''}\n`;
    });
  }

  if (repeatedServices.length > 0) {
    ctx += `Repeated Service Areas in Records:
`;
    repeatedServices.forEach(([type, count]) => {
      ctx += `- ${type}: ${count} records\n`;
    });
  }

  ctx += `Component Service Audit (Stored History):
- Battery: ${hasBatteryService ? 'Battery service/replacement recorded in history' : 'No battery replacement or check recorded in AutoCare'}
- Tyres: ${hasTyreService ? 'Tyre/wheel alignment or rotation recorded in history' : 'No tyre rotation or replacement recorded in AutoCare'}
- Brakes: ${hasBrakeService ? 'Brake inspection or service recorded in history' : 'No brake service recorded in AutoCare'}

AI Predictive Maintenance Due Schedule:
- Standard Engine Oil & Filter (10,000 km / 12 mo interval): Target due at ~${(Math.floor((vOdoNum || 0) / 10000) + 1) * 10000} km (~${((Math.floor((vOdoNum || 0) / 10000) + 1) * 10000) - (vOdoNum || 0)} km remaining).
- Tyre Rotation & Alignment (10,000 km / 6 mo interval): Next due at ~${(Math.floor((vOdoNum || 0) / 10000) + 1) * 10000} km.
- Brake System Inspection (20,000 km / 24 mo interval): Next due at ~${(Math.floor((vOdoNum || 0) / 20000) + 1) * 20000} km.
- Cabin & Air Filters (15,000 km / 12 mo interval): Next due at ~${(Math.floor((vOdoNum || 0) / 15000) + 1) * 15000} km.
- Coolant Flush & Spark Plugs (40,000 km / 36 mo interval): Next due at ~${(Math.floor((vOdoNum || 0) / 40000) + 1) * 40000} km.

==================================================
2. FUEL & MILEAGE (EFFICIENCY, TRENDS & STATISTICS)
Total Fuel Entries: ${fuelEntriesCount}
Total Fuel Quantity: ${totalFuelQuantity} L
Total Fuel Cost: ₹${totalFuelCost.toLocaleString('en-IN')}
Latest Fuel Odometer: ${latestFuelOdo}
Latest Mileage: ${fuelMetrics.latestMileageLabel}
Average Mileage: ${fuelMetrics.averageMileageLabel}
Mileage Trend: ${mileageTrendStatement}
Fuel Cost Trend: ${fuelCostTrendNote}
`;

  if (sortedFuelByDateDesc.length > 0) {
    ctx += `Recent Fuel Fill-ups:
`;
    sortedFuelByDateDesc.slice(0, 4).forEach((f, idx) => {
      const parsedLitres = Number(f.litres);
      const parsedCost = Number(f.totalCost);
      let pplStr = 'N/A';
      if (parsedLitres > 0 && !isNaN(parsedCost) && parsedCost >= 0) {
        pplStr = `₹${(Math.round((parsedCost / parsedLitres) * 100) / 100).toFixed(2).replace(/\.00$/, '')}/L`;
      } else if (f.pricePerLitre) {
        pplStr = `₹${Number(f.pricePerLitre).toFixed(2).replace(/\.00$/, '')}/L`;
      }
      ctx += `${idx + 1}. Date: ${formatDate(f.fuelDate)} | Odo: ${f.odometer !== undefined && f.odometer !== null ? `${Number(f.odometer).toLocaleString('en-IN')} km` : 'N/A'} | Litres: ${f.litres || 'N/A'} | Rate: ${pplStr} | Cost: ₹${Number(f.totalCost || 0).toLocaleString('en-IN')}\n`;
    });
  }

  ctx += `\n==================================================
3. EXPENSES (BREAKDOWN, TRENDS & COMPARISONS)
Total Recorded Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
Highest Spending Category: ${highestExpenseCategory ? `${highestExpenseCategory} (₹${highestExpenseAmount.toLocaleString('en-IN')})` : 'None recorded'}
Expense Trend: ${expenseTrendStatement}
Cross-Category Comparison:
- Fuel Spending: ₹${fuelRecordedExpense.toLocaleString('en-IN')}
- Service Spending: ₹${serviceRecordedExpense.toLocaleString('en-IN')}
- Difference: ${fuelRecordedExpense > serviceRecordedExpense ? `Fuel spending exceeds service spending by ₹${(fuelRecordedExpense - serviceRecordedExpense).toLocaleString('en-IN')}` : serviceRecordedExpense > fuelRecordedExpense ? `Service spending exceeds fuel spending by ₹${(serviceRecordedExpense - fuelRecordedExpense).toLocaleString('en-IN')}` : 'Fuel and service spending are equal'}
`;

  const catEntries = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);
  if (catEntries.length > 0) {
    ctx += `Spending by Category:
`;
    catEntries.forEach(([cat, amt]) => {
      const pct = totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(1) : '0';
      ctx += `- ${cat}: ₹${amt.toLocaleString('en-IN')} (${pct}%)\n`;
    });
  }

  if (monthlyExpenseList.length > 0) {
    ctx += `Monthly Spending Breakdown (Chronological):
`;
    monthlyExpenseList.forEach((m) => {
      ctx += `- ${m.label}: ₹${m.amount.toLocaleString('en-IN')}\n`;
    });
  }

  ctx += `\n==================================================
4. COST FORECASTING (ESTIMATES & BUDGETING)
Status: ${isForecastingViable ? 'Sufficient historical records available for rough estimation' : 'Insufficient historical records for reliable estimation'}
Estimated Monthly Fuel: ${isForecastingViable ? `~₹${estimatedMonthlyFuel.toLocaleString('en-IN')}` : 'Insufficient data'}
Estimated Monthly Service: ${isForecastingViable ? `~₹${estimatedMonthlyService.toLocaleString('en-IN')}` : 'Insufficient data'}
Estimated Monthly Other/Compliance: ${isForecastingViable ? `~₹${estimatedMonthlyOther.toLocaleString('en-IN')}` : 'Insufficient data'}
Estimated Total Monthly Vehicle Budget: ${isForecastingViable ? `~₹${estimatedTotalMonthlyBudget.toLocaleString('en-IN')}` : 'Insufficient data'}
Estimated Annual Vehicle Expense: ${isForecastingViable ? `~₹${(estimatedTotalMonthlyBudget * 12).toLocaleString('en-IN')}` : 'Insufficient data'}
Forecasting Notice: These values are rough statistical estimates based on past user logs in AutoCare, not guaranteed predictions.

==================================================
5. DOCUMENTS & LEGAL COMPLIANCE (INTELLIGENCE & AUDIT)
Total Documents on Record: ${documents.length}
Compliance Checklist:
- Insurance: ${hasInsurance ? (insuranceDoc?.status === 'Expired' ? 'EXPIRED' : insuranceDoc?.status === 'Expiring Soon' ? `EXPIRING SOON (${insuranceDoc.label})` : 'Valid') : 'NOT RECORDED IN AUTOCARE'}
- PUC (Pollution Certificate): ${hasPUC ? (pucDoc?.status === 'Expired' ? 'EXPIRED' : pucDoc?.status === 'Expiring Soon' ? `EXPIRING SOON (${pucDoc.label})` : 'Valid') : 'NOT RECORDED IN AUTOCARE'}
- RC (Registration): ${hasRC ? (rcDoc?.status === 'Expired' ? 'EXPIRED' : 'Valid') : 'NOT RECORDED IN AUTOCARE'}

Documents Stored Metadata:
`;
  if (docList.length === 0) {
    ctx += `No documents recorded for this vehicle in AutoCare.\n`;
  } else {
    for (const d of docList) {
      ctx += `- ${d.type} (Doc #: ${d.number || 'N/A'}): Issued: ${d.issueDate} | Expiry: ${d.expiryDate} | Status: ${d.status} (${d.label})${d.notes ? ` | Notes: ${d.notes}` : ''}\n`;
    }
  }

  ctx += `Storage Notice: Digital scanned file images/PDFs are not accessible in this project; intelligence is derived exclusively from stored document metadata.

==================================================
6. REMINDERS & SCHEDULE (DEDUPLICATED)
Active Reminders: ${activeReminders.length} (Overdue: ${overdueReminders.length}, Due Soon: ${dueSoonReminders.length}, Upcoming: ${upcomingReminders.length})
Completed Reminders: ${completedCount}
Notice: Overlapping document expiry reminders have been deduplicated to prevent double counting.
`;

  if (activeReminders.length > 0) {
    ctx += `Active Reminder List:
`;
    for (const r of activeReminders) {
      ctx += `- [${r.dynamicStatus.toUpperCase()}] ${r.title} | Due: ${r.dueDate} | ${r.label}\n`;
    }
  } else {
    ctx += `No pending reminders.\n`;
  }

  ctx += `\n==================================================
7. TRIP READINESS ASSESSMENT & PRE-TRIP AUDIT
Trip Readiness Status Summary:
- Legal Documents: ${tripLegalValid ? '✓ Insurance is valid' : '⚠ Insurance expired or not recorded'} | ${tripPucValid ? '✓ PUC is valid' : '⚠ PUC missing or expired'} | ${tripRcValid ? '✓ RC is recorded' : '⚠ RC missing'}
- Maintenance Readiness: ${overdueReminders.length === 0 ? '✓ No overdue maintenance tasks' : `⚠ ${overdueReminders.length} overdue task(s)`} | Last service: ${latestService ? `${distanceSinceLastService} ago` : 'No service record'}
- Fuel Efficiency: ${fuelMetrics.latestMileageLabel} (Range estimate available from odometer and fill-up logs)
- Essential Pre-Trip Physical Checks Checklist:
  1. Tyres: Verify tyre pressure (including spare tyre) and inspect tread depth.
  2. Battery: Inspect battery terminals, starting crank, and charge.
  3. Fluid Levels: Check engine oil level, coolant level, brake fluid, and windshield washer fluid.
  4. Lights & Visibility: Test headlights, high beams, brake lights, turn indicators, and wiper blades.
  5. Emergency Kit: Ensure jack, wheel wrench, warning triangle, and first aid kit are in the vehicle.
Safety Disclaimer: AutoCare digital records provide management insights and cannot replace a physical pre-trip vehicle inspection.

==================================================
8. CONFIDENCE RATINGS & DEEP MANAGEMENT ANALYSIS
Confidence Classification:
- HIGH CONFIDENCE: Odometer reading (${vOdo}), recorded service history (${serviceCount} records), document expiry dates, fuel fill-ups (${fuelEntriesCount} entries), recorded expenses (₹${totalExpenses.toLocaleString('en-IN')}).
- MEDIUM CONFIDENCE: Inferred mileage trend (${fuelEntriesCount >= 3 ? 'Supported by 3+ entries' : 'Insufficient entries'}), estimated monthly expense forecast.
- INSUFFICIENT DATA: Areas not recorded in AutoCare (${!hasBatteryService ? 'Battery history missing, ' : ''}${!hasTyreService ? 'Tyre rotation history missing, ' : ''}${!hasPUC ? 'PUC missing, ' : ''}OEM manufacturer maintenance schedule tables).
Health Boundary: No medical-style mechanical health scores are provided. AutoCare documents vehicle management records; physical inspection is required for mechanical diagnosis.

==================================================
9. PRIORITIZED ACTIONABLE RECOMMENDATIONS
`;
  if (prioritizedRecommendations.length > 0) {
    prioritizedRecommendations.forEach((item, idx) => {
      ctx += `${idx + 1}. ${item}\n`;
    });
  } else {
    ctx += `All recorded documents are valid and no reminders are overdue or due soon.\n`;
  }

  ctx += `\nOEM Schedule Disclaimer: AutoCare records user data and does not have manufacturer service interval specifications stored. Users must consult the vehicle's official owner's manual for manufacturer-recommended service schedules.\n`;

  return ctx;
}

// Helpers: Parse Firestore REST values
function parseFirestoreValue(valueObj: any): any {
  if (!valueObj || typeof valueObj !== 'object') return valueObj;
  if ('stringValue' in valueObj) return valueObj.stringValue;
  if ('integerValue' in valueObj) return parseInt(valueObj.integerValue, 10);
  if ('doubleValue' in valueObj) return parseFloat(valueObj.doubleValue);
  if ('booleanValue' in valueObj) return valueObj.booleanValue;
  if ('timestampValue' in valueObj) return valueObj.timestampValue;
  if ('nullValue' in valueObj) return null;
  if ('mapValue' in valueObj) {
    const res: Record<string, any> = {};
    const fields = valueObj.mapValue.fields || {};
    for (const k in fields) {
      res[k] = parseFirestoreValue(fields[k]);
    }
    return res;
  }
  if ('arrayValue' in valueObj) {
    return (valueObj.arrayValue.values || []).map(parseFirestoreValue);
  }
  return valueObj;
}

function parseFirestoreDoc(doc: any): any {
  if (!doc || !doc.fields) return null;
  const res: Record<string, any> = {
    id: doc.name?.split('/').pop() || '',
  };
  for (const k in doc.fields) {
    res[k] = parseFirestoreValue(doc.fields[k]);
  }
  return res;
}

// Verify Firebase ID token using Google Identity Toolkit
async function verifyUserToken(idToken: string): Promise<string | null> {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.users?.[0]?.localId || null;
  } catch (err) {
    console.error('Error verifying Firebase ID token with Identity Toolkit:', err);
    return null;
  }
}

// Query Firestore collection for a user and vehicle via REST
async function fetchUserVehicleCollection(
  collectionName: string,
  userId: string,
  vehicleId: string,
  idToken: string
): Promise<any[]> {
  try {
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents:runQuery`;

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: collectionName }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'userId' },
                  op: 'EQUAL',
                  value: { stringValue: userId },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'vehicleId' },
                  op: 'EQUAL',
                  value: { stringValue: vehicleId },
                },
              },
            ],
          },
        },
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(queryBody),
    });

    if (!res.ok) return [];

    const json = await res.json();
    const docs: any[] = [];
    if (Array.isArray(json)) {
      for (const item of json) {
        if (item.document) {
          const parsed = parseFirestoreDoc(item.document);
          if (parsed) docs.push(parsed);
        }
      }
    }
    return docs;
  } catch (err) {
    console.warn(`Firestore REST query failed for ${collectionName}:`, err);
    return [];
  }
}

// Fetch single vehicle doc from Firestore via REST
async function fetchVehicleDoc(vehicleId: string, idToken: string): Promise<any | null> {
  try {
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/vehicles/${vehicleId}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!res.ok) return null;
    const json = await res.json();
    return parseFirestoreDoc(json);
  } catch (err) {
    console.warn('Firestore REST fetch failed for vehicle:', err);
    return null;
  }
}

// Secure server-side endpoint for Gemini requests with Vehicle Data Integration
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, vehicleId, clientVehicleData } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message must not be empty.' });
    }

    // 1. Authenticated User Isolation
    // Extract ID token from Authorization header or body
    const authHeader = req.headers.authorization;
    const idToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.body.idToken;

    if (!idToken) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in to ask about your vehicles.',
      });
    }

    // Verify token cryptographically with Firebase Auth (Google Identity Toolkit)
    const authenticatedUid = await verifyUserToken(idToken);
    if (!authenticatedUid) {
      return res.status(401).json({
        error: 'Invalid authentication session. Please sign in again.',
      });
    }

    // 2. Active Vehicle Isolation
    if (!vehicleId || typeof vehicleId !== 'string') {
      return res.json({
        response: 'Please select a vehicle before asking about vehicle records.',
      });
    }

    // Retrieve and verify vehicle ownership
    let vehicle = await fetchVehicleDoc(vehicleId, idToken);

    // Fallback verification against client-provided record if REST was unavailable
    if (!vehicle && clientVehicleData?.vehicle) {
      if (
        clientVehicleData.vehicle.id === vehicleId &&
        clientVehicleData.vehicle.userId === authenticatedUid
      ) {
        vehicle = clientVehicleData.vehicle;
      }
    }

    // If vehicle does not exist or does not belong to the authenticated user, reject immediately
    if (!vehicle || vehicle.userId !== authenticatedUid) {
      return res.status(403).json({
        error: 'Selected vehicle not found or does not belong to your account.',
      });
    }

    // 3. Retrieve Vehicle Collections strictly scoped by userId and vehicleId
    // Optimization: Parallelize collection requests instead of sequential blocking calls
    let documents: any[] = [];
    let services: any[] = [];
    let fuelRecords: any[] = [];
    let expenses: any[] = [];
    let reminders: any[] = [];

    // If client vehicle data is complete and authentic, use it directly to bypass 5 sequential/parallel REST calls
    const hasClientCollections =
      clientVehicleData &&
      Array.isArray(clientVehicleData.documents) &&
      Array.isArray(clientVehicleData.services) &&
      Array.isArray(clientVehicleData.fuelRecords) &&
      Array.isArray(clientVehicleData.expenses) &&
      Array.isArray(clientVehicleData.reminders);

    if (hasClientCollections) {
      documents = clientVehicleData.documents.filter(
        (d: any) => d.userId === authenticatedUid && d.vehicleId === vehicleId
      );
      services = clientVehicleData.services.filter(
        (s: any) => s.userId === authenticatedUid && s.vehicleId === vehicleId
      );
      fuelRecords = clientVehicleData.fuelRecords.filter(
        (f: any) => f.userId === authenticatedUid && f.vehicleId === vehicleId
      );
      expenses = clientVehicleData.expenses.filter(
        (e: any) => e.userId === authenticatedUid && e.vehicleId === vehicleId
      );
      reminders = clientVehicleData.reminders.filter(
        (r: any) => r.userId === authenticatedUid && (r.vehicleId === vehicleId || !r.vehicleId)
      );
    } else {
      // Parallelize Firestore REST requests
      const [docsRes, servRes, fuelRes, expRes, remRes] = await Promise.all([
        fetchUserVehicleCollection('documents', authenticatedUid, vehicleId, idToken),
        fetchUserVehicleCollection('serviceRecords', authenticatedUid, vehicleId, idToken),
        fetchUserVehicleCollection('fuelRecords', authenticatedUid, vehicleId, idToken),
        fetchUserVehicleCollection('expenses', authenticatedUid, vehicleId, idToken),
        fetchUserVehicleCollection('reminders', authenticatedUid, vehicleId, idToken),
      ]);
      documents = docsRes;
      services = servRes;
      fuelRecords = fuelRes;
      expenses = expRes;
      reminders = remRes;
    }

    // Build structured, read-only vehicle context string
    const vehicleContextText = buildVehicleContextString({
      vehicle,
      documents,
      services,
      fuelRecords,
      expenses,
      reminders,
    });

    // Check Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not configured in server environment.');
      return res.status(503).json({
        unconfigured: true,
        response: 'AutoCare AI is not connected yet. Please configure the Gemini API connection.',
      });
    }

    const ai = getCachedGenAI(apiKey);

    // Build conversation context from past turns
    const rawTurns: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      const recentHistory = history.slice(-6);
      for (const item of recentHistory) {
        if (
          item &&
          item.text &&
          typeof item.text === 'string' &&
          (item.role === 'user' || item.role === 'model' || item.role === 'assistant')
        ) {
          rawTurns.push({
            role: item.role === 'assistant' ? 'model' : item.role,
            parts: [{ text: String(item.text).trim() }],
          });
        }
      }
    }

    rawTurns.push({
      role: 'user',
      parts: [{ text: message.trim() }],
    });

    // Ensure valid turn alternation (user -> model -> user) for Gemini API
    const formattedContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    for (const turn of rawTurns) {
      if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === turn.role) {
        formattedContents[formattedContents.length - 1].parts[0].text += `\n${turn.parts[0].text}`;
      } else {
        formattedContents.push(turn);
      }
    }
    while (formattedContents.length > 0 && formattedContents[0].role === 'model') {
      formattedContents.shift();
    }
    if (formattedContents.length === 0) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: message.trim() }],
      });
    }

    // Combine system instructions with the dynamic vehicle context
    const fullSystemInstruction = `${AUTOCARE_SYSTEM_INSTRUCTION}

==================================================
CURRENT ACTIVE VEHICLE DATA CONTEXT
==================================================
${vehicleContextText}
==================================================`;

    // Call Gemini using flash model with low temperature for factual precision and fallback
    let reply = '';
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: formattedContents,
          config: {
            systemInstruction: fullSystemInstruction,
            temperature: 0.2,
            maxOutputTokens: 600,
          },
        });
        reply = result.text || 'I apologize, but I could not formulate a response. Please try again.';
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini model ${modelName} failed:`, err?.message || err);
      }
    }

    if (!reply) {
      if (lastError?.message?.includes('resource_exhausted') || lastError?.message?.includes('quota') || lastError?.status === 429) {
        return res.json({
          response: 'AutoCare AI is currently handling a peak volume of queries. Please try your request again in a minute.',
        });
      }
      throw lastError || new Error('No response from AI model');
    }

    // Optional TTS generation if speak was requested
    let audioBase64: string | null = null;
    if (req.body.speak && reply) {
      try {
        const cleanSpeechText = reply
          .replace(/[*#_`~]/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
          .trim()
          .slice(0, 800);

        const ttsResult = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanSpeechText,
                  speechMetadata: {
                    style: 'Friendly, professional, calm automotive female assistant',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });
        audioBase64 = ttsResult.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      } catch (ttsErr: any) {
        console.warn('Gemini TTS generation in /api/ai/chat failed (fallback available):', ttsErr?.message || ttsErr);
      }
    }

    return res.json({ response: reply, audioBase64 });
  } catch (error: any) {
    console.error('Server error handling Gemini request:', error?.message || error);
    return res.status(500).json({
      error: "Sorry, I couldn't process that request right now. Please try again.",
    });
  }
});

// Dedicated endpoint to synthesize natural AI speech for any text using Gemini TTS (voice: Kore)
app.post('/api/ai/speak', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for speech synthesis' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Gemini API key is not configured' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const cleanSpeechText = text
      .replace(/[*#_`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim()
      .slice(0, 800);

    const ttsResult = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanSpeechText,
              speechMetadata: {
                style: 'Friendly, professional, calm automotive female assistant',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioBase64 = ttsResult.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      return res.status(500).json({ error: 'Could not generate audio response' });
    }

    return res.json({ audioBase64, mimeType: 'audio/wav' });
  } catch (err: any) {
    console.error('Error in /api/ai/speak:', err?.message || err);
    return res.status(500).json({ error: 'Speech generation failed' });
  }
});

// Dedicated audio transcription fallback endpoint using gemini-3.5-transcribe
app.post('/api/ai/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Gemini API not configured' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: audioBase64,
            },
          },
          { text: 'Transcribe this vehicle or automotive question accurately. Output ONLY the recognized text with no commentary.' },
        ],
      },
    });

    const transcript = result.text?.trim() || '';
    return res.json({ transcript });
  } catch (err: any) {
    console.error('Error in /api/ai/transcribe:', err?.message || err);
    return res.status(500).json({ error: 'Audio transcription failed' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Create HTTP server instance to attach Express & WebSocketServer
  const httpServer = http.createServer(app);

  // Real-Time Gemini Live API WebSocket endpoint (/live)
  const wss = new WebSocketServer({ server: httpServer, path: '/live' });

  wss.on('connection', (clientWs: WebSocket) => {
    let liveSession: any = null;
    let isAuthenticated = false;

    clientWs.on('message', async (data: Buffer | string) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === 'setup') {
          const { idToken, vehicleContextText } = payload;
          if (!idToken) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                error: 'Authentication required. Please sign in to ask about your vehicles.',
                category: 'AUTH_REQUIRED',
                status: 401,
              })
            );
            clientWs.close(4401, 'Authentication required');
            return;
          }

          const uid = await verifyUserToken(idToken);
          if (!uid) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                error: 'Invalid or expired authentication session. Please sign in again.',
                category: 'AUTH_INVALID',
                status: 401,
              })
            );
            clientWs.close(4401, 'Invalid authentication session');
            return;
          }

          isAuthenticated = true;

          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                error: 'Gemini API key is not configured on the server.',
                category: 'API_KEY_MISSING',
                status: 500,
              })
            );
            clientWs.close(4500, 'Gemini API not configured');
            return;
          }

          const ai = getCachedGenAI(apiKey);

          // Connect to Gemini Live API using model gemini-3.8-live
          const livePrompt = `You are AutoCare AI, the conversational, warm voice co-pilot inside AutoCare.
Keep responses concise, conversational, and direct (1-3 sentences) suitable for hands-free listening while driving or checking vehicles.
You have read-only access to the user's active vehicle data:
${vehicleContextText || 'Active vehicle selected.'}
Current odometer is valid even if 0 km. Never invent unrecorded numbers.`;

          try {
            liveSession = await ai.live.connect({
              model: 'gemini-3.8-live',
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: payload.voiceName || 'Zephyr' },
                  },
                },
                systemInstruction: livePrompt,
                outputAudioTranscription: {},
                inputAudioTranscription: {},
              },
              callbacks: {
                onmessage: (message: LiveServerMessage) => {
                  if (clientWs.readyState !== WebSocket.OPEN) return;

                  // Stream 24kHz audio chunks to client
                  const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                  if (audio) {
                    clientWs.send(JSON.stringify({ audio }));
                  }

                  // Stream user input transcription
                  const userText =
                    message.serverContent?.interimInputTranscription?.text ||
                    message.serverContent?.inputTranscription?.text;
                  if (userText) {
                    clientWs.send(
                      JSON.stringify({
                        speaker: 'user',
                        transcript: userText,
                        isFinal: Boolean(message.serverContent?.inputTranscription?.text),
                      })
                    );
                  }

                  // Stream model output transcription
                  const modelText = message.serverContent?.outputTranscription?.text;
                  if (modelText) {
                    clientWs.send(
                      JSON.stringify({
                        speaker: 'model',
                        transcript: modelText,
                      })
                    );
                  }

                  // Handle barge-in / interruption
                  if (message.serverContent?.interrupted) {
                    clientWs.send(JSON.stringify({ interrupted: true }));
                  }

                  // Handle turn completion
                  if (message.serverContent?.turnComplete) {
                    clientWs.send(JSON.stringify({ type: 'turn_complete' }));
                  }
                },
                onclose: (ev: any) => {
                  if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'session_closed',
                        code: ev?.code,
                        reason: ev?.reason,
                      })
                    );
                  }
                },
                onerror: (err: any) => {
                  const rawMsg = err?.message || String(err);
                  const isPermission = rawMsg.includes('403') || rawMsg.includes('PERMISSION_DENIED');
                  console.warn('Gemini Live session error:', { message: rawMsg });
                  if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'error',
                        error: isPermission
                          ? 'Gemini Live permission denied (403).'
                          : `Gemini Live error: ${rawMsg}`,
                        category: isPermission ? 'GEMINI_PERMISSION_DENIED' : 'LIVE_SESSION_ERROR',
                        status: isPermission ? 403 : 500,
                      })
                    );
                  }
                },
              },
            });

            clientWs.send(JSON.stringify({ type: 'ready' }));
          } catch (connErr: any) {
            const rawMsg = connErr?.message || String(connErr);
            const isPermission = rawMsg.includes('403') || rawMsg.includes('PERMISSION_DENIED');
            const category = isPermission ? 'GEMINI_PERMISSION_DENIED' : 'LIVE_CONNECTION_FAILED';
            console.error('Failed to connect to Gemini Live API:', {
              message: rawMsg,
              category,
            });
            clientWs.send(
              JSON.stringify({
                type: 'error',
                error: isPermission
                  ? 'Gemini Live API permission denied (403). Check API key permissions for Gemini Live.'
                  : `Could not connect to Gemini Live: ${rawMsg}`,
                category,
                status: isPermission ? 403 : 500,
              })
            );
            clientWs.close(isPermission ? 4403 : 4500, 'Gemini Live connect failed');
          }
        } else if (payload.type === 'audio' && isAuthenticated && liveSession) {
          // Stream 16kHz PCM audio chunk to Gemini Live session
          if (payload.audio) {
            liveSession.sendRealtimeInput({
              audio: {
                data: payload.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          }
        } else if (payload.type === 'text' && isAuthenticated && liveSession && payload.text) {
          liveSession.sendRealtimeInput({
            text: payload.text,
          });
        } else if (payload.type === 'ping') {
          clientWs.send(JSON.stringify({ type: 'pong' }));
        } else if (payload.type === 'end') {
          if (liveSession) {
            try {
              liveSession.close?.();
            } catch {}
            liveSession = null;
          }
        }
      } catch (err: any) {
        console.warn('Error handling WebSocket message in /live:', err?.message || err);
      }
    });

    clientWs.on('error', (wsErr) => {
      console.warn('WebSocket client error:', wsErr?.message || wsErr);
    });

    clientWs.on('close', () => {
      if (liveSession) {
        try {
          liveSession.close?.();
        } catch {}
        liveSession = null;
      }
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoCare server running on http://0.0.0.0:${PORT} (Express + WebSocket Live API)`);
  });
}

startServer();
