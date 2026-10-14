import React from 'react';
import { MessageSquareHeart } from 'lucide-react';

interface FeedbackFloatingButtonProps {
  onClick: () => void;
}

export const FeedbackFloatingButton: React.FC<FeedbackFloatingButtonProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Feedback Form"
      className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#0B1628]/95 border border-[#1677FF]/50 text-white font-bold text-sm shadow-[0_10px_25px_-5px_rgba(22,119,255,0.35),0_8px_10px_-6px_rgba(3,8,16,0.8)] hover:shadow-[0_15px_35px_-5px_rgba(0,217,255,0.45),0_10px_15px_-5px_rgba(3,8,16,0.9)] hover:border-[#00D9FF] hover:-translate-y-1 active:translate-y-0.5 transition-all duration-200 cursor-pointer backdrop-blur-xl floating-3d btn-3d"
    >
      <div className="relative flex items-center justify-center">
        <span className="absolute w-3.5 h-3.5 rounded-full bg-[#00D9FF]/40 animate-ping" />
        <span className="text-base select-none">💬</span>
      </div>
      <span className="tracking-wide text-xs sm:text-sm font-extrabold text-[#F5F9FF] group-hover:text-[#00D9FF] transition-colors">
        Feedback
      </span>
    </button>
  );
};
