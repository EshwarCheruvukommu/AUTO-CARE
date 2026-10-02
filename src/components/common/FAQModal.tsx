import React, { useState, useMemo } from 'react';
import { 
  X, 
  HelpCircle, 
  Search, 
  ChevronDown, 
  Sparkles, 
  Car, 
  Wrench, 
  Fuel, 
  FileText, 
  ShieldCheck, 
  MessageSquareHeart,
  ExternalLink
} from 'lucide-react';
import { FAQ_ITEMS, FAQItem } from '../../data/faqData';

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFeedback?: () => void;
}

const CATEGORIES = ['All', 'General', 'Vehicles', 'Maintenance', 'AI Assistant'] as const;

export const FAQModal: React.FC<FAQModalProps> = ({ isOpen, onClose, onOpenFeedback }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openItemIds, setOpenItemIds] = useState<Set<string>>(new Set(['who-is-autocare-for']));

  // Close on ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleItem = (id: string) => {
    setOpenItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenItemIds(new Set(FAQ_ITEMS.map((item) => item.id)));
  };

  const collapseAll = () => {
    setOpenItemIds(new Set());
  };

  const filteredItems = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.question.toLowerCase().includes(q) || 
        item.answer.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-3xl max-h-[90vh] bg-[#0c1018] border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-gray-100 relative animate-in zoom-in-95 duration-200"
      >
        {/* Glow */}
        <div className="absolute top-0 left-1/3 w-80 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-800/80 flex items-center justify-between bg-[#0f1422] shrink-0 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/30">
              <HelpCircle className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Frequently Asked Questions</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold font-mono hidden sm:inline-block">
                  FAQ & Guide
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Quick answers on tracking maintenance, fuel, documents, and vehicle analytics.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer border border-gray-800"
            aria-label="Close FAQ modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Categories */}
        <div className="p-4 sm:p-5 border-b border-gray-800/80 bg-[#0d111b] space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search answers (e.g. 'mileage', 'documents', 'inspection', 'export')..."
              className="w-full bg-[#121622] border border-gray-800 focus:border-cyan-500/50 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Pills & Action buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'bg-gray-900/60 text-gray-400 hover:text-gray-200 border border-gray-800/60'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <button 
                onClick={expandAll}
                className="hover:text-cyan-400 transition-colors cursor-pointer"
              >
                Expand all
              </button>
              <span>•</span>
              <button 
                onClick={collapseAll}
                className="hover:text-cyan-400 transition-colors cursor-pointer"
              >
                Collapse all
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Accordion Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-900/80 border border-gray-800 flex items-center justify-center mx-auto text-gray-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-gray-300">No matching questions found</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Try searching for something else or explore all categories. Have a specific question or suggestion?
              </p>
              {onOpenFeedback && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenFeedback();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold transition-all cursor-pointer"
                >
                  <MessageSquareHeart className="w-3.5 h-3.5" />
                  <span>Send us Feedback</span>
                </button>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isOpen = openItemIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? 'bg-[#101524] border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                      : 'bg-[#0f1420]/70 border-gray-800/80 hover:border-gray-700 hover:bg-[#0f1420]'
                  }`}
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isOpen ? 'bg-cyan-400' : 'bg-gray-600'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                            {item.question}
                          </span>
                        </div>
                        {item.category && (
                          <span className="text-[10px] text-cyan-400/80 font-mono mt-0.5 inline-block uppercase tracking-wider">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400 border-cyan-500/30' : ''}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-gray-800/60 bg-[#0d121c]/50">
                      <p>{item.answer}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Quick Help Banner */}
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-indigo-950/30 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <MessageSquareHeart className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Have more questions or ideas?</div>
                <div className="text-[11px] text-gray-400">Share suggestions or report issues via our feedback form.</div>
              </div>
            </div>

            {onOpenFeedback && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFeedback();
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-md shadow-cyan-500/20 cursor-pointer self-start sm:self-auto shrink-0"
              >
                Open Feedback
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-800/80 bg-[#0f1422] flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            Showing {filteredItems.length} of {FAQ_ITEMS.length} questions
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
