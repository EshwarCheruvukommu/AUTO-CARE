import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

export const ALLOWED_FILE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates a document file against allowed MIME types and max size.
 */
export function validateDocumentFile(file: File | null | undefined): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const extension = file.name ? file.name.split('.').pop()?.toLowerCase() : '';
  const hasValidExtension = extension ? ALLOWED_FILE_EXTENSIONS.includes(extension) : false;
  const hasValidMime = file.type ? ALLOWED_FILE_TYPES.includes(file.type.toLowerCase()) : false;

  if (!hasValidMime && !hasValidExtension) {
    return {
      valid: false,
      error: 'Unsupported file format. Please upload a PDF, JPG, JPEG, or PNG file.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds limit. Maximum allowed size is 10 MB.',
    };
  }

  return { valid: true };
}

/**
 * Maps Firebase Storage error codes to clear user-friendly messages.
 */
export function formatStorageError(error: any): string {
  if (!error) return 'Upload failed. Please check your connection and try again.';
  const code = error.code || '';
  if (code === 'storage/unauthorized') {
    return 'Permission denied: Not authorized to upload document files.';
  }
  if (code === 'storage/canceled') {
    return 'Document upload was canceled.';
  }
  if (code === 'storage/quota-exceeded') {
    return 'Storage quota exceeded for this account.';
  }
  if (
    code === 'storage/retry-limit-exceeded' ||
    code === 'storage/unknown' ||
    code === 'storage/bucket-not-found'
  ) {
    return 'Cloud storage is currently unreachable. You can save document details without a file, or try again.';
  }
  return error.message || 'Failed to upload document file to cloud storage.';
}

/**
 * Uploads a document file to Firebase Storage under documents/{userId}/{vehicleId}/{documentId}/{fileName}
 * Uses uploadBytesResumable with a safety timeout and progress tracking.
 * Guarantees resolution or rejection without infinite hanging.
 */
export async function uploadDocumentFile(
  userId: string,
  vehicleId: string,
  documentId: string,
  file: File,
  onProgress?: (progressPercent: number) => void
): Promise<{ fileName: string; fileUrl: string; storagePath: string }> {
  // 1. Validate file
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  if (!userId || !vehicleId || !documentId) {
    throw new Error('Missing user, vehicle, or document identifier for storage path');
  }

  // 2. Sanitize file name for safe storage path
  const sanitizedFileName = (file.name || 'document')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-80); // Prevent excessively long filenames
  const uniqueName = `${Date.now()}_${sanitizedFileName}`;
  const storagePath = `documents/${userId}/${vehicleId}/${documentId}/${uniqueName}`;
  const storageRef = ref(storage, storagePath);

  // Determine safe standard content type without custom metadata headers (avoids CORS preflight failures)
  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  const isPng = file.name.toLowerCase().endsWith('.png') || file.type === 'image/png';
  const contentType = isPdf ? 'application/pdf' : isPng ? 'image/png' : 'image/jpeg';

  return new Promise<{ fileName: string; fileUrl: string; storagePath: string }>((resolve, reject) => {
    let hasSettled = false;

    // Safety timeout: 15 seconds. If Firebase Storage hangs or stalls, fail cleanly
    const timeoutHandle = setTimeout(() => {
      if (!hasSettled) {
        hasSettled = true;
        try {
          uploadTask.cancel();
        } catch (_) {}
        reject(
          new Error(
            'Upload timed out. Cloud storage may be experiencing delays. Please try again or save without a file.'
          )
        );
      }
    }, 15000);

    const uploadTask = uploadBytesResumable(storageRef, file, { contentType });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const progress = Math.min(
            100,
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          );
          onProgress(progress);
        }
      },
      (error) => {
        if (!hasSettled) {
          hasSettled = true;
          clearTimeout(timeoutHandle);
          console.error('Firebase Storage upload task error:', error);
          reject(new Error(formatStorageError(error)));
        }
      },
      async () => {
        if (!hasSettled) {
          hasSettled = true;
          clearTimeout(timeoutHandle);
          try {
            const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              fileName: file.name,
              fileUrl,
              storagePath,
            });
          } catch (urlErr: any) {
            console.error('Failed to get download URL for uploaded file:', urlErr);
            reject(new Error('File was uploaded, but failed to retrieve access URL.'));
          }
        }
      }
    );
  });
}

/**
 * Deletes a document file from Firebase Storage.
 */
export async function deleteDocumentFile(storagePath?: string | null): Promise<void> {
  if (!storagePath) return;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err: any) {
    // If the file was already deleted or not found, log notice and continue safely
    console.warn('Firebase Storage deletion notice (safe to ignore if file was moved):', err?.message || err);
  }
}
