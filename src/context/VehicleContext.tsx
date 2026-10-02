import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { deleteDocumentFile } from '../services/storage';
import { sanitizeFirestoreData } from '../utils/firestore';
import { useAuth } from './AuthContext';
import { 
  Vehicle, 
  VehicleDocument, 
  ServiceRecord, 
  ExpenseRecord, 
  FuelRecord,
  ReminderNotification,
  VehicleReminder,
  ReminderType,
  ReminderPriority,
  ReminderStatus,
  CustomMaintenanceRule
} from '../types';
import { getDocumentStatus, parseLocalDate, getReminderStatus } from '../utils/formatters';

interface VehicleContextType {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  setSelectedVehicleId: (id: string) => void;
  loadingVehicles: boolean;

  documents: VehicleDocument[];
  loadingDocuments: boolean;

  services: ServiceRecord[];
  loadingServices: boolean;

  fuelRecords: FuelRecord[];
  loadingFuelRecords: boolean;

  expenses: ExpenseRecord[];
  loadingExpenses: boolean;

  customReminders: VehicleReminder[];
  loadingReminders: boolean;
  allReminders: VehicleReminder[];
  reminderSummary: {
    pending: number;
    dueSoon: number;
    overdue: number;
    upcoming: number;
    completed: number;
  };
  activeAlertCount: number;

  reminders: ReminderNotification[];
  unreadRemindersCount: number;
  markReminderAsRead: (id: string) => void;

  // Reminder operations
  addReminder: (reminderData: Omit<VehicleReminder, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'completedAt'>) => Promise<string>;
  updateReminder: (id: string, reminderData: Partial<VehicleReminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  toggleCompleteReminder: (id: string, completed: boolean) => Promise<void>;

  // Vehicle operations
  addVehicle: (vehicleData: Omit<Vehicle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateVehicle: (id: string, vehicleData: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;

  // Document operations
  addDocument: (docData: Omit<VehicleDocument, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDocument: (id: string, docData: Partial<VehicleDocument>, previousStoragePathToClean?: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;

  // Service operations
  addService: (serviceData: Omit<ServiceRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateService: (id: string, serviceData: Partial<ServiceRecord>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  // Fuel operations
  addFuelRecord: (fuelData: Omit<FuelRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateFuelRecord: (id: string, fuelData: Partial<FuelRecord>) => Promise<void>;
  deleteFuelRecord: (id: string) => Promise<void>;

  // Expense operations
  addExpense: (expenseData: Omit<ExpenseRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateExpense: (id: string, expenseData: Partial<ExpenseRecord>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Custom Maintenance Rules operations
  customRules: CustomMaintenanceRule[];
  loadingCustomRules: boolean;
  addCustomRule: (ruleData: Omit<CustomMaintenanceRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateCustomRule: (id: string, ruleData: Partial<CustomMaintenanceRule>) => Promise<void>;
  deleteCustomRule: (id: string) => Promise<void>;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const VehicleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleIdState] = useState<string>('');
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(true);

  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false);

  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);

  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [loadingFuelRecords, setLoadingFuelRecords] = useState<boolean>(false);

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState<boolean>(false);

  const [customReminders, setCustomReminders] = useState<VehicleReminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState<boolean>(false);

  const [customRules, setCustomRules] = useState<CustomMaintenanceRule[]>([]);
  const [loadingCustomRules, setLoadingCustomRules] = useState<boolean>(false);

  const [readReminderIds, setReadReminderIds] = useState<Set<string>>(new Set());

  // 1. Subscribe to User's Vehicles
  useEffect(() => {
    if (!currentUser) {
      setVehicles([]);
      setSelectedVehicleIdState('');
      setLoadingVehicles(false);
      return;
    }

    setLoadingVehicles(true);
    const q = query(
      collection(db, 'vehicles'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Vehicle[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Vehicle, 'id'>) });
      });

      // Sort by creation date descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setVehicles(list);

      // Auto-select first vehicle if none selected or current selection no longer exists
      setSelectedVehicleIdState((currentId) => {
        if (list.length === 0) return '';
        if (currentId && list.some(v => v.id === currentId)) {
          return currentId;
        }
        return list[0].id;
      });

      setLoadingVehicles(false);
    }, (error) => {
      console.error('Error fetching vehicles:', error);
      setLoadingVehicles(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Selected vehicle object
  const selectedVehicle = useMemo(() => {
    return vehicles.find(v => v.id === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  const setSelectedVehicleId = (id: string) => {
    setSelectedVehicleIdState(id);
  };

  // 2. Subscribe to Selected Vehicle Documents
  useEffect(() => {
    if (!currentUser || !selectedVehicleId) {
      setDocuments([]);
      setLoadingDocuments(false);
      return;
    }

    setLoadingDocuments(true);
    const q = query(
      collection(db, 'documents'),
      where('userId', '==', currentUser.uid),
      where('vehicleId', '==', selectedVehicleId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: VehicleDocument[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<VehicleDocument, 'id'>) });
      });
      list.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
      setDocuments(list);
      setLoadingDocuments(false);
    }, (err) => {
      console.error('Error fetching documents:', err);
      setLoadingDocuments(false);
    });

    return () => unsubscribe();
  }, [currentUser, selectedVehicleId]);

  // 3. Subscribe to Selected Vehicle Services
  useEffect(() => {
    if (!currentUser || !selectedVehicleId) {
      setServices([]);
      setLoadingServices(false);
      return;
    }

    setLoadingServices(true);
    const q = query(
      collection(db, 'serviceRecords'),
      where('userId', '==', currentUser.uid),
      where('vehicleId', '==', selectedVehicleId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ServiceRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const sDate = data.serviceDate || data.date || '';
        const desc = data.description || data.workPerformed || '';
        list.push({ 
          id: docSnap.id, 
          ...(data as any),
          serviceDate: sDate,
          date: sDate,
          description: desc,
          workPerformed: desc,
        });
      });
      // Sort newest serviceDate descending
      list.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
      setServices(list);
      setLoadingServices(false);
    }, (err) => {
      console.error('Error fetching service records:', err);
      setLoadingServices(false);
    });

    return () => unsubscribe();
  }, [currentUser, selectedVehicleId]);

  // 4. Subscribe to Selected Vehicle Fuel Records
  useEffect(() => {
    if (!currentUser || !selectedVehicleId) {
      setFuelRecords([]);
      setLoadingFuelRecords(false);
      return;
    }

    setLoadingFuelRecords(true);
    const q = query(
      collection(db, 'fuelRecords'),
      where('userId', '==', currentUser.uid),
      where('vehicleId', '==', selectedVehicleId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: FuelRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<FuelRecord, 'id'>) });
      });
      // Sort newest fuelDate descending, secondary sort by odometer descending
      list.sort((a, b) => {
        const timeDiff = new Date(b.fuelDate).getTime() - new Date(a.fuelDate).getTime();
        if (timeDiff !== 0) return timeDiff;
        return (b.odometer || 0) - (a.odometer || 0);
      });
      setFuelRecords(list);
      setLoadingFuelRecords(false);
    }, (err) => {
      console.error('Error fetching fuel records:', err);
      setLoadingFuelRecords(false);
    });

    return () => unsubscribe();
  }, [currentUser, selectedVehicleId]);

  // 5. Subscribe to Selected Vehicle Expenses
  useEffect(() => {
    if (!currentUser || !selectedVehicleId) {
      setExpenses([]);
      setLoadingExpenses(false);
      return;
    }

    setLoadingExpenses(true);
    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', currentUser.uid),
      where('vehicleId', '==', selectedVehicleId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ExpenseRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const eDate = data.expenseDate || data.date || '';
        list.push({
          id: docSnap.id,
          userId: data.userId,
          vehicleId: data.vehicleId,
          expenseDate: eDate,
          date: eDate,
          category: data.category === 'Washing' ? 'Washing / Detailing' : data.category,
          amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
          description: data.description || '',
          vendor: data.vendor || null,
          notes: data.notes || null,
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
        });
      });
      // Sort newest expenseDate descending; if same expenseDate, newest createdAt descending
      list.sort((a, b) => {
        const timeA = new Date(a.expenseDate).getTime();
        const timeB = new Date(b.expenseDate).getTime();
        if (timeB !== timeA) {
          return timeB - timeA;
        }
        const createdA = new Date(a.createdAt || 0).getTime();
        const createdB = new Date(b.createdAt || 0).getTime();
        return createdB - createdA;
      });
      setExpenses(list);
      setLoadingExpenses(false);
    }, (err) => {
      console.error('Error fetching expenses:', err);
      setLoadingExpenses(false);
    });

    return () => unsubscribe();
  }, [currentUser, selectedVehicleId]);

  // 6. Subscribe to Selected Vehicle Reminders
  useEffect(() => {
    if (!currentUser || !selectedVehicleId) {
      setCustomReminders([]);
      setLoadingReminders(false);
      return;
    }

    setLoadingReminders(true);
    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', currentUser.uid),
      where('vehicleId', '==', selectedVehicleId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: VehicleReminder[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          userId: data.userId,
          vehicleId: data.vehicleId,
          title: data.title || '',
          description: data.description || null,
          reminderType: data.reminderType || 'General',
          dueDate: data.dueDate || '',
          status: data.status || 'Pending',
          priority: data.priority || 'Medium',
          sourceType: data.sourceType || 'custom',
          sourceId: data.sourceId || null,
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
          completedAt: data.completedAt || null,
        });
      });
      setCustomReminders(list);
      setLoadingReminders(false);
    }, (err) => {
      console.error('Error fetching reminders:', err);
      setLoadingReminders(false);
    });

    return () => unsubscribe();
  }, [currentUser, selectedVehicleId]);

  // 7. Subscribe to Selected Vehicle Custom Maintenance Rules
  useEffect(() => {
    if (!currentUser || !selectedVehicleId) {
      setCustomRules([]);
      setLoadingCustomRules(false);
      return;
    }

    setLoadingCustomRules(true);
    const q = query(
      collection(db, 'customMaintenanceRules'),
      where('userId', '==', currentUser.uid),
      where('vehicleId', '==', selectedVehicleId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: CustomMaintenanceRule[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          userId: data.userId,
          vehicleId: data.vehicleId,
          name: data.name || '',
          category: data.category || 'General',
          intervalKm: Number(data.intervalKm) || 10000,
          intervalMonths: data.intervalMonths !== undefined ? Number(data.intervalMonths) : undefined,
          startingOdometer: data.startingOdometer !== undefined ? Number(data.startingOdometer) : undefined,
          lastServiceOdometer: data.lastServiceOdometer !== undefined ? Number(data.lastServiceOdometer) : undefined,
          lastServiceDate: data.lastServiceDate || undefined,
          enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
          ruleType: data.ruleType || 'whichever_first',
          source: data.source || 'Custom',
          description: data.description || undefined,
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
        });
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setCustomRules(list);
      setLoadingCustomRules(false);
    }, (err) => {
      console.warn('Error fetching customMaintenanceRules from Firestore:', err);
      try {
        const stored = localStorage.getItem(`autocare_custom_rules_${selectedVehicleId}`);
        if (stored) {
          setCustomRules(JSON.parse(stored));
        }
      } catch {}
      setLoadingCustomRules(false);
    });

    return () => unsubscribe();
  }, [currentUser, selectedVehicleId]);

  // Dynamically derived and combined Reminders list
  const allReminders = useMemo(() => {
    const list: VehicleReminder[] = [...customReminders];

    // Document expiry derived reminders
    // Section 16: Show document expiry reminders when: Already expired OR Expiring within 30 days.
    // Do not show documents that expire more than 30 days away in the active reminder list.
    documents.forEach((d) => {
      const { status } = getDocumentStatus(d.expiryDate);
      if (status === 'Expired' || status === 'Expiring Soon') {
        const reminderType: ReminderType = 
          d.type === 'Insurance' ? 'Insurance' : 
          d.type === 'PUC' ? 'PUC' : 'Document Expiry';

        list.push({
          id: `doc-exp-${d.id}`,
          userId: currentUser?.uid || '',
          vehicleId: d.vehicleId,
          title: `${d.type} Expiry`,
          description: `${d.type} (${d.documentNumber || 'No #'}) renewal required.`,
          reminderType,
          dueDate: d.expiryDate,
          status: 'Pending',
          priority: status === 'Expired' ? 'High' : 'Medium',
          sourceType: 'document',
          sourceId: d.id,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          completedAt: null,
        });
      }
    });

    // Priority ordering weight: High (3), Medium (2), Low (1)
    const priorityWeight: Record<string, number> = {
      High: 3,
      Medium: 2,
      Low: 1,
    };

    // Sorting as per Section 12:
    // Sort pending reminders by due date ascending (closest upcoming first, overdue first).
    // Completed reminders appear separately or below pending reminders.
    // Within the same date, higher priority may appear first.
    list.sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;

      if (a.status === 'Completed' && b.status === 'Completed') {
        return new Date(b.completedAt || b.dueDate).getTime() - new Date(a.completedAt || a.dueDate).getTime();
      }

      const dateA = parseLocalDate(a.dueDate).getTime();
      const dateB = parseLocalDate(b.dueDate).getTime();
      if (dateA !== dateB) {
        return dateA - dateB;
      }

      const weightA = priorityWeight[a.priority] || 2;
      const weightB = priorityWeight[b.priority] || 2;
      return weightB - weightA;
    });

    return list;
  }, [customReminders, documents, currentUser]);

  // Dynamic Summary calculations as per Section 13
  const reminderSummary = useMemo(() => {
    let pending = 0;
    let dueSoon = 0;
    let overdue = 0;
    let upcoming = 0;
    let completed = 0;

    allReminders.forEach((r) => {
      const { dynamicStatus } = getReminderStatus(r.dueDate, r.status, r.completedAt);
      if (dynamicStatus === 'Completed') {
        completed += 1;
      } else {
        pending += 1;
        if (dynamicStatus === 'Overdue') {
          overdue += 1;
        } else if (dynamicStatus === 'Due Soon') {
          dueSoon += 1;
        } else if (dynamicStatus === 'Upcoming') {
          upcoming += 1;
        }
      }
    });

    return { pending, dueSoon, overdue, upcoming, completed };
  }, [allReminders]);

  // Active alerts count (Overdue + Due Soon) for notification badge
  const activeAlertCount = useMemo(() => {
    return reminderSummary.overdue + reminderSummary.dueSoon;
  }, [reminderSummary]);

  // Dynamic In-App Reminders notifications list for notification panel / header
  const reminders = useMemo(() => {
    const list: ReminderNotification[] = [];

    // Document & Custom reminders that are Overdue or Due Soon
    allReminders.forEach((r) => {
      const { dynamicStatus, label } = getReminderStatus(r.dueDate, r.status, r.completedAt);
      if (dynamicStatus === 'Overdue') {
        list.push({
          id: `alert-${r.id}`,
          type: 'danger',
          title: `${r.title} (Overdue)`,
          message: `${r.title} is ${label.toLowerCase()}.`,
          date: r.dueDate,
          read: readReminderIds.has(`alert-${r.id}`),
          category: r.sourceType === 'document' ? 'document' : 'custom',
          vehicleId: r.vehicleId,
          actionUrl: r.sourceType === 'document' ? '/documents' : '/reminders',
        });
      } else if (dynamicStatus === 'Due Soon') {
        list.push({
          id: `alert-${r.id}`,
          type: 'warning',
          title: `${r.title} (${label})`,
          message: `${r.title} is ${label.toLowerCase()}.`,
          date: r.dueDate,
          read: readReminderIds.has(`alert-${r.id}`),
          category: r.sourceType === 'document' ? 'document' : 'custom',
          vehicleId: r.vehicleId,
          actionUrl: r.sourceType === 'document' ? '/documents' : '/reminders',
        });
      }
    });

    // Recent service reminder / notice
    if (services.length > 0) {
      const latestService = services[0];
      const sDateStr = latestService.serviceDate || latestService.date || new Date().toISOString();
      const serviceDate = new Date(sDateStr);
      const monthsSinceService = (new Date().getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSinceService >= 6) {
        list.push({
          id: `serv-due-${latestService.id}`,
          type: 'warning',
          title: 'Scheduled Service Suggested',
          message: `Last service was recorded ${Math.floor(monthsSinceService)} months ago (${latestService.serviceType}). Check vehicle health!`,
          date: sDateStr,
          read: readReminderIds.has(`serv-due-${latestService.id}`),
          category: 'service',
          vehicleId: latestService.vehicleId,
          actionUrl: '/services',
        });
      }
    }

    return list;
  }, [allReminders, services, readReminderIds]);

  const unreadRemindersCount = useMemo(() => {
    return activeAlertCount;
  }, [activeAlertCount]);

  const markReminderAsRead = (id: string) => {
    setReadReminderIds(prev => new Set(prev).add(id));
  };

  // CRUD Implementations
  const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const cleanData = sanitizeFirestoreData({
      ...vehicleData,
      variant: vehicleData.variant || null,
      imageUrl: vehicleData.imageUrl || null,
      userId: currentUser.uid,
      createdAt: now,
      updatedAt: now,
    });
    const docRef = await addDoc(collection(db, 'vehicles'), cleanData);
    setSelectedVehicleIdState(docRef.id);
    return docRef.id;
  };

  const updateVehicle = async (id: string, vehicleData: Partial<Vehicle>) => {
    const ref = doc(db, 'vehicles', id);
    const cleanData = sanitizeFirestoreData({
      ...vehicleData,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(ref, cleanData);
  };

  const deleteVehicle = async (id: string) => {
    if (!currentUser) throw new Error('Not authenticated');

    // Cascading deletion of related docs, services, expenses
    const batch = writeBatch(db);

    // Delete vehicle doc
    batch.delete(doc(db, 'vehicles', id));

    // Delete sub-records for this vehicle
    const docsSnapshot = await getDocs(query(collection(db, 'documents'), where('vehicleId', '==', id), where('userId', '==', currentUser.uid)));
    for (const d of docsSnapshot.docs) {
      const data = d.data() as VehicleDocument;
      if (data.storagePath) {
        deleteDocumentFile(data.storagePath).catch(console.warn);
      }
      batch.delete(d.ref);
    }

    const servicesSnapshot = await getDocs(query(collection(db, 'serviceRecords'), where('vehicleId', '==', id), where('userId', '==', currentUser.uid)));
    servicesSnapshot.forEach(s => batch.delete(s.ref));

    // Also clean up any legacy services
    const legacyServices = await getDocs(query(collection(db, 'services'), where('vehicleId', '==', id), where('userId', '==', currentUser.uid)));
    legacyServices.forEach(s => batch.delete(s.ref));

    const expensesSnapshot = await getDocs(query(collection(db, 'expenses'), where('vehicleId', '==', id), where('userId', '==', currentUser.uid)));
    expensesSnapshot.forEach(e => batch.delete(e.ref));

    const fuelSnapshot = await getDocs(query(collection(db, 'fuelRecords'), where('vehicleId', '==', id), where('userId', '==', currentUser.uid)));
    fuelSnapshot.forEach(f => batch.delete(f.ref));

    const remindersSnapshot = await getDocs(query(collection(db, 'reminders'), where('vehicleId', '==', id), where('userId', '==', currentUser.uid)));
    remindersSnapshot.forEach(r => batch.delete(r.ref));

    await batch.commit();

    // If active was deleted, will auto-select via onSnapshot
  };

  const addDocument = async (docData: Omit<VehicleDocument, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('Not authenticated');

    // Verify vehicle ownership - prevent user A attaching doc to user B's vehicle
    const isOwned = vehicles.some(v => v.id === docData.vehicleId && v.userId === currentUser.uid);
    if (!isOwned) {
      const vSnap = await getDoc(doc(db, 'vehicles', docData.vehicleId));
      if (!vSnap.exists() || (vSnap.data() as Vehicle).userId !== currentUser.uid) {
        throw new Error('Unauthorized: vehicle does not belong to the authenticated user');
      }
    }

    const now = new Date().toISOString();
    const cleanData = sanitizeFirestoreData({
      vehicleId: docData.vehicleId,
      type: docData.type,
      documentNumber: docData.documentNumber,
      issueDate: docData.issueDate,
      expiryDate: docData.expiryDate,
      fileName: docData.fileName || null,
      fileUrl: docData.fileUrl || null,
      storagePath: docData.storagePath || null,
      notes: docData.notes || null,
      userId: currentUser.uid,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await addDoc(collection(db, 'documents'), cleanData);
    return docRef.id;
  };

  const updateDocument = async (id: string, docData: Partial<VehicleDocument>, previousStoragePathToClean?: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    const ref = doc(db, 'documents', id);
    const snap = await getDoc(ref);
    if (!snap.exists() || (snap.data() as VehicleDocument).userId !== currentUser.uid) {
      throw new Error('Unauthorized: document does not belong to your account');
    }

    const cleanUpdate = sanitizeFirestoreData({
      ...docData,
      fileName: docData.fileName !== undefined ? (docData.fileName || null) : undefined,
      fileUrl: docData.fileUrl !== undefined ? (docData.fileUrl || null) : undefined,
      storagePath: docData.storagePath !== undefined ? (docData.storagePath || null) : undefined,
      notes: docData.notes !== undefined ? (docData.notes || null) : undefined,
      updatedAt: new Date().toISOString(),
    });

    // Remove any undefined keys so updateDoc doesn't fail
    for (const key of Object.keys(cleanUpdate)) {
      if (cleanUpdate[key] === undefined) {
        delete cleanUpdate[key];
      }
    }

    await updateDoc(ref, cleanUpdate);

    if (previousStoragePathToClean && previousStoragePathToClean !== docData.storagePath) {
      try {
        await deleteDocumentFile(previousStoragePathToClean);
      } catch (err) {
        console.warn('Storage cleanup skipped (Spark plan):', err);
      }
    }
  };

  const deleteDocument = async (id: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    const docRef = doc(db, 'documents', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as VehicleDocument;
      if (data.userId !== currentUser.uid) {
        throw new Error('Unauthorized: cannot delete another user document');
      }
      if (data.storagePath) {
        try {
          await deleteDocumentFile(data.storagePath);
        } catch (err) {
          console.warn('Storage deletion skipped (Spark plan):', err);
        }
      }
    }
    await deleteDoc(docRef);
  };

  const addService = async (serviceData: Omit<ServiceRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('Not authenticated');

    // Verify vehicle ownership before creating service record
    const isOwned = vehicles.some((v) => v.id === serviceData.vehicleId);
    if (!isOwned) {
      const vSnap = await getDoc(doc(db, 'vehicles', serviceData.vehicleId));
      if (!vSnap.exists() || (vSnap.data() as Vehicle).userId !== currentUser.uid) {
        throw new Error('Unauthorized: vehicle does not belong to the authenticated user');
      }
    }

    const sDate = serviceData.serviceDate || (serviceData as any).date;
    const desc = serviceData.description || (serviceData as any).workPerformed;
    const odoNum = Number(serviceData.odometer);
    const costNum = Number(serviceData.cost);

    const now = new Date().toISOString();
    const cleanData = sanitizeFirestoreData({
      userId: currentUser.uid,
      vehicleId: serviceData.vehicleId,
      serviceType: serviceData.serviceType,
      serviceDate: sDate,
      odometer: odoNum,
      cost: costNum,
      serviceCenter: serviceData.serviceCenter?.trim() || null,
      description: desc?.trim() || null,
      notes: serviceData.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await addDoc(collection(db, 'serviceRecords'), cleanData);

    // If odometer in service is higher than vehicle's current odometer, update vehicle (Bug #4)
    if (selectedVehicle && !isNaN(odoNum) && (selectedVehicle.currentOdometer === undefined || odoNum > selectedVehicle.currentOdometer)) {
      await updateVehicle(selectedVehicle.id, { currentOdometer: odoNum });
    }

    return docRef.id;
  };

  const updateService = async (id: string, serviceData: Partial<ServiceRecord>) => {
    if (!currentUser) throw new Error('Not authenticated');
    const ref = doc(db, 'serviceRecords', id);
    const snap = await getDoc(ref);
    if (!snap.exists() || (snap.data() as ServiceRecord).userId !== currentUser.uid) {
      throw new Error('Unauthorized: service record does not belong to your account');
    }

    const sDate = serviceData.serviceDate !== undefined ? serviceData.serviceDate : (serviceData as any).date;
    const desc = serviceData.description !== undefined 
      ? serviceData.description 
      : (serviceData as any).workPerformed !== undefined 
      ? (serviceData as any).workPerformed 
      : undefined;

    const cleanData = sanitizeFirestoreData({
      serviceType: serviceData.serviceType,
      serviceDate: sDate,
      odometer: serviceData.odometer !== undefined ? Number(serviceData.odometer) : undefined,
      cost: serviceData.cost !== undefined ? Number(serviceData.cost) : undefined,
      serviceCenter: serviceData.serviceCenter !== undefined ? (serviceData.serviceCenter?.trim() || null) : undefined,
      description: desc !== undefined ? (desc?.trim() || null) : undefined,
      notes: serviceData.notes !== undefined ? (serviceData.notes?.trim() || null) : undefined,
      updatedAt: new Date().toISOString(),
    });

    for (const key of Object.keys(cleanData)) {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    }

    await updateDoc(ref, cleanData);

    if (selectedVehicle && cleanData.odometer !== undefined && !isNaN(cleanData.odometer) && (selectedVehicle.currentOdometer === undefined || cleanData.odometer > selectedVehicle.currentOdometer)) {
      await updateVehicle(selectedVehicle.id, { currentOdometer: cleanData.odometer });
    }
  };

  const deleteService = async (id: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    const ref = doc(db, 'serviceRecords', id);
    const snap = await getDoc(ref);
    if (snap.exists() && (snap.data() as ServiceRecord).userId !== currentUser.uid) {
      throw new Error('Unauthorized: cannot delete another user service record');
    }
    await deleteDoc(ref);
  };

  const addFuelRecord = async (fuelData: Omit<FuelRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('Not authenticated');

    // Verify vehicle ownership before creating fuel record
    const isOwned = vehicles.some((v) => v.id === fuelData.vehicleId);
    if (!isOwned) {
      const vSnap = await getDoc(doc(db, 'vehicles', fuelData.vehicleId));
      if (!vSnap.exists() || (vSnap.data() as Vehicle).userId !== currentUser.uid) {
        throw new Error('Unauthorized: vehicle does not belong to the authenticated user');
      }
    }

    const odoNum = Number(fuelData.odometer);
    const costNum = Number(fuelData.totalCost);
    const litresNum = fuelData.litres !== null && fuelData.litres !== undefined && !isNaN(Number(fuelData.litres))
      ? Number(fuelData.litres)
      : null;

    // Recalculate pricePerLitre dynamically from totalCost / quantity (Bug #1)
    let priceNum = (litresNum && litresNum > 0 && !isNaN(costNum))
      ? Math.round((costNum / litresNum) * 100) / 100
      : (fuelData.pricePerLitre !== null && fuelData.pricePerLitre !== undefined && !isNaN(Number(fuelData.pricePerLitre))
          ? Number(fuelData.pricePerLitre)
          : null);

    const now = new Date().toISOString();
    const cleanData = sanitizeFirestoreData({
      userId: currentUser.uid,
      vehicleId: fuelData.vehicleId,
      fuelDate: fuelData.fuelDate,
      odometer: odoNum,
      fuelType: fuelData.fuelType,
      litres: litresNum,
      pricePerLitre: priceNum,
      totalCost: costNum,
      station: fuelData.station?.trim() || null,
      notes: fuelData.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await addDoc(collection(db, 'fuelRecords'), cleanData);

    // If odometer in fuel record is higher than vehicle's current odometer, update vehicle (Bug #4)
    if (selectedVehicle && !isNaN(odoNum) && (selectedVehicle.currentOdometer === undefined || odoNum > selectedVehicle.currentOdometer)) {
      await updateVehicle(selectedVehicle.id, { currentOdometer: odoNum });
    }

    return docRef.id;
  };

  const updateFuelRecord = async (id: string, fuelData: Partial<FuelRecord>) => {
    if (!currentUser) throw new Error('Not authenticated');
    const ref = doc(db, 'fuelRecords', id);
    const snap = await getDoc(ref);
    if (!snap.exists() || (snap.data() as FuelRecord).userId !== currentUser.uid) {
      throw new Error('Unauthorized: fuel record does not belong to your account');
    }

    const existingData = snap.data() as FuelRecord;
    const odoNum = fuelData.odometer !== undefined ? Number(fuelData.odometer) : undefined;
    const costNum = fuelData.totalCost !== undefined ? Number(fuelData.totalCost) : undefined;
    const litresNum = fuelData.litres !== undefined 
      ? (fuelData.litres !== null && !isNaN(Number(fuelData.litres)) ? Number(fuelData.litres) : null)
      : undefined;

    // Recalculate pricePerLitre dynamically from effective cost / litres (Bug #1)
    const effectiveCost = costNum !== undefined ? costNum : existingData.totalCost;
    const effectiveLitres = litresNum !== undefined ? litresNum : existingData.litres;
    let finalPrice = fuelData.pricePerLitre !== undefined
      ? (fuelData.pricePerLitre !== null && !isNaN(Number(fuelData.pricePerLitre)) ? Number(fuelData.pricePerLitre) : null)
      : existingData.pricePerLitre;

    if (effectiveLitres && effectiveLitres > 0 && effectiveCost !== undefined && !isNaN(effectiveCost)) {
      finalPrice = Math.round((effectiveCost / effectiveLitres) * 100) / 100;
    }

    const cleanData = sanitizeFirestoreData({
      fuelDate: fuelData.fuelDate,
      odometer: odoNum,
      fuelType: fuelData.fuelType,
      litres: litresNum,
      pricePerLitre: finalPrice,
      totalCost: costNum,
      station: fuelData.station !== undefined ? (fuelData.station?.trim() || null) : undefined,
      notes: fuelData.notes !== undefined ? (fuelData.notes?.trim() || null) : undefined,
      updatedAt: new Date().toISOString(),
    });

    for (const key of Object.keys(cleanData)) {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    }

    await updateDoc(ref, cleanData);

    if (selectedVehicle && odoNum !== undefined && !isNaN(odoNum) && (selectedVehicle.currentOdometer === undefined || odoNum > selectedVehicle.currentOdometer)) {
      await updateVehicle(selectedVehicle.id, { currentOdometer: odoNum });
    }
  };

  const deleteFuelRecord = async (id: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    const ref = doc(db, 'fuelRecords', id);
    const snap = await getDoc(ref);
    if (snap.exists() && (snap.data() as FuelRecord).userId !== currentUser.uid) {
      throw new Error('Unauthorized: cannot delete another user fuel record');
    }
    await deleteDoc(ref);
  };

  const addExpense = async (expenseData: Omit<ExpenseRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('Not authenticated');

    // Verify vehicle ownership before creating expense record
    const isOwned = vehicles.some((v) => v.id === expenseData.vehicleId);
    if (!isOwned) {
      const vSnap = await getDoc(doc(db, 'vehicles', expenseData.vehicleId));
      if (!vSnap.exists() || (vSnap.data() as Vehicle).userId !== currentUser.uid) {
        throw new Error('Unauthorized: vehicle does not belong to the authenticated user');
      }
    }

    const amtNum = Number(expenseData.amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      throw new Error('Expense amount must be a positive number');
    }

    const eDate = expenseData.expenseDate || (expenseData as any).date;
    const now = new Date().toISOString();

    const cleanData = sanitizeFirestoreData({
      userId: currentUser.uid,
      vehicleId: expenseData.vehicleId,
      expenseDate: eDate,
      date: eDate, // ensure backwards compatibility
      category: expenseData.category,
      amount: amtNum,
      description: expenseData.description.trim(),
      vendor: expenseData.vendor?.trim() || null,
      notes: expenseData.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await addDoc(collection(db, 'expenses'), cleanData);
    return docRef.id;
  };

  const updateExpense = async (id: string, expenseData: Partial<ExpenseRecord>) => {
    if (!currentUser) throw new Error('Not authenticated');
    const ref = doc(db, 'expenses', id);
    const snap = await getDoc(ref);
    if (!snap.exists() || (snap.data() as ExpenseRecord).userId !== currentUser.uid) {
      throw new Error('Unauthorized: expense does not belong to your account');
    }

    const amtNum = expenseData.amount !== undefined ? Number(expenseData.amount) : undefined;
    if (amtNum !== undefined && (isNaN(amtNum) || amtNum <= 0)) {
      throw new Error('Expense amount must be a positive number');
    }

    const eDate = expenseData.expenseDate !== undefined 
      ? expenseData.expenseDate 
      : (expenseData as any).date !== undefined 
      ? (expenseData as any).date 
      : undefined;

    const cleanData = sanitizeFirestoreData({
      category: expenseData.category,
      expenseDate: eDate,
      date: eDate,
      amount: amtNum,
      description: expenseData.description !== undefined ? expenseData.description.trim() : undefined,
      vendor: expenseData.vendor !== undefined ? (expenseData.vendor?.trim() || null) : undefined,
      notes: expenseData.notes !== undefined ? (expenseData.notes?.trim() || null) : undefined,
      updatedAt: new Date().toISOString(),
    });

    for (const key of Object.keys(cleanData)) {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    }

    await updateDoc(ref, cleanData);
  };

  const deleteExpense = async (id: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    const ref = doc(db, 'expenses', id);
    const snap = await getDoc(ref);
    if (snap.exists() && (snap.data() as ExpenseRecord).userId !== currentUser.uid) {
      throw new Error('Unauthorized: cannot delete another user expense record');
    }
    await deleteDoc(ref);
  };

  // Reminder CRUD operations
  const addReminder = async (reminderData: Omit<VehicleReminder, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'completedAt'>) => {
    if (!currentUser) throw new Error('Not authenticated');

    // Verify vehicle ownership before creating reminder
    const isOwned = vehicles.some((v) => v.id === reminderData.vehicleId);
    if (!isOwned) {
      const vSnap = await getDoc(doc(db, 'vehicles', reminderData.vehicleId));
      if (!vSnap.exists() || (vSnap.data() as Vehicle).userId !== currentUser.uid) {
        throw new Error('Unauthorized: vehicle does not belong to the authenticated user');
      }
    }

    if (!reminderData.title || !reminderData.title.trim()) {
      throw new Error('Reminder title is required');
    }

    if (!reminderData.dueDate) {
      throw new Error('Due date is required');
    }

    const now = new Date().toISOString();
    const cleanData = sanitizeFirestoreData({
      userId: currentUser.uid,
      vehicleId: reminderData.vehicleId,
      title: reminderData.title.trim(),
      description: reminderData.description?.trim() || null,
      reminderType: reminderData.reminderType,
      dueDate: reminderData.dueDate,
      status: reminderData.status || 'Pending',
      priority: reminderData.priority || 'Medium',
      sourceType: reminderData.sourceType || 'custom',
      sourceId: reminderData.sourceId || null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });

    const docRef = await addDoc(collection(db, 'reminders'), cleanData);
    return docRef.id;
  };

  const updateReminder = async (id: string, reminderData: Partial<VehicleReminder>) => {
    if (!currentUser) throw new Error('Not authenticated');
    const ref = doc(db, 'reminders', id);
    const snap = await getDoc(ref);
    if (!snap.exists() || (snap.data() as VehicleReminder).userId !== currentUser.uid) {
      throw new Error('Unauthorized: reminder does not belong to your account');
    }

    const existingData = snap.data() as VehicleReminder;

    const cleanData = sanitizeFirestoreData({
      title: reminderData.title !== undefined ? reminderData.title.trim() : undefined,
      description: reminderData.description !== undefined ? (reminderData.description?.trim() || null) : undefined,
      reminderType: reminderData.reminderType,
      dueDate: reminderData.dueDate,
      priority: reminderData.priority,
      status: reminderData.status,
      completedAt: reminderData.status === 'Completed'
        ? (existingData.completedAt || new Date().toISOString())
        : (reminderData.status === 'Pending' ? null : undefined),
      updatedAt: new Date().toISOString(),
    });

    for (const key of Object.keys(cleanData)) {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    }

    await updateDoc(ref, cleanData);
  };

  const toggleCompleteReminder = async (id: string, completed: boolean) => {
    if (!currentUser) throw new Error('Not authenticated');
    const ref = doc(db, 'reminders', id);
    const snap = await getDoc(ref);
    if (!snap.exists() || (snap.data() as VehicleReminder).userId !== currentUser.uid) {
      throw new Error('Unauthorized: reminder does not belong to your account');
    }

    const now = new Date().toISOString();
    await updateDoc(ref, {
      status: completed ? 'Completed' : 'Pending',
      completedAt: completed ? now : null,
      updatedAt: now,
    });
  };

  const deleteReminder = async (id: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    const ref = doc(db, 'reminders', id);
    const snap = await getDoc(ref);
    if (snap.exists() && (snap.data() as VehicleReminder).userId !== currentUser.uid) {
      throw new Error('Unauthorized: cannot delete another user reminder');
    }
    await deleteDoc(ref);
  };

  // Custom Maintenance Rules operations (Bug #5)
  const addCustomRule = async (ruleData: Omit<CustomMaintenanceRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser || !selectedVehicleId) throw new Error('No vehicle or user active');
    const now = new Date().toISOString();
    const cleanData: any = {
      ...ruleData,
      userId: currentUser.uid,
      vehicleId: selectedVehicleId,
      createdAt: now,
      updatedAt: now,
      enabled: ruleData.enabled !== undefined ? ruleData.enabled : true,
    };
    try {
      const docRef = await addDoc(collection(db, 'customMaintenanceRules'), cleanData);
      return docRef.id;
    } catch (err) {
      console.warn('Firestore addDoc customMaintenanceRules failed, using local state:', err);
      const fakeId = `rule_${Date.now()}`;
      const newRule: CustomMaintenanceRule = { ...cleanData, id: fakeId };
      setCustomRules(prev => [newRule, ...prev]);
      try {
        localStorage.setItem(`autocare_custom_rules_${selectedVehicleId}`, JSON.stringify([newRule, ...customRules]));
      } catch {}
      return fakeId;
    }
  };

  const updateCustomRule = async (id: string, ruleData: Partial<CustomMaintenanceRule>) => {
    if (!currentUser) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const cleanData: any = {
      ...ruleData,
      updatedAt: now,
    };
    delete cleanData.id;
    delete cleanData.userId;
    try {
      await updateDoc(doc(db, 'customMaintenanceRules', id), cleanData);
    } catch (err) {
      console.warn('Firestore updateDoc customMaintenanceRules failed:', err);
      setCustomRules(prev => prev.map(r => r.id === id ? { ...r, ...cleanData } : r));
    }
  };

  const deleteCustomRule = async (id: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    try {
      await deleteDoc(doc(db, 'customMaintenanceRules', id));
    } catch (err) {
      console.warn('Firestore deleteDoc customMaintenanceRules failed:', err);
      setCustomRules(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <VehicleContext.Provider value={{
      vehicles,
      selectedVehicle,
      setSelectedVehicleId,
      loadingVehicles,
      documents,
      loadingDocuments,
      services,
      loadingServices,
      fuelRecords,
      loadingFuelRecords,
      expenses,
      loadingExpenses,
      customReminders,
      loadingReminders,
      allReminders,
      reminderSummary,
      activeAlertCount,
      reminders,
      unreadRemindersCount,
      markReminderAsRead,
      addReminder,
      updateReminder,
      deleteReminder,
      toggleCompleteReminder,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      addDocument,
      updateDocument,
      deleteDocument,
      addService,
      updateService,
      deleteService,
      addFuelRecord,
      updateFuelRecord,
      deleteFuelRecord,
      addExpense,
      updateExpense,
      deleteExpense,
      customRules,
      loadingCustomRules,
      addCustomRule,
      updateCustomRule,
      deleteCustomRule,
    }}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicle = () => {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error('useVehicle must be used within a VehicleProvider');
  }
  return context;
};
