import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MessageSquareHeart, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Heart, 
  Smile, 
  Meh, 
  Frown, 
  ThumbsUp, 
  Star,
  Layers,
  Wrench,
  Fuel,
  Receipt,
  FileText,
  Bell,
  Bot,
  LayoutDashboard,
  Check,
  Send
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { submitUserFeedback } from '../../services/feedback';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EASE_OPTIONS = [
  { label: 'Very Easy', value: 'Very Easy', icon: '⚡' },
  { label: 'Easy', value: 'Easy', icon: '😊' },
  { label: 'Neutral', value: 'Neutral', icon: '😐' },
  { label: 'Difficult', value: 'Difficult', icon: '😕' },
  { label: 'Very Difficult', value: 'Very Difficult', icon: '😫' },
];

const MOST_USEFUL_FEATURES = [
  { label: 'Vehicle Management', icon: Layers },
  { label: 'Maintenance & Service', icon: Wrench },
  { label: 'Fuel & Mileage', icon: Fuel },
  { label: 'Expenses', icon: Receipt },
  { label: 'Documents', icon: FileText },
  { label: 'Reminders', icon: Bell },
  { label: 'AI Assistant', icon: Bot },
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Other', icon: Sparkles },
];

const HELPFUL_OPTIONS = [
  'Very Helpful',
  'Helpful',
  'Neutral',
  'Not Very Helpful',
  'Not Helpful',
];

const USEFUL_OPTIONS = [
  'Very Useful',
  'Useful',
  'Neutral',
  'Not Very Useful',
  'Not Useful',
];

const MULTI_VEHICLE_OPTIONS = [
  'Definitely Yes',
  'Probably Yes',
  'Maybe',
  'Probably Not',
  'Definitely Not',
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();

  // Form State
  const [easeOfUse, setEaseOfUse] = useState<string>('');
  const [mostUsefulFeature, setMostUsefulFeature] = useState<string>('');
  const [otherFeatureText, setOtherFeatureText] = useState<string>('');
  const [fuelExpenseHelpful, setFuelExpenseHelpful] = useState<string>('');
  const [maintenanceRemindersHelpful, setMaintenanceRemindersHelpful] = useState<string>('');
  const [documentManagementHelpful, setDocumentManagementHelpful] = useState<string>('');
  const [multipleVehiclesInterest, setMultipleVehiclesInterest] = useState<string>('');
  const [additionalFeatureRequest, setAdditionalFeatureRequest] = useState<string>('');
  const [improvementSuggestions, setImprovementSuggestions] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEaseOfUse('');
    setMostUsefulFeature('');
    setOtherFeatureText('');
    setFuelExpenseHelpful('');
    setMaintenanceRemindersHelpful('');
    setDocumentManagementHelpful('');
    setMultipleVehiclesInterest('');
    setAdditionalFeatureRequest('');
    setImprovementSuggestions('');
    setErrorMessage(null);
    setIsSubmittedSuccess(false);
  };

  const handleModalClose = () => {
    if (isSubmitting) return;
    if (isSubmittedSuccess) {
      resetForm();
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validation
    if (!easeOfUse) {
      setErrorMessage('Please answer question 1: "Is AutoCare easy to use?".');
      return;
    }
    if (!mostUsefulFeature) {
      setErrorMessage('Please answer question 2: "Which feature do you find most useful?".');
      return;
    }
    if (mostUsefulFeature === 'Other' && !otherFeatureText.trim()) {
      setErrorMessage('Please specify your other most useful feature in question 2.');
      return;
    }
    if (!fuelExpenseHelpful) {
      setErrorMessage('Please answer question 3: "Is tracking fuel and expenses helpful?".');
      return;
    }
    if (!maintenanceRemindersHelpful) {
      setErrorMessage('Please answer question 4: "Are maintenance reminders useful?".');
      return;
    }
    if (!documentManagementHelpful) {
      setErrorMessage('Please answer question 5: "Is managing vehicle documents in one place helpful?".');
      return;
    }
    if (!multipleVehiclesInterest) {
      setErrorMessage('Please answer question 6: "Would you use AutoCare to manage multiple vehicles?".');
      return;
    }

    if (!currentUser) {
      setErrorMessage('You must be signed in to submit feedback.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const finalMostUseful = mostUsefulFeature === 'Other'
        ? `Other: ${otherFeatureText.trim()}`
        : mostUsefulFeature;

      await submitUserFeedback({
        userId: currentUser.uid,
        easeOfUse,
        mostUsefulFeature: finalMostUseful,
        fuelExpenseHelpful,
        maintenanceRemindersHelpful,
        documentManagementHelpful,
        multipleVehiclesInterest,
        additionalFeatureRequest: additionalFeatureRequest.trim(),
        improvementSuggestions: improvementSuggestions.trim(),
      });

      setIsSubmittedSuccess(true);
    } catch (err: any) {
      console.error('Failed to submit feedback:', err);
      setErrorMessage(
        err?.message?.includes('permission')
          ? "Permission error submitting feedback. Please try again."
          : 'Unable to submit feedback right now. Your answers are preserved, please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          handleModalClose();
        }
      }}
    >
      <div 
        ref={modalRef}
        className="w-full max-w-3xl max-h-[92vh] bg-[#0c1018] border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-gray-100 relative animate-modal-3d"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-800/80 flex items-center justify-between bg-[#0f1422] shrink-0 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/30">
              <MessageSquareHeart className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Help Us Improve AutoCare</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Your feedback helps us make AutoCare more useful and easier to use.
              </p>
            </div>
          </div>

          <button
            onClick={handleModalClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer border border-gray-800 disabled:opacity-50"
            aria-label="Close feedback modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State View */}
        {isSubmittedSuccess ? (
          <div className="p-8 sm:p-12 text-center space-y-6 my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-indigo-500/20 border border-cyan-500/40 flex items-center justify-center mx-auto text-4xl shadow-xl shadow-cyan-500/10">
              💙
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Thank You! 💙
              </h3>
              <p className="text-base text-cyan-300 font-semibold">
                Your feedback has been submitted successfully.
              </p>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed pt-1">
                We appreciate your time in helping us refine AutoCare's maintenance tracking, fuel calculations, document manager, and automotive intelligence.
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={handleModalClose}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Feedback Form View */
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            {/* Scrollable Questions Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-8 custom-scrollbar">
              
              {/* Error Banner */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs sm:text-sm flex items-start gap-2.5 shadow-lg shadow-red-950/20 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* QUESTION 1: Is AutoCare easy to use? */}
              {/* ---------------------------------------------------- */}
              <div className="p-5 rounded-2xl bg-[#0f1420] border border-gray-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-[11px] font-black flex items-center justify-center">1</span>
                    <span>Is AutoCare easy to use?</span>
                    <span className="text-cyan-400 text-xs font-mono">*</span>
                  </label>
                  <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Usability</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                  {EASE_OPTIONS.map((opt) => {
                    const isSelected = easeOfUse === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEaseOfUse(opt.value)}
                        className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                            : 'bg-gray-900/80 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 hover:bg-gray-850'
                        }`}
                      >
                        <span className="text-xl">{opt.icon}</span>
                        <span className="text-center">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* QUESTION 2: Which feature do you find most useful? */}
              {/* ---------------------------------------------------- */}
              <div className="p-5 rounded-2xl bg-[#0f1420] border border-gray-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-[11px] font-black flex items-center justify-center">2</span>
                    <span>Which feature do you find most useful?</span>
                    <span className="text-cyan-400 text-xs font-mono">*</span>
                  </label>
                  <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Key Feature</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {MOST_USEFUL_FEATURES.map((feat) => {
                    const isSelected = mostUsefulFeature === feat.label;
                    const Icon = feat.icon;
                    return (
                      <button
                        key={feat.label}
                        type="button"
                        onClick={() => setMostUsefulFeature(feat.label)}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                            : 'bg-gray-900/80 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 hover:bg-gray-850'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-gray-500'}`} />
                        <span className="truncate">{feat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Optional "Other" input field */}
                {mostUsefulFeature === 'Other' && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={otherFeatureText}
                      onChange={(e) => setOtherFeatureText(e.target.value)}
                      placeholder="Please specify which feature..."
                      maxLength={100}
                      className="w-full bg-[#131722] border border-cyan-500/40 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* ---------------------------------------------------- */}
              {/* QUESTION 3: Is tracking fuel and expenses helpful? */}
              {/* ---------------------------------------------------- */}
              <div className="p-5 rounded-2xl bg-[#0f1420] border border-gray-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-[11px] font-black flex items-center justify-center">3</span>
                    <span>Is tracking fuel and expenses helpful?</span>
                    <span className="text-cyan-400 text-xs font-mono">*</span>
                  </label>
                  <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Fuel &amp; Cost</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {HELPFUL_OPTIONS.map((val) => {
                    const isSelected = fuelExpenseHelpful === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFuelExpenseHelpful(val)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                            : 'bg-gray-900/80 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* QUESTION 4: Are maintenance reminders useful? */}
              {/* ---------------------------------------------------- */}
              <div className="p-5 rounded-2xl bg-[#0f1420] border border-gray-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-[11px] font-black flex items-center justify-center">4</span>
                    <span>Are maintenance reminders useful?</span>
                    <span className="text-cyan-400 text-xs font-mono">*</span>
                  </label>
                  <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Reminders</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {USEFUL_OPTIONS.map((val) => {
                    const isSelected = maintenanceRemindersHelpful === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMaintenanceRemindersHelpful(val)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                            : 'bg-gray-900/80 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* QUESTION 5: Is managing vehicle documents in one place helpful? */}
              {/* ---------------------------------------------------- */}
              <div className="p-5 rounded-2xl bg-[#0f1420] border border-gray-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-[11px] font-black flex items-center justify-center">5</span>
                    <span>Is managing vehicle documents in one place helpful?</span>
                    <span className="text-cyan-400 text-xs font-mono">*</span>
                  </label>
                  <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Documents</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {HELPFUL_OPTIONS.map((val) => {
                    const isSelected = documentManagementHelpful === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setDocumentManagementHelpful(val)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                            : 'bg-gray-900/80 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* QUESTION 6: Would you use AutoCare to manage multiple vehicles? */}
              {/* ---------------------------------------------------- */}
              <div className="p-5 rounded-2xl bg-[#0f1420] border border-gray-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-[11px] font-black flex items-center justify-center">6</span>
                    <span>Would you use AutoCare to manage multiple vehicles?</span>
                    <span className="text-cyan-400 text-xs font-mono">*</span>
                  </label>
                  <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Multi-Vehicle</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {MULTI_VEHICLE_OPTIONS.map((val) => {
                    const isSelected = multipleVehiclesInterest === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMultipleVehiclesInterest(val)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                            : 'bg-gray-900/80 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* QUESTION 7: What additional feature would you like to see? */}
              {/* ---------------------------------------------------- */}
              <div className="p-5 rounded-2xl bg-[#0f1420] border border-gray-800/90 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-[11px] font-black flex items-center justify-center">7</span>
                    <span>What additional feature would you like to see?</span>
                  </label>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {additionalFeatureRequest.length}/500
                  </span>
                </div>

                <textarea
                  value={additionalFeatureRequest}
                  onChange={(e) => setAdditionalFeatureRequest(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="e.g., GPS tracking integration, toll fastag sync, tyre pressure monitor logs..."
                  className="w-full bg-[#121622] border border-gray-800 focus:border-cyan-500/50 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* ---------------------------------------------------- */}
              {/* QUESTION 8: What improvements would make AutoCare more useful? */}
              {/* ---------------------------------------------------- */}
              <div className="p-5 rounded-2xl bg-[#0f1420] border border-gray-800/90 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-[11px] font-black flex items-center justify-center">8</span>
                    <span>What improvements would make AutoCare more useful?</span>
                  </label>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {improvementSuggestions.length}/500
                  </span>
                </div>

                <textarea
                  value={improvementSuggestions}
                  onChange={(e) => setImprovementSuggestions(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Share any thoughts on UI layout, speed, notifications, or features that could be improved..."
                  className="w-full bg-[#121622] border border-gray-800 focus:border-cyan-500/50 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors resize-none leading-relaxed"
                />
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-800/80 bg-[#0f1422] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-gray-500">
                Fields marked with <span className="text-cyan-400">*</span> are required.
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
