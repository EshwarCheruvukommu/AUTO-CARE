/**
 * Sanitizes an object before writing to Firestore.
 * - Converts any `undefined` value to `null` or removes it to prevent Firestore errors.
 * - Recursively processes nested objects.
 */
export function sanitizeFirestoreData<T extends Record<string, any>>(data: T): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      sanitized[key] = null;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      sanitized[key] = sanitizeFirestoreData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
