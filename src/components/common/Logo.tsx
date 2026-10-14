import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

/**
 * Original Front-Facing Sports-Car Silhouette
 * Minimal, aerodynamic, recognizable automotive mark
 * Features white/light silhouette body, dark windshield, and glowing cyan LED headlights.
 */
export const SportsCarSilhouette: React.FC<{ className?: string; accentColor?: string }> = ({
  className = "w-6 h-6",
  accentColor = "#00D9FF"
}) => {
  return (
    <svg 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Ambient Headlight Glow Filter */}
      <defs>
        <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main Sports Car Body Silhouette */}
      <path
        d="M17 14C19.5 11.5 28.5 11.5 31 14L34 20C35.5 20.2 38 21.2 38.5 22.5C39 23.5 38 24.2 36.5 24.2L37 26.5C38.2 27.2 40 28.8 40.5 31.5C41 34 40.2 35.8 39 36.8L39 39C39 40 37.8 40.5 36.5 40.5L34 40.5C33.2 40.5 32.5 39.8 32.5 39L32.5 38L15.5 38L15.5 39C15.5 39.8 14.8 40.5 14 40.5L11.5 40.5C10.2 40.5 9 40 9 39L9 36.8C7.8 35.8 7 34 7.5 31.5C8 28.8 9.8 27.2 11 26.5L11.5 24.2C10 24.2 9 23.5 9.5 22.5C10 21.2 12.5 20.2 14 20L17 14Z"
        fill="#FFFFFF"
        stroke="#07111F"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Raked Aerodynamic Windshield */}
      <path
        d="M18 16.5C19.8 14.5 28.2 14.5 30 16.5L32.8 21.5C31.5 21.8 16.5 21.8 15.2 21.5L18 16.5Z"
        fill="#07111F"
      />

      {/* Hood Aerodynamic Contour Creases */}
      <path
        d="M20 22.5L21.5 28M28 22.5L26.5 28"
        stroke="#07111F"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Aggressive Slanted LED Headlights in Cyan */}
      <path
        d="M11.5 29C13.5 28.2 16.5 28.8 17.5 30C16 31 12.8 31.2 11.2 30.5L11.5 29Z"
        fill={accentColor}
        filter="url(#cyanGlow)"
      />
      <path
        d="M36.5 29C34.5 28.2 31.5 28.8 30.5 30C32 31 35.2 31.2 36.8 30.5L36.5 29Z"
        fill={accentColor}
        filter="url(#cyanGlow)"
      />

      {/* Lower Intake Grille */}
      <path
        d="M17 33C20 32.5 28 32.5 31 33L32 36.5C28.5 37.2 19.5 37.2 16 36.5L17 33Z"
        fill="#07111F"
      />

      {/* Aerodynamic Front Splitter Accent */}
      <path
        d="M15 38.5C19 39 29 39 33 38.5"
        stroke={accentColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  showText = true 
}) => {
  const iconContainerSize = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
  }[size];

  const carIconSize = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  const textSize = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size];

  const subtextSize = {
    sm: 'text-[8px]',
    md: 'text-[9px]',
    lg: 'text-[11px]',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Front-Facing Sports Car Emblem Badge */}
      <div className={`relative ${iconContainerSize} flex items-center justify-center bg-gradient-to-tr from-[#1677FF] via-[#2196FF] to-[#00D9FF] p-[1.5px] shadow-lg shadow-[#1677FF]/20 group shrink-0`}>
        <div className="w-full h-full bg-[#07111F] rounded-[inherit] flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:bg-[#0B1628]">
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,217,255,0.15),transparent_70%)] opacity-80" />
          
          {/* Sports Car Silhouette Icon */}
          <SportsCarSilhouette className={`${carIconSize} relative z-10 transition-transform duration-300 group-hover:scale-105`} />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col select-none">
          <div className="flex items-center">
            <span className={`font-black tracking-wider text-white ${textSize} font-mono leading-none`}>
              AUTO<span className="text-[#00D9FF]">CARE</span>
            </span>
          </div>
          <span className={`${subtextSize} font-semibold text-[#A9B8CC] tracking-widest uppercase mt-0.5 font-mono`}>
            Vehicle Platform
          </span>
        </div>
      )}
    </div>
  );
};

