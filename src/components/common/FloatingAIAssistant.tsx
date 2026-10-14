import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface FloatingAIAssistantProps {
  onClick: () => void;
  isActive?: boolean;
}

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({ 
  onClick,
  isActive = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="fixed bottom-[84px] right-6 sm:bottom-[86px] sm:right-6 z-40 flex items-center gap-2.5 pointer-events-auto select-none">
      {/* Small Tooltip Appearing on Left */}
      <div
        role="tooltip"
        id="ai-assistant-tooltip"
        className={`pointer-events-none transition-all duration-200 transform ${
          isHovered
            ? 'opacity-100 translate-x-0 scale-100'
            : 'opacity-0 translate-x-2 scale-95 pointer-events-none'
        } hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F1F35]/95 border border-[#1677FF]/50 text-white text-xs font-semibold shadow-xl shadow-black/60 backdrop-blur-md`}
      >
        <Sparkles className="w-3.5 h-3.5 text-[#00D9FF] animate-pulse" />
        <span className="text-[#F5F9FF] font-medium">Ask AutoCare AI</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1677FF]/20 text-[#00D9FF] font-mono border border-[#1677FF]/35">
          Co-Pilot
        </span>
      </div>

      {/* Floating Avatar Button */}
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        aria-label="Open AutoCare AI Assistant"
        aria-describedby="ai-assistant-tooltip"
        className={`relative group flex items-center p-1 sm:p-1.5 rounded-full bg-[#0B1628]/95 border transition-all duration-300 cursor-pointer backdrop-blur-xl outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] ${
          isActive
            ? 'border-[#00D9FF] shadow-[0_0_25px_rgba(0,217,255,0.45)] ring-2 ring-[#00D9FF]/40'
            : 'border-[#1677FF]/50 shadow-[0_10px_25px_-5px_rgba(22,119,255,0.35),0_8px_10px_-6px_rgba(3,8,16,0.8)] hover:border-[#00D9FF] hover:shadow-[0_15px_35px_-5px_rgba(0,217,255,0.45),0_10px_15px_-5px_rgba(3,8,16,0.9)] hover:scale-105 active:scale-95'
        }`}
      >
        {/* Subtle Ambient Idle Pulse Glow Behind Avatar */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#1677FF] to-[#00D9FF] opacity-35 blur-[3px] animate-pulse" />

        {/* Circular Avatar Frame with High-Tech Border */}
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden p-[2px] bg-gradient-to-tr from-[#1677FF] via-[#2196FF] to-[#00D9FF] shadow-inner">
          <div className="w-full h-full rounded-full overflow-hidden bg-[#07111F]">
            <img
              src="/src/assets/images/autocare_ai_avatar_1791025216006.jpg"
              alt="AutoCare Intelligent AI Co-Pilot"
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          </div>
        </div>

        {/* Desktop Mini Label Badge */}
        <div className="hidden sm:flex flex-col text-left pl-2 pr-2.5 py-0.5">
          <span className="text-[11px] font-bold text-white group-hover:text-[#00D9FF] transition-colors leading-tight font-mono flex items-center gap-1">
            AutoCare AI
          </span>
          <span className="text-[9px] text-[#A9B8CC] font-mono leading-none mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse" />
            <span>Online</span>
          </span>
        </div>

        {/* Mobile Status Dot */}
        <span className="sm:hidden absolute bottom-1 right-1 w-3 h-3 rounded-full bg-[#00D9FF] ring-2 ring-[#07111F] shadow-[0_0_8px_#00D9FF] animate-pulse" />
      </button>
    </div>
  );
};
