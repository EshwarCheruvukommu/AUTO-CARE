export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export type FuelType = 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid' | 'CNG' | 'Other';

export interface Vehicle {
  id: string;
  userId: string;
  name: string;
  vehicleNumber: string;
  brand: string;
  model: string;
  variant?: string;
  fuelType: FuelType;
  purchaseDate: string;
  currentOdometer: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 
  | 'Insurance'
  | 'PUC'
  | 'RC'
  | 'Driving Licence'
  | 'Service Document'
  | 'Other';

export type DocumentStatus = 'Valid' | 'Expiring Soon' | 'Expired';

export interface VehicleDocument {
  id: string;
  userId: string;
  vehicleId: string;
  type: DocumentType;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  fileName?: string | null;
  fileUrl?: string | null;
  storagePath?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ServiceType = 
  | 'General Service'
  | 'Oil Change'
  | 'Brake Service'
  | 'Tyre Service'
  | 'Battery Replacement'
  | 'AC Service'
  | 'Engine Repair'
  | 'Electrical Repair'
  | 'Suspension'
  | 'Wheel Alignment'
  | 'Wheel Balancing'
  | 'Car Wash / Detailing'
  | 'Other';

export interface ServiceRecord {
  id: string;
  userId: string;
  vehicleId: string;
  serviceType: ServiceType;
  serviceDate: string;
  odometer: number;
  cost: number;
  serviceCenter?: string | null;
  description?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  // Optional backward compatibility aliases
  date?: string;
  workPerformed?: string;
}

export type FuelRecordType = 'Petrol' | 'Diesel' | 'CNG' | 'EV Charging' | 'Other';

export interface FuelRecord {
  id: string;
  userId: string;
  vehicleId: string;
  fuelDate: string;
  odometer: number;
  fuelType: FuelRecordType;
  litres: number | null;
  pricePerLitre: number | null;
  totalCost: number;
  station?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory = 
  | 'Fuel'
  | 'Service'
  | 'Repair'
  | 'Insurance'
  | 'PUC'
  | 'Tyres'
  | 'Battery'
  | 'Accessories'
  | 'Washing / Detailing'
  | 'Washing'
  | 'Parking'
  | 'Toll'
  | 'Other';

export interface ExpenseRecord {
  id: string;
  userId: string;
  vehicleId: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  date?: string; // backwards compatibility
  description: string;
  vendor?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReminderType = 
  | 'Document Expiry'
  | 'Service'
  | 'Maintenance'
  | 'Insurance'
  | 'PUC'
  | 'Tyre'
  | 'Battery'
  | 'Oil Change'
  | 'General'
  | 'Other';

export type ReminderPriority = 'Low' | 'Medium' | 'High';

export type ReminderStatus = 'Pending' | 'Completed';

export type DynamicReminderStatus = 'Completed' | 'Overdue' | 'Due Soon' | 'Upcoming';

export interface VehicleReminder {
  id: string;
  userId: string;
  vehicleId: string;
  title: string;
  description?: string | null;
  reminderType: ReminderType;
  dueDate: string;
  status: ReminderStatus;
  priority: ReminderPriority;
  sourceType: 'custom' | 'document' | string;
  sourceId?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface ReminderNotification {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  date: string;
  read: boolean;
  category: 'document' | 'service' | 'system' | 'custom';
  vehicleId?: string;
  actionUrl?: string;
}
