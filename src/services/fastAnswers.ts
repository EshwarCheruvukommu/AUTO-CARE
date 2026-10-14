// AutoCare Fast Intent Classifier & Direct Answer Engine
// Optimizes simple factual questions to respond near-instantly without heavy AI pipelines,
// while preserving vehicle isolation, 0 km handling, and fallback for reasoning queries.

import { Vehicle, VehicleDocument, ServiceRecord, FuelRecord, ExpenseRecord, VehicleReminder } from '../types';
import { formatDate, formatCurrency, getDocumentStatus, getReminderStatus } from '../utils/formatters';

export type QuestionIntent =
  | 'ODOMETER'
  | 'VEHICLE_IDENTITY'
  | 'REGISTRATION'
  | 'FUEL_TYPE'
  | 'LAST_SERVICE'
  | 'NEXT_SERVICE'
  | 'SERVICE_COST'
  | 'SERVICE_COUNT'
  | 'LAST_FUEL'
  | 'FUEL_SPENT'
  | 'AVERAGE_MILEAGE'
  | 'TOTAL_EXPENSES'
  | 'LATEST_EXPENSE'
  | 'DOCUMENT_EXPIRY'
  | 'DOCUMENT_LIST'
  | 'REMINDERS'
  | 'REASONING'; // Full AI analysis, trip readiness, recommendations, etc.

export interface FastAnswerContext {
  vehicle: Vehicle;
  documents: VehicleDocument[];
  services: ServiceRecord[];
  fuelRecords: FuelRecord[];
  expenses: ExpenseRecord[];
  reminders: VehicleReminder[];
}

export function classifyQuestionIntent(rawMessage: string): QuestionIntent {
  const q = rawMessage.toLowerCase().trim();

  // 1. ODOMETER
  if (
    q.includes('odometer') ||
    q.includes('current km') ||
    q.includes('current mileage reading') ||
    q.includes('how many km driven') ||
    q.includes('how many kilometers has') ||
    q.includes('reading on my odometer')
  ) {
    return 'ODOMETER';
  }

  // 2. VEHICLE IDENTITY
  if (
    q.includes('what vehicle') ||
    q.includes('which vehicle') ||
    q.includes('what car am i using') ||
    q.includes('active vehicle') ||
    q.includes('current car') ||
    q.includes('what model') ||
    q.includes('what brand')
  ) {
    return 'VEHICLE_IDENTITY';
  }

  // 3. REGISTRATION NUMBER
  if (
    q.includes('registration number') ||
    q.includes('vehicle registration') ||
    q.includes('registration plate') ||
    q.includes('license plate') ||
    q.includes('number plate') ||
    q.includes('reg number') ||
    q.includes('vehicle number')
  ) {
    return 'REGISTRATION';
  }

  // 4. FUEL TYPE
  if (
    q.includes('what fuel does') ||
    q.includes('what fuel type') ||
    q.includes('fuel my vehicle use') ||
    q.includes('petrol or diesel') ||
    q.includes('cng or petrol') ||
    q.includes('does it take petrol') ||
    q.includes('is it electric')
  ) {
    return 'FUEL_TYPE';
  }

  // 5. SERVICE QUESTIONS
  if (
    q.includes('last service cost') ||
    q.includes('how much did my last service cost') ||
    q.includes('cost of my last service')
  ) {
    return 'SERVICE_COST';
  }

  if (
    q.includes('last service') ||
    q.includes('most recent service') ||
    q.includes('previous service') ||
    q.includes('serviced last') ||
    q.includes('latest service')
  ) {
    return 'LAST_SERVICE';
  }

  if (
    q.includes('next service') ||
    q.includes('when is my service due') ||
    q.includes('service due next') ||
    q.includes('service due date')
  ) {
    return 'NEXT_SERVICE';
  }

  if (
    q.includes('how many services') ||
    q.includes('total services') ||
    q.includes('service count') ||
    q.includes('number of services')
  ) {
    return 'SERVICE_COUNT';
  }

  // 6. FUEL QUESTIONS
  if (
    q.includes('last fuel') ||
    q.includes('last refuel') ||
    q.includes('latest fuel entry') ||
    q.includes('most recent refuel') ||
    q.includes('last fill up')
  ) {
    return 'LAST_FUEL';
  }

  if (
    q.includes('how much did i spend on fuel') ||
    q.includes('spend on fuel') ||
    q.includes('total fuel cost') ||
    q.includes('fuel expenditure') ||
    q.includes('fuel spend')
  ) {
    return 'FUEL_SPENT';
  }

  if (
    q.includes('average mileage') ||
    q.includes('avg mileage') ||
    q.includes('fuel economy') ||
    q.includes('km per litre') ||
    q.includes('km/l')
  ) {
    return 'AVERAGE_MILEAGE';
  }

  // 7. EXPENSES
  if (
    q.includes('how much have i spent') ||
    q.includes('total expenses') ||
    q.includes('total spend') ||
    q.includes('total spent') ||
    q.includes('all expenses')
  ) {
    return 'TOTAL_EXPENSES';
  }

  if (
    q.includes('latest expense') ||
    q.includes('last expense') ||
    q.includes('recent expense') ||
    q.includes('most recent expense')
  ) {
    return 'LATEST_EXPENSE';
  }

  // 8. DOCUMENTS
  if (
    q.includes('which document expires') ||
    q.includes('when does my insurance expire') ||
    q.includes('insurance expire') ||
    q.includes('puc expire') ||
    q.includes('document expiring')
  ) {
    return 'DOCUMENT_EXPIRY';
  }

  if (
    q.includes('what documents') ||
    q.includes('which documents') ||
    q.includes('my documents') ||
    q.includes('all documents')
  ) {
    return 'DOCUMENT_LIST';
  }

  // 9. REMINDERS
  if (
    q.includes('what reminders') ||
    q.includes('any reminders') ||
    q.includes('what is due next') ||
    q.includes('overdue reminders') ||
    q.includes('due reminders')
  ) {
    return 'REMINDERS';
  }

  return 'REASONING';
}

/**
 * Attempts to resolve deterministic factual queries directly from active vehicle state in under 5ms.
 * Returns null if the question requires Gemini AI reasoning or complex inference.
 */
export function getFastDirectAnswer(
  intent: QuestionIntent,
  ctx: FastAnswerContext
): string | null {
  const { vehicle, documents, services, fuelRecords, expenses, reminders } = ctx;

  const vName = vehicle.name || `${vehicle.brand} ${vehicle.model}`;
  const vReg = vehicle.vehicleNumber || 'Unregistered';

  switch (intent) {
    case 'ODOMETER': {
      const odo = vehicle.currentOdometer;
      if (odo !== undefined && odo !== null && !isNaN(Number(odo))) {
        const odoNum = Number(odo);
        return `Your current odometer reading for ${vName} (${vReg}) is ${odoNum.toLocaleString('en-IN')} km.`;
      }
      return `There is currently no odometer reading recorded for ${vName} (${vReg}). You can update it anytime in the Dashboard or Vehicle section.`;
    }

    case 'VEHICLE_IDENTITY': {
      const parts = [
        vehicle.brand,
        vehicle.model,
        vehicle.variant ? `(${vehicle.variant})` : '',
      ].filter(Boolean).join(' ');
      return `You are currently viewing ${vName} — a ${parts || 'vehicle'} registered as ${vReg} (${vehicle.fuelType || 'Unspecified'} fuel).`;
    }

    case 'REGISTRATION': {
      return `The registration number for your active vehicle (${vName}) is ${vReg}.`;
    }

    case 'FUEL_TYPE': {
      const fuel = vehicle.fuelType || 'not specified';
      return `Your active vehicle (${vName}) uses ${fuel}.`;
    }

    case 'LAST_SERVICE': {
      if (services.length === 0) {
        return `No service records are currently logged for ${vName} (${vReg}). You can log one anytime in the Service & Maintenance section.`;
      }
      const sorted = [...services].sort((a, b) => {
        const timeA = new Date(a.serviceDate || (a as any).date || 0).getTime();
        const timeB = new Date(b.serviceDate || (b as any).date || 0).getTime();
        return timeB - timeA;
      });
      const last = sorted[0];
      const dateStr = formatDate(last.serviceDate || (last as any).date || '');
      const costStr = formatCurrency(last.cost || 0);
      const centerStr = last.serviceCenter ? ` at ${last.serviceCenter}` : '';
      const odoStr = last.odometer ? ` at ${Number(last.odometer).toLocaleString('en-IN')} km` : '';
      return `Your last service was ${last.serviceType} on ${dateStr}${odoStr}${centerStr}, costing ${costStr}.`;
    }

    case 'SERVICE_COST': {
      if (services.length === 0) {
        return `No service records have been logged yet for ${vName}.`;
      }
      const sorted = [...services].sort((a, b) => {
        const timeA = new Date(a.serviceDate || (a as any).date || 0).getTime();
        const timeB = new Date(b.serviceDate || (b as any).date || 0).getTime();
        return timeB - timeA;
      });
      const last = sorted[0];
      const dateStr = formatDate(last.serviceDate || (last as any).date || '');
      return `Your last service (${last.serviceType} on ${dateStr}) cost ${formatCurrency(last.cost || 0)}.`;
    }

    case 'SERVICE_COUNT': {
      const count = services.length;
      if (count === 0) {
        return `You have 0 service records logged for ${vName}.`;
      }
      const totalSpend = services.reduce((acc, s) => acc + (Number(s.cost) || 0), 0);
      return `You have logged ${count} service record${count > 1 ? 's' : ''} for ${vName}, totaling ${formatCurrency(totalSpend)} in maintenance.`;
    }

    case 'NEXT_SERVICE': {
      // Check reminders first
      const pendingReminders = reminders
        .filter((r) => r.status !== 'Completed' && (r.reminderType === 'Service' || r.reminderType === 'Maintenance' || r.reminderType === 'General' || r.reminderType === 'Oil Change'))
        .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

      if (pendingReminders.length > 0) {
        const next = pendingReminders[0];
        const status = getReminderStatus(next.dueDate, next.status);
        return `Your next scheduled service reminder is "${next.title}", due on ${formatDate(next.dueDate)} (${status.label}).`;
      }

      // Check preventive mileage intervals (10,000 km standard)
      const currentOdo = Number(vehicle.currentOdometer || 0);
      const nextMilestone = (Math.floor(currentOdo / 10000) + 1) * 10000;
      const kmRemaining = nextMilestone - currentOdo;
      return `Based on standard 10,000 km intervals, your next regular service will be due around ${nextMilestone.toLocaleString('en-IN')} km (in ~${kmRemaining.toLocaleString('en-IN')} km).`;
    }

    case 'LAST_FUEL': {
      if (fuelRecords.length === 0) {
        return `No fuel entries are currently recorded for ${vName}. You can add one in the Fuel & Mileage section.`;
      }
      const sorted = [...fuelRecords].sort((a, b) => {
        const timeA = new Date(a.fuelDate || 0).getTime();
        const timeB = new Date(b.fuelDate || 0).getTime();
        return timeB - timeA;
      });
      const last = sorted[0];
      const dateStr = formatDate(last.fuelDate);
      const litresStr = last.litres ? `${last.litres} litres` : 'fill-up';
      const costStr = formatCurrency(last.totalCost || 0);
      const stationStr = last.station ? ` at ${last.station}` : '';
      return `Your last fuel entry was on ${dateStr}: ${litresStr} (${last.fuelType || 'Fuel'}) costing ${costStr}${stationStr}.`;
    }

    case 'FUEL_SPENT': {
      if (fuelRecords.length === 0) {
        return `You have not logged any fuel expenses yet for ${vName}.`;
      }
      const totalFuelCost = fuelRecords.reduce((acc, f) => acc + (Number(f.totalCost) || 0), 0);
      const totalLitres = fuelRecords.reduce((acc, f) => acc + (Number(f.litres) || 0), 0);
      return `You have spent ${formatCurrency(totalFuelCost)} on fuel across ${fuelRecords.length} entries (${totalLitres.toFixed(1)} litres total) for ${vName}.`;
    }

    case 'AVERAGE_MILEAGE': {
      if (fuelRecords.length < 2) {
        return `Calculating average mileage requires at least two consecutive fuel entries. You currently have ${fuelRecords.length} fuel record${fuelRecords.length === 1 ? '' : 's'} logged.`;
      }
      // Calculate true interval mileages
      const chronological = [...fuelRecords].sort((a, b) => {
        const timeDiff = new Date(a.fuelDate || 0).getTime() - new Date(b.fuelDate || 0).getTime();
        if (timeDiff !== 0) return timeDiff;
        return (Number(a.odometer) || 0) - (Number(b.odometer) || 0);
      });

      const validMileages: number[] = [];
      for (let i = 1; i < chronological.length; i++) {
        const dist = (Number(chronological[i].odometer) || 0) - (Number(chronological[i - 1].odometer) || 0);
        const fuel = Number(chronological[i].litres) || 0;
        if (dist > 0 && fuel > 0) {
          validMileages.push(dist / fuel);
        }
      }

      if (validMileages.length === 0) {
        return `Not enough odometer distance recorded between consecutive fuel entries to calculate mileage. Ensure positive odometers on subsequent refuels.`;
      }

      const avg = validMileages.reduce((a, b) => a + b, 0) / validMileages.length;
      const latest = validMileages[validMileages.length - 1];
      return `Your average mileage for ${vName} is ${avg.toFixed(1)} km/L (latest fill-up achieved ${latest.toFixed(1)} km/L).`;
    }

    case 'TOTAL_EXPENSES': {
      const expensesTotal = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const fuelTotal = fuelRecords.reduce((acc, f) => acc + (Number(f.totalCost) || 0), 0);
      const serviceTotal = services.reduce((acc, s) => acc + (Number(s.cost) || 0), 0);

      // Check whether fuel or services are already logged inside expenses
      const hasFuelInExpenses = expenses.some((e) => (e.category || '').toLowerCase() === 'fuel');
      const hasServiceInExpenses = expenses.some((e) => (e.category || '').toLowerCase() === 'service');

      const grandTotal =
        expensesTotal +
        (hasFuelInExpenses ? 0 : fuelTotal) +
        (hasServiceInExpenses ? 0 : serviceTotal);

      return `Total recorded expenditure for ${vName} is ${formatCurrency(grandTotal)} (${expenses.length} expense records, ${fuelRecords.length} fuel logs, and ${services.length} maintenance visits).`;
    }

    case 'LATEST_EXPENSE': {
      if (expenses.length === 0) {
        return `No general expenses are recorded yet for ${vName}.`;
      }
      const sorted = [...expenses].sort((a, b) => {
        const timeA = new Date(a.expenseDate || (a as any).date || 0).getTime();
        const timeB = new Date(b.expenseDate || (b as any).date || 0).getTime();
        return timeB - timeA;
      });
      const latest = sorted[0];
      const dateStr = formatDate(latest.expenseDate || (latest as any).date || '');
      return `Your latest expense is ${formatCurrency(latest.amount)} for "${latest.description || latest.category}" (${latest.category}) on ${dateStr}.`;
    }

    case 'DOCUMENT_EXPIRY': {
      if (documents.length === 0) {
        return `No documents (Insurance, PUC, RC) are currently stored for ${vName}. You can upload details in the Documents section.`;
      }
      // Find document with earliest expiry date
      const sortedDocs = [...documents].map((d) => {
        const st = getDocumentStatus(d.expiryDate);
        return { ...d, ...st };
      }).sort((a, b) => a.daysRemaining - b.daysRemaining);

      const earliest = sortedDocs[0];
      if (earliest.daysRemaining < 0) {
        return `Your ${earliest.type} document expired ${Math.abs(earliest.daysRemaining)} days ago on ${formatDate(earliest.expiryDate)}. It requires immediate renewal.`;
      } else if (earliest.daysRemaining <= 30) {
        return `Your ${earliest.type} document is expiring soon on ${formatDate(earliest.expiryDate)} (${earliest.daysRemaining === 0 ? 'today' : `in ${earliest.daysRemaining} days`}).`;
      } else {
        return `Your next document to expire is ${earliest.type} on ${formatDate(earliest.expiryDate)} (valid for another ${earliest.daysRemaining} days).`;
      }
    }

    case 'DOCUMENT_LIST': {
      if (documents.length === 0) {
        return `You have no vehicle documents recorded for ${vName}. Upload your Insurance, PUC, or RC to track expiries.`;
      }
      const summaryList = documents.map((d) => {
        const st = getDocumentStatus(d.expiryDate);
        return `${d.type}: ${st.status} (Expires: ${formatDate(d.expiryDate)})`;
      }).join('; ');
      return `You have ${documents.length} document${documents.length > 1 ? 's' : ''} on file for ${vName}: ${summaryList}.`;
    }

    case 'REMINDERS': {
      const pending = reminders.filter((r) => r.status !== 'Completed');
      if (pending.length === 0) {
        return `You have no active reminders or pending tasks for ${vName}. Everything is on schedule!`;
      }
      const overdue = pending.filter((r) => getReminderStatus(r.dueDate, r.status).dynamicStatus === 'Overdue');
      const dueSoon = pending.filter((r) => getReminderStatus(r.dueDate, r.status).dynamicStatus === 'Due Soon');
      const upcoming = pending.filter((r) => getReminderStatus(r.dueDate, r.status).dynamicStatus === 'Upcoming');

      const parts = [];
      if (overdue.length > 0) parts.push(`${overdue.length} overdue`);
      if (dueSoon.length > 0) parts.push(`${dueSoon.length} due soon`);
      if (upcoming.length > 0) parts.push(`${upcoming.length} upcoming`);

      const nextTask = pending.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())[0];
      return `You have ${pending.length} active reminder${pending.length > 1 ? 's' : ''} (${parts.join(', ')}). Earliest: "${nextTask.title}" due ${formatDate(nextTask.dueDate)}.`;
    }

    default:
      return null;
  }
}
