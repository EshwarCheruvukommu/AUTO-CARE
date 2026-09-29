import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  FileText, 
  Download, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Car,
  Gauge,
  Wind,
  CreditCard,
  Wrench,
  HelpCircle,
  Eye,
  Check,
  Calendar
} from 'lucide-react';
import { VehicleDocument, DocumentType } from '../../types';
import { useVehicle } from '../../context/VehicleContext';
import { DocumentModal } from './DocumentModal';
import { ConfirmDialog, Modal } from '../common/Modal';
import { formatDate, formatOdometer, getDocumentStatus } from '../../utils/formatters';

export const DocumentsView: React.FC = () => {
  const { 
    selectedVehicle, 
    documents, 
    loadingDocuments, 
    addDocument, 
    updateDocument, 
    deleteDocument 
  } = useVehicle();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<VehicleDocument | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<VehicleDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAdd = async (data: any) => {
    try {
      setErrorMessage(null);
      await addDocument(data);
      showToast('Document saved successfully.');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message?.includes('permission')
          ? "You don't have permission to perform this action."
          : err?.message || 'Unable to save your document. Please try again.'
      );
      throw err;
    }
  };

  const handleUpdate = async (data: any, previousStoragePathToClean?: string) => {
    if (!editingDoc) return;
    try {
      setErrorMessage(null);
      await updateDocument(editingDoc.id, data, previousStoragePathToClean);
      setEditingDoc(null);
      showToast('Document updated successfully.');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message?.includes('permission')
          ? "You don't have permission to edit this document."
          : err?.message || 'Failed to update document. Please try again.'
      );
      throw err;
    }
  };

  const confirmDelete = async () => {
    if (!deletingDocId) return;
    try {
      setIsDeleting(true);
      setErrorMessage(null);
      await deleteDocument(deletingDocId);
      setDeletingDocId(null);
      showToast('Document deleted successfully.');
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to delete document. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getDocTypeIcon = (type: DocumentType) => {
    switch (type) {
      case 'Insurance':
        return <Shield className="w-5 h-5 text-cyan-400" />;
      case 'PUC':
        return <Wind className="w-5 h-5 text-emerald-400" />;
      case 'RC':
        return <Car className="w-5 h-5 text-blue-400" />;
      case 'Driving Licence':
        return <CreditCard className="w-5 h-5 text-purple-400" />;
      case 'Service Document':
        return <Wrench className="w-5 h-5 text-amber-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  if (!selectedVehicle) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-[#0d1017] p-12 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto text-3xl mb-4">
          🚗
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Active Vehicle Selected</h3>
        <p className="text-sm text-gray-400 mb-6">
          Please add or select a vehicle first to view and manage its documents.
        </p>
      </div>
    );
  }

  const getStatusBadge = (expiryDate: string) => {
    const { status } = getDocumentStatus(expiryDate);
    if (status === 'Expired') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>🔴 Expired</span>
        </span>
      );
    }
    if (status === 'Expiring Soon') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>🟡 Expiring Soon</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>🟢 Valid</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center justify-between shadow-lg shadow-emerald-950/20 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-xs text-emerald-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold flex items-center justify-between shadow-lg shadow-red-950/20 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={() => setErrorMessage(null)}
            className="text-xs text-red-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-800/60">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>Documents</span>
            <span className="text-sm font-normal text-gray-400 bg-gray-900 px-2.5 py-0.5 rounded-full border border-gray-800">
              {documents.length}
            </span>
          </h1>

          {/* Current Vehicle Badge */}
          <div className="mt-2 flex items-center gap-3 text-sm text-gray-300">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Car className="w-4 h-4 text-cyan-400" />
              <span>{selectedVehicle.name}</span>
            </span>
            <span className="text-gray-600">•</span>
            <span className="font-mono text-cyan-400 font-semibold flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" />
              <span>{formatOdometer(selectedVehicle.currentOdometer)}</span>
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400 font-mono text-xs">{selectedVehicle.vehicleNumber}</span>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Document</span>
        </button>
      </div>

      {loadingDocuments ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400 space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
          <span className="text-xs uppercase font-semibold tracking-wider text-cyan-400">Loading documents...</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-3xl border border-gray-800 bg-[#0d1017] p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto text-3xl">
            📄
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No documents added yet</h3>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
              Keep your important vehicle documents organized in one place.
            </p>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            + Add Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => {
            const { status, label } = getDocumentStatus(doc.expiryDate);
            const isDanger = status === 'Expired';
            const isWarning = status === 'Expiring Soon';

            return (
              <div
                key={doc.id}
                className={`rounded-2xl border bg-[#0f131c] flex flex-col justify-between overflow-hidden transition-all duration-200 ${
                  isDanger 
                    ? 'border-red-500/40 hover:border-red-500/70 shadow-lg shadow-red-950/30' 
                    : isWarning 
                    ? 'border-amber-500/40 hover:border-amber-500/70 shadow-lg shadow-amber-950/30'
                    : 'border-gray-800/80 hover:border-cyan-500/40'
                }`}
              >
                <div className="p-5 flex-1 space-y-4">
                  {/* Top: Icon, Document Type, Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center shrink-0">
                        {getDocTypeIcon(doc.type)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {doc.type}
                        </h3>
                        <span className="text-[11px] text-gray-500 uppercase font-semibold">
                          Vehicle Document
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(doc.expiryDate)}
                  </div>

                  {/* Document / Policy Number */}
                  <div className="p-3 rounded-xl bg-[#0a0d14] border border-gray-800/70 space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Policy / Document Number
                    </span>
                    <div className="text-sm font-bold text-cyan-300 font-mono tracking-wide select-all">
                      {doc.documentNumber}
                    </div>
                  </div>

                  {/* Dates & Expiry Countdown */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">
                        Issue Date
                      </span>
                      <span className="text-gray-300 font-medium">
                        {formatDate(doc.issueDate)}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">
                        Expiry Date
                      </span>
                      <span className={`font-semibold ${isDanger ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {formatDate(doc.expiryDate)}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Countdown Status */}
                  <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Countdown:</span>
                    <span className={`font-bold font-mono ${isDanger ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {label}
                    </span>
                  </div>

                  {/* Notes / Provider (if present) */}
                  {doc.notes && (
                    <div className="text-xs text-gray-400 bg-gray-900/40 p-2.5 rounded-lg border border-gray-800/60 line-clamp-2">
                      <span className="text-gray-500 font-semibold text-[10px] uppercase block">Notes:</span>
                      {doc.notes}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="p-3.5 bg-gray-950/60 border-t border-gray-800/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* View Document File (if file exists) or Informational 'No file attached' */}
                    {doc.fileUrl ? (
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="View Document File"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View File</span>
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                        <FileText className="w-3.5 h-3.5 text-gray-600" />
                        <span>No file attached</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingDoc(doc)}
                      className="p-1.5 text-gray-400 hover:text-cyan-300 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingDoc(doc)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                      title="Edit Document"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingDocId(doc.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete Document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Document Modal */}
      {isAddOpen && (
        <DocumentModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAdd}
          vehicleId={selectedVehicle.id}
          title="Add Document"
        />
      )}

      {/* Edit Document Modal */}
      {editingDoc && (
        <DocumentModal
          isOpen={!!editingDoc}
          onClose={() => setEditingDoc(null)}
          onSubmit={handleUpdate}
          initialData={editingDoc}
          vehicleId={selectedVehicle.id}
          title="Edit Document"
        />
      )}

      {/* View Document Modal */}
      {viewingDoc && (
        <Modal
          isOpen={!!viewingDoc}
          onClose={() => setViewingDoc(null)}
          title={`${viewingDoc.type} — ${viewingDoc.documentNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Metadata Summary */}
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Type</span>
                <span className="text-white font-semibold">{viewingDoc.type}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Number</span>
                <span className="text-cyan-400 font-mono font-bold truncate block">{viewingDoc.documentNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Issue Date</span>
                <span className="text-gray-300">{formatDate(viewingDoc.issueDate)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Expiry Date</span>
                <span className="text-gray-300 font-semibold">{formatDate(viewingDoc.expiryDate)}</span>
              </div>
            </div>

            {viewingDoc.notes && (
              <div className="text-xs text-gray-300 bg-gray-900/40 p-3 rounded-xl border border-gray-800">
                <span className="text-gray-500 text-[10px] font-bold uppercase block mb-1">Notes:</span>
                {viewingDoc.notes}
              </div>
            )}

            {/* File Viewer or Normal Informational State when no file */}
            {viewingDoc.fileUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-800">
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="truncate">{viewingDoc.fileName || 'Attached Document File'}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={viewingDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                    </a>
                    <a
                      href={viewingDoc.fileUrl}
                      download={viewingDoc.fileName || `${viewingDoc.type}_document`}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  </div>
                </div>

                {viewingDoc.fileUrl.includes('.pdf') || viewingDoc.fileName?.toLowerCase().endsWith('.pdf') ? (
                  <div className="h-[460px] w-full rounded-xl overflow-hidden border border-gray-800 bg-black">
                    <iframe
                      src={viewingDoc.fileUrl}
                      className="w-full h-full"
                      title="PDF Document Viewer"
                    />
                  </div>
                ) : (
                  <div className="max-h-[460px] overflow-auto rounded-xl flex items-center justify-center bg-black/60 p-2 border border-gray-800">
                    <img
                      src={viewingDoc.fileUrl}
                      alt={viewingDoc.fileName || 'Document Attachment'}
                      className="max-h-[440px] max-w-full object-contain rounded-lg shadow"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center bg-gray-900/40 rounded-xl border border-gray-800 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-gray-800/80 flex items-center justify-center mx-auto text-gray-400">
                  <FileText className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-gray-300">
                  No file attached
                </p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Document file upload is currently unavailable on this version. You can still save all document details and track expiry dates.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingDocId}
        onClose={() => setDeletingDocId(null)}
        onConfirm={confirmDelete}
        title="Delete Document?"
        message="Are you sure you want to delete this document? This will permanently remove the document record and uploaded file."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
      />
    </div>
  );
};
