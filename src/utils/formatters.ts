import { DocumentStatus } from '../types';

/**
 * Parses YYYY-MM-DD string into a local Date instance without UTC offset shifts.
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  if (dateString.includes('T')) {
    // If it's an ISO timestamp string, extract YYYY-MM-DD
    const isoDatePart = dateString.split('T')[0];
    const parts = isoDatePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateString);
  }
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateString);
}

/**
 * Format a number to Indian currency representation (e.g. ₹42,850)
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return '₹' + amount.toLocaleString('en-IN');
}

/**
 * Format odometer kilometers (e.g. 20,640 KM)
 */
export function formatOdometer(km: number): string {
  if (isNaN(km)) return '0 KM';
  return `${km.toLocaleString('en-IN')} KM`;
}

/**
 * Format date string into Indian-friendly display format (e.g. 30 Sep 2026)
 * Prevents UTC timezone conversion shifts.
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  try {
    const d = parseLocalDate(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Calculate document status, days remaining/past based on expiry date
 * Strict rule:
 * - Expiry date has passed (< 0 days): Expired ("Expired X days ago")
 * - 0 to 30 days remaining (<= 30 days): Expiring Soon ("Expires in X days" or "Expires today")
 * - More than 30 days remaining (> 30 days): Valid ("Expires in X days")
 */
export function getDocumentStatus(expiryDate: string): {
  status: DocumentStatus;
  daysRemaining: number;
  label: string;
} {
  if (!expiryDate) {
    return { status: 'Valid', daysRemaining: 999, label: 'No Expiry Set' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exp = parseLocalDate(expiryDate);
  exp.setHours(0, 0, 0, 0);

  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    return {
      status: 'Expired',
      daysRemaining: diffDays,
      label: `Expired ${daysAgo === 1 ? '1 day' : `${daysAgo} days`} ago`,
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

/**
 * Calculates dynamic reminder status and friendly days remaining/overdue labels.
 * Rules:
 * - Completed: status === 'Completed'
 * - Overdue: status === 'Pending' AND dueDate < today (diffDays < 0)
 * - Due Soon: status === 'Pending' AND dueDate >= today AND dueDate <= today + 30 days (diffDays 0..30)
 * - Upcoming: status === 'Pending' AND dueDate > today + 30 days (diffDays > 30)
 */
export function getReminderStatus(
  dueDate: string,
  status: 'Pending' | 'Completed',
  completedAt?: string | null
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = parseLocalDate(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
    return {
      dynamicStatus: 'Overdue',
      diffDays,
      label: daysOverdue === 1 ? 'Overdue by 1 day' : `Overdue by ${daysOverdue} days`,
    };
  }

  if (diffDays === 0) {
    return {
      dynamicStatus: 'Due Soon',
      diffDays: 0,
      label: 'Due today',
    };
  }

  if (diffDays === 1) {
    return {
      dynamicStatus: 'Due Soon',
      diffDays: 1,
      label: 'Due tomorrow',
    };
  }

  if (diffDays <= 30) {
    return {
      dynamicStatus: 'Due Soon',
      diffDays,
      label: `Due in ${diffDays} days`,
    };
  }

  return {
    dynamicStatus: 'Upcoming',
    diffDays,
    label: `Due in ${diffDays} days`,
  };
}
