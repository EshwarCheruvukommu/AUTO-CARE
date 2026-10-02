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
      className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#111726] to-[#1a2236] border border-cyan-500/40 text-white font-bold text-sm shadow-[0_10px_25px_-5px_rgba(6,182,212,0.35),0_8px_10px_-6px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_30px_-5px_rgba(6,182,212,0.5),0_10px_15px_-5px_rgba(0,0,0,0.6)] hover:border-cyan-400 hover:-translate-y-1 active:translate-y-0.5 transition-all duration-200 cursor-pointer backdrop-blur-md"
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="relative flex items-center justify-center">
        <span className="absolute w-3 h-3 rounded-full bg-pink-500/40 animate-ping" />
        <MessageSquareHeart className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform duration-200" />
      </div>
      <span className="tracking-wide text-xs sm:text-sm font-extrabold text-cyan-200 group-hover:text-white transition-colors">
        Feedback
      </span>
    </button>
  );
};
