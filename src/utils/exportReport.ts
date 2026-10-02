import { Vehicle, ServiceRecord, FuelRecord, ExpenseRecord, VehicleDocument } from '../types';
import { formatCurrency, formatOdometer, formatDate } from './formatters';

/**
 * Downloads a string payload as a client-side file.
 */
function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export vehicle service records to CSV spreadsheet.
 */
export function exportServicesToCSV(vehicle: Vehicle, services: ServiceRecord[]) {
  const headers = ['Date', 'Service Type', 'Odometer (KM)', 'Cost (INR)', 'Service Center', 'Work Performed', 'Notes'];
  const rows = services.map((s) => [
    `"${s.serviceDate || (s as any).date || ''}"`,
    `"${s.serviceType || ''}"`,
    `"${s.odometer || 0}"`,
    `"${s.cost || 0}"`,
    `"${(s.serviceCenter || '').replace(/"/g, '""')}"`,
    `"${(s.description || (s as any).workPerformed || '').replace(/"/g, '""')}"`,
    `"${(s.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const fileName = `${vehicle.name.replace(/\s+/g, '_')}_Services_${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}

/**
 * Export vehicle fuel logs to CSV spreadsheet.
 */
export function exportFuelToCSV(vehicle: Vehicle, fuelRecords: FuelRecord[]) {
  const headers = ['Date', 'Fuel Type', 'Odometer (KM)', 'Litres', 'Price Per Litre', 'Total Cost (INR)', 'Station', 'Notes'];
  const rows = fuelRecords.map((f) => [
    `"${f.fuelDate || ''}"`,
    `"${f.fuelType || ''}"`,
    `"${f.odometer || 0}"`,
    `"${f.litres || ''}"`,
    `"${f.pricePerLitre || ''}"`,
    `"${f.totalCost || 0}"`,
    `"${(f.station || '').replace(/"/g, '""')}"`,
    `"${(f.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const fileName = `${vehicle.name.replace(/\s+/g, '_')}_Fuel_${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}

/**
 * Export vehicle expenses to CSV spreadsheet.
 */
export function exportExpensesToCSV(vehicle: Vehicle, expenses: ExpenseRecord[]) {
  const headers = ['Date', 'Category', 'Amount (INR)', 'Description', 'Vendor', 'Notes'];
  const rows = expenses.map((e) => [
    `"${e.expenseDate || (e as any).date || ''}"`,
    `"${e.category || ''}"`,
    `"${e.amount || 0}"`,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    `"${(e.vendor || '').replace(/"/g, '""')}"`,
    `"${(e.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const fileName = `${vehicle.name.replace(/\s+/g, '_')}_Expenses_${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}

/**
 * Export complete vehicle data snapshot as JSON backup.
 */
export function exportVehicleDataJSON(
  vehicle: Vehicle,
  services: ServiceRecord[],
  fuelRecords: FuelRecord[],
  expenses: ExpenseRecord[],
  documents: VehicleDocument[]
) {
  const payload = {
    exportDate: new Date().toISOString(),
    generator: 'AutoCare Vehicle Personal Maintenance Manager',
    vehicle,
    services,
    fuelRecords,
    expenses,
    documents,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const fileName = `${vehicle.name.replace(/\s+/g, '_')}_Full_Backup_${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(jsonStr, fileName, 'application/json');
}

/**
 * Export full authenticated user data snapshot as AutoCare_Backup_YYYY-MM-DD.json
 */
export function exportFullAccountBackupJSON(data: {
  userEmail?: string | null;
  vehicles: Vehicle[];
  services: ServiceRecord[];
  fuelRecords: FuelRecord[];
  expenses: ExpenseRecord[];
  documents: VehicleDocument[];
  reminders: any[];
  customRules: any[];
}) {
  const payload = {
    exportDate: new Date().toISOString(),
    generator: "AutoCare — Your Vehicle's Personal Maintenance Manager",
    version: '1.0',
    user: {
      email: data.userEmail || 'authenticated_user',
    },
    vehiclesCount: data.vehicles.length,
    vehicles: data.vehicles,
    servicesCount: data.services.length,
    services: data.services,
    fuelRecordsCount: data.fuelRecords.length,
    fuelRecords: data.fuelRecords,
    expensesCount: data.expenses.length,
    expenses: data.expenses,
    documentsCount: data.documents.length,
    documents: data.documents,
    remindersCount: data.reminders.length,
    reminders: data.reminders,
    customMaintenanceRulesCount: data.customRules.length,
    customMaintenanceRules: data.customRules,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `AutoCare_Backup_${dateStr}.json`;
  downloadFile(jsonStr, fileName, 'application/json');
}

/**
 * Generates and opens a printable AutoCare Vehicle Maintenance Certificate in a new window/tab.
 */
export function printVehicleMaintenanceReport(
  vehicle: Vehicle,
  services: ServiceRecord[],
  documents: VehicleDocument[],
  fuelRecords: FuelRecord[],
  expenses: ExpenseRecord[]
) {
  const totalServiceCost = services.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
  const totalFuelCost = fuelRecords.reduce((sum, f) => sum + (Number(f.totalCost) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>AutoCare Maintenance Certificate - ${vehicle.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 40px; margin: 0; line-height: 1.5; }
    .header { border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
    .badge { font-size: 11px; font-weight: bold; background: #eee; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .card { background: #f9f9f9; border: 1px solid #ddd; padding: 12px 16px; border-radius: 8px; }
    .card-label { font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; }
    .card-val { font-size: 16px; font-weight: bold; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th { background: #f0f0f0; text-align: left; padding: 8px 12px; border-bottom: 1px solid #ccc; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px 12px; border-bottom: 1px solid #eee; }
    .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 10px; color: #777; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">AUTOCARE MAINTENANCE RECORD</div>
      <div style="font-size: 12px; color: #555; margin-top: 4px;">Verified Personal Vehicle Maintenance History Certificate</div>
    </div>
    <div style="text-align: right;">
      <span class="badge">Official AutoCare Record</span>
      <div style="font-size: 11px; color: #666; margin-top: 4px;">Generated: ${formatDate(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Vehicle</div>
      <div class="card-val">${vehicle.name}</div>
      <div style="font-size: 11px; color: #666;">${vehicle.brand} ${vehicle.model}</div>
    </div>
    <div class="card">
      <div class="card-label">Registration</div>
      <div class="card-val">${vehicle.vehicleNumber}</div>
      <div style="font-size: 11px; color: #666;">Fuel: ${vehicle.fuelType}</div>
    </div>
    <div class="card">
      <div class="card-label">Recorded Odometer</div>
      <div class="card-val">${formatOdometer(vehicle.currentOdometer)}</div>
      <div style="font-size: 11px; color: #666;">Purchase: ${vehicle.purchaseDate ? formatDate(vehicle.purchaseDate) : 'N/A'}</div>
    </div>
    <div class="card">
      <div class="card-label">Maintenance Records</div>
      <div class="card-val">${services.length} Services</div>
      <div style="font-size: 11px; color: #666;">Spend: ${formatCurrency(totalServiceCost)}</div>
    </div>
  </div>

  <div class="section-title">Verified Service & Maintenance History</div>
  ${services.length === 0 ? '<p style="font-size: 12px; color: #888;">No service records logged yet.</p>' : `
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Service Type</th>
        <th>Odometer</th>
        <th>Service Center</th>
        <th>Work Performed / Notes</th>
        <th style="text-align: right;">Cost</th>
      </tr>
    </thead>
    <tbody>
      ${services.map(s => `
        <tr>
          <td>${formatDate(s.serviceDate || (s as any).date)}</td>
          <td><b>${s.serviceType}</b></td>
          <td>${formatOdometer(s.odometer)}</td>
          <td>${s.serviceCenter || '—'}</td>
          <td>${s.description || (s as any).workPerformed || s.notes || '—'}</td>
          <td style="text-align: right;"><b>${formatCurrency(s.cost)}</b></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  `}

  <div class="section-title" style="margin-top: 32px;">Document Compliance Status</div>
  ${documents.length === 0 ? '<p style="font-size: 12px; color: #888;">No documents logged.</p>' : `
  <table>
    <thead>
      <tr>
        <th>Document</th>
        <th>Document #</th>
        <th>Issue Date</th>
        <th>Expiry Date</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${documents.map(d => `
        <tr>
          <td><b>${d.type}</b></td>
          <td>${d.documentNumber || '—'}</td>
          <td>${d.issueDate ? formatDate(d.issueDate) : '—'}</td>
          <td>${d.expiryDate ? formatDate(d.expiryDate) : 'No Expiry'}</td>
          <td>${d.notes || '—'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  `}

  <div class="footer">
    <div>AutoCare — Your Vehicle's Personal Maintenance Manager</div>
    <div>Page 1 of 1 • Verified Digital Certificate</div>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
