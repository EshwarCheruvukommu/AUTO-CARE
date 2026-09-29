import React, { useState, useEffect } from 'react';
import { DocumentType, VehicleDocument } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { FileText, AlertCircle, X, Loader2 } from 'lucide-react';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<VehicleDocument, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    previousStoragePathToClean?: string
  ) => Promise<void>;
  initialData?: VehicleDocument | null;
  vehicleId: string;
  title: string;
}

const DOCUMENT_TYPES: DocumentType[] = [
  'Insurance',
  'PUC',
  'RC',
  'Driving Licence',
  'Service Document',
  'Other',
];

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  vehicleId,
  title,
}) => {
  const { currentUser } = useAuth();

  const [type, setType] = useState<DocumentType>(initialData?.type || 'Insurance');
  const [documentNumber, setDocumentNumber] = useState(initialData?.documentNumber || '');
  const [issueDate, setIssueDate] = useState(
    initialData?.issueDate || new Date().toISOString().split('T')[0]
  );
  const [expiryDate, setExpiryDate] = useState(initialData?.expiryDate || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Status state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setDocumentNumber(initialData.documentNumber);
      setIssueDate(initialData.issueDate || new Date().toISOString().split('T')[0]);
      setExpiryDate(initialData.expiryDate || '');
      setNotes(initialData.notes || '');
    } else {
      setType('Insurance');
      setDocumentNumber('');
      setIssueDate(new Date().toISOString().split('T')[0]);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setExpiryDate(nextYear.toISOString().split('T')[0]);
      setNotes('');
    }
    setError(null);
    setIsSubmitting(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser) {
      setError('You must be signed in to perform this action.');
      return;
    }

    if (!vehicleId) {
      setError('No active vehicle selected.');
      return;
    }

    if (!type) {
      setError('Please select a Document Type.');
      return;
    }

    if (!documentNumber.trim()) {
      setError('Please provide a Document Number (e.g. Policy / Registration number).');
      return;
    }

    if (!issueDate) {
      setError('Please provide the Issue Date.');
      return;
    }

    if (!expiryDate) {
      setError('Please select an Expiry Date.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save Firestore document safely without Cloud Storage operations (Spark plan)
      await onSubmit({
        vehicleId,
        type,
        documentNumber: documentNumber.trim().toUpperCase(),
        issueDate,
        expiryDate,
        fileName: initialData?.fileName || null,
        fileUrl: initialData?.fileUrl || null,
        storagePath: initialData?.storagePath || null,
        notes: notes.trim() ? notes.trim() : null,
      });

      onClose();
    } catch (err: any) {
      console.error('Document save failed:', err);
      setError(
        err?.message?.includes('permission')
          ? "You don't have permission to perform this action."
          : err?.message || 'Failed to save document. Please check your network and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="fixed inset-0" onClick={isSubmitting ? undefined : onClose} />
      <div className="relative w-full max-w-lg bg-[#121620] border border-cyan-500/20 rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📄</span> {title}
          </h3>
          {!isSubmitting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Document Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DocumentType)}
                disabled={isSubmitting}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Document / Policy Number *
              </label>
              <input
                type="text"
                placeholder="e.g. POL-987214"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-gray-500 focus:outline-none transition-colors uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Issue Date *
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Graceful Informational Notice for File Upload */}
          <div className="rounded-xl border border-gray-800 bg-[#0a0d14] p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 shrink-0 mt-0.5">
              <FileText className="w-4 h-4 text-cyan-400/80" />
            </div>
            <div className="space-y-1 text-left min-w-0 flex-1">
              <div className="text-xs font-semibold text-gray-300">
                Document file upload is currently unavailable on this version.
              </div>
              <div className="text-[11px] text-gray-400 leading-relaxed">
                You can still save all document details and track expiry dates.
              </div>
              {initialData?.fileName && (
                <div className="pt-1.5 mt-1 border-t border-gray-800/60 flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="text-gray-500 font-medium">Attached File:</span>
                  <span className="text-cyan-300 font-mono truncate">{initialData.fileName}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Notes / Policy Provider (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. HDFC ERGO Zero Dep with 24x7 Roadside Assistance"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#0a0d14] border border-gray-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : (initialData ? 'Update Document' : 'Save Document')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
